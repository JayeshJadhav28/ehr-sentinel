import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Brain,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  History,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { getMe, login } from "@/lib/api/auth.functions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EHR Sentinel — Explainable AI for Healthcare Access Monitoring" },
      {
        name: "description",
        content:
          "EHR Sentinel detects abnormal EHR access, preserves legitimate clinical work, and explains every alert with evidence. Synthetic demonstration data only.",
      },
      {
        property: "og:title",
        content: "EHR Sentinel — Explainable AI for Healthcare Access Monitoring",
      },
      {
        property: "og:description",
        content:
          "Detect abnormal access. Preserve legitimate care. Explain every alert.",
      },
    ],
  }),
  component: LandingPage,
});

/* ─────────────────────────────────────────────────────────────────
   Small reusable primitives
───────────────────────────────────────────────────────────────── */

function SentinelMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className={cn("h-6 w-6", className)}
    />
  );
}

/* Subtle top nav ------------------------------------------------- */
function TopNav({ onSignIn }: { onSignIn: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <SentinelMark className="h-6 w-6" />
          <span className="text-sm font-bold tracking-tight text-foreground">
            EHR Sentinel
          </span>
        </div>

        <nav className="hidden items-center gap-6 sm:flex" aria-label="Page sections">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#architecture" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Architecture
          </a>
          <a href="#demo-flow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
        </nav>

        <button
          onClick={onSignIn}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in to demo
        </button>
      </div>
    </header>
  );
}

/* Demo badge ---------------------------------------------------- */
function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
      <Database className="h-3 w-3" aria-hidden />
      DEMO ENVIRONMENT · SYNTHETIC DATA ONLY
    </span>
  );
}

/* Section wrapper ----------------------------------------------- */
function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto max-w-6xl px-6 py-20", className)}
    >
      {children}
    </section>
  );
}

