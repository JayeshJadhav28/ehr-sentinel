import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Filter } from "lucide-react";
import { SeverityBadge, StatusBadge, RiskIndicator } from "@/components/common/SeverityBadge";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { getAlerts } from "@/lib/api/alerts.functions";
import { formatTs } from "@/lib/severity";
import { relativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alerts/")({
  head: () => ({
    meta: [
      { title: "Security alerts · EHR Sentinel" },
      {
        name: "description",
        content:
          "Rule-driven access alerts with evidence-backed explanations for reviewers.",
      },
    ],
  }),
  component: AlertsPage,
});

/* Severity left-border stripe per §6 — color never alone */
const STRIPE: Record<string, string> = {
  HIGH:   "severity-stripe-high",
  MEDIUM: "severity-stripe-medium",
  LOW:    "severity-stripe-low",
  BENIGN: "severity-stripe-benign",
};

function AlertsPage() {
  const fetchAlerts = useServerFn(getAlerts);
  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(),
  });

  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");

  const alerts = (query.data ?? []).filter(
    (a) =>
      (severity === "" || a.severity === severity) &&
      (status === "" || a.status === status),
  );

  const hasFilters = severity !== "" || status !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security alerts"
        description="Each alert is raised by deterministic rules. The model-derived signal is supporting context only — it never authorizes or blocks access."
      />

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" aria-hidden />
          <span className="label-xs">Filter</span>
        </div>

        <div>
          <label htmlFor="sev-filter" className="label-xs block mb-1.5">
            Severity
          </label>
          <select
            id="sev-filter"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="block rounded-md border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {["", "HIGH", "MEDIUM", "LOW", "BENIGN"].map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All severities" : s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="st-filter" className="label-xs block mb-1.5">
            Status
          </label>
          <select
            id="st-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="block rounded-md border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {["", "OPEN", "INVESTIGATING", "DISMISSED", "ESCALATED", "RESOLVED"].map(
              (s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s}
                </option>
              ),
            )}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSeverity(""); setStatus(""); }}
            className="text-xs text-primary hover:underline self-end pb-2"
          >
            Clear filters
          </button>
        )}

        {query.data && (
          <p className="ml-auto self-end pb-2 text-xs text-muted-foreground">
            {alerts.length} of {query.data.length} alert
            {query.data.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Loading / error */}
      {query.isPending ? <LoadingState label="Loading alerts" /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {/* Alert list */}
      {query.data ? (
        alerts.length === 0 ? (
          <EmptyState
            title="No alerts match"
            description="Run a scenario from Scenario Replay to generate detections against synthetic activity."
          />
        ) : (
          <ul className="space-y-3" role="list" aria-label="Security alerts">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  to="/alerts/$alertId"
                  params={{ alertId: alert.id }}
                  className={cn(
                    "group block rounded-lg border border-border bg-surface pl-4 pr-4 py-4 transition-colors hover:bg-accent/40",
                    STRIPE[alert.severity],
                  )}
                >
                  {/*
                   * Spec §2.2 evidence hierarchy:
                   * 1. Event name + severity — what happened
                   * 2. Summary — context
                   * 3. Rules — detection
                   * 4. Risk score — last
                   */}

                  {/* Row 1 — event identity */}
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm font-semibold text-foreground">
                      {alert.type.replaceAll("_", " ")}
                    </span>
                    <StatusBadge status={alert.status} />
                    <span className="mono-xs ml-auto text-muted-foreground">
                      {formatTs(alert.createdAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(alert.createdAt)}
                    </span>
                  </div>

                  {/* Row 2 — summary (context) */}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {alert.summary}
                  </p>

                  {/* Row 3 — actor + rules */}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {alert.displayName} ({alert.username})
                    {alert.ruleIds.length > 0 && (
                      <>
                        {" · "}
                        <span className="mono-xs">
                          {alert.ruleIds.join(" + ")}
                        </span>
                      </>
                    )}
                  </p>

                  {/* Row 4 — model signal + risk score (lowest priority) */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      <span className="label-xs mr-1">Model signal</span>
                      {alert.mlScore === null ? "—" : alert.mlScore.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="label-xs">Risk</span>
                      <RiskIndicator score={alert.riskScore} />
                    </div>
                    <span className="ml-auto flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      View evidence
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}