import { authorize } from "@/lib/authz/authorize";
import { isClinicalRole } from "@/lib/authz/policies";
import type { Patient, PatientRecord, RecordType } from "@/lib/types/patient";
import { db } from "./db.server";
import { logAccessEvent } from "./audit.server";
import type { SessionContext } from "./session.server";
import { evaluateUser } from "./detection.server";

export interface DenialPayload {
  denied: true;
  status: 403;
  reasonCode: string;
  message: string;
  policyStatement: string;
  actualStatement: string;
}

export async function assignedPatientIds(userId: string): Promise<Set<string>> {
  const { data, error } = await db
    .from("care_assignments")
    .select("patient_id,valid_to")
    .eq("user_id", userId);
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:care_assignments:${error.message}`);
  return new Set(
    (data ?? []).filter((r) => !r.valid_to || new Date(r.valid_to).getTime() > Date.now()).map((r) => r.patient_id),
  );
}

interface PatientRow {
  id: string;
  synthetic_mrn: string;
  display_name: string;
  department_id: string;
  demographic_band: string;
}

async function departmentNames(): Promise<Map<string, string>> {
  const { data } = await db.from("departments").select("id,name");
  return new Map((data ?? []).map((d) => [d.id, d.name]));
}

export async function listPatients(ctx: SessionContext, query: string): Promise<Patient[]> {
  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "SEARCH",
    resourceType: "PATIENT",
  });

  await logAccessEvent({
    eventType: "RECORD_SEARCH",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    departmentId: ctx.departmentId,
    action: "SEARCH",
    targetType: "PATIENT",
    result: decision.allowed ? "SUCCESS" : "DENIED",
    reasonCode: decision.reasonCode,
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
    metadata: { query },
  });

  if (!decision.allowed || !isClinicalRole(ctx.role)) return [];

  const assigned = await assignedPatientIds(ctx.id);
  const depts = await departmentNames();

  let builder = db.from("patients").select("id,synthetic_mrn,display_name,department_id,demographic_band");
  if (query.trim()) {
    const q = query.trim().replace(/[%,]/g, "");
    builder = builder.or(`synthetic_mrn.ilike.%${q}%,display_name.ilike.%${q}%`);
  }
  const { data, error } = await builder.order("synthetic_mrn").limit(80);
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:patients:${error.message}`);

  return (data as PatientRow[]).map((p) => ({
    id: p.id,
    syntheticMrn: p.synthetic_mrn,
    displayName: p.display_name,
    departmentId: p.department_id,
    departmentName: depts.get(p.department_id) ?? "Unknown",
    demographicBand: p.demographic_band,
    assigned: assigned.has(p.id),
    inScope: p.department_id === ctx.departmentId,
  }));
}

export interface PatientDetail {
  patient: Patient;
  records: PatientRecord[];
  visitCount: number;
}

export async function getPatientDetail(
  ctx: SessionContext,
  patientId: string,
): Promise<PatientDetail | DenialPayload> {
  const { data: row, error } = await db
    .from("patients")
    .select("id,synthetic_mrn,display_name,department_id,demographic_band")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:patients:${error.message}`);
  if (!row) throw new Error("NOT_FOUND:No patient matches that identifier.");

  const depts = await departmentNames();
  const assigned = await assignedPatientIds(ctx.id);

  const decision = authorize({
    role: ctx.role,
    roleLabel: ctx.roleLabel,
    departmentId: ctx.departmentId,
    departmentName: ctx.departmentName,
    action: "VIEW",
    resourceType: "PATIENT",
    resource: {
      patientId: row.id,
      departmentId: row.department_id,
      departmentName: depts.get(row.department_id) ?? "Unknown",
      mrn: row.synthetic_mrn,
    },
    assignedPatientIds: assigned,
  });

  const { data: records } = decision.allowed
    ? await db
        .from("patient_records")
        .select("id,patient_id,record_type,title,payload,created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
    : { data: [] };

  await logAccessEvent({
    eventType: decision.allowed ? "RECORD_ACCESS" : "AUTHZ",
    userId: ctx.id,
    username: ctx.username,
    role: ctx.role,
    departmentId: ctx.departmentId,
    action: "VIEW",
    targetType: "PATIENT",
    targetId: patientId,
    result: decision.allowed ? "SUCCESS" : "DENIED",
    reasonCode: decision.reasonCode,
    recordsReturned: decision.allowed ? (records?.length ?? 0) : 0,
    sourceIp: ctx.sourceIp,
    sessionId: ctx.sessionId,
    scenarioTag: "LIVE",
  });

  if (!decision.allowed) {
    await evaluateUser({ userId: ctx.id, windowMinutes: 60, scenarioTag: "LIVE", persistBenign: false });
    return {
      denied: true,
      status: 403,
      reasonCode: decision.reasonCode ?? "DENIED",
      message: "You are not authorized to access this patient. This attempt has been logged.",
      policyStatement: decision.policyStatement,
      actualStatement: decision.actualStatement,
    };
  }

  return {
    patient: {
      id: row.id,
      syntheticMrn: row.synthetic_mrn,
      displayName: row.display_name,
      departmentId: row.department_id,
      departmentName: depts.get(row.department_id) ?? "Unknown",
      demographicBand: row.demographic_band,
      assigned: assigned.has(row.id),
      inScope: row.department_id === ctx.departmentId,
    },
    records: (records ?? []).map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      recordType: r.record_type as RecordType,
      title: r.title,
      summary: String((r.payload as { summary?: string } | null)?.summary ?? ""),
      createdAt: r.created_at,
    })),
    visitCount: (records ?? []).filter((r) => r.record_type === "VISIT").length,
  };
}
