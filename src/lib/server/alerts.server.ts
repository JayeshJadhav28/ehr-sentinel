import { authorize } from "@/lib/authz/authorize";
import type { Alert, AlertDetail, AlertEvidence, AlertStatus, AlertType, ReviewerAction, Severity } from "@/lib/types/alert";
import { db, EVENT_COLUMNS, mapEvent, type AccessEventRow } from "./db.server";
import { logAccessEvent } from "./audit.server";
import type { SessionContext } from "./session.server";

interface AlertRow {
  id: string;
  created_at: string;
  type: string;
  severity: string;
  user_id: string | null;
  status: string;
  rule_ids: string[];
  risk_score: number;
  ml_score: number | null;
  summary: string;
  evidence_json: unknown;
  scenario_tag: string | null;
}

async function userLabels(): Promise<Map<string, { username: string; displayName: string }>> {
  const { data } = await db.from("users").select("id,username,display_name");
  return new Map((data ?? []).map((u) => [u.id, { username: u.username, displayName: u.display_name }]));
}

function mapAlert(row: AlertRow, labels: Map<string, { username: string; displayName: string }>): Alert {
  const label = row.user_id ? labels.get(row.user_id) : undefined;
  return {
    id: row.id,
    createdAt: row.created_at,
    type: row.type as AlertType,
    severity: row.severity as Severity,
    userId: row.user_id,
    username: label?.username ?? "unknown",
    displayName: label?.displayName ?? "Unknown user",
    status: row.status as AlertStatus,
    ruleIds: row.rule_ids ?? [],
    riskScore: row.risk_score,
    mlScore: row.ml_score === null ? null : Number(row.ml_score),
    summary: row.summary,
    evidence: row.evidence_json as AlertEvidence,
    scenarioTag: row.scenario_tag,
  };
}

function requireSecurityRead(ctx: SessionContext) {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "SECURITY_ALERT",
  });
  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not read security alerts.");
}

export async function listAlerts(ctx: SessionContext): Promise<Alert[]> {
  requireSecurityRead(ctx);
  const { data, error } = await db
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:alerts:${error.message}`);
  const labels = await userLabels();
  return (data as AlertRow[]).map((row) => mapAlert(row, labels));
}

export async function getAlertDetail(ctx: SessionContext, alertId: string): Promise<AlertDetail> {
  requireSecurityRead(ctx);
  const { data: row, error } = await db.from("alerts").select("*").eq("id", alertId).maybeSingle();
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:alerts:${error.message}`);
  if (!row) throw new Error("NOT_FOUND:No alert matches that identifier.");

  const labels = await userLabels();
  const alert = mapAlert(row as AlertRow, labels);

  const { data: links } = await db.from("alert_events").select("event_id").eq("alert_id", alertId);
  const ids = (links ?? []).map((l) => l.event_id);
  const { data: events } = ids.length
    ? await db.from("access_events").select(EVENT_COLUMNS).in("id", ids).order("ts", { ascending: true })
    : { data: [] };

  const { data: timeline } = await db
    .from("alert_timeline")
    .select("id,ts,actor,action,note")
    .eq("alert_id", alertId)
    .order("ts", { ascending: true });

  await logAccessEvent({
    eventType: "REVIEWER",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    action: "VIEW",
    targetType: "ALERT",
    targetId: alertId,
    result: "SUCCESS",
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
  });

  return {
    ...alert,
    supportingEvents: ((events ?? []) as AccessEventRow[]).map(mapEvent),
    timeline: (timeline ?? []).map((t) => ({
      id: t.id,
      ts: t.ts,
      actor: t.actor,
      action: t.action,
      note: t.note,
    })),
  };
}

const ACTION_STATUS: Record<ReviewerAction, AlertStatus> = {
  OPEN: "OPEN",
  INVESTIGATE: "INVESTIGATING",
  DISMISS: "DISMISSED",
  ESCALATE: "ESCALATED",
  RESOLVE: "RESOLVED",
};

