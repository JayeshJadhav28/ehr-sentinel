import type { AuthorizationDecision, PermissionAction, ResourceType, RoleName } from "@/lib/types/auth";
import { ROLE_SCOPE_LABEL, rolePolicyAllows } from "./policies";
import { assignmentAllows, resourceInScope } from "./scope";

export interface AuthorizeInput {
  role: RoleName;
  roleLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  action: PermissionAction;
  resourceType: ResourceType;
  /** Present only for patient-bound resources. */
  resource?: { patientId: string; departmentId: string; departmentName: string; mrn: string } | undefined;
  assignedPatientIds?: Set<string> | undefined;
}

/**
 * Pure authorization decision:
 *   role_policy_allows AND resource_in_scope AND assignment_allows
 * The caller is responsible for persisting the resulting audit event.
 */
export function authorize(input: AuthorizeInput): AuthorizationDecision {
  const roleOk = rolePolicyAllows(input.role, input.action, input.resourceType);

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

  let reasonCode: string | null = null;
  if (!roleOk) reasonCode = "ROLE_POLICY_DENIED";
  else if (!scopeOk) reasonCode = "OUT_OF_DEPARTMENT_SCOPE";
  else if (!assignmentOk) reasonCode = "NOT_ASSIGNED_TO_CARE_TEAM";

  const policyStatement = input.resource
    ? `${input.roleLabel} -> ${input.departmentName ?? "no department"} (${ROLE_SCOPE_LABEL[input.role]})`
    : `${input.roleLabel} -> ${ROLE_SCOPE_LABEL[input.role]}`;

  const actualStatement = input.resource
    ? `Patient ${input.resource.mrn} -> ${input.resource.departmentName} Department`
    : `${input.action} on ${input.resourceType}`;

  return { allowed, roleOk, scopeOk, assignmentOk, reasonCode, policyStatement, actualStatement };
}

export const REASON_TEXT: Record<string, string> = {
  ROLE_POLICY_DENIED: "The role policy does not permit this action on this resource type.",
  OUT_OF_DEPARTMENT_SCOPE: "Patient is outside the assigned care scope.",
  NOT_ASSIGNED_TO_CARE_TEAM: "No active care-team assignment links this user to the patient.",
  INVALID_CREDENTIALS: "Username or password did not match an active account.",
  SESSION_EXPIRED: "The session token has expired.",
  NO_SESSION: "No authenticated session was presented.",
};
