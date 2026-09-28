import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AccessEvent, AuditFilters } from "@/lib/types/audit";
import type { AdminAggregates } from "@/lib/server/audit-query.server";

const filtersSchema = z.object({
  username: z.string().max(64).optional(),
  role: z.string().max(32).optional(),
  eventType: z.string().max(32).optional(),
  action: z.string().max(32).optional(),
  result: z.string().max(16).optional(),
  targetType: z.string().max(32).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

/** GET /api/audit/events */
export const getAuditEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => filtersSchema.parse(data))
  .handler(async ({ data }): Promise<AccessEvent[]> => {
    const { requireSession } = await import("@/lib/server/session.server");
    const { queryAuditEvents } = await import("@/lib/server/audit-query.server");
    const ctx = await requireSession();
    const filters: AuditFilters = {};
    if (data.username) filters.username = data.username;
    if (data.role) filters.role = data.role;
    if (data.eventType) filters.eventType = data.eventType;
    if (data.action) filters.action = data.action;
    if (data.result) filters.result = data.result;
    if (data.targetType) filters.targetType = data.targetType;
    if (data.from) filters.from = data.from;
    if (data.to) filters.to = data.to;
    if (data.limit) filters.limit = data.limit;
    return queryAuditEvents(ctx, filters);
  });

export const getAdminAggregates = createServerFn({ method: "GET" }).handler(async (): Promise<AdminAggregates> => {
  const { requireSession } = await import("@/lib/server/session.server");
  const { adminAggregates } = await import("@/lib/server/audit-query.server");
  const ctx = await requireSession();
  return adminAggregates(ctx);
});
