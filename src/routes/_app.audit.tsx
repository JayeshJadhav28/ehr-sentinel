import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { getAuditEvents } from "@/lib/api/audit.functions";
import { RESULT_CLASS, formatTs } from "@/lib/severity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({
    meta: [
      { title: "Audit explorer · EHR Sentinel" },
      { name: "description", content: "Filterable append-only audit trail of authentication, authorization and record access events." },
      { property: "og:title", content: "Audit explorer · EHR Sentinel" },
      { property: "og:description", content: "Filterable append-only audit trail of access events." },
    ],
  }),
  component: AuditPage,
});

const EVENT_TYPES = ["", "AUTH", "AUTHZ", "RECORD_ACCESS", "RECORD_SEARCH", "REVIEWER", "SCENARIO"];
const RESULTS = ["", "SUCCESS", "DENIED", "FAILURE"];
const ACTIONS = ["", "LOGIN", "LOGOUT", "VIEW", "SEARCH", "UPDATE", "EXPORT", "REPLAY"];

function AuditPage() {
  const [filters, setFilters] = useState({ username: "", eventType: "", action: "", result: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const fetchEvents = useServerFn(getAuditEvents);

  const query = useQuery({
    queryKey: ["audit", filters],
    queryFn: () =>
      fetchEvents({
        data: {
          username: filters.username || undefined,
          eventType: filters.eventType || undefined,
          action: filters.action || undefined,
          result: filters.result || undefined,
          limit: 300,
        },
      }),
  });

  return (
    <div>
      <PageHeader
        title="Audit explorer"
        description="Append-only record of who did what, when, from where, and with what outcome. Clinical record contents are never written to this trail."
      />

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="f-user" className="label-xs">
            Username
          </label>
          <input
            id="f-user"
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            placeholder="physician.demo"
          />
        </div>
        {[
          { id: "f-type", label: "Event type", key: "eventType" as const, options: EVENT_TYPES },
          { id: "f-action", label: "Action", key: "action" as const, options: ACTIONS },
          { id: "f-result", label: "Outcome", key: "result" as const, options: RESULTS },
        ].map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="label-xs">
              {field.label}
            </label>
            <select
              id={field.id}
              value={filters[field.key]}
              onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option === "" ? "All" : option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {query.isPending ? <LoadingState label="Loading audit events" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {query.data ? (
        query.data.length === 0 ? (
          <EmptyState title="No events match these filters" description="Broaden the filters or run a scenario replay." />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Audit events</caption>
              <thead className="border-b border-border">
                <tr className="label-xs">
                  <th className="px-3 py-2">Seq</th>
                  <th className="px-3 py-2">Timestamp (UTC)</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Records</th>
                  <th className="px-3 py-2">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {query.data.map((event) => {
                  const denied = event.result === "DENIED";
                  const open = expanded === event.id;
                  return (
                    <Fragment key={event.id}>
                      <tr
                        tabIndex={0}
                        role="button"
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : event.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpanded(open ? null : event.id);
                          }
                        }}
                        className={cn(
                          "cursor-pointer hover:bg-accent/40",
                          denied && "bg-severity-high/8 border-l-2 border-l-severity-high",
                        )}
                      >
                        <td className="mono-xs px-3 py-1.5 text-muted-foreground">{event.seq}</td>
                        <td className="mono-xs px-3 py-1.5 text-muted-foreground">{formatTs(event.timestamp)}</td>
                        <td className="px-3 py-1.5">{event.username ?? "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{event.eventType}</td>
                        <td className="px-3 py-1.5">{event.action}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{event.targetType ?? "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums">{event.recordsReturned}</td>
                        <td className={cn("px-3 py-1.5 font-medium", RESULT_CLASS[event.result])}>{event.result}</td>
                      </tr>
                      {open ? (
                        <tr className="bg-surface-raised">
                          <td colSpan={8} className="px-4 py-3">
                            <dl className="grid gap-3 text-xs sm:grid-cols-3 xl:grid-cols-4">
                              {[
                                ["Event ID", event.id],
                                ["Correlation ID", event.correlationId],
                                ["Session", event.sessionId ?? "—"],
                                ["Role", event.role ?? "—"],
                                ["Source address", event.sourceIp ?? "—"],
                                ["Target ID", event.targetId ?? "—"],
                                ["Reason code", event.reasonCode ?? "—"],
                                ["Scenario tag", event.scenarioTag ?? "—"],
                              ].map(([term, value]) => (
                                <div key={term}>
                                  <dt className="label-xs">{term}</dt>
                                  <dd className="mono-xs break-all text-muted-foreground">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
