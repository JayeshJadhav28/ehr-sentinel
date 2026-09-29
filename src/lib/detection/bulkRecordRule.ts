import { DETECTION_CONFIG } from "@/lib/constants";
import type { AccessEvent } from "@/lib/types/audit";
import type { RuleTrigger } from "@/lib/types/alert";
import type { BehaviorProfile } from "@/lib/types/behavior";

export const BULK_RECORD_RULE_ID = "BULK_RECORD_ACCESS";

/** "Typical" range shown in evidence: 60%-140% of the user's average records/hour. */
const TYPICAL_LOW_FACTOR = 0.6;
const TYPICAL_HIGH_FACTOR = 1.4;
/** "Typical" range shown when the user has no behavior profile yet. */
const FALLBACK_TYPICAL_LOW = 6;
const FALLBACK_TYPICAL_HIGH = 12;

/**
 * records_returned > max(static_threshold, baseline_mean + sigma * baseline_std)
 * Prototype configuration values, not a security standard.
 */
export function bulkRecordRule(events: AccessEvent[], profile: BehaviorProfile | null, now: Date): RuleTrigger {
  const cfg = DETECTION_CONFIG.bulkAccess;
  const windowStart = now.getTime() - cfg.windowMinutes * 60_000;

  const accesses = events.filter(
    (e) =>
      (e.eventType === "RECORD_ACCESS" || e.eventType === "RECORD_SEARCH") &&
      e.result === "SUCCESS" &&
      new Date(e.timestamp).getTime() >= windowStart,
  );

  const observed = accesses.reduce((sum, e) => sum + e.recordsReturned, 0);

  const sparse = !profile || profile.sampleSize < cfg.minSampleSize;
  const statistical = profile ? profile.avgRecordsPerHour + cfg.sigma * (profile.stdRecordsPerAction || 1) : 0;
  const threshold = sparse ? cfg.sparseBaselineFallback : Math.max(cfg.sparseBaselineFallback, statistical);

  const typicalLow = profile
    ? Math.max(1, Math.round(profile.avgRecordsPerHour * TYPICAL_LOW_FACTOR))
    : FALLBACK_TYPICAL_LOW;
  const typicalHigh = profile
    ? Math.max(typicalLow + 1, Math.round(profile.avgRecordsPerHour * TYPICAL_HIGH_FACTOR))
    : FALLBACK_TYPICAL_HIGH;

  // Span between earliest and latest access (does not rely on event ordering).
  const accessTimes = accesses.map((e) => new Date(e.timestamp).getTime());
  const spanMinutes =
    accessTimes.length > 1
      ? Math.max(1, Math.round((Math.max(...accessTimes) - Math.min(...accessTimes)) / 60000))
      : 1;

  const ratio = profile && profile.avgRecordsPerHour > 0 ? observed / profile.avgRecordsPerHour : 0;
  const triggered = observed > threshold;

  return {
    ruleId: BULK_RECORD_RULE_ID,
    name: "Unusually large record retrieval",
    triggered,
    severity: triggered ? "MEDIUM" : "LOW",
    explanation: triggered
      ? `${observed} records were retrieved in ${spanMinutes} minute${spanMinutes === 1 ? "" : "s"}, compared with this user's typical ${typicalLow}\u2013${typicalHigh} records/hour. Threshold applied: ${Math.round(threshold)} records (${sparse ? "sparse-baseline fallback" : `baseline mean + ${cfg.sigma}\u03c3`}).`
      : `${observed} records retrieved in the last ${cfg.windowMinutes} minutes, within the applied threshold of ${Math.round(threshold)}.`,
    supportingEventIds: accesses.map((e) => e.id),
    comparison: {
      metric: "Records retrieved",
      observed: `${observed} records in ${spanMinutes} min`,
      expected: `Typical range: ${typicalLow}\u2013${typicalHigh} records/hour`,
      deviation: ratio > 0 ? `${ratio.toFixed(1)}x above recent baseline` : "No usable baseline",
    },
  };
}