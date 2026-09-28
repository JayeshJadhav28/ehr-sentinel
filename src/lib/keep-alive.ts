/**
 * keep-alive.ts
 *
 * Prevents Render free-tier spin-down by pinging this server
 * every 14 minutes. Render sleeps after 15 minutes of inactivity.
 *
 * Only runs when:
 *   - NODE_ENV === "production"
 *   - RENDER_EXTERNAL_URL is set (Render injects this automatically)
 *
 * Safe to import anywhere — it is a no-op outside Render production.
 */

const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

function getTargetUrl(): string | null {
  // Render injects this automatically — no manual config needed
  const renderUrl = process.env["RENDER_EXTERNAL_URL"];
  if (renderUrl) return renderUrl;

  // Fallback: manually set via environment variable
  const manual = process.env["KEEP_ALIVE_URL"];
  if (manual) return manual;

  return null;
}

export function startKeepAlive(): void {
  // Only run in production
  if (process.env["NODE_ENV"] !== "production") return;

  const url = getTargetUrl();
  if (!url) {
    console.info("[keep-alive] No target URL found — skipping. Set RENDER_EXTERNAL_URL or KEEP_ALIVE_URL.");
    return;
  }

  const target = url.endsWith("/") ? url : `${url}/`;

  console.info(`[keep-alive] Started. Pinging ${target} every ${INTERVAL_MS / 60000} minutes.`);

  // Ping immediately on start, then on interval
  void ping(target);

  setInterval(() => {
    void ping(target);
  }, INTERVAL_MS);
}

async function ping(url: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "GET",
      // Short timeout — we only need the server to wake, not a full response
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "EHR-Sentinel-KeepAlive/1.0",
        // Prevent any CSRF middleware from blocking this internal ping
        "x-keep-alive": "1",
      },
    });
    console.info(`[keep-alive] Ping OK — ${res.status} at ${new Date().toISOString()}`);
  } catch (err) {
    // Log but never throw — a failed ping should not crash the server
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[keep-alive] Ping failed — ${message}`);
  }
}
