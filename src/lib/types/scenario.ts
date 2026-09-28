export type ScenarioId =
  | "NORMAL"
  | "BRUTE_FORCE"
  | "BULK_ACCESS"
  | "SCOPE_VIOLATION"
  | "COMBINED_ATTACK"
  | "BUSY_CLINICIAN";

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  actor: string;
  description: string;
  expectation: string;
  expectedOutcome: "ALERT" | "NO_ALERT";
}

export interface ScenarioRunResult {
  scenario: ScenarioId;
  eventsCreated: number;
  alertsCreated: { id: string; type: string; severity: string; riskScore: number; summary: string }[];
  verdict: string;
  benignExplanation: string[] | null;
}
