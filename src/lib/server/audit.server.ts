import { db } from "./db.server";
import type { AccessAction, AccessEventType, AccessResult, AccessTargetType } from "@/lib/types/audit";

export interface AuditInput {
  eventType: AccessEventType;
  userId?: string | null;
  username?: string | null;
  role?: string | null;
  departmentId?: string | null;
  action: AccessAction;
  targetType?: AccessTargetType | null;
  targetId?: string | null;
  result: AccessResult;
  reasonCode?: string | null;
  recordsReturned?: number;
  sourceIp?: string | null;
  sessionId?: string | null;
  correlationId?: string;
  scenarioTag?: string | null;
  ts?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit writer. Never stores clinical record contents - only
 * identity, action, target reference, outcome and counters.
 */
export async function logAccessEvent(input: AuditInput): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await db.from("access_events").insert({
    id,
    ts: input.ts ?? new Date().toISOString(),
    event_type: input.eventType,
    user_id: input.userId ?? null,
    username: input.username ?? null,
    role: input.role ?? null,
    department_id: input.departmentId ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    result: input.result,
    reason_code: input.reasonCode ?? null,
    records_returned: input.recordsReturned ?? 0,
    source_ip: input.sourceIp ?? null,
    session_id: input.sessionId ?? null,
    correlation_id: input.correlationId ?? crypto.randomUUID(),
    scenario_tag: input.scenarioTag ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
  if (error) throw new Error(`AUDIT_WRITE_FAILED:${error.message}`);
  return id;
}

export async function logManyAccessEvents(inputs: AuditInput[]): Promise<string[]> {
  if (inputs.length === 0) return [];
  const rows = inputs.map((input) => ({
    id: crypto.randomUUID(),
    ts: input.ts ?? new Date().toISOString(),
    event_type: input.eventType,
    user_id: input.userId ?? null,
    username: input.username ?? null,
    role: input.role ?? null,
    department_id: input.departmentId ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    result: input.result,
    reason_code: input.reasonCode ?? null,
    records_returned: input.recordsReturned ?? 0,
    source_ip: input.sourceIp ?? null,
    session_id: input.sessionId ?? null,
    correlation_id: input.correlationId ?? crypto.randomUUID(),
    scenario_tag: input.scenarioTag ?? null,
    metadata: (input.metadata ?? {}) as never,
  }));
  const { error } = await db.from("access_events").insert(rows);
  if (error) throw new Error(`AUDIT_WRITE_FAILED:${error.message}`);
  return rows.map((r) => r.id);
}
