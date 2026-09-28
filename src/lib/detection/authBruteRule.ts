import { DETECTION_CONFIG } from "@/lib/constants";
import type { AccessEvent } from "@/lib/types/audit";
import type { RuleTrigger } from "@/lib/types/alert";

export const AUTH_BRUTE_RULE_ID = "AUTH_BRUTE";

/** Repeated failed authentication for a single account inside a short window. */
export function authBruteRule(events: AccessEvent[], now: Date): RuleTrigger {
  const cfg = DETECTION_CONFIG.authBrute;
  const windowStart = now.getTime() - cfg.windowMinutes * 60_000;

  const failures = events.filter(
    (e) =>
      e.eventType === "AUTH" &&
      e.action === "LOGIN" &&
      e.result === "FAILURE" &&
      new Date(e.timestamp).getTime() >= windowStart,
  );

  const ips = new Set(failures.map((e) => e.sourceIp ?? "unknown"));
  const triggered = failures.length >= cfg.failureThreshold;
  const escalated = failures.length >= cfg.escalationFailures || ips.size >= cfg.escalationDistinctIps;

  const successAfter = events.some(
    (e) =>
      e.eventType === "AUTH" &&
      e.result === "SUCCESS" &&
      failures.length > 0 &&
      new Date(e.timestamp).getTime() > new Date(failures[0]!.timestamp).getTime(),
  );

  return {
    ruleId: AUTH_BRUTE_RULE_ID,
    name: "Repeated failed logins",
    triggered,
    severity: triggered ? "HIGH" : "LOW",
    explanation: triggered
      ? `${failures.length} failed authentication attempts were recorded for the same account within ${cfg.windowMinutes} minutes, from ${ips.size} source address${ips.size === 1 ? "" : "es"}.` +
        (successAfter ? " A successful login followed the failure burst." : " No successful login followed the burst.") +
        (escalated ? " Escalation condition met." : "")
      : `${failures.length} failed authentication attempts in the last ${cfg.windowMinutes} minutes (threshold ${cfg.failureThreshold}).`,
    supportingEventIds: failures.map((e) => e.id),
    comparison: {
      metric: "Failed logins in 5 minutes",
      observed: `${failures.length} failures`,
      expected: `< ${cfg.failureThreshold} failures`,
      deviation: `${ips.size} distinct source address${ips.size === 1 ? "" : "es"}`,
    },
  };
}
