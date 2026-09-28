<div align="center">
  <img src="https://ehr-sentinel.onrender.com/logo.png" alt="EHR Sentinel Logo" width="100" height="100" />
  <h1>EHR Sentinel</h1>
</div>

**Explainable AI for healthcare access monitoring**

Detect abnormal access · Preserve legitimate care · Explain every alert

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ehr--sentinel.onrender.com-2B89FF?style=for-the-badge&logo=render&logoColor=white)](https://ehr-sentinel.onrender.com)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Demo](https://img.shields.io/badge/Synthetic%20Data%20Only-Demo-D99000?style=for-the-badge)

> Research prototype · Synthetic data only · Not a medical device · Not a production EHR

---

## What is EHR Sentinel?

EHR Sentinel is a security monitoring layer for electronic health record systems. Every access attempt is **authorized server-side**, written to an **append-only audit trail**, and evaluated by a **deterministic detection engine**. Every alert ships with a full evidence package — so reviewers understand exactly *what happened* and *why* before they see a risk score.

```
Observed event → Context → Evidence → Detection rules → ML signal → Risk indicator
```

The interface answers **"What happened?"** before **"How risky is it?"**

---

## Key capabilities

| Capability | Detail |
|---|---|
| 🔒 **Server-side RBAC** | Role × department scope × care-assignment. The browser never decides. |
| 📋 **Append-only audit** | Who, what, when, where, outcome — every attempt logged, authorized or denied. |
| ⚡ **Detection engine** | Auth brute-force, bulk record access, and scope violation rules — deterministic, not ML-dependent. |
| ✅ **Benign-aware** | A busy ED physician accessing 45 records in 20 minutes is never misclassified as an attacker. |
| 🧠 **ML signal** | Isolation Forest anomaly score — supporting context only. It never authorizes or blocks access. |
| 🔍 **Evidence-first UI** | Observed facts → context → rules → ML score → risk indicator. Score is always last. |

---

## The key distinction

The most important design goal: high volume alone is never enough to raise an alert.

| | Scenario A — Bulk access | Scenario B — Busy clinician |
|---|---|---|
| Records accessed | 42 in 4 minutes | 45 in 20 minutes |
| Time | 02:10 — outside shift | 14:20 — active shift |
| Patient scope | 3 out-of-scope denials | All assigned patients |
| ML signal | 0.91 — anomalous | Within baseline |
| **Outcome** | **🔴 ALERT raised** | **🟢 No alert — legitimate** |

---

## Demo accounts

Sign in at **[ehr-sentinel.onrender.com](https://ehr-sentinel.onrender.com)**

| Name | Username | Role |
|---|---|---|
| Dr. A. Kumar | `physician.demo` | Physician · Cardiology |
| Dr. R. Mehta | `emergency.demo` | Physician · Emergency |
| N. Pereira | `nurse.demo` | Nurse · General Medicine |
| Dr. S. Iyer | `specialist.demo` | Specialist · Oncology |
| R. Fernandes | `security.demo` | Security Reviewer |
| M. Dsouza | `admin.demo` | Administrator |

> Shared demo password is shown on the sign-in page.

---

## Detection scenarios

Run any scenario live from the **Scenario Replay** screen inside the demo.

| Scenario | Expected outcome |
|---|---|
| 🟢 Normal activity | Audit events only. No alert. |
| 🔴 Brute force | `AUTH_BRUTE` — HIGH severity alert. |
| 🔴 Bulk access | `BULK_RECORD_ACCESS` alert raised. |
| 🔴 Scope violation | Server-side denial + `ROLE_SCOPE_VIOLATION` alert. |
| 🔴 Combined attack | Multiple rules fire. Highest risk score. |
| 🟢 Busy clinician | High volume, all legitimate. **No alert created.** |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework** | TanStack Start (SSR) · React 19 · TypeScript 5.8 |
| **Routing / data** | TanStack Router · TanStack Query · server functions (RPC) |
| **UI** | Tailwind CSS v4 · shadcn/ui (new-york) · Recharts · Lucide icons |
| **Database** | Supabase (hosted Postgres) · Drizzle for migrations only |
| **Auth / sessions** | Server-side sessions · Supabase Auth |
| **ML** | Hand-rolled Isolation Forest `src/lib/ml/` |
| **Deploy** | Render (Web Service · Node.js) |

---

## Project structure

```
src/
├── routes/              # Pages — file-based routing
│   ├── index.tsx        # Landing page + sign-in
│   ├── _app.overview    # Security dashboard
│   ├── _app.alerts.*    # Alert list + investigation
│   ├── _app.patients.*  # Patient directory + records
│   ├── _app.audit       # Audit explorer
│   ├── _app.behavior    # Behavioral baseline profiles
│   └── _app.scenarios   # Scenario replay
├── components/
│   ├── ui/              # shadcn/ui primitives (~50 components)
│   ├── layout/          # AppShell, sidebar, topbar
│   ├── charts/          # Recharts dashboard charts
│   └── common/          # SeverityBadge, States, PageHeader
├── lib/
│   ├── api/             # Typed client RPC (server functions)
│   ├── authz/           # RBAC policies, scope, authorization
│   ├── detection/       # Detection rules + risk scorer + evidence builder
│   ├── ml/              # Isolation Forest + feature builder + anomaly service
│   └── server/          # I/O boundary — Supabase queries, sessions
├── integrations/
│   └── supabase/        # Supabase client setup + auth middleware
└── styles.css           # Design tokens (Tailwind v4)

drizzle/                 # Schema + SQL migrations (tooling only)
```

---

## Request lifecycle

```
Browser request
      │
      ▼
TanStack Start (SSR)
      │
      ▼
Authorization (authz/authorize.ts)
  role_policy_allows
  + resource_in_scope
  + assignment_allows
      │
      ├─── DENIED ──→ Audit event logged → 403 returned
      │
      ▼
Action executed
      │
      ▼
Audit event written (append-only)
      │
      ▼
Detection engine (detection/engine.ts)
  Feature builder
  → Rule engine (brute force · bulk access · scope violation)
  → ML engine (Isolation Forest)
  → Risk scorer + evidence builder
      │
      ├─── Alert raised ──→ Evidence package stored
      │
      ▼
Response returned to client
```

---

## Getting started locally

### Prerequisites

- Node.js 20+
- A Supabase project

### 1. Clone and install

```bash
git clone https://github.com/JayeshJadhav28/ehr-sentinel.git
cd ehr-sentinel
npm install
```

### 2. Environment variables

Create `.env` at the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### 3. Run database migrations

```bash
npx drizzle-kit push
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Building for production

```bash
# Build
npm run build

# Start the production server
npm start
# → node .output/server/index.mjs
```

---

## Deployment

Deployed on **Render** as a Node.js Web Service.

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Runtime | Node.js |
| Database | Supabase Cloud (external) |

---

<div align="center">
  <img src="https://ehr-sentinel.onrender.com/logo.png" alt="EHR Sentinel" width="48" height="48" />
  <br />
  <sub>
    Research prototype · Synthetic data only · Not a medical device · Not a production EHR
    <br />
    <a href="https://jayeshjadhav.com">jayeshjadhav.com</a>
  </sub>
</div>
