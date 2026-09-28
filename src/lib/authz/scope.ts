import type { RoleName } from "@/lib/types/auth";
import { isClinicalRole } from "./policies";

export interface ScopeSubject {
  role: RoleName;
  departmentId: string | null;
}

export interface ScopeResource {
  departmentId: string;
}

/** Department / ward scope check. Non-clinical roles never hold clinical scope. */
export function resourceInScope(subject: ScopeSubject, resource: ScopeResource): boolean {
  if (!isClinicalRole(subject.role)) return false;
  if (!subject.departmentId) return false;
  return subject.departmentId === resource.departmentId;
}

/** Explicit care-team assignment check. */
export function assignmentAllows(assignedPatientIds: Set<string>, patientId: string): boolean {
  return assignedPatientIds.has(patientId);
}
