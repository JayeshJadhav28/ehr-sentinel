import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BaselineComparisonChart } from "@/components/charts/DashboardCharts";
import { ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { getBehaviorProfile, getEvaluationReport, getMonitoredUsers } from "@/lib/api/behavior.functions";

export const Route = createFileRoute("/_app/behavior")({
  head: () => ({
    meta: [
      { title: "Behavior analytics · EHR Sentinel" },
      { name: "description", content: "Per-user behavioral baseline compared with current activity, plus model evaluation on labelled synthetic data." },
      { property: "og:title", content: "Behavior analytics · EHR Sentinel" },
      { property: "og:description", content: "Behavioral baselines and model evaluation on labelled synthetic data." },
    ],
  }),
  component: BehaviorPage,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="label-xs">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function BehaviorPage() {
  const fetchUsers = useServerFn(getMonitoredUsers);
  const fetchProfile = useServerFn(getBehaviorProfile);
  const fetchEvaluation = useServerFn(getEvaluationReport);
  const [selected, setSelected] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["monitored-users"], queryFn: () => fetchUsers() });
  const userId = selected ?? users.data?.[0]?.id ?? null;

  const snapshot = useQuery({
    queryKey: ["behavior", userId],
    queryFn: () => fetchProfile({ data: { userId: userId as string } }),
    enabled: Boolean(userId),
  });
  const evaluation = useQuery({ queryKey: ["evaluation"], queryFn: () => fetchEvaluation() });

  if (users.isPending) return <LoadingState label="Loading monitored users" />;
  if (users.isError) return <ErrorState error={users.error} onRetry={() => void users.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Behavior analytics"
        description="Baselines are learned only from benign activity. Suspicious windows are excluded so an attack never becomes the new normal."
      />

      <div className="mb-4 max-w-sm">
        <label htmlFor="user" className="label-xs">
          Monitored user
        </label>
        <select
          id="user"
          value={userId ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          {users.data.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName} ({u.role}
              {u.department ? ` · ${u.department}` : ""})
            </option>
          ))}
        </select>
      </div>

      {snapshot.isPending ? <LoadingState label="Computing baseline comparison" /> : null}
      {snapshot.isError ? <ErrorState error={snapshot.error} onRetry={() => void snapshot.refetch()} /> : null}

      {snapshot.data ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="panel p-4">
              <h2 className="text-sm font-semibold">Baseline ({snapshot.data.profile.baselineType})</h2>
              <p className="text-xs text-muted-foreground">
                {snapshot.data.profile.windowDays}-day window · {snapshot.data.profile.sampleSize} benign events ·
                model {snapshot.data.profile.modelVersion}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Stat label="Mean records / action" value={snapshot.data.profile.avgRecordsPerAction.toFixed(1)} />
                <Stat label="Std deviation" value={snapshot.data.profile.stdRecordsPerAction.toFixed(1)} />
                <Stat label="Mean records / hour" value={snapshot.data.profile.avgRecordsPerHour.toFixed(1)} />
                <Stat
                  label="Unique patients / session"
                  value={snapshot.data.profile.uniquePatientsPerSession.toFixed(1)}
                />
                <Stat label="Failed logins / day" value={snapshot.data.profile.failedLoginRate.toFixed(2)} />
                <Stat
                  label="Usual hours (UTC)"
                  value={
                    snapshot.data.profile.commonHours.length
                      ? `${Math.min(...snapshot.data.profile.commonHours)}:00–${Math.max(...snapshot.data.profile.commonHours)}:00`
                      : "—"
                  }
                />
              </div>
            </div>

            <div className="panel p-4">
              <h2 className="text-sm font-semibold">Current activity (last 24h)</h2>
              <p className="text-xs text-muted-foreground">Observed facts from the audit trail.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Stat label="Records retrieved" value={snapshot.data.current.recordsLast24h} />
                <Stat label="Unique patients" value={snapshot.data.current.uniquePatients24h} />
                <Stat label="Failed logins" value={snapshot.data.current.failedLogins24h} />
                <Stat label="Denied attempts" value={snapshot.data.current.deniedAttempts24h} />
                <Stat
                  label="Peak burst"
                  value={snapshot.data.current.peakRecordsInWindow}
                  hint={`records in a ${snapshot.data.current.peakWindowMinutes}-minute window`}
                />
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Baseline versus current, by hour (UTC)</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Baseline is the mean daily record volume per hour across the benign window.
            </p>
            <BaselineComparisonChart data={snapshot.data.hourHistogram} />
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Feature vector ({"features-v1"}) and model-derived signal</h2>
            <p className="text-xs text-muted-foreground">
              The same feature vector is sent to any adapter. Current adapter: {snapshot.data.ml.adapter}, score{" "}
              {snapshot.data.ml.anomalyScore.toFixed(3)}. Supplementary signal only.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Object.entries(snapshot.data.features).map(([key, value]) => (
                <div key={key} className="rounded-md border border-border p-2.5">
                  <p className="mono-xs text-muted-foreground">{key}</p>
                  <p className="text-sm font-semibold tabular-nums">{Number(value).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {evaluation.data ? (
        <div className="panel mt-4 p-4">
          <h2 className="text-sm font-semibold">Detection evaluation on labelled synthetic fixtures</h2>
          <p className="text-xs text-muted-foreground">
            Computed at request time by running the live detection pipeline over {evaluation.data.rows.length} labelled
            synthetic activity windows. No figure here is hand-written.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Stat label="Rules precision" value={evaluation.data.rulesOnly.precision.toFixed(2)} />
            <Stat label="Rules recall" value={evaluation.data.rulesOnly.recall.toFixed(2)} />
            <Stat label="False positive rate" value={evaluation.data.rulesOnly.falsePositiveRate.toFixed(2)} />
            <Stat label="Mean decision latency" value={`${evaluation.data.meanLatencyMs} ms`} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr className="label-xs">
                  <th className="py-1.5 pr-3">Fixture</th>
                  <th className="py-1.5 pr-3">Label</th>
                  <th className="py-1.5 pr-3">Rules verdict</th>
                  <th className="py-1.5 pr-3">Rules + model</th>
                  <th className="py-1.5 pr-3">Model signal</th>
                  <th className="py-1.5">Explanation complete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {evaluation.data.rows.map((row) => (
                  <tr key={row.fixture}>
                    <td className="mono-xs py-1.5 pr-3">{row.fixture}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{row.labelled}</td>
                    <td className="py-1.5 pr-3">{row.rulesOnly ? "ALERT" : "no alert"}</td>
                    <td className="py-1.5 pr-3">{row.rulesPlusMl ? "ALERT" : "no alert"}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{row.mlScore.toFixed(3)}</td>
                    <td className="py-1.5">{row.explanationComplete ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
