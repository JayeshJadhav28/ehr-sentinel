import { DETECTION_CONFIG } from "@/lib/constants";
import type { ContextSignals } from "@/lib/detection/contextSignals";
import type { AccessEvent } from "@/lib/types/audit";
import type { BehavioralFeatures, BehaviorProfile } from "@/lib/types/behavior";

/**
 * Feature builder - schema `features-v1`.
 * The exact same feature vector is produced for the TypeScript development
 * adapter and for the Python Isolation Forest service adapter.
 */
export function buildFeatures(
  windowEvents: AccessEvent[],
  profile: BehaviorProfile | null,
  signals: ContextSignals,
  now: Date,
): BehavioralFeatures {
  const fiveMinAgo = now.getTime() - 5 * 60_000;
  const fifteenMinAgo = now.getTime() - 15 * 60_000;

  const failed5m = windowEvents.filter(
    (e) => e.eventType === "AUTH" && e.result === "FAILURE" && new Date(e.timestamp).getTime() >= fiveMinAgo,
  ).length;

  const records15m = windowEvents
    .filter((e) => e.result === "SUCCESS" && new Date(e.timestamp).getTime() >= fifteenMinAgo)
    .reduce((sum, e) => sum + e.recordsReturned, 0);

  const offScope1h = windowEvents.filter(
    (e) => e.result === "DENIED" && e.reasonCode === "OUT_OF_DEPARTMENT_SCOPE",
  ).length;

  const mean = profile?.avgRecordsPerAction ?? 0;
  const perAction = windowEvents.filter((e) => e.recordsReturned > 0);
  const observedMean = perAction.length
    ? perAction.reduce((s, e) => s + e.recordsReturned, 0) / perAction.length
    : 0;

  return {
    failed_logins_5m: failed5m,
    records_returned_15m: records15m,
    unique_patients_1h: signals.uniquePatients1h,
    off_scope_attempts_1h: offScope1h,
    after_hours_ratio: Number(signals.afterHoursRatio.toFixed(3)),
    department_change_rate: Number(signals.departmentChangeRate.toFixed(3)),
    records_vs_user_mean: mean > 0 ? Number((observedMean / mean).toFixed(3)) : 0,
    session_action_burst: Number(signals.sessionActionBurst.toFixed(3)),
    new_source_flag: signals.newSourceFlag ? 1 : 0,
  };
}

export const FEATURE_SCHEMA_VERSION = DETECTION_CONFIG.featureSchemaVersion;
