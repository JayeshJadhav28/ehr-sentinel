import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { PageHeader } from "@/components/common/States";
import { replay, resetDemo } from "@/lib/api/scenarios.functions";
import { SCENARIOS } from "@/lib/constants";
import type { ScenarioId, ScenarioRunResult } from "@/lib/types/scenario";
import type { Severity } from "@/lib/types/alert";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenario replay · EHR Sentinel" },
      { name: "description", content: "Deterministic replay of benign and malicious access scenarios against synthetic data." },
      { property: "og:title", content: "Scenario replay · EHR Sentinel" },
      { property: "og:description", content: "Deterministic replay of benign and malicious access scenarios." },
    ],
  }),
  component: ScenarioPage,
});

function ScenarioPage() {
  const runReplay = useServerFn(replay);
  const runReset = useServerFn(resetDemo);
  const queryClient = useQueryClient();
  const [results, setResults] = useState<Record<string, ScenarioRunResult>>({});
  const [error, setError] = useState<string | null>(null);

  async function refreshAll() {
    await queryClient.invalidateQueries();
  }

  const mutation = useMutation({
    mutationFn: (scenario: ScenarioId) => runReplay({ data: { scenario } }),
    onSuccess: async (result) => {
      setError(null);
      setResults((prev) => ({ ...prev, [result.scenario]: result }));
      await refreshAll();
    },
    onError: (err: Error) => setError(err.message.replace(/^[A-Z_]+:/, "")),
  });

  const reset = useMutation({
    mutationFn: () => runReset(),
    onSuccess: async () => {
      setResults({});
      await refreshAll();
    },
  });

  return (
    <div>
      <PageHeader
        title="Scenario replay"
        description="Each scenario resets its own synthetic events and regenerates them deterministically, so the same run always produces the same detections."
        actions={
          <button
            type="button"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-60"
          >
            {reset.isPending ? "Resetting..." : "Reset all scenario data"}
          </button>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-severity-high/40 bg-severity-high/10 px-3 py-2 text-sm text-severity-high">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {SCENARIOS.map((scenario) => {
          const result = results[scenario.id];
          const running = mutation.isPending && mutation.variables === scenario.id;
          const expectsAlert = scenario.expectedOutcome === "ALERT";
          return (
            <article key={scenario.id} className="panel flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{scenario.name}</h2>
                  <p className="text-xs text-muted-foreground">{scenario.actor}</p>
                </div>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 text-[11px] font-semibold",
                    expectsAlert
                      ? "border-severity-high/40 bg-severity-high/10 text-severity-high"
                      : "border-severity-benign/40 bg-severity-benign/10 text-severity-benign",
                  )}
                >
                  {expectsAlert ? "EXPECT ALERT" : "EXPECT NO ALERT"}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">Expected: {scenario.expectation}</p>

              <button
                type="button"
                onClick={() => mutation.mutate(scenario.id)}
                disabled={mutation.isPending}
                className="mt-3 self-start rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {running ? "Replaying..." : "Run scenario"}
              </button>

              {result ? (
                <div className="mt-3 rounded-md border border-border bg-surface-raised p-3">
                  <p className="text-sm font-medium">{result.verdict}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {result.eventsCreated} audit events written.
                  </p>
                  {result.alertsCreated.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {result.alertsCreated.map((alert) => (
                        <li key={alert.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <SeverityBadge severity={alert.severity as Severity} />
                          <span>{alert.type.replaceAll("_", " ")}</span>
                          <span className="text-xs text-muted-foreground">risk {alert.riskScore}</span>
                          <Link
                            to="/alerts/$alertId"
                            params={{ alertId: alert.id }}
                            className="text-xs text-primary hover:underline"
                          >
                            Investigate
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {result.benignExplanation ? (
                    <ul className="mt-2 space-y-1 text-xs text-severity-benign">
                      {result.benignExplanation.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        All scenario activity is synthetic. Replay never contacts external systems and never uses real patient data.
      </p>
    </div>
  );
}