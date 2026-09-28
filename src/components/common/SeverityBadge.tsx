import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";
import { SEVERITY_CLASS, SEVERITY_ICON_CLASS, STATUS_CLASS } from "@/lib/severity";
import type { AlertStatus, Severity } from "@/lib/types/alert";
import { cn } from "@/lib/utils";

/* ── Icon per severity — spec §19 ──────────────────────────────── */
const SEVERITY_ICON: Record<Severity, React.ElementType> = {
  HIGH:   ShieldAlert,
  MEDIUM: AlertTriangle,
  LOW:    Info,
  BENIGN: CheckCircle2,
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        SEVERITY_CLASS[severity],
        className,
      )}
    >
      {/* Spec §6 — icon + text, never color alone */}
      <Icon className="h-3 w-3" aria-hidden />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
      )}
    >
      {status}
    </span>
  );
}

/*
 * RiskIndicator — spec §2.2.
 * Score is the LAST element in the evidence hierarchy.
 * Rendered small and secondary; never the primary visual.
 */
export function RiskIndicator({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-severity-high"
      : score >= 40
        ? "bg-severity-medium"
        : "bg-severity-low";

  return (
    <div
      className="flex items-center gap-2"
      title={`Prototype risk indicator: ${score}/100. Demonstration configuration only.`}
      aria-label={`Risk score ${score} out of 100`}
    >
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${Math.max(3, score)}%` }}
        />
      </div>
      <span className="mono-xs tabular-nums text-muted-foreground">
        {score}
      </span>
    </div>
  );
}