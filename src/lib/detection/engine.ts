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

interface RuleFlags {
  brute: boolean;
  bulk: boolean;
  scope: boolean;
}

/** Returns true when the rule with the given id fired in this window. */
function isTriggered(rules: RuleTrigger[], ruleId: string): boolean {
  return rules.find((r) => r.ruleId === ruleId)?.triggered ?? false;
}

/** Picks the alert type from the fired rules. Benign context always wins. */
export function classifyAlertType(flags: RuleFlags, benign: boolean): AlertType {
  if (benign) return "BENIGN_HIGH_ACTIVITY";
  const triggeredCount = [flags.brute, flags.bulk, flags.scope].filter(Boolean).length;
  if (triggeredCount > 1) return "COMBINED_ATTACK";
  if (flags.brute) return "AUTH_BRUTE";
  if (flags.scope) return "ROLE_SCOPE_VIOLATION";
  if (flags.bulk) return "BULK_RECORD_ACCESS";
  return "BENIGN_HIGH_ACTIVITY";
}

/** Brute force and scope violations are HIGH; bulk access alone is MEDIUM. */
export function classifySeverity(flags: RuleFlags, benign: boolean): Severity {
  if (benign) return "BENIGN";
  if (flags.brute || flags.scope) return "HIGH";
  if (flags.bulk) return "MEDIUM";
  return "LOW";
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

  const flags: RuleFlags = {
    brute: isTriggered(rules, "AUTH_BRUTE"),
    bulk: isTriggered(rules, "BULK_RECORD_ACCESS"),
    scope: isTriggered(rules, "ROLE_SCOPE_VIOLATION"),
  };

  const legitimateContext =
    !flags.scope &&
    !flags.brute &&
    signals.allAccessesAssigned &&
    !signals.outsideWorkingHours &&
    signals.historicallyElevated;

  const risk = scoreRisk({
    authBrute: flags.brute,
    bulkAccess: flags.bulk,
    scopeViolation: flags.scope,
    mlScoreComponent: ml.anomalyScore,
    legitimateContext,
  });

  const benign = legitimateContext && !flags.brute && !flags.scope;

  const alertType = classifyAlertType(flags, benign);
  const severity = classifySeverity(flags, benign);

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