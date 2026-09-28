import { authorize } from "@/lib/authz/authorize";
import { runDetection } from "@/lib/detection/engine";
import type { AccessEvent } from "@/lib/types/audit";
import type { BehaviorProfile } from "@/lib/types/behavior";
import type { SessionContext } from "./session.server";

/**
 * Model / rule evaluation over labelled synthetic fixtures.
 * All metrics below are computed at request time from these fixtures -
 * no performance number is hard-coded.
 */

interface Fixture {
  name: string;
  malicious: boolean;
  events: AccessEvent[];
}

const PROFILE: BehaviorProfile = {
  userId: "fixture",
  username: "fixture.user",
  displayName: "Fixture User",
  role: "PHYSICIAN",
  windowDays: 14,
  loginRate: 1,
  avgRecordsPerAction: 8,
  stdRecordsPerAction: 2,
  avgRecordsPerHour: 9,
  uniquePatientsPerSession: 4,
  commonHours: [8, 9, 10, 11, 12, 13, 14, 15, 16],
  failedLoginRate: 0.1,
  sampleSize: 84,
  modelVersion: "demo-v1",
  baselineType: "USER",
};

let counter = 0;
function evt(partial: Partial<AccessEvent>): AccessEvent {
  counter += 1;
  return {
    id: `fixture-${counter}`,
    seq: counter,
    timestamp: new Date().toISOString(),
    eventType: "RECORD_ACCESS",
    userId: "fixture",
    username: "fixture.user",
    role: "PHYSICIAN",
    departmentId: "dept-1",
    action: "VIEW",
    targetType: "PATIENT",
    targetId: `patient-${counter % 12}`,
    result: "SUCCESS",
    reasonCode: null,
    recordsReturned: 0,
    sourceIp: "10.20.4.11",
    sessionId: "session-1",
    correlationId: "corr-1",
    scenarioTag: "FIXTURE",
    ...partial,
  };
}

function buildFixtures(now: Date): Fixture[] {
  const t = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000).toISOString();

  const normal = (n: number, records: number): AccessEvent[] =>
    Array.from({ length: n }, (_, i) => evt({ timestamp: t(3000 - i * 180), recordsReturned: records }));

  return [
    { name: "normal_light", malicious: false, events: normal(4, 6) },
    { name: "normal_moderate", malicious: false, events: normal(6, 7) },
    { name: "normal_rounds", malicious: false, events: normal(5, 8) },
    {
      name: "busy_clinician",
      malicious: false,
      events: Array.from({ length: 15 }, (_, i) => evt({ timestamp: t(1200 - i * 70), recordsReturned: 3 })),
    },
    {
      name: "brute_force",
      malicious: true,
      events: Array.from({ length: 7 }, (_, i) =>
        evt({
          timestamp: t(200 - i * 20),
          eventType: "AUTH",
          action: "LOGIN",
          result: "FAILURE",
          reasonCode: "INVALID_CREDENTIALS",
          sourceIp: `203.0.113.${10 + (i % 3)}`,
          recordsReturned: 0,
        }),
      ),
    },
    {
      name: "bulk_access",
      malicious: true,
      events: Array.from({ length: 14 }, (_, i) => evt({ timestamp: t(240 - i * 15), recordsReturned: 3 })),
    },
    {
      name: "scope_violation",
      malicious: true,
      events: [
        evt({ timestamp: t(300), recordsReturned: 4 }),
        evt({ timestamp: t(240), eventType: "AUTHZ", result: "DENIED", reasonCode: "OUT_OF_DEPARTMENT_SCOPE" }),
        evt({ timestamp: t(180), eventType: "AUTHZ", result: "DENIED", reasonCode: "OUT_OF_DEPARTMENT_SCOPE" }),
      ],
    },
    {
      name: "combined_attack",
      malicious: true,
      events: [
        ...Array.from({ length: 5 }, (_, i) =>
          evt({
            timestamp: t(600 - i * 20),
            eventType: "AUTH",
            action: "LOGIN",
            result: "FAILURE",
            sourceIp: "203.0.113.44",
          }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          evt({ timestamp: t(400 - i * 12), recordsReturned: 15, sourceIp: "203.0.113.44" }),
        ),
        evt({ timestamp: t(120, ), eventType: "AUTHZ", result: "DENIED", reasonCode: "OUT_OF_DEPARTMENT_SCOPE" }),
      ],
    },
  ];
}

