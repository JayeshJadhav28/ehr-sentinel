/** A patient as shown in lists and detail views (synthetic demo data). */
export interface Patient {
  id: string;
  /** Synthetic medical record number. */
  syntheticMrn: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  demographicBand: string;
  /** True when the current user is on the patient's care team. */
  assigned: boolean;
  /** True when the patient is in the current user's department. */
  inScope: boolean;
}

export type RecordType = "VISIT" | "MEDICATION" | "HISTORY" | "NOTE";

/** A clinical record entry belonging to a patient. */
export interface PatientRecord {
  id: string;
  patientId: string;
  recordType: RecordType;
  title: string;
  summary: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/** Links a staff member to a patient for a period of time (care-team assignment). */
export interface CareAssignment {
  userId: string;
  patientId: string;
  validFrom: string;
  /** Null means the assignment has no end date. */
  validTo: string | null;
}