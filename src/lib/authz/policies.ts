import type { PermissionAction, ResourceType, RoleName } from "@/lib/types/auth";

/**
 * Structured RBAC policy. Roles never appear as ad-hoc `if (role === ...)`
 * checks inside components or route handlers - every decision resolves here.
 */
export const ROLE_POLICY: Record<RoleName, { resource: ResourceType; actions: PermissionAction[] }[]> = {
  // Clinical roles: read-only access to patients and their records.
  PHYSICIAN: [
    { resource: "PATIENT", actions: ["VIEW", "SEARCH"] },
    { resource: "RECORD", actions: ["VIEW"] },
  ],
  NURSE: [
    { resource: "PATIENT", actions: ["VIEW", "SEARCH"] },
    { resource: "RECORD", actions: ["VIEW"] },
  ],
  SPECIALIST: [
    { resource: "PATIENT", actions: ["VIEW", "SEARCH"] },
    { resource: "RECORD", actions: ["VIEW"] },
  ],
  // Security domain only: no clinical content.
  SECURITY_REVIEWER: [
    { resource: "SECURITY_ALERT", actions: ["VIEW", "UPDATE"] },
    { resource: "AUDIT_EVENT", actions: ["VIEW", "SEARCH"] },
    { resource: "BEHAVIOR_PROFILE", actions: ["VIEW"] },
    { resource: "SCENARIO", actions: ["UPDATE"] },
  ],
  // System-level only: no individual patient records.
  ADMINISTRATOR: [
    { resource: "AGGREGATE_ANALYTICS", actions: ["VIEW"] },
    { resource: "AUDIT_EVENT", actions: ["VIEW", "SEARCH"] },
    { resource: "SCENARIO", actions: ["UPDATE"] },
  ],
};

/** What each role is allowed to access (shown in policy statements). */
export const ROLE_SCOPE_LABEL: Record<RoleName, string> = {
  PHYSICIAN: "Assigned patients within the physician's department",
  NURSE: "Assigned ward / care team",
  SPECIALIST: "Assigned specialty and referred patients",
  SECURITY_REVIEWER: "Security domain only (alerts, audit events, evidence)",
  ADMINISTRATOR: "Aggregate and system-level information only",
};

/** What each role is explicitly not allowed to access. */
export const ROLE_DENIED_LABEL: Record<RoleName, string> = {
  PHYSICIAN: "Unassigned patients, security administration",
  NURSE: "Administrative analytics, unrelated departments",
  SPECIALIST: "Unrelated patient populations",
  SECURITY_REVIEWER: "Arbitrary clinical content",
  ADMINISTRATOR: "Individual identifiable patient records",
};

/** Returns true if the role policy permits `action` on `resource`. */
export function rolePolicyAllows(role: RoleName, action: PermissionAction, resource: ResourceType): boolean {
  return ROLE_POLICY[role].some((p) => p.resource === resource && p.actions.includes(action));
}

/** Roles that may read clinical resources at all. */
export function isClinicalRole(role: RoleName): boolean {
  return role === "PHYSICIAN" || role === "NURSE" || role === "SPECIALIST";
}

/** UI navigation visibility only; this is not a security boundary (the server enforces access). */
export function canSeeNav(role: RoleName, resource: string): boolean {
  switch (resource) {
    case "OVERVIEW":
      return true;
    case "PATIENT":
      return isClinicalRole(role);
    case "AUDIT_EVENT":
      return rolePolicyAllows(role, "VIEW", "AUDIT_EVENT");
    case "SECURITY_ALERT":
      return rolePolicyAllows(role, "VIEW", "SECURITY_ALERT");
    case "BEHAVIOR_PROFILE":
      return rolePolicyAllows(role, "VIEW", "BEHAVIOR_PROFILE");
    case "SCENARIO":
      return rolePolicyAllows(role, "UPDATE", "SCENARIO");
    default:
      // Unknown resources are hidden by default.
      return false;
  }
}