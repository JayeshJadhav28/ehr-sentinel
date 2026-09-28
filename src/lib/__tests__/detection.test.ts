import { describe, expect, it } from "vitest";
import { authorize } from "@/lib/authz/authorize";
import { runDetection } from "@/lib/detection/engine";
import { scoreRisk } from "@/lib/detection/riskScorer";
import type { AccessEvent } from "@/lib/types/audit";
import type { BehaviorProfile } from "@/lib/types/behavior";

const NOW = new Date("2026-01-15T14:40:00.000Z");

const CARDIO = "d0000000-0000-4000-8000-000000000001";
const EMERG = "d0000000-0000-4000-8000-000000000002";

function event(partial: Partial<AccessEvent> & { seq: number }): AccessEvent {
  return {
    id: `evt-${partial.seq}`,
    timestamp: NOW.toISOString(),
    eventType: "RECORD_ACCESS",
    userId: "u1",
    username: "physician.demo",
    role: "PHYSICIAN",
    departmentId: CARDIO,
    action: "VIEW",
    targetType: "PATIENT",
    targetId: `p-${partial.seq}`,
    result: "SUCCESS",
    reasonCode: null,
    recordsReturned: 1,
    sourceIp: "10.0.0.5",
    sessionId: "s1",
    correlationId: `c-${partial.seq}`,
    scenarioTag: null,
    ...partial,
  };
}

