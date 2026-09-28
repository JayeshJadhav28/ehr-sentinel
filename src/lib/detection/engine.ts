import type { AlertEvidence, AlertType, RuleTrigger, Severity } from "@/lib/types/alert";
import type { AccessEvent } from "@/lib/types/audit";
import type { BehaviorProfile } from "@/lib/types/behavior";
import { buildFeatures } from "@/lib/ml/features";
import { getAnomalyDetectionService } from "@/lib/ml/anomalyService";
import { authBruteRule } from "./authBruteRule";
import { bulkRecordRule } from "./bulkRecordRule";
import { scopeViolationRule } from "./scopeViolationRule";
import { buildContextSignals } from "./contextSignals";
import { buildEvidence } from "./evidenceBuilder";
import { scoreRisk, type RiskBreakdown } from "./riskScorer";

export interface DetectionInput {
  identity: AlertEvidence["identity"];
  windowEvents: AccessEvent[];
  historyEvents: AccessEvent[];
  profile: BehaviorProfile | null;
  now: Date;
}

export interface DetectionOutcome {
  rules: RuleTrigger[];
  risk: RiskBreakdown;
  severity: Severity;
  alertType: AlertType;
  evidence: AlertEvidence;
  benign: boolean;
  summary: string;
  mlScore: number;
}

/**
 * Access Event -> Feature Builder -> Rule Engine -> ML Engine ->
 * Risk/Evidence Correlator -> Alert
 */
export async function runDetection(input: DetectionInput): Promise<DetectionOutcome> {
  const { windowEvents, historyEvents, profile, now } = input;

  const rules: RuleTrigger[] = [
    authBruteRule(windowEvents, now),
    bulkRecordRule(windowEvents, profile, now),
    scopeViolationRule(windowEvents, now),
  ];

  const signals = buildContextSignals(windowEvents, historyEvents, profile);
  const features = buildFeatures(windowEvents, profile, signals, now);
  const ml = await getAnomalyDetectionService().score(features, profile ? "USER" : "GLOBAL");

  const brute = rules.find((r) => r.ruleId === "AUTH_BRUTE")?.triggered ?? false;
  const bulk = rules.find((r) => r.ruleId === "BULK_RECORD_ACCESS")?.triggered ?? false;
  const scope = rules.find((r) => r.ruleId === "ROLE_SCOPE_VIOLATION")?.triggered ?? false;

  const legitimateContext =
    !scope && !brute && signals.allAccessesAssigned && !signals.outsideWorkingHours && signals.historicallyElevated;

  const risk = scoreRisk({
    authBrute: brute,
    bulkAccess: bulk,
    scopeViolation: scope,
    mlScoreComponent: ml.anomalyScore,
    legitimateContext,
  });

  const benign = legitimateContext && !brute && !scope;

  let alertType: AlertType = "BENIGN_HIGH_ACTIVITY";
  const triggeredCount = [brute, bulk, scope].filter(Boolean).length;
  if (benign) alertType = "BENIGN_HIGH_ACTIVITY";
  else if (triggeredCount > 1) alertType = "COMBINED_ATTACK";
  else if (brute) alertType = "AUTH_BRUTE";
  else if (scope) alertType = "ROLE_SCOPE_VIOLATION";
  else if (bulk) alertType = "BULK_RECORD_ACCESS";

  let severity: Severity = "LOW";
  if (benign) severity = "BENIGN";
  else if (brute || scope) severity = "HIGH";
  else if (bulk) severity = "MEDIUM";

  const evidence = buildEvidence({
    identity: input.identity,
    windowEvents,
    rules,
    signals,
    profile,
    ml,
    benign,
  });

  const summary = benign
    ? `Benign high activity: ${input.identity.displayName} retrieved a high volume of records, all within assignment and shift context.`
    : evidence.narrative;

  return { rules, risk, severity, alertType, evidence, benign, summary, mlScore: ml.anomalyScore };
}
