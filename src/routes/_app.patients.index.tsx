import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { searchPatients } from "@/lib/api/patients.functions";

export const Route = createFileRoute("/_app/patients/")({
  head: () => ({
    meta: [
      { title: "Patient directory · EHR Sentinel" },
      { name: "description", content: "Synthetic patient directory with per-patient access scope indicators." },
      { property: "og:title", content: "Patient directory · EHR Sentinel" },
      { property: "og:description", content: "Synthetic patient directory with per-patient access scope indicators." },
    ],
  }),
  component: PatientsPage,
});

function ScopeChip({ assigned, inScope }: { assigned: boolean; inScope: boolean }) {
  if (assigned)
    return (
      <span className="rounded border border-severity-benign/40 bg-severity-benign/10 px-2 py-0.5 text-xs font-medium text-severity-benign">
        Assigned
      </span>
    );
  if (inScope)
    return (
      <span className="rounded border border-severity-medium/40 bg-severity-medium/10 px-2 py-0.5 text-xs font-medium text-severity-medium">
        In department, not assigned
      </span>
    );
  return (
    <span className="rounded border border-severity-high/40 bg-severity-high/10 px-2 py-0.5 text-xs font-medium text-severity-high">
      Out of scope
    </span>
  );
}

function PatientsPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const search = useServerFn(searchPatients);
  const result = useQuery({
    queryKey: ["patients", submitted],
    queryFn: () => search({ data: { query: submitted } }),
  });

  return (
    <div>
      <PageHeader
        title="Patient directory"
        description="Searching is logged as a RECORD_SEARCH event. Opening a patient is authorized on the server; out-of-scope attempts are denied and recorded."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="mb-4 flex gap-2"
        role="search"
      >
        <label htmlFor="patient-search" className="sr-only">
          Search patients by name or synthetic MRN
        </label>
        <input
          id="patient-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or MRN-DEMO-..."
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Search
        </button>
      </form>

      {result.isPending ? <LoadingState label="Loading patients" /> : null}
      {result.isError ? <ErrorState error={result.error} onRetry={() => void result.refetch()} /> : null}

      {result.data ? (
        result.data.length === 0 ? (
          <EmptyState title="No matching patients" description="Adjust your search terms and try again." />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Synthetic patients with access scope</caption>
              <thead className="border-b border-border">
                <tr className="label-xs">
                  <th className="px-4 py-2">Patient</th>
                  <th className="px-4 py-2">Synthetic MRN</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Cohort</th>
                  <th className="px-4 py-2">Access scope</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40">
                    <td className="px-4 py-2 font-medium">{p.displayName}</td>
                    <td className="mono-xs px-4 py-2 text-muted-foreground">{p.syntheticMrn}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.departmentName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.demographicBand}</td>
                    <td className="px-4 py-2">
                      <ScopeChip assigned={p.assigned} inScope={p.inScope} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: p.id }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open record
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Opening an out-of-scope record is intentionally possible from this list: the server denies it, records the
        denial and feeds the detection engine.
      </p>
    </div>
  );
}
