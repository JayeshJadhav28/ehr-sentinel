import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ScenarioRunResult } from "@/lib/types/scenario";

const scenarioSchema = z.object({
  scenario: z.enum(["NORMAL", "BRUTE_FORCE", "BULK_ACCESS", "SCOPE_VIOLATION", "COMBINED_ATTACK", "BUSY_CLINICIAN"]),
});

/** POST /api/demo/replay */
export const replay = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => scenarioSchema.parse(data))
  .handler(async ({ data }): Promise<ScenarioRunResult> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { replayScenario } = await import("@/lib/server/scenarios.server");
    const ctx = await requireSession();
    return replayScenario(ctx, data.scenario);
  });

export const resetDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { resetAllScenarios } = await import("@/lib/server/scenarios.server");
  const ctx = await requireSession();
  await resetAllScenarios(ctx);
  return { ok: true };
});