/* Section label + heading --------------------------------------- */
function SectionHeading({
  label,
  title,
  subtitle,
  center,
}: {
  label: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("mb-12", center && "text-center")}>
      <p className="label-xs mb-3">{label}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-3 text-base text-muted-foreground", center && "mx-auto max-w-2xl")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Feature card -------------------------------------------------- */
function FeatureCard({
  icon,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent?: "danger" | "warning" | "benign" | "primary";
}) {
  const iconBg = {
    danger:  "bg-severity-high/10 text-severity-high",
    warning: "bg-severity-medium/10 text-severity-medium",
    benign:  "bg-severity-benign/10 text-severity-benign",
    primary: "bg-primary/10 text-primary",
  }[accent ?? "primary"];

  return (
    <div className="panel p-6">
      <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/* Evidence hierarchy pill --------------------------------------- */
function HierarchyStep({
  n,
  label,
  sub,
  last,
}: {
  n: number;
  label: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {n}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      {!last && (
        <div className="my-2 h-6 w-px bg-border" aria-hidden />
      )}
    </div>
  );
}

/* Scenario comparison card -------------------------------------- */
function ScenarioCard({
  title,
  badge,
  badgeTone,
  rows,
  conclusion,
  conclusionTone,
}: {
  title: string;
  badge: string;
  badgeTone: "danger" | "benign";
  rows: { label: string; value: string; flagged?: boolean }[];
  conclusion: string;
  conclusionTone: "danger" | "benign";
}) {
  const toneClass = {
    danger: "border-severity-high/30 bg-severity-high/5",
    benign: "border-severity-benign/30 bg-severity-benign/5",
  }[badgeTone];

  const badgeClass = {
    danger: "border-severity-high/40 bg-severity-high/10 text-severity-high",
    benign: "border-severity-benign/40 bg-severity-benign/10 text-severity-benign",
  }[badgeTone];

  const conclusionClass = {
    danger: "text-severity-high",
    benign: "text-severity-benign",
  }[conclusionTone];

  return (
    <div className={cn("rounded-xl border p-5", toneClass)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", badgeClass)}>
          {badge}
        </span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={cn("font-medium", row.flagged ? "text-severity-high" : "text-foreground")}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4">
        <p className={cn("text-sm font-semibold", conclusionClass)}>{conclusion}</p>
      </div>
    </div>
  );
}

/* Architecture layer -------------------------------------------- */
function ArchLayer({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: "primary" | "warning" | "danger" | "benign" | "muted";
}) {
  const borderColor = {
    primary: "border-l-primary",
    warning: "border-l-severity-medium",
    danger: "border-l-severity-high",
    benign:  "border-l-severity-benign",
    muted:   "border-l-border",
  }[accent];

  return (
    <div className={cn("rounded-lg border border-border border-l-4 bg-surface p-4", borderColor)}>
      <p className="label-xs mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-border bg-surface-subtle px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sign-in section (embedded at bottom — no new route)
───────────────────────────────────────────────────────────────── */
function SignInSection({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const navigate = useNavigate();
  const doLogin = useServerFn(login);
  const whoAmI = useServerFn(getMe);

  const [username, setUsername] = useState("physician.demo");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void whoAmI().then((user) => {
      if (active && user) void navigate({ to: "/overview", replace: true });
    });
    return () => { active = false; };
  }, [navigate, whoAmI]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await doLogin({ data: { username, password } });
      if (!result.ok) {
        setError(result.message ?? "Authentication failed.");
        return;
      }
      await navigate({ to: "/overview", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("SECURITY_DEPENDENCY_UNAVAILABLE")
          ? "The authentication service is unavailable. No access was granted."
          : "Authentication failed. This attempt has been logged.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="sign-in"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="border-t border-border bg-surface-subtle"
      aria-label="Sign in to the demonstration"
    >
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_420px]">

          {/* Left — context */}
          <div className="flex flex-col justify-center">
            <p className="label-xs mb-3">Ready to explore</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Sign in to the live demonstration
            </h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              The demonstration runs entirely on synthetic patient data.
              No real health information is used at any point. Every access attempt
              is authorized server-side, written to an audit trail, and evaluated
              by the detection engine in real time.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: Shield, text: "Server-side RBAC — every decision enforced on the server" },
                { icon: History, text: "Append-only audit — who, what, when, where, outcome" },
                { icon: AlertTriangle, text: "Deterministic rules — brute force, bulk access, scope violations" },
                { icon: CheckCircle2, text: "Benign-aware — a busy emergency clinician is never misclassified" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {text}
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Research prototype · Synthetic data only · Not a medical device · Not a production EHR
            </p>
          </div>

          {/* Right — sign-in form */}
          <div>
            <div className="panel p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                  <SentinelMark className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">EHR Sentinel</p>
                  <p className="text-xs text-muted-foreground">Demonstration access</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="username" className="label-xs block mb-1.5">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-describedby={error ? "signin-error" : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label-xs block mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {error && (
                  <div
                    id="signin-error"
                    role="alert"
                    className="rounded-md border border-severity-high/30 bg-severity-high/8 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-severity-high">
                      Authentication failed
                    </p>
                    <p className="mt-0.5 text-xs text-severity-high/80">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>

            {/* Demo accounts */}
            <div className="mt-4">
              <p className="label-xs mb-2 px-1">Demonstration accounts</p>
              <ul className="space-y-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.username}>
                    <button
                      type="button"
                      onClick={() => {
                        setUsername(account.username);
                        setPassword(DEMO_PASSWORD);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                        username === account.username &&
                          "border-primary/30 bg-accent ring-1 ring-primary/20",
                      )}
                    >
                      <span>
                        <span className="font-medium text-foreground">
                          {account.label}
                        </span>
                        <span className="mono-xs ml-2 text-muted-foreground">
                          {account.username}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {account.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Shared demo password:{" "}
                <span className="mono-xs">{DEMO_PASSWORD}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Landing page
───────────────────────────────────────────────────────────────── */
function LandingPage() {
  const signInRef = useRef<HTMLElement | null>(null);

  function scrollToSignIn() {
    signInRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav onSignIn={scrollToSignIn} />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <DemoBadge />

            <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground">
              Secure every access.
              <br />
              <span className="text-primary">Explain every alert.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              EHR Sentinel is an explainable-AI security layer for electronic health
              records. It detects abnormal access patterns, preserves legitimate
              clinical work, and produces evidence-backed explanations for every
              alert — so reviewers understand exactly what happened and why.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={scrollToSignIn}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Explore the demo
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
              >
                How it works
              </a>
            </div>

            {/* Three headline claims */}
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Lock,
                  label: "Every access decision",
                  sub: "Enforced server-side, never in the browser",
                },
                {
                  icon: Eye,
                  label: "Every event audited",
                  sub: "Append-only trail: who, what, when, where",
                },
                {
                  icon: Brain,
                  label: "Every alert explained",
                  sub: "Evidence first, ML score last",
                },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <Section id="how-it-works">
        <SectionHeading
          label="How it works"
          title="Detection that explains itself"
          subtitle="EHR Sentinel layers deterministic rules, behavioral context, and a machine-learning signal into a single evidence package that a reviewer can read in under a minute."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<History className="h-5 w-5" />}
            title="Append-only audit trail"
            body="Every access attempt — authorized or denied — is written to an immutable audit log. Who accessed what record, when, from where, and with what outcome."
            accent="primary"
          />
          <FeatureCard
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Deterministic detection rules"
            body="Three rule families fire independently: authentication brute force, bulk record retrieval above the user's baseline, and out-of-scope access attempts."
            accent="danger"
          />
          <FeatureCard
            icon={<Brain className="h-5 w-5" />}
            title="Isolation Forest ML signal"
            body="A behavioral anomaly model scores each session against the user's historical baseline. The score is supporting context — it never authorizes or blocks access."
            accent="warning"
          />
          <FeatureCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Benign-aware by design"
            body="An emergency physician accessing 45 records in 20 minutes is not an attacker. The system checks assignment, scope, shift hours, and workload history before raising an alert."
            accent="benign"
          />
        </div>
      </Section>

      {/* ── Evidence hierarchy ────────────────────────────────── */}
      <section className="border-y border-border bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2">

            <div>
              <SectionHeading
                label="Evidence hierarchy"
                title="What happened — before how risky"
                subtitle="Most security tools lead with a score. EHR Sentinel leads with evidence. The risk indicator is always the last item a reviewer sees."
              />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The interface answers <em>What happened?</em> before it answers{" "}
                <em>How risky is it?</em> This means reviewers evaluate facts, not numbers.
              </p>
            </div>

            {/* Hierarchy steps */}
            <div className="flex flex-col justify-center">
              <div className="panel p-6">
                {[
                  { n: 1, label: "Observed event", sub: "Directly recorded in the audit trail" },
                  { n: 2, label: "Context", sub: "Role, department, shift, assignment" },
                  { n: 3, label: "Evidence", sub: "Specific facts from the audit events" },
                  { n: 4, label: "Detection rules", sub: "Which thresholds fired and why" },
                  { n: 5, label: "Model signal", sub: "Isolation Forest anomaly score (supporting only)" },
                  { n: 6, label: "Risk indicator", sub: "Composite score — presented last", last: true },
                ].map((step) => (
                  <HierarchyStep key={step.n} {...step} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The key distinction ───────────────────────────────── */}
      <Section id="demo-flow">
        <SectionHeading
          label="The key distinction"
          title="Suspicious activity vs legitimate high workload"
          subtitle="The most important design goal: EHR Sentinel must never flag a busy clinician as an attacker. These two scenarios look similar on the surface."
          center
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ScenarioCard
            title="Scenario A — Bulk access alert"
            badge="ALERT RAISED"
            badgeTone="danger"
            rows={[
              { label: "Records accessed", value: "42 in 4 minutes", flagged: true },
              { label: "User baseline", value: "6–12 records/hour" },
              { label: "Time of access", value: "02:10 — outside shift" },
              { label: "Patient scope", value: "3 out-of-scope denials", flagged: true },
              { label: "Rule triggered", value: "BULK_RECORD_ACCESS" },
              { label: "ML signal", value: "0.91 (anomalous)" },
            ]}
            conclusion="BULK_RECORD_ACCESS · HIGH severity · Evidence package generated"
            conclusionTone="danger"
          />

          <ScenarioCard
            title="Scenario B — Busy clinician (benign)"
            badge="NO ALERT"
            badgeTone="benign"
            rows={[
              { label: "Records accessed", value: "45 in 20 minutes" },
              { label: "Department", value: "Emergency — high baseline" },
              { label: "Time of access", value: "14:20 — active shift" },
              { label: "Patient scope", value: "All assigned patients" },
              { label: "Scope violations", value: "None" },
              { label: "Historical workload", value: "Consistent with pattern" },
            ]}
            conclusion="LEGITIMATE HIGH ACTIVITY — No alert created"
            conclusionTone="benign"
          />
        </div>

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">
                The system checks context, not just volume
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                High access volume is evaluated alongside role authorization, patient assignment,
                shift hours, and historical workload. A high number alone is never sufficient to
                raise an alert. The detection engine requires multiple corroborating signals —
                or a clear policy violation such as an out-of-scope access attempt.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Architecture ──────────────────────────────────────── */}
      <section id="architecture" className="border-y border-border bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeading
            label="System architecture"
            title="What the prototype actually builds"
            subtitle="Every layer is implemented and running. The detection engine, ML model, audit trail, and authorization policies are all live — not mocked."
          />

          <div className="grid gap-3 md:grid-cols-2">
            <ArchLayer
              label="Frontend (TanStack Start + React)"
              items={["Landing page", "Security dashboard", "Alert investigation", "Audit explorer", "Behavior profiles", "Scenario replay"]}
              accent="primary"
            />
            <ArchLayer
              label="Authorization layer"
              items={["Server-side RBAC", "Role policies", "Care-assignment scope", "Department scope", "Every decision logged"]}
              accent="warning"
            />
            <ArchLayer
              label="Detection engine"
              items={["Auth brute-force rule", "Bulk record access rule", "Scope violation rule", "Risk scorer", "Evidence builder"]}
              accent="danger"
            />
            <ArchLayer
              label="ML + audit"
              items={["Isolation Forest model", "Feature extraction", "Behavioral baseline", "Append-only audit trail", "Correlation IDs"]}
              accent="benign"
            />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <p className="label-xs mb-3">Demo scenarios available</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Normal activity", tone: "benign" },
                { label: "Brute force", tone: "danger" },
                { label: "Bulk access", tone: "danger" },
                { label: "Scope violation", tone: "danger" },
                { label: "Combined attack", tone: "danger" },
                { label: "Busy clinician", tone: "benign" },
              ].map(({ label, tone }) => (
                <span
                  key={label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
                    tone === "danger"
                      ? "border-severity-high/30 bg-severity-high/8 text-severity-high"
                      : "border-severity-benign/30 bg-severity-benign/8 text-severity-benign",
                  )}
                >
                  {tone === "danger"
                    ? <AlertTriangle className="h-3 w-3" aria-hidden />
                    : <CheckCircle2 className="h-3 w-3" aria-hidden />
                  }
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What you can explore ──────────────────────────────── */}
      <Section>
        <SectionHeading
          label="What you can explore"
          title="Six screens, one complete security loop"
          center
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Security dashboard",
              body: "Live counts of alerts, audit events, denied attempts, and ML-flagged activity. Charts show access patterns over time.",
              to: "/overview",
            },
            {
              icon: Users,
              title: "Patient directory",
              body: "Role-filtered patient list. Accessing a patient outside your assigned scope is denied server-side and logged immediately.",
              to: "/patients",
            },
            {
              icon: History,
              title: "Audit explorer",
              body: "Full append-only audit trail with filtering by user, role, action, result, and time. Every event is inspectable.",
              to: "/audit",
            },
            {
              icon: ShieldAlert,
              title: "Alert investigation",
              body: "Evidence-backed alert detail: who, what, when, observed vs expected, triggered rules, ML signal, reviewer actions.",
              to: "/alerts",
            },
            {
              icon: Eye,
              title: "Behavior profiles",
              body: "Per-user baseline comparison. See current session activity plotted against historical norms.",
              to: "/behavior",
            },
            {
              icon: RotateCcw,
              title: "Scenario replay",
              body: "Run any of six pre-built scenarios against the live detection engine. Results appear in the audit trail and alert list immediately.",
              to: "/scenarios",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="panel p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA strip ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <SentinelMark className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to walk through the demo?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Sign in with any demonstration account below. The entire system runs on
            synthetic data — no real patient information is ever used.
          </p>
          <button
            onClick={scrollToSignIn}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
            Sign in below
          </button>
        </div>
      </section>

      {/* ── Sign-in section ───────────────────────────────────── */}
      <SignInSection sectionRef={signInRef} />

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2">
            <SentinelMark className="h-5 w-5" />
            <span className="text-sm font-semibold text-foreground">EHR Sentinel</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Research prototype · Synthetic data only · Not a medical device · Not a production EHR
          </p>
          <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
            <Database className="h-3 w-3 text-primary" aria-hidden />
            <span className="text-xs font-semibold text-primary">
              DEMO ENVIRONMENT
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}