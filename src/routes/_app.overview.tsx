import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Activity,
  ShieldOff,
  Brain,
  ArrowRight,
} from "lucide-react";
import { ActivityChart, DetectionDistribution } from "@/components/charts/DashboardCharts";
import { SeverityBadge, StatusBadge, RiskIndicator } from "@/components/common/SeverityBadge";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { getOverview } from "@/lib/api/alerts.functions";
import { getAdminAggregates } from "@/lib/api/audit.functions";
import { clinicianHome } from "@/lib/api/patients.functions";
import { rolePolicyAllows } from "@/lib/authz/policies";
import { RESULT_CLASS, formatTs } from "@/lib/severity";
import { relativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/overview")({
  head: () => ({
    meta: [
      { title: "Overview · EHR Sentinel" },
      {
        name: "description",
        content:
          "Role-aware overview of access activity, detections and audit volume.",
      },
    ],
  }),
  component: OverviewPage,
});

/* ── Metric card ────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "danger" | "warning" | "primary" | "benign";
}) {
  const iconColor = {
    danger: "text-severity-high bg-severity-high/10",
    warning: "text-severity-medium bg-severity-medium/10",
    primary: "text-primary bg-primary/10",
    benign: "text-severity-benign bg-severity-benign/10",
  }[tone ?? "primary"];

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconColor)}
          aria-hidden
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

/* ── Severity left-border on alert list items ───────────────────── */
const STRIPE: Record<string, string> = {
  HIGH:   "severity-stripe-high",
  MEDIUM: "severity-stripe-medium",
  LOW:    "severity-stripe-low",
  BENIGN: "severity-stripe-benign",
};

import type { ReactNode } from "react";

/* ── Router ─────────────────────────────────────────────────────── */
function OverviewPage() {
  const { user } = Route.useRouteContext();
  if (rolePolicyAllows(user.role, "VIEW", "SECURITY_ALERT"))
    return <SecurityDashboard />;
  if (rolePolicyAllows(user.role, "VIEW", "AGGREGATE_ANALYTICS"))
    return <AdministratorView />;
  return <ClinicianHome />;
}

