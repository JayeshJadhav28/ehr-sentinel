import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CurrentUser } from "@/lib/types/auth";

/** Input validation for the login request (runs on the server). */
const loginSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(6).max(128),
});

export interface LoginResult {
  ok: boolean;
  message?: string;
  user?: CurrentUser;
}

/** POST /api/auth/login */
export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    // Server-only modules are imported lazily so they never reach the client bundle.
    const { db } = await import("@/lib/server/db.server");
    const { logAccessEvent } = await import("@/lib/server/audit.server");
    const { createSession, clientIp, contextForSession } = await import("@/lib/server/session.server");
    const { evaluateUser } = await import("@/lib/server/detection.server");

    const sourceIp = clientIp();

    // Look up the account (if any) so failed attempts can be attributed in the audit log.
    const { data: account } = await db
      .from("users")
      .select("id,username,role_id,department_id")
      .eq("username", data.username)
      .maybeSingle();
    const { data: role } = account
      ? await db.from("roles").select("name").eq("id", account.role_id).maybeSingle()
      : { data: null };

    // Credentials are verified inside the database, never in application code.
    const { data: verified, error } = await db.rpc("verify_credentials", {
      p_username: data.username,
      p_password: data.password,
    });
    if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:auth:${error.message}`);

    const match = (verified as { user_id: string }[] | null)?.[0];

    // Failed login: audit it and run detection (feeds brute-force detection).
    if (!match) {
      await logAccessEvent({
        eventType: "AUTH",
        userId: account?.id ?? null,
        username: data.username,
        role: role?.name ?? null,
        departmentId: account?.department_id ?? null,
        action: "LOGIN",
        targetType: "SESSION",
        result: "FAILURE",
        reasonCode: "INVALID_CREDENTIALS",
        sourceIp,
        scenarioTag: "LIVE",
      });
      if (account) {
        await evaluateUser({ userId: account.id, windowMinutes: 10, scenarioTag: "LIVE" });
      }
      return { ok: false, message: "Username or password is incorrect." };
    }

    // Successful login: create the session, then audit it.
    const { sessionId } = await createSession(match.user_id, sourceIp);
    await logAccessEvent({
      eventType: "AUTH",
      userId: match.user_id,
      username: data.username,
      role: role?.name ?? null,
      departmentId: account?.department_id ?? null,
      action: "LOGIN",
      targetType: "SESSION",
      result: "SUCCESS",
      sourceIp,
      sessionId,
      scenarioTag: "LIVE",
    });

    const ctx = await contextForSession(match.user_id, sessionId);
    if (!ctx) return { ok: false, message: "Session could not be established." };
    // sourceIp is internal and is not returned to the client.
    const { sourceIp: _ip, ...user } = ctx;
    return { ok: true, user };
  });

/** POST /api/auth/logout */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getSessionContext, revokeSession } = await import("@/lib/server/session.server");
  const { logAccessEvent } = await import("@/lib/server/audit.server");
  const ctx = await getSessionContext();
  // Logout is audited first, then the session is revoked. Without a session it is a no-op.
  if (ctx) {
    await logAccessEvent({
      eventType: "AUTH",
      userId: ctx.id,
      username: ctx.username,
      role: ctx.role,
      departmentId: ctx.departmentId,
      action: "LOGOUT",
      targetType: "SESSION",
      result: "SUCCESS",
      sourceIp: ctx.sourceIp,
      sessionId: ctx.sessionId,
      scenarioTag: "LIVE",
    });
    await revokeSession(ctx.sessionId);
  }
  return { ok: true };
});

/** GET /api/me */
export const getMe = createServerFn({ method: "GET" }).handler(async (): Promise<CurrentUser | null> => {
  const { getSessionContext } = await import("@/lib/server/session.server");
  const ctx = await getSessionContext();
  if (!ctx) return null;
  // Strip the internal sourceIp before returning the user to the client.
  const { sourceIp: _ip, ...user } = ctx;
  return user;
});