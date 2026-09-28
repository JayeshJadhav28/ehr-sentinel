import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Patient } from "@/lib/types/patient";
import type { DenialPayload, PatientDetail } from "@/lib/server/patients.server";

const uuid = z.string().uuid();

/** POST /api/records/search */
export const searchPatients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ query: z.string().max(80).default("") }).parse(data))
  .handler(async ({ data }): Promise<Patient[]> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { listPatients } = await import("@/lib/server/patients.server");
    const ctx = await requireSession();
    return listPatients(ctx, data.query);
  });

/** GET /api/patients/{id} + /api/patients/{id}/records */
export const getPatient = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ patientId: uuid }).parse(data))
  .handler(async ({ data }): Promise<PatientDetail | DenialPayload> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { getPatientDetail } = await import("@/lib/server/patients.server");
    const ctx = await requireSession();
    return getPatientDetail(ctx, data.patientId);
  });

export interface ClinicianHome {
  assignedCount: number;
  patients: Patient[];
  recentActivity: { id: string; seq: number; ts: string; action: string; result: string; records: number; reason: string | null }[];
}

export const clinicianHome = createServerFn({ method: "GET" }).handler(async (): Promise<ClinicianHome> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { listPatients } = await import("@/lib/server/patients.server");
  const { loadEvents } = await import("@/lib/server/behavior.server");
  const ctx = await requireSession();
  const patients = await listPatients(ctx, "");
  const events = await loadEvents(ctx.id, 48 * 60, new Date(), 40);
  return {
    assignedCount: patients.filter((p) => p.assigned).length,
    patients: patients.filter((p) => p.assigned).slice(0, 8),
    recentActivity: events
      .slice(-10)
      .reverse()
      .map((e) => ({
        id: e.id,
        seq: e.seq,
        ts: e.timestamp,
        action: e.action,
        result: e.result,
        records: e.recordsReturned,
        reason: e.reasonCode,
      })),
  };
});