/* ── Security reviewer dashboard ───────────────────────────────── */
function SecurityDashboard() {
  const fetchOverview = useServerFn(getOverview);
  const query = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
  });

  if (query.isPending) return <LoadingState label="Loading security posture" />;
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security dashboard"
        description="Live counts read from the audit and alert tables. No value on this page is estimated or simulated."
      />

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active alerts"
          value={data.activeAlerts}
          hint="Status OPEN or INVESTIGATING"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={data.activeAlerts > 0 ? "danger" : "primary"}
        />
        <MetricCard
          label="Audit events"
          value={data.auditEvents}
          hint="Append-only access_events rows"
          icon={<Activity className="h-5 w-5" />}
          tone="primary"
        />
        <MetricCard
          label="Blocked attempts"
          value={data.blockedAttempts}
          hint="Server-side authorization denials"
          icon={<ShieldOff className="h-5 w-5" />}
          tone={data.blockedAttempts > 0 ? "warning" : "primary"}
        />
        <MetricCard
          label="Model-flagged"
          value={data.anomalies}
          hint="Alerts with ML signal ≥ 0.60 (supporting only)"
          icon={<Brain className="h-5 w-5" />}
          tone="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Access activity by hour — last 24h UTC
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            Authorized, denied and failed outcomes from the audit trail.
          </p>
          {data.activityByHour.length ? (
            <ActivityChart data={data.activityByHour} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No activity recorded in the last 24 hours.
            </p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Detections by rule
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            Deterministic rule attribution across all stored alerts.
          </p>
          {data.detectionDistribution.length ? (
            <DetectionDistribution data={data.detectionDistribution} />
          ) : (
            <EmptyState
              title="No detections yet"
              description="Run a scenario from Scenario Replay to generate detections."
            />
          )}
        </div>
      </div>

      {/* Alert list + denied attempts */}
      <div className="grid gap-4 xl:grid-cols-2">

        {/* Recent alerts — events FIRST, score last */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent alerts
            </h2>
            <Link
              to="/alerts"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              All alerts
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          {data.recentAlerts.length === 0 ? (
            <EmptyState
              title="No alerts stored"
              description="Run a scenario replay to generate detections against synthetic activity."
            />
          ) : (
            <ul className="space-y-2">
              {data.recentAlerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    to="/alerts/$alertId"
                    params={{ alertId: alert.id }}
                    className={cn(
                      "block rounded-lg border border-border bg-surface-subtle p-3 pl-4 transition-colors hover:bg-accent/50",
                      STRIPE[alert.severity],
                    )}
                  >
                    {/* Event name + status — primary */}
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-sm font-semibold text-foreground">
                        {alert.type.replaceAll("_", " ")}
                      </span>
                      <StatusBadge status={alert.status} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(alert.createdAt)}
                      </span>
                    </div>

                    {/* Summary — context */}
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {alert.summary}
                    </p>

                    {/* Risk score — deprioritized, last */}
                    <div className="mt-2 flex items-center gap-3">
                      <RiskIndicator score={alert.riskScore} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Denied / failed attempts */}
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Denied and failed attempts
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Observed facts from the audit trail.
          </p>

          {data.recentSuspicious.length === 0 ? (
            <EmptyState
              title="No denied or failed attempts"
              description="No authorization denials or authentication failures have been recorded."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label-xs pb-2 pr-4">Time</th>
                    <th className="label-xs pb-2 pr-4">User</th>
                    <th className="label-xs pb-2 pr-4">Action</th>
                    <th className="label-xs pb-2">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentSuspicious.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-subtle">
                      <td className="mono-xs py-2.5 pr-4 text-muted-foreground">
                        {formatTs(e.ts)}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{e.username}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{e.action}</td>
                      <td className={cn("py-2.5 font-medium", RESULT_CLASS[e.result])}>
                        {e.result}
                        {e.reason ? (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({e.reason})
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Administrator view ─────────────────────────────────────────── */
function AdministratorView() {
  const fetchAggregates = useServerFn(getAdminAggregates);
  const query = useQuery({
    queryKey: ["admin-aggregates"],
    queryFn: () => fetchAggregates(),
  });

  if (query.isPending) return <LoadingState label="Loading aggregates" />;
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator overview"
        description="Aggregate and system-level information only. Identifiable patient records are never exposed to this role."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Audit events"
          value={data.totalEvents}
          hint="All recorded access events"
          icon={<Activity className="h-5 w-5" />}
          tone="primary"
        />
        <MetricCard
          label="Denied attempts"
          value={data.deniedEvents}
          hint="Authorization denials"
          icon={<ShieldOff className="h-5 w-5" />}
          tone={data.deniedEvents > 0 ? "warning" : "primary"}
        />
        <MetricCard
          label="Failed logins"
          value={data.failedLogins}
          hint="Authentication failures"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={data.failedLogins > 0 ? "danger" : "primary"}
        />
        <MetricCard
          label="Monitored users"
          value={data.userCount}
          hint={`${data.patientCount} synthetic patients`}
          icon={<Brain className="h-5 w-5" />}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold mb-4">Alerts by type</h2>
          {data.alertsByType.length ? (
            <DetectionDistribution
              data={data.alertsByType.map((a) => ({
                type: a.type,
                count: a.count,
              }))}
            />
          ) : (
            <EmptyState title="No alerts stored" description="Run a scenario to generate data." />
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold mb-4">Events by role</h2>
          <ul className="space-y-2 text-sm">
            {data.eventsByRole.map((r) => (
              <li
                key={r.role}
                className="flex justify-between border-b border-border pb-2"
              >
                <span>{r.role}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Clinician home ─────────────────────────────────────────────── */
function ClinicianHome() {
  const { user } = Route.useRouteContext();
  const fetchHome = useServerFn(clinicianHome);
  const query = useQuery({
    queryKey: ["clinician-home"],
    queryFn: () => fetchHome(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${user.displayName}`}
        description={`${user.roleLabel}${user.departmentName ? ` · ${user.departmentName}` : ""}. You may open records for patients assigned to your care. Every access is authorized server-side and written to the audit trail.`}
      />

      {query.isPending ? <LoadingState label="Loading your caseload" /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {query.data ? (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Assigned patients ({query.data.assignedCount})
              </h2>
              <Link
                to="/patients"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Patient directory
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>

            {query.data.patients.length === 0 ? (
              <EmptyState
                title="No active assignments"
                description="No patients are currently assigned to you."
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {query.data.patients.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: p.id }}
                      className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                    >
                      <p className="text-sm font-semibold">{p.displayName}</p>
                      <p className="mono-xs text-muted-foreground">
                        {p.syntheticMrn}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.departmentName}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold mb-1">Your recent access</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Your own audit trail entries.
            </p>
            {query.data.recentActivity.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {query.data.recentActivity.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 border-b border-border pb-1.5"
                  >
                    <span className="mono-xs text-muted-foreground">
                      {formatTs(e.ts)}
                    </span>
                    <span className="flex-1 truncate">{e.action}</span>
                    <span className={cn("font-medium", RESULT_CLASS[e.result])}>
                      {e.result}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}