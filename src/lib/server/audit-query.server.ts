import { authorize } from "@/lib/authz/authorize";
import type { AccessEvent, AuditFilters } from "@/lib/types/audit";
import { db, EVENT_COLUMNS, mapEvent, type AccessEventRow } from "./db.server";
import type { SessionContext } from "./session.server";

export async function queryAuditEvents(ctx: SessionContext, filters: AuditFilters): Promise<AccessEvent[]> {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "AUDIT_EVENT",
  });
  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not read the audit log.");

  let builder = db.from("access_events").select(EVENT_COLUMNS);
  if (filters.username) builder = builder.eq("username", filters.username);
  if (filters.role) builder = builder.eq("role", filters.role);
  if (filters.eventType) builder = builder.eq("event_type", filters.eventType);
  if (filters.action) builder = builder.eq("action", filters.action);
  if (filters.result) builder = builder.eq("result", filters.result);
  if (filters.targetType) builder = builder.eq("target_type", filters.targetType);
  if (filters.from) builder = builder.gte("ts", filters.from);
  if (filters.to) builder = builder.lte("ts", filters.to);

  const { data, error } = await builder
    .order("ts", { ascending: false })
    .limit(Math.min(filters.limit ?? 200, 500));
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:access_events:${error.message}`);
  return (data as AccessEventRow[]).map(mapEvent);
}

export interface AdminAggregates {
  totalEvents: number;
  deniedEvents: number;
  failedLogins: number;
  alertsByType: { type: string; count: number }[];
  eventsByRole: { role: string; count: number }[];
  patientCount: number;
  userCount: number;
}

/** Administrator surface: aggregates only, never identifiable patient records. */
export async function adminAggregates(ctx: SessionContext): Promise<AdminAggregates> {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "AGGREGATE_ANALYTICS",
  });
  if (!decision.allowed) throw new Error("FORBIDDEN:Your role may not read aggregate analytics.");

  const { count: totalEvents } = await db.from("access_events").select("id", { count: "exact", head: true });
  const { count: deniedEvents } = await db
    .from("access_events")
    .select("id", { count: "exact", head: true })
    .eq("result", "DENIED");
  const { count: failedLogins } = await db
    .from("access_events")
    .select("id", { count: "exact", head: true })
    .eq("action", "LOGIN")
    .eq("result", "FAILURE");
  const { count: patientCount } = await db.from("patients").select("id", { count: "exact", head: true });
  const { count: userCount } = await db.from("users").select("id", { count: "exact", head: true });

  const { data: alerts } = await db.from("alerts").select("type");
  const typeMap = new Map<string, number>();
  for (const a of alerts ?? []) typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1);

  const { data: roleRows } = await db.from("access_events").select("role").limit(2000);
  const roleMap = new Map<string, number>();
  for (const r of roleRows ?? []) roleMap.set(r.role ?? "unknown", (roleMap.get(r.role ?? "unknown") ?? 0) + 1);

  return {
    totalEvents: totalEvents ?? 0,
    deniedEvents: deniedEvents ?? 0,
    failedLogins: failedLogins ?? 0,
    patientCount: patientCount ?? 0,
    userCount: userCount ?? 0,
    alertsByType: [...typeMap.entries()].map(([type, count]) => ({ type, count })),
    eventsByRole: [...roleMap.entries()].map(([role, count]) => ({ role, count })),
  };
}
