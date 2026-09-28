import type { AccessEvent } from "@/lib/types/audit";
import type { RuleTrigger } from "@/lib/types/alert";

export const SCOPE_VIOLATION_RULE_ID = "ROLE_SCOPE_VIOLATION";

/** Explicit policy denials recorded by the server-side authorization layer. */
export function scopeViolationRule(events: AccessEvent[], now: Date, windowMinutes = 60): RuleTrigger {
  const windowStart = now.getTime() - windowMinutes * 60_000;

  const denials = events.filter(
    (e) => e.result === "DENIED" && new Date(e.timestamp).getTime() >= windowStart,
  );

  const explicitPolicy = denials.filter(
    (e) => e.reasonCode === "ROLE_POLICY_DENIED" || e.reasonCode === "OUT_OF_DEPARTMENT_SCOPE",
  );

  const triggered = denials.length > 0;

  return {
    ruleId: SCOPE_VIOLATION_RULE_ID,
    name: "Role / scope violation",
    triggered,
    severity: explicitPolicy.length > 0 ? "HIGH" : triggered ? "MEDIUM" : "LOW",
    explanation: triggered
      ? `${denials.length} access request${denials.length === 1 ? " was" : "s were"} denied server-side in the last ${windowMinutes} minutes. Reasons: ${[...new Set(denials.map((d) => d.reasonCode ?? "UNKNOWN"))].join(", ")}.`
      : "No denied access requests recorded in the evaluation window.",
    supportingEventIds: denials.map((e) => e.id),
    comparison: {
      metric: "Denied access requests",
      observed: `${denials.length} denied`,
      expected: "0 denied requests",
      deviation: explicitPolicy.length > 0 ? "Explicit policy denial" : "Contextual deviation",
    },
  };
}
