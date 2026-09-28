import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BehaviorSnapshot } from "@/lib/types/behavior";
import type { MonitoredUser } from "@/lib/server/behavior-view.server";
import type { EvaluationReport } from "@/lib/server/evaluation.server";

export const getMonitoredUsers = createServerFn({ method: "GET" }).handler(async (): Promise<MonitoredUser[]> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { listMonitoredUsers } = await import("@/lib/server/behavior-view.server");
  const ctx = await requireSession();
  return listMonitoredUsers(ctx);
});

/** GET /api/analytics/users/{id}/profile */
export const getBehaviorProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<BehaviorSnapshot> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { behaviorSnapshot } = await import("@/lib/server/behavior-view.server");
    const ctx = await requireSession();
    return behaviorSnapshot(ctx, data.userId);
  });

export const getEvaluationReport = createServerFn({ method: "GET" }).handler(async (): Promise<EvaluationReport> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { evaluateModel } = await import("@/lib/server/evaluation.server");
  const ctx = await requireSession();
  return evaluateModel(ctx);
});
