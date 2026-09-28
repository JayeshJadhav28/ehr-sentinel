export type RoleName =
  | "PHYSICIAN"
  | "NURSE"
  | "SPECIALIST"
  | "SECURITY_REVIEWER"
  | "ADMINISTRATOR";

export type PermissionAction = "VIEW" | "SEARCH" | "UPDATE" | "EXPORT" | "LOGIN";

export type ResourceType =
  | "PATIENT"
  | "RECORD"
  | "SESSION"
  | "SECURITY_ALERT"
  | "AUDIT_EVENT"
  | "BEHAVIOR_PROFILE"
  | "AGGREGATE_ANALYTICS"
  | "SCENARIO";

export interface Permission {
  action: PermissionAction;
  resourceType: ResourceType;
}

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: RoleName;
  roleLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  sessionId: string;
  sessionExpiresAt: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  roleOk: boolean;
  scopeOk: boolean;
  assignmentOk: boolean;
  reasonCode: string | null;
  policyStatement: string;
  actualStatement: string;
}
