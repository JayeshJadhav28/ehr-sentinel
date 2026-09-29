import { DETECTION_CONFIG } from "@/lib/constants";
import type { AlertEvidence, RuleTrigger } from "@/lib/types/alert";
import type { AccessEvent } from "@/lib/types/audit";
import type { AnomalyResult, BehaviorProfile } from "@/lib/types/behavior";
import type { ContextSignals } from "./contextSignals";

export interface EvidenceInput {
  identity: AlertEvidence["identity"];
  windowEvents: AccessEvent[];
  rules: RuleTrigger[];
  signals: ContextSignals;
  profile: BehaviorProfile | null;
  ml: AnomalyResult | null;
  benign: boolean;
}

function hourLabel(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function buildEvidence(input: EvidenceInput): AlertEvidence {
  const events = [...input.windowEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const first = events[0];
  const last = events[events.length - 1];
  const triggered = input.rules.filter((r) => r.triggered);

  const totalRecords = events.filter((e) => e.result === "SUCCESS").reduce((s, e) => s + e.recordsReturned, 0);
  const denied = events.filter((e) => e.result === "DENIED").length;
  const failedLogins = events.filter((e) => e.eventType === "AUTH" && e.result === "FAILURE").length;

  const accessEventCount = events.filter((e) => e.eventType === "RECORD_ACCESS").length;

  const observed: string[] = [
    `${plural(totalRecords, "record")} retrieved across ${plural(accessEventCount, "access event")}.`,
    `${plural(input.signals.uniquePatients1h, "unique patient")} touched in the evaluation window.`,
  ];
  if (failedLogins) observed.push(`${plural(failedLogins, "failed authentication attempt")}.`);
  if (denied) observed.push(`${plural(denied, "request")} denied server-side by the authorization layer.`);
  if (input.signals.newSourceFlag) observed.push("Activity includes a source address not seen in recent history.");

  const expected: string[] = input.profile
    ? [
        `Baseline mean ${input.profile.avgRecordsPerAction} records per access event (sample size ${input.profile.sampleSize}).`,
        `Typical activity hours: ${input.profile.commonHours.length ? `${Math.min(...input.profile.commonHours)}:00\u2013${Math.max(...input.profile.commonHours)}:00 UTC` : "not established"}.`,
        `Baseline type: ${input.profile.baselineType} profile, model ${input.profile.modelVersion}.`,
      ]
    : ["No user baseline available; role/global fallback applied."];

  const policyContext: string[] = [
    `Working-hours configuration: ${DETECTION_CONFIG.workingHours.start}:00\u2013${DETECTION_CONFIG.workingHours.end}:00 UTC (prototype configuration).`,
    `Bulk-retrieval fallback threshold: ${DETECTION_CONFIG.bulkAccess.sparseBaselineFallback} records/request.`,
    `Brute-force rule: ${DETECTION_CONFIG.authBrute.failureThreshold} failures in ${DETECTION_CONFIG.authBrute.windowMinutes} minutes.`,
  ];

  const benignFactors: string[] = [];
  if (input.signals.allAccessesAssigned) benignFactors.push("All accessed patients are assigned to this clinician.");
  if (!input.signals.outsideWorkingHours) benignFactors.push("Activity occurs during the configured active shift window.");
  if (input.signals.deniedCount === 0) benignFactors.push("No scope violations detected.");
  if (input.signals.historicallyElevated) benignFactors.push("Historical workload for this user is already elevated.");
  if (input.rules.every((r) => r.ruleId !== "ROLE_SCOPE_VIOLATION" || !r.triggered))
    benignFactors.push("Role policy permits every request in this window.");

  const narrative = input.benign
    ? `High activity detected for ${input.identity.displayName}: ${totalRecords} records in the evaluation window. Context checks passed, so the activity is classified as benign high activity rather than a security concern.`
    : triggered.length
      ? triggered.map((r) => r.explanation).join(" ")
      : "No deterministic rule triggered in this window.";

  return {
    identity: input.identity,
    timeContext: {
      windowStart: first?.timestamp ?? new Date().toISOString(),
      windowEnd: last?.timestamp ?? new Date().toISOString(),
      localHourRange: first && last ? `${hourLabel(first.timestamp)}\u2013${hourLabel(last.timestamp)} UTC` : "n/a",
      withinShift: !input.signals.outsideWorkingHours,
    },
    observedBehavior: observed,
    expectedBehavior: expected,
    policyContext,
    triggeredRules: input.rules,
    mlSignal: input.ml,
    supportingEventIds: [...new Set(triggered.flatMap((r) => r.supportingEventIds))].slice(0, 40),
    benignFactors,
    narrative,
  };
}