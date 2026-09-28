# EHR Sentinel

**Explainable AI for healthcare access monitoring.**

Every EHR access decision is authorized server-side, written to an
append-only audit trail, evaluated by a deterministic detection engine,
and every alert ships with a full evidence package.

> Research prototype · Synthetic data only · Not a medical device · Not a production EHR

---

## What it does

| Capability        | Detail                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Server-side RBAC  | Role × department scope × care-assignment. Browser never decides.       |
| Append-only audit | Who, what, when, where, outcome — every attempt logged.                 |
| Detection engine  | Auth brute-force, bulk record access, scope violations.                 |
| Benign-aware      | A busy ED physician is never misclassified as an attacker.              |
| ML signal         | Isolation Forest anomaly score — supporting context only, never blocks. |
| Evidence-first UI | Observed event → context → evidence → rules → ML score → risk last.     |

---

## Tech stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Framework      | TanStack Start (SSR) + React 19 + TypeScript 5.8        |
| Routing / data | TanStack Router + TanStack Query + server functions     |
| UI             | Tailwind CSS v4, shadcn/ui (new-york), Recharts, Lucide |
| Database       | Supabase (Postgres) — hosted, no self-managed DB        |
| ML             | Hand-rolled Isolation Forest (`src/lib/ml/`)            |
| Build          | Vite 8 + Nitro (`node` preset)                          |

---

## Getting started locally

### Prerequisites

- Node.js 20+
- A Supabase project (see environment variables below)

### 1. Clone and install

```bash
git clone https://github.com/JayeshJadhav28/ehr-sentinel.git
cd ehr-sentinel
npm install
```
