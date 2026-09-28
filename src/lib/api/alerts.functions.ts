import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Alert, AlertDetail } from "@/lib/types/alert";
import type { OverviewMetrics } from "@/lib/server/alerts.server";

/** GET /api/alerts */
export const getAlerts = createServerFn({ method: "GET" }).handler(async (): Promise<Alert[]> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { listAlerts } = await import("@/lib/server/alerts.server");
  const ctx = await requireSession();
  return listAlerts(ctx);
});

/** GET /api/alerts/{id} */
export const getAlert = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ alertId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<AlertDetail> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { getAlertDetail } = await import("@/lib/server/alerts.server");
    const ctx = await requireSession();
    return getAlertDetail(ctx, data.alertId);
  });

/** POST /api/alerts/{id}/action */
export const actOnAlert = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        alertId: z.string().uuid(),
        action: z.enum(["INVESTIGATE", "DISMISS", "ESCALATE", "RESOLVE", "OPEN"]),
        note: z.string().max(400).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { applyReviewerAction } = await import("@/lib/server/alerts.server");
    const ctx = await requireSession();
    return applyReviewerAction(ctx, data.alertId, data.action, data.note);
  });

export const getOverview = createServerFn({ method: "GET" }).handler(async (): Promise<OverviewMetrics> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { overviewMetrics } = await import("@/lib/server/alerts.server");
  const ctx = await requireSession();
  return overviewMetrics(ctx);
});