export interface EvaluationRow {
  fixture: string;
  labelled: "MALICIOUS" | "BENIGN";
  rulesOnly: boolean;
  rulesPlusMl: boolean;
  mlScore: number;
  detectionLatencyMs: number;
  explanationComplete: boolean;
}

export interface EvaluationReport {
  rows: EvaluationRow[];
  rulesOnly: { precision: number; recall: number; falsePositiveRate: number };
  rulesPlusMl: { precision: number; recall: number; falsePositiveRate: number };
  meanLatencyMs: number;
  explanationCompleteness: number;
  featureSchema: string;
  modelVersion: string;
  adapter: string;
}

function metrics(rows: EvaluationRow[], key: "rulesOnly" | "rulesPlusMl") {
  const tp = rows.filter((r) => r.labelled === "MALICIOUS" && r[key]).length;
  const fp = rows.filter((r) => r.labelled === "BENIGN" && r[key]).length;
  const fn = rows.filter((r) => r.labelled === "MALICIOUS" && !r[key]).length;
  const tn = rows.filter((r) => r.labelled === "BENIGN" && !r[key]).length;
  return {
    precision: tp + fp === 0 ? 0 : Number((tp / (tp + fp)).toFixed(3)),
    recall: tp + fn === 0 ? 0 : Number((tp / (tp + fn)).toFixed(3)),
    falsePositiveRate: fp + tn === 0 ? 0 : Number((fp / (fp + tn)).toFixed(3)),
  };
}

export async function evaluateModel(ctx: SessionContext): Promise<EvaluationReport> {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "BEHAVIOR_PROFILE",
  });
  const adminDecision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "AGGREGATE_ANALYTICS",
  });
  if (!decision.allowed && !adminDecision.allowed) {
    throw new Error("FORBIDDEN:Your role may not read the evaluation report.");
  }

  const now = new Date();
  const rows: EvaluationRow[] = [];
  let adapter = "isolation-forest-ts";

  for (const fixture of buildFixtures(now)) {
    const started = Date.now();
    const outcome = await runDetection({
      identity: {
        userId: "fixture",
        username: "fixture.user",
        displayName: "Fixture User",
        role: "Physician",
        department: "Cardiology",
      },
      windowEvents: fixture.events,
      historyEvents: [],
      profile: PROFILE,
      now,
    });
    const latency = Date.now() - started;
    adapter = outcome.evidence.mlSignal?.adapter ?? adapter;

    const rulesOnly = outcome.rules.some((r) => r.triggered) && !outcome.benign;
    const rulesPlusMl = rulesOnly || (outcome.mlScore >= 0.62 && !outcome.benign);

    rows.push({
      fixture: fixture.name,
      labelled: fixture.malicious ? "MALICIOUS" : "BENIGN",
      rulesOnly,
      rulesPlusMl,
      mlScore: outcome.mlScore,
      detectionLatencyMs: latency,
      explanationComplete:
        outcome.evidence.observedBehavior.length > 0 &&
        outcome.evidence.expectedBehavior.length > 0 &&
        outcome.evidence.narrative.length > 0,
    });
  }

  return {
    rows,
    rulesOnly: metrics(rows, "rulesOnly"),
    rulesPlusMl: metrics(rows, "rulesPlusMl"),
    meanLatencyMs: Number((rows.reduce((s, r) => s + r.detectionLatencyMs, 0) / rows.length).toFixed(1)),
    explanationCompleteness: Number(
      (rows.filter((r) => r.explanationComplete).length / rows.length).toFixed(3),
    ),
    featureSchema: "features-v1",
    modelVersion: "demo-v1",
    adapter,
  };
}
