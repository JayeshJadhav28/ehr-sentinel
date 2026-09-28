export interface Patient {
  id: string;
  syntheticMrn: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  demographicBand: string;
  assigned: boolean;
  inScope: boolean;
}

export type RecordType = "VISIT" | "MEDICATION" | "HISTORY" | "NOTE";

export interface PatientRecord {
  id: string;
  patientId: string;
  recordType: RecordType;
  title: string;
  summary: string;
  createdAt: string;
}

export interface CareAssignment {
  userId: string;
  patientId: string;
  validFrom: string;
  validTo: string | null;
}
