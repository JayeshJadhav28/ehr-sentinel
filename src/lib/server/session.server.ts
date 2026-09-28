import { getRequest, getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { db, sha256 } from "./db.server";
import type { CurrentUser, RoleName } from "@/lib/types/auth";

export const SESSION_COOKIE = "ehrs_session";
export const SESSION_TTL_MINUTES = 60;

export function readSessionToken(): string | null {
  const cookie = getRequestHeader("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
}

function writeCookie(value: string, maxAgeSeconds: number) {
  // Secure is required in hosted (https) environments and must be omitted for
  // plain-http local development, otherwise the browser drops the cookie.
  const proto = getRequestHeader("x-forwarded-proto") ?? (getRequest().url.startsWith("https") ? "https" : "http");
  const secure = proto === "https" ? " Secure;" : "";
  setResponseHeader(
    "set-cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSeconds}`,
  );
}

export function clearSessionCookie() {
  writeCookie("", 0);
}

export function clientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    "10.20.4.11"
  );
}

export async function createSession(userId: string, sourceIp: string): Promise<{ sessionId: string }> {
  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString();

  const { error } = await db.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    token_hash: await sha256(token),
    expires_at: expiresAt,
    source_ip: sourceIp,
  });
  if (error) throw new Error(`SESSION_CREATE_FAILED:${error.message}`);

  writeCookie(token, SESSION_TTL_MINUTES * 60);
  return { sessionId };
}

export interface SessionContext extends CurrentUser {
  sourceIp: string;
}

/** Resolves the caller from the httpOnly session cookie. Server-side only. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const token = readSessionToken();
  if (!token) return null;

  const tokenHash = await sha256(token);
  const { data: session, error } = await db
    .from("sessions")
    .select("id,user_id,expires_at,revoked_at,source_ip")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:sessions:${error.message}`);
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: user, error: userError } = await db
    .from("users")
    .select("id,username,display_name,status,department_id,role_id")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userError) throw new Error(`SECURITY_DEPENDENCY_UNAVAILABLE:users:${userError.message}`);
  if (!user || user.status !== "ACTIVE") return null;

  const { data: role } = await db.from("roles").select("name,label").eq("id", user.role_id).maybeSingle();
  const { data: dept } = user.department_id
    ? await db.from("departments").select("name").eq("id", user.department_id).maybeSingle()
    : { data: null };

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: (role?.name ?? "PHYSICIAN") as RoleName,
    roleLabel: role?.label ?? "Physician",
    departmentId: user.department_id,
    departmentName: dept?.name ?? null,
    sessionId: session.id,
    sessionExpiresAt: session.expires_at,
    sourceIp: clientIp(),
  };
}

/**
 * Builds the caller context directly from identifiers, for the sign-in request
 * itself: the session cookie is only readable on the *next* request.
 */
export async function contextForSession(userId: string, sessionId: string): Promise<SessionContext | null> {
  const { data: user } = await db
    .from("users")
    .select("id,username,display_name,status,department_id,role_id")
    .eq("id", userId)
    .maybeSingle();
  if (!user || user.status !== "ACTIVE") return null;

  const { data: role } = await db.from("roles").select("name,label").eq("id", user.role_id).maybeSingle();
  const { data: dept } = user.department_id
    ? await db.from("departments").select("name").eq("id", user.department_id).maybeSingle()
    : { data: null };
  const { data: session } = await db.from("sessions").select("expires_at").eq("id", sessionId).maybeSingle();

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: (role?.name ?? "PHYSICIAN") as RoleName,
    roleLabel: role?.label ?? "Physician",
    departmentId: user.department_id,
    departmentName: dept?.name ?? null,
    sessionId,
    sessionExpiresAt: session?.expires_at ?? new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString(),
    sourceIp: clientIp(),
  };
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) {
    throw new Error("UNAUTHENTICATED:No valid session. Please sign in again.");
  }
  return ctx;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId);
  clearSessionCookie();
}
