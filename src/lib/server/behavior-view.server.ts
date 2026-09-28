import { authorize } from "@/lib/authz/authorize";
import { buildContextSignals } from "@/lib/detection/contextSignals";
import { buildFeatures } from "@/lib/ml/features";
import { getAnomalyDetectionService } from "@/lib/ml/anomalyService";
import type { BehaviorSnapshot } from "@/lib/types/behavior";
import { db } from "./db.server";
import { loadEvents, loadHistory, loadProfile } from "./behavior.server";
import type { SessionContext } from "./session.server";

export interface MonitoredUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  department: string | null;
}

function requireBehaviorRead(ctx: SessionContext) {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "BEHAVIOR_PROFILE",
  });
  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not read behavior profiles.");
}

export async function listMonitoredUsers(ctx: SessionContext): Promise<MonitoredUser[]> {
  requireBehaviorRead(ctx);
  const { data } = await db.from("users").select("id,username,display_name,role_id,department_id").order("username");
  const { data: roles } = await db.from("roles").select("id,label");
  const { data: depts } = await db.from("departments").select("id,name");
  const roleMap = new Map((roles ?? []).map((r) => [r.id, r.label]));
  const deptMap = new Map((depts ?? []).map((d) => [d.id, d.name]));
  return (data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: roleMap.get(u.role_id) ?? "Unknown",
    department: u.department_id ? (deptMap.get(u.department_id) ?? null) : null,
  }));
}

export async function behaviorSnapshot(ctx: SessionContext, userId: string): Promise<BehaviorSnapshot> {
  requireBehaviorRead(ctx);

  const now = new Date();
  const [profile, history, recent] = await Promise.all([
    loadProfile(userId),
    loadHistory(userId, 14),
    loadEvents(userId, 24 * 60, now, 1000),
  ]);

  const signals = buildContextSignals(recent, history, profile);
  const features = buildFeatures(recent, profile, signals, now);
  const ml = await getAnomalyDetectionService().score(features, profile ? profile.baselineType : "GLOBAL");

  // Peak volume inside any rolling 15-minute window over the last 24h.
  let peak = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const start = new Date(recent[i]!.timestamp).getTime();
    let sum = 0;
    for (let j = i; j < recent.length; j += 1) {
      if (new Date(recent[j]!.timestamp).getTime() - start > 15 * 60_000) break;
      sum += recent[j]!.recordsReturned;
    }
    if (sum > peak) peak = sum;
  }

  const baselineHours = new Map<number, number>();
  for (const e of history.filter((x) => x.recordsReturned > 0)) {
    const h = new Date(e.timestamp).getUTCHours();
    baselineHours.set(h, (baselineHours.get(h) ?? 0) + e.recordsReturned);
  }
  const currentHours = new Map<number, number>();
  for (const e of recent.filter((x) => x.recordsReturned > 0)) {
    const h = new Date(e.timestamp).getUTCHours();
    currentHours.set(h, (currentHours.get(h) ?? 0) + e.recordsReturned);
  }
  const days = 14;
  const hourHistogram = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    baseline: Number(((baselineHours.get(hour) ?? 0) / days).toFixed(1)),
    current: currentHours.get(hour) ?? 0,
  }));

  const { data: user } = await db.from("users").select("username,display_name,role_id").eq("id", userId).maybeSingle();
  const { data: role } = user ? await db.from("roles").select("name").eq("id", user.role_id).maybeSingle() : { data: null };

  return {
    profile:
      profile ??
      {
        userId,
        username: user?.username ?? "unknown",
        displayName: user?.display_name ?? "Unknown user",
        role: role?.name ?? "UNKNOWN",
        windowDays: 14,
        loginRate: 0,
        avgRecordsPerAction: 0,
        stdRecordsPerAction: 0,
        avgRecordsPerHour: 0,
        uniquePatientsPerSession: 0,
        commonHours: [],
        failedLoginRate: 0,
        sampleSize: 0,
        modelVersion: "demo-v1",
        baselineType: "GLOBAL",
      },
    current: {
      recordsLast24h: recent.reduce((s, e) => s + e.recordsReturned, 0),
      uniquePatients24h: new Set(recent.filter((e) => e.targetType === "PATIENT").map((e) => e.targetId)).size,
      failedLogins24h: recent.filter((e) => e.action === "LOGIN" && e.result === "FAILURE").length,
      deniedAttempts24h: recent.filter((e) => e.result === "DENIED").length,
      peakRecordsInWindow: peak,
      peakWindowMinutes: 15,
    },
    features,
    ml,
    hourHistogram,
  };
}
