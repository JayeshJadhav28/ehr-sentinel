import { runDetection } from "@/lib/detection/engine";
import type { AlertEvidence } from "@/lib/types/alert";
import { db } from "./db.server";
import { loadEvents, loadHistory, loadProfile } from "./behavior.server";

export interface DetectionRunOptions {
  userId: string;
  windowMinutes?: number;
  scenarioTag?: string | null;
  /** Evaluation clock; scenario replays evaluate at their own window end. */
  now?: Date;
  /** When false, benign outcomes are not persisted as an alert row. */
  persistBenign?: boolean;
}

export interface PersistedAlertSummary {
  id: string;
  type: string;
  severity: string;
  riskScore: number;
  summary: string;
  benign: boolean;
}

async function identityFor(userId: string): Promise<AlertEvidence["identity"]> {
  const { data: user } = await db
    .from("users")
    .select("id,username,display_name,role_id,department_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    return {
      userId: null,
      username: "unknown",
      displayName: "Unknown user",
      role: "Unknown role",
      department: "\u2014",
    };
  }

  const [{ data: role }, { data: dept }] = await Promise.all([
    user.role_id
      ? db.from("roles").select("label").eq("id", user.role_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user.department_id
      ? db.from("departments").select("name").eq("id", user.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    userId: user.id,
    username: user.username ?? "unknown",
    displayName: user.display_name ?? "Unknown user",
    role: role?.label ?? "Unknown role",
    department: dept?.name ?? "\u2014",
  };
}

/**
 * Correlates recent events for a user, runs rules + model, and persists an
 * alert with its evidence package and supporting event links.
 */
export async function evaluateUser(options: DetectionRunOptions): Promise<PersistedAlertSummary | null> {
  const windowMinutes = options.windowMinutes ?? 60;
  const now = options.now ?? new Date();
  const [identity, windowEvents, history, profile] = await Promise.all([
    identityFor(options.userId),
    loadEvents(options.userId, windowMinutes, now),
    loadHistory(options.userId, 14),
    loadProfile(options.userId),
  ]);

  if (windowEvents.length === 0) return null;

  const outcome = await runDetection({
    identity,
    windowEvents,
    historyEvents: history,
    profile,
    now,
  });

  const anyTriggered = outcome.rules.some((r) => r.triggered);
  if (!anyTriggered && !outcome.benign) return null;
  if (outcome.benign && (options.persistBenign === false || !anyTriggered)) {
    return null;
  }

  const alertId = crypto.randomUUID();
  const { error } = await db.from("alerts").insert({
    id: alertId,
    type: outcome.alertType,
    severity: outcome.severity,
    user_id: options.userId,
    status: "OPEN",
    rule_ids: outcome.rules.filter((r) => r.triggered).map((r) => r.ruleId),
    risk_score: outcome.risk.score,
    ml_score: outcome.mlScore,
    summary: outcome.summary,
    evidence_json: {
      ...outcome.evidence,
      riskBreakdown: outcome.risk.lines,
    } as never,
    scenario_tag: options.scenarioTag ?? null,
  });
  if (error) throw new Error(`ALERT_WRITE_FAILED:${error.message}`);

  const supporting = outcome.evidence.supportingEventIds;
  if (supporting.length > 0) {
    await db.from("alert_events").insert(
      supporting.map((eventId) => ({
        alert_id: alertId,
        event_id: eventId,
        relation_type: "SUPPORTING",
      })),
    );
  }

  await db.from("alert_timeline").insert({
    alert_id: alertId,
    actor: "detection-engine",
    action: "Alert created",
    note: `${outcome.alertType} \u00b7 prototype risk indicator ${outcome.risk.score}`,
  });

  return {
    id: alertId,
    type: outcome.alertType,
    severity: outcome.severity,
    riskScore: outcome.risk.score,
    summary: outcome.summary,
    benign: outcome.benign,
  };
}