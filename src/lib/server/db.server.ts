import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AccessEvent, AccessEventType, AccessAction, AccessResult, AccessTargetType } from "@/lib/types/audit";

export const db = supabaseAdmin;

export interface AccessEventRow {
  id: string;
  seq: number;
  ts: string;
  event_type: string;
  user_id: string | null;
  username: string | null;
  role: string | null;
  department_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  result: string;
  reason_code: string | null;
  records_returned: number;
  source_ip: string | null;
  session_id: string | null;
  correlation_id: string;
  scenario_tag: string | null;
}

export function mapEvent(row: AccessEventRow): AccessEvent {
  return {
    id: row.id,
    seq: Number(row.seq),
    timestamp: row.ts,
    eventType: row.event_type as AccessEventType,
    userId: row.user_id,
    username: row.username,
    role: row.role,
    departmentId: row.department_id,
    action: row.action as AccessAction,
    targetType: row.target_type as AccessTargetType | null,
    targetId: row.target_id,
    result: row.result as AccessResult,
    reasonCode: row.reason_code,
    recordsReturned: row.records_returned,
    sourceIp: row.source_ip,
    sessionId: row.session_id,
    correlationId: row.correlation_id,
    scenarioTag: row.scenario_tag,
  };
}

export const EVENT_COLUMNS =
  "id,seq,ts,event_type,user_id,username,role,department_id,action,target_type,target_id,result,reason_code,records_returned,source_ip,session_id,correlation_id,scenario_tag";

/** Fails closed: any database/security-service failure must not imply access. */
export function assertDependency<T>(data: T | null, error: { message: string } | null, what: string): T {
  if (error || data === null) {
    throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:${what}:${error?.message ?? "no data"}`);
  }
  return data;
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
