import { authorize } from "@/lib/authz/authorize";
import type { ScenarioId, ScenarioRunResult } from "@/lib/types/scenario";
import { db } from "./db.server";
import { logAccessEvent, logManyAccessEvents, type AuditInput } from "./audit.server";
import { evaluateUser } from "./detection.server";
import { recomputeProfile } from "./behavior.server";
import type { SessionContext } from "./session.server";

const PHYSICIAN = "a0000000-0000-4000-8000-000000000001";
const EMERGENCY = "a0000000-0000-4000-8000-000000000006";
const CARDIOLOGY = "d0000000-0000-4000-8000-000000000001";
const EMERGENCY_DEPT = "d0000000-0000-4000-8000-000000000002";

/** Every tag a scenario (or the live replay log) can write under. */
const ALL_SCENARIO_TAGS = [
  "NORMAL",
  "BRUTE_FORCE",
  "BULK_ACCESS",
  "SCOPE_VIOLATION",
  "COMBINED_ATTACK",
  "BUSY_CLINICIAN",
  "LIVE",
] as const;

function patientId(index: number): string {
  return `b0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
/** Deterministic patient cohorts: departments were seeded round-robin. */
function cohort(offset: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => patientId(offset + i * 5));
}

function atUtcHour(hour: number, minute: number): Date {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  if (d.getTime() > Date.now()) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function iso(base: Date, offsetSeconds: number): string {
  return new Date(base.getTime() + offsetSeconds * 1000).toISOString();
}

async function resetScenario(tag: string): Promise<void> {
  await db.from("alerts").delete().eq("scenario_tag", tag);
  await db.from("access_events").delete().eq("scenario_tag", tag);
}

/** Shared authorization check for scenario replay / reset. */
function authorizeScenarioUpdate(ctx: SessionContext) {
  return authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "UPDATE",
    resourceType: "SCENARIO",
  });
}

interface Actor {
  userId: string;
  username: string;
  role: string;
  departmentId: string;
}

const PHYSICIAN_ACTOR: Actor = {
  userId: PHYSICIAN,
  username: "physician.demo",
  role: "PHYSICIAN",
  departmentId: CARDIOLOGY,
};
const EMERGENCY_ACTOR: Actor = {
  userId: EMERGENCY,
  username: "emergency.demo",
  role: "PHYSICIAN",
  departmentId: EMERGENCY_DEPT,
};

function accessEvent(
  actor: Actor,
  tag: string,
  sessionId: string,
  ts: string,
  targetId: string,
  records: number,
  ip: string,
): AuditInput {
  return {
    eventType: "RECORD_ACCESS",
    userId: actor.userId,
    username: actor.username,
    role: actor.role,
    departmentId: actor.departmentId,
    action: "VIEW",
    targetType: "PATIENT",
    targetId,
    result: "SUCCESS",
    recordsReturned: records,
    sourceIp: ip,
    sessionId,
    scenarioTag: tag,
    ts,
  };
}

function deniedEvent(
  actor: Actor,
  tag: string,
  sessionId: string,
  ts: string,
  targetId: string,
  ip: string,
): AuditInput {
  return {
    eventType: "AUTHZ",
    userId: actor.userId,
    username: actor.username,
    role: actor.role,
    departmentId: actor.departmentId,
    action: "VIEW",
    targetType: "PATIENT",
    targetId,
    result: "DENIED",
    reasonCode: "OUT_OF_DEPARTMENT_SCOPE",
    recordsReturned: 0,
    sourceIp: ip,
    sessionId,
    scenarioTag: tag,
    ts,
  };
}

function failedLogin(actor: Actor, tag: string, ts: string, ip: string): AuditInput {
  return {
    eventType: "AUTH",
    userId: actor.userId,
    username: actor.username,
    role: actor.role,
    action: "LOGIN",
    targetType: "SESSION",
    result: "FAILURE",
    reasonCode: "INVALID_CREDENTIALS",
    sourceIp: ip,
    scenarioTag: tag,
    ts,
  };
}

interface GeneratedScenario {
  events: AuditInput[];
  evaluationNow: Date;
  actorId: string;
  windowMinutes: number;
}

function generate(scenario: ScenarioId): GeneratedScenario {
  const tag = scenario;
  const sessionId = crypto.randomUUID();

  switch (scenario) {
    case "NORMAL": {
      const base = new Date(Date.now() - 60 * 60_000);
      const patients = cohort(1, 6);
      const events = patients.map((p, i) =>
        accessEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, i * 600), p, 6, "10.20.4.11"),
      );
      events.unshift({
        eventType: "AUTH",
        userId: PHYSICIAN,
        username: "physician.demo",
        role: "PHYSICIAN",
        action: "LOGIN",
        targetType: "SESSION",
        result: "SUCCESS",
        sourceIp: "10.20.4.11",
        sessionId,
        scenarioTag: tag,
        ts: iso(base, -60),
      });
      return { events, evaluationNow: new Date(base.getTime() + 6 * 600_000), actorId: PHYSICIAN, windowMinutes: 90 };
    }

    case "BRUTE_FORCE": {
      const base = new Date(Date.now() - 4 * 60_000);
      const ips = ["10.20.9.31", "10.20.9.32", "203.0.113.77"];
      const events = Array.from({ length: 7 }, (_, i) =>
        failedLogin(PHYSICIAN_ACTOR, tag, iso(base, i * 30), ips[i % 3] as string),
      );
      return { events, evaluationNow: new Date(base.getTime() + 7 * 30_000), actorId: PHYSICIAN, windowMinutes: 10 };
    }

    case "BULK_ACCESS": {
      const base = new Date(Date.now() - 5 * 60_000);
      const patients = cohort(1, 10);
      const events = Array.from({ length: 14 }, (_, i) =>
        accessEvent(
          PHYSICIAN_ACTOR,
          tag,
          sessionId,
          iso(base, i * 17),
          patients[i % patients.length] as string,
          3,
          "10.20.4.11",
        ),
      );
      return { events, evaluationNow: new Date(base.getTime() + 14 * 17_000), actorId: PHYSICIAN, windowMinutes: 30 };
    }

    case "SCOPE_VIOLATION": {
      const base = new Date(Date.now() - 6 * 60_000);
      const oncology = cohort(3, 3);
      const events: AuditInput[] = [
        accessEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, 0), patientId(1), 4, "10.20.4.11"),
        deniedEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, 60), oncology[0] as string, "10.20.4.11"),
        deniedEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, 120), oncology[1] as string, "10.20.4.11"),
      ];
      return { events, evaluationNow: new Date(base.getTime() + 180_000), actorId: PHYSICIAN, windowMinutes: 30 };
    }

    case "COMBINED_ATTACK": {
      const base = atUtcHour(2, 10);
      const ip = "203.0.113.44";
      const oncology = cohort(3, 10);
      const events: AuditInput[] = [];
      for (let i = 0; i < 5; i += 1) events.push(failedLogin(PHYSICIAN_ACTOR, tag, iso(base, i * 20), ip));
      events.push({
        eventType: "AUTH",
        userId: PHYSICIAN,
        username: "physician.demo",
        role: "PHYSICIAN",
        action: "LOGIN",
        targetType: "SESSION",
        result: "SUCCESS",
        sourceIp: ip,
        sessionId,
        scenarioTag: tag,
        ts: iso(base, 120),
      });
      for (let i = 0; i < 10; i += 1) {
        events.push(
          accessEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, 140 + i * 12), oncology[i] as string, 15, ip),
        );
      }
      for (let i = 0; i < 3; i += 1) {
        events.push(deniedEvent(PHYSICIAN_ACTOR, tag, sessionId, iso(base, 270 + i * 10), oncology[i] as string, ip));
      }
      return { events, evaluationNow: new Date(base.getTime() + 310_000), actorId: PHYSICIAN, windowMinutes: 30 };
    }

    case "BUSY_CLINICIAN":
    default: {
      const base = atUtcHour(14, 20);
      const patients = cohort(2, 10);
      const events = Array.from({ length: 15 }, (_, i) =>
        accessEvent(
          EMERGENCY_ACTOR,
          tag,
          sessionId,
          iso(base, i * 80),
          patients[i % patients.length] as string,
          3,
          "10.20.4.12",
        ),
      );
      return { events, evaluationNow: new Date(base.getTime() + 15 * 80_000), actorId: EMERGENCY, windowMinutes: 30 };
    }
  }
}

export async function replayScenario(ctx: SessionContext, scenario: ScenarioId): Promise<ScenarioRunResult> {
  const decision = authorizeScenarioUpdate(ctx);

  await logAccessEvent({
    eventType: "SCENARIO",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    action: "REPLAY",
    targetType: "SCENARIO",
    result: decision.allowed ? "SUCCESS" : "DENIED",
    reasonCode: decision.reasonCode,
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
    metadata: { scenario },
  });

  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not run scenario replays.");

  await resetScenario(scenario);

  const generated = generate(scenario);
  await logManyAccessEvents(generated.events);

  if (scenario === "NORMAL" || scenario === "BUSY_CLINICIAN") {
    await recomputeProfile(generated.actorId);
  }

  const alert = await evaluateUser({
    userId: generated.actorId,
    windowMinutes: generated.windowMinutes,
    scenarioTag: scenario,
    now: generated.evaluationNow,
  });

  const benignExplanation =
    scenario === "BUSY_CLINICIAN"
      ? [
          "all patients are assigned",
          "activity occurs during active shift",
          "role permits access",
          "historical emergency workload supports this behavior",
          "no scope violations detected",
        ]
      : null;

  const verdict = alert
    ? alert.benign
      ? "Benign high activity - no suspicious alert raised."
      : `${alert.type} raised at ${alert.severity} severity.`
    : "No alert. Activity stayed inside policy and baseline.";

  return {
    scenario,
    eventsCreated: generated.events.length,
    alertsCreated: alert ? [alert] : [],
    verdict,
    benignExplanation,
  };
}

export async function resetAllScenarios(ctx: SessionContext): Promise<void> {
  const decision = authorizeScenarioUpdate(ctx);
  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not reset demo state.");
  for (const tag of ALL_SCENARIO_TAGS) {
    await resetScenario(tag);
  }
  await logAccessEvent({
    eventType: "SCENARIO",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    action: "REPLAY",
    targetType: "SCENARIO",
    result: "SUCCESS",
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
    metadata: { scenario: "RESET_ALL" },
  });
}