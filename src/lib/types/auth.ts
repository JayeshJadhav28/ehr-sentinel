/** Staff roles recognised by the RBAC policy. */
export type RoleName =
  | "PHYSICIAN"
  | "NURSE"
  | "SPECIALIST"
  | "SECURITY_REVIEWER"
  | "ADMINISTRATOR";

/** Actions that can be attempted against a resource. */
export type PermissionAction = "VIEW" | "SEARCH" | "UPDATE" | "EXPORT" | "LOGIN";

/** Kinds of resources that authorization decisions apply to. */
export type ResourceType =
  | "PATIENT"
  | "RECORD"
  | "SESSION"
  | "SECURITY_ALERT"
  | "AUDIT_EVENT"
  | "BEHAVIOR_PROFILE"
  | "AGGREGATE_ANALYTICS"
  | "SCENARIO";

/** A single action on a resource type. */
export interface Permission {
  action: PermissionAction;
  resourceType: ResourceType;
}

/** The authenticated user as exposed to the client (no internal fields such as source IP). */
export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: RoleName;
  roleLabel: string;
  /** Null for roles that are not tied to a department. */
  departmentId: string | null;
  departmentName: string | null;
  sessionId: string;
  /** ISO-8601 timestamp. */
  sessionExpiresAt: string;
}

/**
 * Result of an authorization check. `allowed` is true only when
 * roleOk, scopeOk and assignmentOk are all true.
 */
export interface AuthorizationDecision {
  allowed: boolean;
  roleOk: boolean;
  scopeOk: boolean;
  assignmentOk: boolean;
  /** Set when access is denied; null when allowed. */
  reasonCode: string | null;
  /** What the role policy allows. */
  policyStatement: string;
  /** What was actually attempted. */
  actualStatement: string;
}