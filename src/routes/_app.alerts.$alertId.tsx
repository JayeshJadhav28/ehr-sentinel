import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
import { SeverityBadge, StatusBadge, RiskIndicator } from "@/components/common/SeverityBadge";
import { ErrorState, LoadingState } from "@/components/common/States";
import { actOnAlert, getAlert } from "@/lib/api/alerts.functions";
import { DETECTION_CONFIG } from "@/lib/constants";
import { RESULT_CLASS, formatTs } from "@/lib/severity";
import type { ReviewerAction } from "@/lib/types/alert";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alerts/$alertId")({
  head: () => ({
    meta: [
      { title: "Alert investigation · EHR Sentinel" },
      {
        name: "description",
        content:
          "Evidence-backed alert investigation: who, what, when, where, why and compared to baseline.",
      },
    ],
  }),
  component: AlertDetailPage,
});

/* ── Section wrapper ────────────────────────────────────────────── */
function Section({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* ── Observed vs Expected — spec §22 visual centerpiece ─────────── */
function ObservedVsExpected({
  observed,
  expected,
}: {
  observed: string[];
  expected: string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Expected */}
      <div className="rounded-lg border border-border bg-surface-subtle p-4">
        <p className="label-xs mb-3 text-muted-foreground">Expected</p>
        <ul className="space-y-2">
          {expected.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-benign"
                aria-hidden
              />
              <span className="text-muted-foreground">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Observed */}
      <div className="rounded-lg border border-severity-high/25 bg-severity-high/5 p-4">
        <p className="label-xs mb-3 text-severity-high">Observed</p>
        <ul className="space-y-2">
          {observed.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm">
              <ShieldAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-high"
                aria-hidden
              />
              <span className="font-medium text-foreground">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Reviewer action buttons ────────────────────────────────────── */
const ACTIONS: {
  action: ReviewerAction;
  label: string;
  className: string;
}[] = [
  {
    action: "INVESTIGATE",
    label: "Investigate",
    className:
      "border border-severity-medium/40 bg-severity-medium/8 text-severity-medium hover:bg-severity-medium/15",
  },
  {
    action: "DISMISS",
    label: "Dismiss",
    className:
      "border border-border bg-surface text-muted-foreground hover:bg-surface-subtle",
  },
  {
    action: "ESCALATE",
    label: "Escalate",
    className:
      "border border-severity-high/40 bg-severity-high/8 text-severity-high hover:bg-severity-high/15",
  },
  {
    action: "RESOLVE",
    label: "Resolve",
    className:
      "border border-severity-benign/40 bg-severity-benign/8 text-severity-benign hover:bg-severity-benign/15",
  },
];

/* ── Main page ──────────────────────────────────────────────────── */
function AlertDetailPage() {
  const { alertId } = Route.useParams();
  const fetchAlert = useServerFn(getAlert);
  const act = useServerFn(actOnAlert);
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["alert", alertId],
    queryFn: () => fetchAlert({ data: { alertId } }),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (action: ReviewerAction) =>
      act({ data: { alertId, action, note: note || null } }),
    onSuccess: async () => {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["alert", alertId] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  if (query.isPending)
    return <LoadingState label="Loading investigation package" />;
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const alert = query.data;
  const ev = alert.evidence;

  return (
    <div className="space-y-4">

      {/* Back */}
      <Link
        to="/alerts"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to alerts
      </Link>

      {/* ── Alert header ────────────────────────────────────────── */}
      <div className={cn(
        "panel p-5",
        alert.severity === "HIGH" && "severity-stripe-high",
        alert.severity === "MEDIUM" && "severity-stripe-medium",
        alert.severity === "LOW" && "severity-stripe-low",
        alert.severity === "BENIGN" && "severity-stripe-benign",
      )}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Identity — first thing a reviewer reads */}
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {alert.type.replaceAll("_", " ")}
              </h1>
              <StatusBadge status={alert.status} />
            </div>

            {/* Actor */}
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden />
              {ev.identity.displayName} · {ev.identity.role} · {ev.identity.department}
            </div>

            {/* Summary — what happened */}
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground">
              {alert.summary}
            </p>

            <p className="mono-xs mt-2 text-muted-foreground">
              {alert.id} · raised {formatTs(alert.createdAt)}
            </p>
          </div>

          {/* Risk score — rightmost, small, clearly de-emphasized */}
          <div className="shrink-0 rounded-lg border border-border bg-surface-subtle p-3 min-w-44">
            <p className="label-xs mb-2">Prototype risk indicator</p>
            <RiskIndicator score={alert.riskScore} />
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Demonstration weighting. Not a clinical or regulatory risk score.
            </p>
          </div>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">

        {/* Left column — evidence */}
        <div className="space-y-4">

          {/*
           * Spec §2.2 — narrative is the primary evidence surface.
           * "What happened?" before "How risky is it?"
           */}
          <Section
            title="What happened"
            subtitle="Plain-language explanation assembled from the audit events below."
          >
            <p className="text-sm leading-relaxed text-foreground">
              {ev.narrative}
            </p>
          </Section>

          {/*
           * Spec §22 — Observed vs Expected is the visual centerpiece.
           * Two-column layout, structured comparison.
           */}
          <Section
            title="Observed vs expected"
            subtitle="Recorded audit facts compared against this user's normal baseline."
          >
            <ObservedVsExpected
              observed={ev.observedBehavior}
              expected={ev.expectedBehavior}
            />
          </Section>

          {/* Triggered rules */}
          <Section
            title="Triggered detection rules"
            subtitle="Deterministic rule logic. Rules fire based on thresholds, not model scores."
          >
            <ul className="space-y-3">
              {ev.triggeredRules.map((rule) => (
                <li
                  key={rule.ruleId}
                  className="rounded-lg border border-border bg-surface-subtle p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {rule.ruleId}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {rule.name}
                    </span>
                    <SeverityBadge severity={rule.severity} className="ml-auto" />
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {rule.explanation}
                  </p>

                  {rule.comparison && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="label-xs pb-1.5 pr-4">Metric</th>
                            <th className="label-xs pb-1.5 pr-4">Observed</th>
                            <th className="label-xs pb-1.5 pr-4">Expected</th>
                            <th className="label-xs pb-1.5">Deviation</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1.5 pr-4 text-muted-foreground">
                              {rule.comparison.metric}
                            </td>
                            <td className="py-1.5 pr-4 font-semibold text-severity-high">
                              {rule.comparison.observed}
                            </td>
                            <td className="py-1.5 pr-4 text-muted-foreground">
                              {rule.comparison.expected}
                            </td>
                            <td className="py-1.5 text-muted-foreground">
                              {rule.comparison.deviation}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="mono-xs mt-3 text-muted-foreground">
                    {rule.supportingEventIds.length} supporting event
                    {rule.supportingEventIds.length !== 1 ? "s" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          {/* ML signal — clearly labeled, after deterministic rules */}
          <Section
            title="Model-derived signal"
            subtitle="Isolation Forest anomaly signal. Supplementary context only — never overrides an authorization decision."
          >
            {ev.mlSignal ? (
              <div>
                {/* Signal label makes provenance explicit */}
                <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface-subtle px-3 py-1.5">
                  <span className="label-xs text-primary">MODEL SIGNAL</span>
                  <span className="mono-xs font-semibold text-foreground">
                    {ev.mlSignal.anomalyScore.toFixed(3)}
                  </span>
                </div>

                <dl className="mb-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="label-xs">Baseline</dt>
                    <dd className="mt-0.5 text-muted-foreground">
                      {ev.mlSignal.baselineType}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-xs">Model</dt>
                    <dd className="mono-xs mt-0.5 text-muted-foreground">
                      {ev.mlSignal.modelVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-xs">Adapter</dt>
                    <dd className="mono-xs mt-0.5 text-muted-foreground">
                      {ev.mlSignal.adapter}
                    </dd>
                  </div>
                </dl>

                <p className="mb-4 text-sm text-muted-foreground">
                  {ev.mlSignal.explanation}
                </p>

                {/* Feature contributions */}
                <p className="label-xs mb-2">Feature contributions (top 5)</p>
                <ul className="space-y-2">
                  {ev.mlSignal.featureContributions.slice(0, 5).map((c) => (
                    <li key={c.feature} className="flex items-center gap-3 text-xs">
                      <span className="mono-xs w-44 shrink-0 text-muted-foreground">
                        {c.feature}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, Math.abs(c.contribution) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {c.value.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No model signal was recorded for this alert.
              </p>
            )}
          </Section>

          {/* Supporting audit events */}
          <Section
            title="Supporting audit events"
            subtitle="The exact events this alert is built from. OBSERVED — directly recorded, not inferred."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="label-xs py-2 pr-4">Seq</th>
                    <th className="label-xs py-2 pr-4">Time</th>
                    <th className="label-xs py-2 pr-4">Action</th>
                    <th className="label-xs py-2 pr-4">Records</th>
                    <th className="label-xs py-2 pr-4">Source</th>
                    <th className="label-xs py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alert.supportingEvents.map((e) => (
                    <tr
                      key={e.id}
                      className={cn(
                        "hover:bg-surface-subtle",
                        e.result === "DENIED" && "bg-severity-high/5",
                      )}
                    >
                      <td className="mono-xs py-2.5 pr-4 text-muted-foreground">
                        {e.seq}
                      </td>
                      <td className="mono-xs py-2.5 pr-4 text-muted-foreground">
                        {formatTs(e.timestamp)}
                      </td>
                      <td className="py-2.5 pr-4">{e.action}</td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {e.recordsReturned}
                      </td>
                      <td className="mono-xs py-2.5 pr-4 text-muted-foreground">
                        {e.sourceIp ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 font-medium",
                          RESULT_CLASS[e.result],
                        )}
                      >
                        {e.result}
                        {e.reasonCode && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ({e.reasonCode})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* Right column — context + actions */}
        <div className="space-y-4">

          {/* Identity / time / where */}
          <Section title="Who · when · where">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="label-xs flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  Actor
                </dt>
                <dd className="font-semibold">
                  {ev.identity.displayName}
                </dd>
                <dd className="text-muted-foreground">{ev.identity.role}</dd>
                <dd className="mono-xs text-muted-foreground">
                  {ev.identity.username}
                </dd>
              </div>

              <div>
                <dt className="label-xs mb-1">Department</dt>
                <dd className="text-muted-foreground">
                  {ev.identity.department}
                </dd>
              </div>

              <div>
                <dt className="label-xs flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Detection window
                </dt>
                <dd className="mono-xs text-muted-foreground">
                  {formatTs(ev.timeContext.windowStart)}
                </dd>
                <dd className="mono-xs text-muted-foreground">
                  → {formatTs(ev.timeContext.windowEnd)}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">
                  {ev.timeContext.localHourRange} ·{" "}
                  {ev.timeContext.withinShift ? (
                    <span className="text-severity-benign">within expected shift</span>
                  ) : (
                    <span className="text-severity-medium">outside expected hours</span>
                  )}
                </dd>
              </div>
            </dl>
          </Section>

          {/* Policy context */}
          <Section
            title="Policy context"
            subtitle="Authorization rules applied to this event."
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              {ev.policyContext.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Shield
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
          </Section>

          {/* Benign factors — only rendered when present */}
          {ev.benignFactors.length > 0 && (
            <Section
              title="Legitimate-use factors"
              subtitle="Context that argues against malicious intent."
            >
              <ul className="space-y-2">
                {ev.benignFactors.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-sm text-severity-benign"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Reviewer actions */}
          <Section
            title="Reviewer actions"
            subtitle="Every decision is written to the audit trail and the alert timeline."
          >
            <div>
              <label htmlFor="reviewer-note" className="label-xs block mb-1.5">
                Note (optional)
              </label>
              <textarea
                id="reviewer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Reviewer rationale…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.action}
                    onClick={() => mutation.mutate(a.action)}
                    disabled={mutation.isPending}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-55",
                      a.className,
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {mutation.isError && (
                <p
                  role="alert"
                  className="mt-3 rounded-md border border-severity-high/30 bg-severity-high/8 px-3 py-2 text-xs text-severity-high"
                >
                  Action failed:{" "}
                  {(mutation.error as Error).message.replace(/^[A-Z_]+:/, "")}
                </p>
              )}

              {mutation.isSuccess && (
                <p
                  role="status"
                  className="mt-3 text-xs text-severity-benign"
                >
                  Action recorded and written to the audit trail.
                </p>
              )}
            </div>
          </Section>

          {/* Investigation timeline */}
          <Section
            title="Investigation timeline"
            subtitle="Reviewer actions are themselves audited."
          >
            <ol className="space-y-3">
              {alert.timeline.map((entry) => (
                <li key={entry.id} className="relative pl-5">
                  {/* Timeline spine */}
                  <span
                    className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-border"
                    aria-hidden
                  />
                  <span
                    className="absolute left-0.75 top-3.5 h-full w-px bg-border"
                    aria-hidden
                  />

                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {entry.action.replaceAll("_", " ")}
                    </p>
                    <p className="mono-xs shrink-0 text-muted-foreground">
                      {formatTs(entry.ts)}
                    </p>
                  </div>

                  {entry.actor && (
                    <p className="text-xs text-muted-foreground">
                      by {entry.actor}
                    </p>
                  )}
                  {entry.note && (
                    <p className="mt-1 text-xs text-foreground">{entry.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          {/* Risk score explanation — bottom of page, clearly secondary */}
          <div className="panel-security rounded-lg p-4">
            <p className="label-xs text-security-muted mb-2">
              Risk indicator — prototype configuration
            </p>
            <p className="text-[11px] leading-relaxed text-security-muted">
              Weights: brute-force {DETECTION_CONFIG.risk.authBrute} · bulk{" "}
              {DETECTION_CONFIG.risk.bulkAccess} · scope{" "}
              {DETECTION_CONFIG.risk.scopeViolation} · ML{" "}
              {DETECTION_CONFIG.risk.mlWeight} · legitimate relief −
              {DETECTION_CONFIG.risk.legitimateContextRelief}. Demonstration
              configuration only. Not a clinical risk score and not a security
              standard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}