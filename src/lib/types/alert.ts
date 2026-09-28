import type { AccessEvent } from "./audit";
import type { AnomalyResult } from "./behavior";

export type AlertType =
  | "AUTH_BRUTE"
  | "BULK_RECORD_ACCESS"
  | "ROLE_SCOPE_VIOLATION"
  | "COMBINED_ATTACK"
  | "BENIGN_HIGH_ACTIVITY";

export type Severity = "HIGH" | "MEDIUM" | "LOW" | "BENIGN";

export type AlertStatus = "OPEN" | "INVESTIGATING" | "DISMISSED" | "ESCALATED" | "RESOLVED";

export type ReviewerAction = "INVESTIGATE" | "DISMISS" | "ESCALATE" | "RESOLVE" | "OPEN";

export interface ObservedExpected {
  metric: string;
  observed: string;
  expected: string;
  deviation: string;
}

export interface RuleTrigger {
  ruleId: string;
  name: string;
  triggered: boolean;
  severity: Severity;
  explanation: string;
  supportingEventIds: string[];
  comparison?: ObservedExpected;
}

export interface AlertEvidence {
  identity: { userId: string | null; username: string; displayName: string; role: string; department: string };
  timeContext: { windowStart: string; windowEnd: string; localHourRange: string; withinShift: boolean };
  observedBehavior: string[];
  expectedBehavior: string[];
  policyContext: string[];
  triggeredRules: RuleTrigger[];
  mlSignal: AnomalyResult | null;
  supportingEventIds: string[];
  benignFactors: string[];
  narrative: string;
}

export interface Alert {
  id: string;
  createdAt: string;
  type: AlertType;
  severity: Severity;
  userId: string | null;
  username: string;
  displayName: string;
  status: AlertStatus;
  ruleIds: string[];
  riskScore: number;
  mlScore: number | null;
  summary: string;
  evidence: AlertEvidence;
  scenarioTag: string | null;
}

export interface AlertTimelineEntry {
  id: string;
  ts: string;
  actor: string | null;
  action: string;
  note: string | null;
}

export interface AlertDetail extends Alert {
  supportingEvents: AccessEvent[];
  timeline: AlertTimelineEntry[];
}
