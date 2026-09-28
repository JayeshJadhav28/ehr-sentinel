import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ErrorState, LoadingState } from "@/components/common/States";
import { getPatient } from "@/lib/api/patients.functions";
import { formatTs } from "@/lib/severity";

export const Route = createFileRoute("/_app/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient record · EHR Sentinel" },
      { name: "description", content: "Synthetic patient record view with an explicit access scope decision." },
      { property: "og:title", content: "Patient record · EHR Sentinel" },
      { property: "og:description", content: "Synthetic patient record view with an explicit access scope decision." },
    ],
  }),
  component: PatientDetailPage,
});

function PatientDetailPage() {
  const { patientId } = Route.useParams();
  const fetchPatient = useServerFn(getPatient);
  const query = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient({ data: { patientId } }),
    retry: false,
  });

  if (query.isPending) return <LoadingState label="Authorizing access" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;

  if ("denied" in data) {
    return (
      <div className="max-w-2xl">
        <Link to="/patients" className="text-xs text-primary hover:underline">
          ← Back to patient directory
        </Link>
        <div className="panel mt-3 border-severity-high/50 p-6" role="alert">
          <div className="flex items-center gap-2">
            <span className="rounded border border-severity-high/50 bg-severity-high/10 px-2 py-0.5 text-xs font-semibold text-severity-high">
              403 ACCESS DENIED
            </span>
            <span className="mono-xs text-muted-foreground">{data.reasonCode}</span>
          </div>
          <p className="mt-3 text-sm">{data.message}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="label-xs">Policy statement</dt>
              <dd className="text-muted-foreground">{data.policyStatement}</dd>
            </div>
            <div>
              <dt className="label-xs">Actual state</dt>
              <dd className="text-muted-foreground">{data.actualStatement}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            No clinical content was returned. An AUTHZ audit event was written and the detection engine evaluated this
            attempt.
          </p>
        </div>
      </div>
    );
  }

  const { patient, records, visitCount } = data;

  return (
    <div>
      <Link to="/patients" className="text-xs text-primary hover:underline">
        ← Back to patient directory
      </Link>

      <div className="panel mt-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{patient.displayName}</h1>
            <p className="mono-xs mt-1 text-muted-foreground">
              {patient.syntheticMrn} · {patient.departmentName} · {patient.demographicBand}
            </p>
          </div>
          <div className="rounded-md border border-severity-benign/40 bg-severity-benign/10 px-3 py-2">
            <p className="label-xs text-severity-benign">Access scope</p>
            <p className="mt-0.5 text-sm font-medium text-severity-benign">
              {patient.assigned ? "Authorized · assigned care team" : "Authorized · role and scope satisfied"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Decision recorded in the audit trail.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Record timeline ({records.length})</h2>
          <p className="text-xs text-muted-foreground">Synthetic clinical entries generated for demonstration.</p>
          <ol className="mt-4 space-y-3">
            {records.map((record) => (
              <li key={record.id} className="border-l-2 border-border pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                    {record.recordType}
                  </span>
                  <span className="text-sm font-medium">{record.title}</span>
                  <span className="mono-xs text-muted-foreground">{formatTs(record.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{record.summary}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel h-fit p-4">
          <h2 className="text-sm font-semibold">Access context</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="label-xs">Records returned</dt>
              <dd>{records.length}</dd>
            </div>
            <div>
              <dt className="label-xs">Encounters</dt>
              <dd>{visitCount}</dd>
            </div>
            <div>
              <dt className="label-xs">Audit</dt>
              <dd className="text-muted-foreground">
                A RECORD_ACCESS event with the returned record count was written for this view. Record contents are
                never stored in the audit trail.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
