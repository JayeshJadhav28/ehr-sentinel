import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Loading ────────────────────────────────────────────────────── */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="panel flex items-center gap-3 p-6 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label={`${label}…`}
    >
      {/* Skeleton pulse */}
      <div className="space-y-2 flex-1">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <span className="shrink-0 text-xs">{label}…</span>
    </div>
  );
}

/* ── Empty ──────────────────────────────────────────────────────── */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel px-6 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm mx-auto text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Error ──────────────────────────────────────────────────────── */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const raw = error instanceof Error ? error.message : String(error);
  const forbidden = raw.includes("FORBIDDEN");
  const dependency = raw.includes("SECURITY_DEPENDENCY_UNAVAILABLE");

  const title = forbidden
    ? "Access denied"
    : dependency
      ? "Security service unavailable"
      : "Request failed";

  const body = forbidden
    ? `${raw.split("FORBIDDEN:")[1]?.trim() ?? "You are not authorized for this resource."} This attempt has been logged.`
    : dependency
      ? "No authorization decision was assumed. Nothing was disclosed and no access was granted."
      : raw.replace(/^[A-Z_]+:/, "").trim();

  const Icon = forbidden ? ShieldOff : AlertTriangle;

  return (
    <div
      className={cn(
        "panel p-6",
        forbidden
          ? "border-severity-high/30 bg-severity-high/5"
          : "border-severity-medium/30 bg-severity-medium/5",
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            forbidden ? "text-severity-high" : "text-severity-medium",
          )}
          aria-hidden
        />
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              forbidden ? "text-severity-high" : "text-severity-medium",
            )}
          >
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page header ────────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}