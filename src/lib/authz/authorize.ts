import type { AuthorizationDecision, PermissionAction, ResourceType, RoleName } from "@/lib/types/auth";
import { ROLE_SCOPE_LABEL, rolePolicyAllows } from "./policies";
import { assignmentAllows, resourceInScope } from "./scope";

export interface AuthorizeInput {
  /** Role of the authenticated staff member. */
  role: RoleName;
  /** Human-readable role name used in policy statements. */
  roleLabel: string;
  /** Staff member's department (null when not department-bound). */
  departmentId: string | null;
  departmentName: string | null;
  /** Action being attempted and the type of resource it targets. */
  action: PermissionAction;
  resourceType: ResourceType;
  /** Present only for patient-bound resources. */
  resource?: { patientId: string; departmentId: string; departmentName: string; mrn: string } | undefined;
  /** Patient IDs the staff member is actively assigned to (care-team assignment). */
  assignedPatientIds?: Set<string> | undefined;
}

/**
 * Picks the first failing check, in priority order:
 * role policy -> department scope -> care-team assignment.
 */
function resolveReasonCode(roleOk: boolean, scopeOk: boolean, assignmentOk: boolean): string | null {
  if (!roleOk) return "ROLE_POLICY_DENIED";
  if (!scopeOk) return "OUT_OF_DEPARTMENT_SCOPE";
  if (!assignmentOk) return "NOT_ASSIGNED_TO_CARE_TEAM";
  return null;
}

/**
 * Pure authorization decision:
 *   role_policy_allows AND resource_in_scope AND assignment_allows
 * The caller is responsible for persisting the resulting audit event.
 */
export function authorize(input: AuthorizeInput): AuthorizationDecision {
  const roleOk = rolePolicyAllows(input.role, input.action, input.resourceType);

  // Scope and assignment only apply to patient-bound resources.
  let scopeOk = true;
  let assignmentOk = true;

  if (input.resource) {
    scopeOk = resourceInScope(
      { role: input.role, departmentId: input.departmentId },
      { departmentId: input.resource.departmentId },
    );
    assignmentOk = assignmentAllows(input.assignedPatientIds ?? new Set<string>(), input.resource.patientId);
  }

  const allowed = roleOk && scopeOk && assignmentOk;
  const reasonCode = resolveReasonCode(roleOk, scopeOk, assignmentOk);

  // What the policy says the user may access vs. what was actually accessed.
  const policyStatement = input.resource
    ? `${input.roleLabel} -> ${input.departmentName ?? "no department"} (${ROLE_SCOPE_LABEL[input.role]})`
    : `${input.roleLabel} -> ${ROLE_SCOPE_LABEL[input.role]}`;

  const actualStatement = input.resource
    ? `Patient ${input.resource.mrn} -> ${input.resource.departmentName} Department`
    : `${input.action} on ${input.resourceType}`;

  return { allowed, roleOk, scopeOk, assignmentOk, reasonCode, policyStatement, actualStatement };
}

/** User-facing explanations for each denial / auth failure reason code. */
export const REASON_TEXT: Record<string, string> = {
  ROLE_POLICY_DENIED: "The role policy does not permit this action on this resource type.",
  OUT_OF_DEPARTMENT_SCOPE: "Patient is outside the assigned care scope.",
  NOT_ASSIGNED_TO_CARE_TEAM: "No active care-team assignment links this user to the patient.",
  INVALID_CREDENTIALS: "Username or password did not match an active account.",
  SESSION_EXPIRED: "The session token has expired.",
  NO_SESSION: "No authenticated session was presented.",
};