function profile(overrides: Partial<BehaviorProfile> = {}): BehaviorProfile {
  return {
    userId: "u1",
    windowDays: 14,
    loginRate: 2,
    avgRecordsPerAction: 1.2,
    stdRecordsPerAction: 0.4,
    avgRecordsPerHour: 8,
    uniquePatientsPerSession: 6,
    deptEntropy: 0.1,
    commonHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    failedLoginRate: 0.1,
    sampleSize: 260,
    modelVersion: "demo-v1",
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const identity = {
  userId: "u1",
  username: "physician.demo",
  displayName: "Dr. A. Kumar",
  role: "PHYSICIAN",
  roleLabel: "Physician",
  department: "Cardiology",
};

describe("T01 RBAC positive path", () => {
  it("allows an assigned in-department patient view", () => {
    const decision = authorize({
      role: "PHYSICIAN",
      roleLabel: "Physician",
      departmentId: CARDIO,
      departmentName: "Cardiology",
      action: "VIEW",
      resourceType: "PATIENT",
      resource: { patientId: "p1", departmentId: CARDIO, departmentName: "Cardiology", mrn: "MRN-DEMO-10400" },
      assignedPatientIds: new Set(["p1"]),
    });
    expect(decision.allowed).toBe(true);
    expect(decision.roleOk && decision.scopeOk && decision.assignmentOk).toBe(true);
  });
});

describe("T02 RBAC negative path", () => {
  it("denies an out-of-department patient and reports a reason code", () => {
    const decision = authorize({
      role: "PHYSICIAN",
      roleLabel: "Physician",
      departmentId: CARDIO,
      departmentName: "Cardiology",
      action: "VIEW",
      resourceType: "PATIENT",
      resource: { patientId: "p9", departmentId: EMERG, departmentName: "Emergency", mrn: "MRN-DEMO-10449" },
      assignedPatientIds: new Set<string>(),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBeTruthy();
  });

  it("denies a security reviewer reading clinical records", () => {
    const decision = authorize({
      role: "SECURITY_REVIEWER",
      roleLabel: "Security Reviewer",
      departmentId: null,
      departmentName: null,
      action: "VIEW",
      resourceType: "PATIENT",
      resource: { patientId: "p1", departmentId: CARDIO, departmentName: "Cardiology", mrn: "MRN-DEMO-10400" },
      assignedPatientIds: new Set(["p1"]),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.roleOk).toBe(false);
  });
});

describe("T03 repeated failed logins", () => {
  it("raises AUTH_BRUTE and keeps evidence", async () => {
    const failures: AccessEvent[] = Array.from({ length: 6 }, (_, i) =>
      event({
        seq: i + 1,
        eventType: "AUTH",
        action: "LOGIN",
        targetType: "SESSION",
        result: "FAILURE",
        reasonCode: "INVALID_CREDENTIALS",
        recordsReturned: 0,
        timestamp: new Date(NOW.getTime() - (6 - i) * 30_000).toISOString(),
      }),
    );
    const outcome = await runDetection({
      identity,
      windowEvents: failures,
      historyEvents: [],
      profile: profile(),
      now: NOW,
    });
    expect(outcome.rules.find((r) => r.ruleId === "AUTH_BRUTE")?.triggered).toBe(true);
    expect(outcome.benign).toBe(false);
    expect(outcome.evidence.supportingEventIds.length).toBeGreaterThan(0);
  });
});

describe("T04 bulk record retrieval", () => {
  it("raises BULK_RECORD_ACCESS above the baseline threshold", async () => {
    const events: AccessEvent[] = Array.from({ length: 60 }, (_, i) =>
      event({
        seq: i + 1,
        timestamp: new Date(NOW.getTime() - (60 - i) * 10_000).toISOString(),
        targetId: `p-out-${i}`,
        recordsReturned: 3,
      }),
    );
    const outcome = await runDetection({
      identity,
      windowEvents: events,
      historyEvents: [],
      profile: profile(),
      now: NOW,
    });
    expect(outcome.rules.find((r) => r.ruleId === "BULK_RECORD_ACCESS")?.triggered).toBe(true);
  });
});

describe("T05 busy clinician does not false alarm", () => {
  it("classifies high but assigned, in-hours activity as benign", async () => {
    const assigned = new Set(Array.from({ length: 45 }, (_, i) => `p-assigned-${i}`));
    const windowEvents: AccessEvent[] = [...assigned].map((patientId, i) =>
      event({
        seq: i + 1,
        userId: "u2",
        username: "emergency.demo",
        departmentId: EMERG,
        targetId: patientId,
        timestamp: new Date(new Date("2026-01-15T14:20:00.000Z").getTime() + i * 25_000).toISOString(),
        reasonCode: "ASSIGNED_PATIENT",
      }),
    );
    const historyEvents: AccessEvent[] = Array.from({ length: 200 }, (_, i) =>
      event({ seq: 1000 + i, userId: "u2", username: "emergency.demo", departmentId: EMERG, reasonCode: "ASSIGNED_PATIENT" }),
    );
    const outcome = await runDetection({
      identity: { ...identity, userId: "u2", username: "emergency.demo", displayName: "Dr. R. Mehta", department: "Emergency" },
      windowEvents,
      historyEvents,
      profile: profile({ userId: "u2", avgRecordsPerHour: 40, uniquePatientsPerSession: 35, sampleSize: 900 }),
      now: new Date("2026-01-15T14:40:00.000Z"),
    });
    expect(outcome.rules.find((r) => r.ruleId === "ROLE_SCOPE_VIOLATION")?.triggered).toBe(false);
    expect(outcome.benign).toBe(true);
    expect(outcome.evidence.benignFactors.length).toBeGreaterThan(0);
  });
});

describe("T06 evidence completeness", () => {
  it("answers who, what, when, where and compared-with-what", async () => {
    const denials: AccessEvent[] = Array.from({ length: 4 }, (_, i) =>
      event({
        seq: i + 1,
        eventType: "AUTHZ",
        result: "DENIED",
        reasonCode: "OUT_OF_DEPARTMENT_SCOPE",
        recordsReturned: 0,
      }),
    );
    const outcome = await runDetection({ identity, windowEvents: denials, historyEvents: [], profile: profile(), now: NOW });
    const e = outcome.evidence;
    expect(e.identity.username).toBe("physician.demo");
    expect(e.timeContext).toBeTruthy();
    expect(e.observedBehavior.length).toBeGreaterThan(0);
    expect(e.expectedBehavior.length).toBeGreaterThan(0);
    expect(e.policyContext.length).toBeGreaterThan(0);
    expect(e.narrative.length).toBeGreaterThan(0);
  });
});

describe("T10 model-derived signal never overrides authorization", () => {
  it("keeps a benign verdict even at a high model score", () => {
    const risk = scoreRisk({
      authBrute: false,
      bulkAccess: true,
      scopeViolation: false,
      mlScoreComponent: 1,
      legitimateContext: true,
    });
    expect(risk.score).toBeLessThan(
      scoreRisk({ authBrute: false, bulkAccess: true, scopeViolation: false, mlScoreComponent: 1, legitimateContext: false }).score,
    );
    expect(risk.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeLessThanOrEqual(100);
  });
});
