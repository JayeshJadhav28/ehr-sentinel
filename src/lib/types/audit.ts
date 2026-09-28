export type AccessEventType = "AUTH" | "AUTHZ" | "RECORD_ACCESS" | "RECORD_SEARCH" | "REVIEWER" | "SCENARIO";
export type AccessAction = "LOGIN" | "LOGOUT" | "VIEW" | "SEARCH" | "UPDATE" | "EXPORT" | "REPLAY";
export type AccessTargetType = "PATIENT" | "RECORD" | "SESSION" | "ALERT" | "SCENARIO";
export type AccessResult = "SUCCESS" | "DENIED" | "FAILURE";

/** Canonical audit event. Never contains clinical record contents. */
export interface AccessEvent {
  id: string;
  seq: number;
  timestamp: string;
  eventType: AccessEventType;
  userId: string | null;
  username: string | null;
  role: string | null;
  departmentId: string | null;
  action: AccessAction;
  targetType: AccessTargetType | null;
  targetId: string | null;
  targetLabel?: string | null;
  result: AccessResult;
  reasonCode: string | null;
  recordsReturned: number;
  sourceIp: string | null;
  sessionId: string | null;
  correlationId: string;
  scenarioTag: string | null;
}

export interface AuditFilters {
  username?: string;
  role?: string;
  eventType?: string;
  action?: string;
  result?: string;
  targetType?: string;
  from?: string;
  to?: string;
  limit?: number;
}