export async function applyReviewerAction(
  ctx: SessionContext,
  alertId: string,
  action: ReviewerAction,
  note: string | null,
): Promise<{ status: AlertStatus }> {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "UPDATE",
    resourceType: "SECURITY_ALERT",
  });

  await logAccessEvent({
    eventType: "REVIEWER",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    action: "UPDATE",
    targetType: "ALERT",
    targetId: alertId,
    result: decision.allowed ? "SUCCESS" : "DENIED",
    reasonCode: decision.reasonCode,
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
    metadata: { reviewerAction: action },
  });

  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not update security alerts.");

  const status = ACTION_STATUS[action];
  const { error } = await db
    .from("alerts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", alertId);
  if (error) throw new Error(`ALERT_UPDATE_FAILED:${error.message}`);

  await db.from("alert_timeline").insert({
    alert_id: alertId,
    actor: `${ctx.displayName} (${ctx.roleLabel})`,
    action: `Marked as ${status}`,
    note,
  });

  return { status };
}

export interface OverviewMetrics {
  activeAlerts: number;
  auditEvents: number;
  blockedAttempts: number;
  anomalies: number;
  detectionDistribution: { type: string; count: number }[];
  activityByHour: { hour: string; success: number; denied: number; failed: number }[];
  recentAlerts: Alert[];
  recentSuspicious: { id: string; ts: string; username: string; action: string; result: string; reason: string | null; seq: number }[];
}

export async function overviewMetrics(ctx: SessionContext): Promise<OverviewMetrics> {
  requireSecurityRead(ctx);
  const labels = await userLabels();

  const { data: alertRows, error } = await db.from("alerts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:alerts:${error.message}`);
  const alerts = (alertRows as AlertRow[]).map((r) => mapAlert(r, labels));

  const { count: auditEvents } = await db.from("access_events").select("id", { count: "exact", head: true });
  const { count: blocked } = await db
    .from("access_events")
    .select("id", { count: "exact", head: true })
    .eq("result", "DENIED");

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recent } = await db
    .from("access_events")
    .select(EVENT_COLUMNS)
    .gte("ts", since)
    .order("ts", { ascending: false })
    .limit(600);
  const recentEvents = ((recent ?? []) as AccessEventRow[]).map(mapEvent);

  const buckets = new Map<string, { success: number; denied: number; failed: number }>();
  for (const e of recentEvents) {
    const key = `${e.timestamp.slice(11, 13)}:00`;
    const bucket = buckets.get(key) ?? { success: 0, denied: 0, failed: 0 };
    if (e.result === "SUCCESS") bucket.success += 1;
    else if (e.result === "DENIED") bucket.denied += 1;
    else bucket.failed += 1;
    buckets.set(key, bucket);
  }

  const distribution = new Map<string, number>();
  for (const a of alerts) for (const rule of a.ruleIds) distribution.set(rule, (distribution.get(rule) ?? 0) + 1);

  return {
    activeAlerts: alerts.filter((a) => a.status === "OPEN" || a.status === "INVESTIGATING").length,
    auditEvents: auditEvents ?? 0,
    blockedAttempts: blocked ?? 0,
    anomalies: alerts.filter((a) => (a.mlScore ?? 0) >= 0.6).length,
    detectionDistribution: [...distribution.entries()].map(([type, count]) => ({ type, count })),
    activityByHour: [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([hour, v]) => ({ hour, ...v })),
    recentAlerts: alerts.slice(0, 6),
    recentSuspicious: recentEvents
      .filter((e) => e.result !== "SUCCESS")
      .slice(0, 12)
      .map((e) => ({
        id: e.id,
        seq: e.seq,
        ts: e.timestamp,
        username: e.username ?? "unknown",
        action: e.action,
        result: e.result,
        reason: e.reasonCode,
      })),
  };
}
