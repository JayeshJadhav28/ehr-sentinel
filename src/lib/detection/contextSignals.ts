import { DETECTION_CONFIG } from "@/lib/constants";
import type { AccessEvent } from "@/lib/types/audit";
import type { BehaviorProfile } from "@/lib/types/behavior";

export interface ContextSignals {
  afterHoursRatio: number;
  outsideWorkingHours: boolean;
  departmentChangeRate: number;
  uniquePatients1h: number;
  newSourceFlag: boolean;
  sessionActionBurst: number;
  allAccessesAssigned: boolean;
  deniedCount: number;
  historicallyElevated: boolean;
}

/** Contextual signals. Supporting context only - never standalone proof. */
export function buildContextSignals(
  windowEvents: AccessEvent[],
  historyEvents: AccessEvent[],
  profile: BehaviorProfile | null,
): ContextSignals {
  const hours = DETECTION_CONFIG.workingHours;
  const accesses = windowEvents.filter((e) => e.eventType === "RECORD_ACCESS");

  const afterHours = accesses.filter((e) => {
    const h = new Date(e.timestamp).getUTCHours();
    return h < hours.start || h >= hours.end;
  });
  const afterHoursRatio = accesses.length ? afterHours.length / accesses.length : 0;

  const depts = new Set(accesses.map((e) => e.departmentId ?? "none"));
  const departmentChangeRate = accesses.length ? (depts.size - 1) / accesses.length : 0;

  const uniquePatients1h = new Set(
    accesses.filter((e) => e.targetType === "PATIENT" && e.targetId).map((e) => e.targetId as string),
  ).size;

  const knownIps = new Set(historyEvents.map((e) => e.sourceIp ?? "").filter(Boolean));
  const currentIps = windowEvents.map((e) => e.sourceIp ?? "").filter(Boolean);
  const newSourceFlag = currentIps.some((ip) => !knownIps.has(ip));

  const spanMinutes =
    windowEvents.length > 1
      ? Math.max(
          1,
          (new Date(windowEvents[windowEvents.length - 1]!.timestamp).getTime() -
            new Date(windowEvents[0]!.timestamp).getTime()) /
            60000,
        )
      : 1;
  const sessionActionBurst = windowEvents.length / spanMinutes;

  const deniedCount = windowEvents.filter((e) => e.result === "DENIED").length;
  const allAccessesAssigned = accesses.length > 0 && deniedCount === 0;

  const historicallyElevated = !!profile && profile.avgRecordsPerAction >= 14;

  return {
    afterHoursRatio,
    outsideWorkingHours: afterHoursRatio > 0.5,
    departmentChangeRate,
    uniquePatients1h,
    newSourceFlag,
    sessionActionBurst,
    allAccessesAssigned,
    deniedCount,
    historicallyElevated,
  };
}
