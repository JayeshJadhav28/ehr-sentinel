import type { AlertStatus, Severity } from "@/lib/types/alert";

/* Spec §5 — semantic color classes, light theme */
export const SEVERITY_CLASS: Record<Severity, string> = {
  HIGH:   "border-severity-high/40 bg-severity-high/10 text-severity-high",
  MEDIUM: "border-severity-medium/40 bg-severity-medium/10 text-severity-medium",
  LOW:    "border-severity-low/40 bg-severity-low/10 text-severity-low",
  BENIGN: "border-severity-benign/40 bg-severity-benign/10 text-severity-benign",
};

/* Icon color — matches severity, for Lucide icons inside badges */
export const SEVERITY_ICON_CLASS: Record<Severity, string> = {
  HIGH:   "text-severity-high",
  MEDIUM: "text-severity-medium",
  LOW:    "text-severity-low",
  BENIGN: "text-severity-benign",
};

/* Spec §55 — alert status visual treatment */
export const STATUS_CLASS: Record<AlertStatus, string> = {
  OPEN:          "border-severity-high/40 bg-severity-high/10 text-severity-high",
  INVESTIGATING: "border-severity-medium/40 bg-severity-medium/10 text-severity-medium",
  DISMISSED:     "border-border bg-surface-subtle text-muted-foreground",
  ESCALATED:     "border-severity-high/60 bg-severity-high/15 text-severity-high",
  RESOLVED:      "border-severity-benign/40 bg-severity-benign/10 text-severity-benign",
};

/* Spec §5 — audit event result colors */
export const RESULT_CLASS: Record<string, string> = {
  SUCCESS: "text-severity-benign",
  DENIED:  "text-severity-high",
  FAILURE: "text-severity-medium",
};

/* Timestamps */
export function formatTs(iso: string): string {
  const d = new Date(iso);
  return (
    d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 19) + "Z"
  );
}

export function formatTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 19) + "Z";
}