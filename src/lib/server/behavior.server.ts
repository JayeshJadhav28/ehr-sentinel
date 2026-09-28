import { db, EVENT_COLUMNS, mapEvent, type AccessEventRow } from "./db.server";
import type { AccessEvent } from "@/lib/types/audit";
import type { BaselineType, BehaviorProfile } from "@/lib/types/behavior";

/** Activity tagged as benign; suspicious scenarios never update baselines. */
export const BENIGN_TAGS = ["BASELINE", "NORMAL", "BUSY_CLINICIAN", "LIVE"];

export async function loadEvents(
  userId: string,
  sinceMinutes: number,
  now: Date = new Date(),
  limit = 500,
): Promise<AccessEvent[]> {
  const since = new Date(now.getTime() - sinceMinutes * 60_000).toISOString();
  const { data, error } = await db
    .from("access_events")
    .select(EVENT_COLUMNS)
    .eq("user_id", userId)
    .gte("ts", since)
    .lte("ts", now.toISOString())
    .order("ts", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:access_events:${error.message}`);
  return (data as AccessEventRow[]).map(mapEvent);
}

export async function loadHistory(userId: string, days = 14): Promise<AccessEvent[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await db
    .from("access_events")
    .select(EVENT_COLUMNS)
    .eq("user_id", userId)
    .in("scenario_tag", BENIGN_TAGS)
    .gte("ts", since)
    .order("ts", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:access_events:${error.message}`);
  return (data as AccessEventRow[]).map(mapEvent);
}

interface UserMeta {
  id: string;
  username: string;
  display_name: string;
  role_id: string;
}

export async function loadProfile(userId: string): Promise<BehaviorProfile | null> {
  const { data: row } = await db.from("behavior_profiles").select("*").eq("user_id", userId).maybeSingle();
  const { data: user } = await db
    .from("users")
    .select("id,username,display_name,role_id")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return null;
  const meta = user as UserMeta;
  const { data: role } = await db.from("roles").select("name").eq("id", meta.role_id).maybeSingle();

  if (!row) return null;

  const baselineType: BaselineType = row.sample_size >= 12 ? "USER" : "ROLE";

  return {
    userId,
    username: meta.username,
    displayName: meta.display_name,
    role: role?.name ?? "UNKNOWN",
    windowDays: row.window_days,
    loginRate: Number(row.login_rate),
    avgRecordsPerAction: Number(row.avg_records_per_action),
    stdRecordsPerAction: Number(row.std_records_per_action),
    avgRecordsPerHour: Number(row.avg_records_per_hour),
    uniquePatientsPerSession: Number(row.unique_patients_per_session),
    commonHours: row.common_hours ?? [],
    failedLoginRate: Number(row.failed_login_rate),
    sampleSize: row.sample_size,
    modelVersion: row.model_version,
    baselineType,
  };
}

/** Recomputes a user baseline from benign activity only. */
export async function recomputeProfile(userId: string): Promise<void> {
  const history = await loadHistory(userId, 14);
  const accesses = history.filter((e) => e.recordsReturned > 0);
  if (accesses.length === 0) return;

  const values = accesses.map((e) => e.recordsReturned);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, values.length - 1);
  const hours = [...new Set(accesses.map((e) => new Date(e.timestamp).getUTCHours()))].sort((a, b) => a - b);
  const hourBuckets = new Set(accesses.map((e) => e.timestamp.slice(0, 13)));
  const logins = history.filter((e) => e.action === "LOGIN" && e.result === "SUCCESS").length;
  const failed = history.filter((e) => e.action === "LOGIN" && e.result === "FAILURE").length;
  const sessions = new Set(history.map((e) => e.sessionId ?? "none"));
  const patients = new Set(history.filter((e) => e.targetType === "PATIENT").map((e) => e.targetId));

  await db.from("behavior_profiles").upsert({
    user_id: userId,
    window_days: 14,
    login_rate: Number((logins / 14).toFixed(2)),
    avg_records_per_action: Number(mean.toFixed(2)),
    std_records_per_action: Number(Math.sqrt(variance).toFixed(2)),
    avg_records_per_hour: Number((values.reduce((a, b) => a + b, 0) / Math.max(1, hourBuckets.size)).toFixed(2)),
    unique_patients_per_session: Number((patients.size / Math.max(1, sessions.size)).toFixed(2)),
    dept_entropy: 0,
    common_hours: hours,
    failed_login_rate: Number((failed / 14).toFixed(2)),
    sample_size: accesses.length,
    model_version: "demo-v1",
    updated_at: new Date().toISOString(),
  });
}
