<div align="center">

<img src="https://ehr-sentinel.onrender.com/logo.png" alt="EHR Sentinel Logo" width="100" height="100" />

# EHR Sentinel

### Explainable Digital Twin for Predictive Healthcare

**Understand the Patient · Predict the Risk · Explain the Outcome**

<br />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ehr--sentinel.onrender.com-2B89FF?style=for-the-badge&logo=render&logoColor=white)](https://ehr-sentinel.onrender.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Digital Twin](https://img.shields.io/badge/Digital%20Twin-Predictive%20Healthcare-7C3AED?style=for-the-badge)](#)
[![Synthetic Data](https://img.shields.io/badge/Data-Synthetic%20%2B%20Open-D99000?style=for-the-badge)](#)

> **Research prototype · Synthetic/open data only · Not a medical device · Not for autonomous clinical diagnosis or treatment**

</div>

---

# 1. Project Overview

**EHR Sentinel** is an AI-powered healthcare Digital Twin platform that creates a continuously updated virtual representation of a patient by combining:

1. **Historical / static Electronic Health Record (EHR) data**
2. **Dynamic physiological and lifestyle data from wearable/IoT streams**

The fused patient state is used to predict a **specific near-term health outcome** and provide an explainable view for clinicians.

## Primary use case

**Type 2 Diabetes — near-term glucose-spike risk prediction**

The system predicts whether a patient's current trajectory is likely to enter a configured high-risk glucose state within the next **2 hours**, using the patient's clinical history together with continuously changing physiological and behavioral signals.

The Digital Twin is presented through a doctor-facing dashboard showing:

- Current patient state
- Historical clinical context
- Dynamic sensor measurements
- Personalized baselines
- Predicted outcome
- Prediction probability
- Contributing factors
- Forecast trend
- Clinical context
- Secure access and audit information

---

# 2. Problem Statement

Healthcare data is usually distributed across historical clinical records and continuously changing physiological information.

An EHR may describe:

- Demographics
- Previous diagnoses
- Laboratory results
- Medication history
- Previous glucose measurements
- Other longitudinal clinical information

Wearable and IoT systems can continuously provide:

- Glucose
- Heart rate
- Heart-rate variability
- Sleep
- Steps
- Activity

Looking at these streams independently provides only a partial view of the patient.

The core problem is:

> **How can historical clinical information and dynamic physiological data be fused into a continuously updated representation of the patient that can predict a specific health outcome before it occurs?**

EHR Sentinel addresses this by maintaining a patient-specific Digital Twin and continuously updating its state as new observations arrive.

---

# 3. Healthcare Use Case

## Type 2 Diabetes

The initial Digital Twin focuses on Type 2 Diabetes because it is well suited to combining longitudinal clinical data with continuously changing physiological measurements.

### Prediction target

> **Predict the probability that the patient's glucose trajectory will enter a configured high-risk spike state within the next 2 hours.**

The prediction is based on the relationship between:

- Current glucose state
- Recent glucose trend
- Historical glucose behavior
- HbA1c and clinical history
- Sleep
- Activity
- Heart rate
- HRV
- Patient-specific baseline behavior

The threshold and target definition are part of the project's synthetic-data and model configuration and are not intended to represent a clinical diagnosis threshold.

---

# 4. Digital Twin Concept

The Digital Twin represents the patient using three connected layers:

```text
┌─────────────────────────────────────────────┐
│             HISTORICAL CLINICAL STATE       │
│                                             │
│ Demographics · Diagnoses · Labs · Meds      │
│ Previous glucose · Longitudinal history     │
└──────────────────────┬──────────────────────┘
                       │
                       │
                       ▼
┌─────────────────────────────────────────────┐
│             DYNAMIC PHYSIOLOGICAL STATE     │
│                                             │
│ Glucose · HR · HRV · Sleep · Steps          │
│ Activity · Recent trends                    │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │  DATA FUSION  │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │ PATIENT TWIN  │
               │ Current state │
               │ Baseline      │
               │ Trends        │
               └───────┬───────┘
                       │
                       ▼
              ┌──────────────────┐
              │ PREDICTION MODEL │
              └────────┬─────────┘
                       │
                       ▼
             ┌────────────────────┐
             │ EXPLAINABLE OUTPUT │
             └─────────┬──────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ DOCTOR DASHBOARD  │
              └──────────────────┘
```

The Digital Twin is dynamic rather than a static patient profile. New measurements change the represented state and can change the predicted outcome.

---

# 5. Two-Stream Data Fusion

A central requirement of the project is the fusion of two independent healthcare data streams.

## Stream 1 — Historical EHR

The EHR layer contains synthetic/open clinical information such as:

```text
Patient demographics
Previous diagnoses
Diabetes history
Laboratory results
HbA1c
Medication history
Previous glucose measurements
Relevant clinical attributes
Synthetic genetic/risk attributes where available
```

## Stream 2 — Dynamic Wearable / IoT Data

The dynamic stream contains time-series measurements such as:

```text
Continuous glucose
Heart rate
Heart-rate variability
Sleep duration
Sleep stages
Step count
Activity intensity
Timestamped observations
```

## Fusion process

```text
Historical EHR
      +
Dynamic Sensor Stream
      ↓
Data cleaning
      ↓
Temporal alignment
      ↓
Feature extraction
      ↓
Patient-specific baselines
      ↓
Feature fusion
      ↓
Digital Twin state
      ↓
Prediction
```

---

# 6. Data Sources

The project follows the challenge's requirement that real patient data must not be used for the prototype. The solution uses **synthetic, anonymized, or appropriately licensed open data**.

## EHR

### Primary approach

**Synthea-generated synthetic EHR data**

The synthetic clinical layer can contain:

- Demographics
- Diagnoses
- Encounters
- Medications
- Laboratory measurements
- Longitudinal patient history

Additional synthetic diabetes-specific fields can be generated where the base dataset does not provide the required granularity.

### Optional research datasets

The architecture is also designed to support appropriately licensed anonymized clinical datasets such as **MIMIC-IV**, subject to their access and licensing requirements.

## Wearable / Sensor data

The prototype uses a synchronized multi-sensor stream containing:

- Continuous glucose
- Heart rate
- HRV
- Sleep duration / stages
- Steps
- Activity intensity

The sensor stream can be:

- Synthetic
- Open-source
- Replayed as a simulated real-time stream

No real patient or identifiable wearable data is required for the prototype.

---

# 7. Patient Digital Twin State

Each Digital Twin maintains a patient-specific state.

## Clinical state

```text
Age
Sex
BMI
Diabetes duration
HbA1c
Medication profile
Historical glucose pattern
Relevant clinical history
```

## Physiological state

```text
Current glucose
Glucose slope
Heart rate
HRV
Sleep
Steps
Activity
```

## Behavioral baseline

```text
Typical glucose level
Typical glucose variability
Typical sleep duration
Typical activity
Typical resting heart rate
Typical HRV
Historical spike behavior
```

The system compares the current state with the patient's own historical baseline instead of relying only on a population-level threshold.

---

# 8. Feature Engineering

## EHR features

```text
age
bmi
diabetes_duration
hba1c
medication_profile
historical_glucose_mean
historical_glucose_variability
previous_spike_frequency
clinical_risk_attributes
```

## Sensor features

```text
current_glucose
glucose_slope
glucose_variability
heart_rate_mean
heart_rate_change
hrv_mean
hrv_deviation
sleep_duration
sleep_deviation
steps_last_6h
activity_level
```

## Fused features

```text
current_vs_historical_glucose
sleep_vs_personal_baseline
activity_vs_personal_baseline
hrv_vs_personal_baseline
glucose_response_pattern
recent_change_rate
patient_risk_profile
```

The feature pipeline is designed to preserve both **clinical context** and **short-term physiological changes**.

---

# 9. AI / ML Architecture

The prediction pipeline uses a **gradient-boosted decision tree model using XGBoost** for the primary near-term risk prediction task.

XGBoost is selected because the challenge use case is primarily structured/tabular and time-windowed data, while tree-based models provide strong performance, fast inference, and practical interpretability for a prototype.

## Prediction pipeline

```text
Raw EHR
   +
Sensor Time-Series
        ↓
Preprocessing
        ↓
Temporal Alignment
        ↓
Feature Engineering
        ↓
EHR + Sensor Feature Fusion
        ↓
XGBoost Prediction Model
        ↓
2-Hour Risk Probability
        ↓
Explainability Layer
        ↓
Doctor Dashboard
```

## Primary model output

```text
Prediction:
Potential glucose spike

Prediction horizon:
2 hours

Probability:
0–100%

Current patient state:
Dynamic

Model version:
Tracked
```

---

# 10. Explainable AI

EHR Sentinel is designed so that the prediction is not presented as an unexplained number.

The system exposes the factors that contributed to the prediction.

## Example

```text
Prediction:
High near-term glucose-spike risk

Probability:
87%

Contributing factors:

↑ Elevated current glucose
↑ Rapid recent glucose increase
↓ Sleep relative to baseline
↓ Recent activity relative to baseline
↑ Historical glucose-spike pattern
↓ HRV relative to personal baseline
```

The explainability layer is designed around feature contributions and patient-specific context.

Where supported by the model pipeline, **SHAP-based feature attribution** can be used to show which features influenced the prediction and in which direction.

The output is intended for **decision support and model transparency**, not autonomous diagnosis.

---

# 11. Digital Twin Simulation

The prototype includes a replayable dynamic stream to demonstrate the Digital Twin changing over time.

Example:

```text
08:00
Patient baseline loaded
        ↓
08:30
Sleep / recovery state updated
        ↓
09:00
New glucose observation
        ↓
09:15
Heart rate + HRV updated
        ↓
09:30
Activity remains below baseline
        ↓
09:45
Feature window recalculated
        ↓
10:00
Digital Twin state updated
        ↓
10:05
Prediction generated
        ↓
10:30
New observations arrive
        ↓
10:35
Prediction recalculated
```

This demonstrates that the patient model responds to changing observations rather than generating one static prediction.

---

# 12. Doctor-Facing Dashboard

The main interface is designed around how a clinician would interact with a virtual patient.

## Patient overview

```text
Patient ID
Age
Condition
Current state
Current risk
```

## Digital Twin state

```text
Glucose
Heart rate
HRV
Sleep
Steps
Activity
```

## Historical context

```text
Previous diagnoses
HbA1c
Medication history
Previous glucose patterns
```

## Predictive section

```text
Predicted outcome
Prediction horizon
Probability
Trend
```

## Explanation section

```text
Why is the prediction changing?
What differs from the patient's baseline?
Which features contributed most?
```

## Timeline

```text
EHR events
Sensor observations
Twin-state updates
Prediction updates
```

---

# 13. Predictive Visualization

The dashboard visualizes both the patient's actual and predicted trajectory.

```text
Current
   │
   ├──────── Historical trend
   │
   ├──────── Personal baseline
   │
   └──────── Forecast
                 │
                 ├── 30 min
                 ├── 60 min
                 ├── 90 min
                 └── 120 min
```

The objective is to make the prediction understandable visually instead of presenting only a probability score.

---

# 14. Example Patient Scenario

### Patient

```text
Type 2 Diabetes
HbA1c: elevated relative to personal baseline
Current glucose: increasing
Sleep: below personal baseline
Activity: low
HRV: below personal baseline
```

### Digital Twin interpretation

The patient's current physiological state differs from their normal pattern.

The model evaluates:

```text
Clinical history
+
Current glucose
+
Glucose rate of change
+
Sleep deviation
+
Activity deviation
+
HRV deviation
+
Historical glucose patterns
```

### Output

```text
Potential glucose-spike risk detected

Prediction horizon:
2 hours

Risk probability:
87%

Primary contributing factors:
1. Rising glucose trend
2. Current glucose deviation
3. Reduced activity
4. Reduced sleep
5. Historical pattern
```

---

# 15. Security Layer

The original EHR Sentinel security architecture remains part of the platform.

The Digital Twin is built on top of an access-controlled healthcare data layer.

## Server-side authorization

Authorization considers:

```text
Role
Department
Patient assignment
Requested action
Resource scope
```

The client interface never acts as the final security boundary.

## Audit logging

Relevant access events are recorded with fields such as:

```text
Event ID
Timestamp
User
Role
Action
Resource
Result
Reason
Session
Source
```

## Security detection

The existing security layer can identify:

- Repeated failed logins
- Bulk record access
- Role/scope violations
- Behavioral anomalies

The security subsystem is complementary to the Digital Twin.

**The primary product goal is predictive healthcare.**

**The security layer protects the sensitive EHR and Digital Twin information used by that product.**

---

# 16. Security + Digital Twin Architecture

```text
                         PATIENT
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       HISTORICAL EHR              SENSOR STREAM
              │                           │
              │                           │
              └─────────────┬─────────────┘
                            ▼
                     DATA PROCESSING
                            │
                            ▼
                     FEATURE FUSION
                            │
                            ▼
                    PATIENT DIGITAL TWIN
                            │
                            ▼
                    PREDICTIVE MODEL
                            │
                            ▼
                    EXPLAINABLE RESULT
                            │
                            ▼
                    DOCTOR DASHBOARD


        ┌──────────────── SECURITY LAYER ────────────────┐
        │                                                 │
        │  Server-side RBAC                               │
        │          ↓                                      │
        │  Audit Logging                                  │
        │          ↓                                      │
        │  Access Monitoring                              │
        │          ↓                                      │
        │  Security Alerts                                │
        │                                                 │
        └─────────────────────────────────────────────────┘
```

---

# 17. Why This Approach

A conventional predictive healthcare application may look like:

```text
Dataset → ML Model → Prediction
```

EHR Sentinel instead aims to demonstrate:

```text
EHR
 +
Dynamic Wearable Data
       ↓
Patient-Specific Digital Twin
       ↓
Continuous State Updates
       ↓
Predictive AI
       ↓
Explainable Forecast
       ↓
Doctor Decision Support
       +
Secure Data Access
```

The focus is therefore not only on model accuracy but on the complete flow from **patient data → patient state → prediction → explanation → clinical interaction**.

---

# 18. Scenario Testing

The prototype supports multiple patient-state scenarios.

## 🟢 Normal state

```text
Stable glucose
Normal sleep
Normal activity
Stable physiological signals
```

Expected:

**Low predicted risk**

---

## 🟡 Emerging risk

```text
Increasing glucose
Reduced sleep
Reduced activity
Early physiological deviation
```

Expected:

**Increasing predicted risk**

---

## 🔴 High-risk trajectory

```text
Rapid glucose increase
Elevated current glucose
Reduced activity
Reduced sleep
HRV deviation
Historical spike tendency
```

Expected:

**High near-term prediction probability**

---

## 🟢 Recovery

```text
Improved activity
Stabilizing glucose
Improved physiological signals
```

Expected:

**Prediction decreases as the Digital Twin state changes**

---

# 19. Data Privacy

This project is a research and demonstration prototype.

### Data policy

- No real patient data is required
- Synthetic or appropriately licensed open data is used
- No production medical records are included
- Secrets are stored through environment variables
- Access is controlled server-side
- Sensitive application events are audited
- Demo data is synthetic

The challenge itself requires anonymized, open-source, or synthetic datasets for the prototype.

---

# 20. Clinical Safety Position

EHR Sentinel is **not a medical device**.

It does not:

- Diagnose disease
- Prescribe treatment
- Replace a physician
- Make autonomous clinical decisions
- Guarantee future health outcomes

The prediction is presented as an **AI-assisted decision-support signal**.

A clinician remains responsible for interpretation and decision-making.

---

# 21. Evaluation Metrics

The project evaluates both the predictive model and the overall system.

## ML metrics

Where applicable:

- Accuracy
- Precision
- Recall
- F1 Score
- ROC-AUC
- PR-AUC
- Calibration
- False-positive rate

## Digital Twin metrics

- State update latency
- Prediction latency
- Sensor-ingestion latency
- Forecast stability
- Scenario consistency

## Explainability

- Explanation completeness
- Feature-attribution availability
- Patient-baseline comparison
- Human readability

---

# 22. Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | TanStack Start · React 19 · TypeScript |
| **Routing** | TanStack Router |
| **UI** | Tailwind CSS v4 · shadcn/ui |
| **Charts** | Recharts · Lucide |
| **Backend** | TanStack Start server functions · Nitro / Node.js |
| **Database** | Supabase · PostgreSQL |
| **Schema / migrations** | Drizzle |
| **Authentication** | Supabase Auth · Server-side sessions |
| **Digital Twin** | TypeScript state + feature-fusion services |
| **Prediction** | XGBoost |
| **Explainability** | SHAP-based feature attribution |
| **Security anomaly detection** | Isolation Forest |
| **Deployment** | Render |
| **Data** | Synthetic / anonymized / open-source |
| **Source control** | GitHub |

---

# 23. Project Structure

```text
ehr-sentinel/
│
├── README.md
├── LICENSE
├── package.json
│
├── docs/
│   ├── architecture.pdf
│   ├── presentation.pdf
│   └── technical-design.md
│
├── data/
│   ├── README.md
│   ├── synthetic/
│   └── processed/
│
├── drizzle/
│   ├── migrations/
│   └── schema.ts
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── digital-twin/
│   │   ├── dashboard/
│   │   ├── predictions/
│   │   ├── security/
│   │   ├── charts/
│   │   └── ui/
│   │
│   ├── integrations/
│   │   └── supabase/
│   │
│   ├── lib/
│   │   ├── digital-twin/
│   │   ├── sensors/
│   │   ├── prediction/
│   │   ├── ml/
│   │   ├── detection/
│   │   ├── authz/
│   │   ├── api/
│   │   ├── server/
│   │   └── types/
│   │
│   └── routes/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── scenarios/
│
└── ...
```

---

# 24. End-to-End Architecture

```text
                   ┌───────────────────────┐
                   │       React UI        │
                   │ Doctor Dashboard      │
                   │ Digital Twin View     │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │    TanStack Start     │
                   │ Server Functions      │
                   └───────────┬───────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
        ┌──────────┐     ┌───────────┐    ┌───────────┐
        │   EHR    │     │  Sensors  │    │ Security  │
        │ Services │     │  Stream   │    │ Services  │
        └────┬─────┘     └─────┬─────┘    └─────┬─────┘
             │                 │                │
             └─────────────────┼────────────────┘
                               ▼
                    ┌────────────────────┐
                    │  Data Processing   │
                    │ Temporal Alignment │
                    │ Feature Engineering│
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │  Digital Twin      │
                    │  State Engine      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   XGBoost Model    │
                    │   Prediction       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Explainability     │
                    │ SHAP / Contributors│
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Doctor Dashboard   │
                    └────────────────────┘

                 ┌────────────────────────────┐
                 │ Supabase / PostgreSQL      │
                 │ EHR · Sensor · Twin · ML   │
                 │ Prediction · Audit data    │
                 └────────────────────────────┘
```

---

# 25. Local Development

## Prerequisites

- Node.js 20+
- npm
- Supabase project
- Git

## Clone

```bash
git clone https://github.com/JayeshJadhav28/ehr-sentinel.git
cd ehr-sentinel
npm install
```

## Environment variables

Create `.env`:

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

Never commit secrets or production credentials.

## Database setup

```bash
npx drizzle-kit push
```

## Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 26. Production Build

```bash
npm run build
npm start
```

Production server:

```text
node .output/server/index.mjs
```

---

# 27. Live Prototype

**Live Application**

https://ehr-sentinel.onrender.com/

The deployed prototype uses synthetic demonstration data.

---

# 28. Demo Accounts

Sign in at:

https://ehr-sentinel.onrender.com/

| Name | Username | Role |
|---|---|---|
| Dr. A. Kumar | `physician.demo` | Physician · Cardiology |
| Dr. R. Mehta | `emergency.demo` | Physician · Emergency |
| N. Pereira | `nurse.demo` | Nurse · General Medicine |
| Dr. S. Iyer | `specialist.demo` | Specialist · Oncology |
| R. Fernandes | `security.demo` | Security Reviewer |
| M. Dsouza | `admin.demo` | Administrator |

> Shared demo credentials are presented through the sign-in experience.

---

# 29. Prototype Scenarios

The application provides scenario-driven demonstration of the platform.

| Scenario | Expected result |
|---|---|
| 🟢 Normal patient state | Stable Digital Twin + low predicted risk |
| 🟡 Emerging glucose risk | Prediction increases as signals deviate |
| 🔴 High-risk glucose trajectory | High near-term prediction probability |
| 🟢 Recovery state | Prediction decreases as signals normalize |
| 🔒 EHR access monitoring | Authorized/unauthorized activity recorded |
| 🔴 Bulk record access | Security alert |
| 🔴 Scope violation | Server-side denial + security alert |
| 🟢 Busy clinician | High legitimate activity without unnecessary security alert |

---

# 30. Demo Video

**Minimum required prototype explanation/demo: 20 minutes**

### Current demo link

https://youtu.be/RxDb1mqNWrI

> **Note:** The final submitted video must satisfy the challenge's minimum-duration and prototype-demonstration requirements.

Recommended content:

```text
00:00–02:00  Problem
02:00–04:00  Digital Twin concept
04:00–06:00  Type 2 Diabetes use case
06:00–09:00  Architecture
09:00–11:00  EHR data
11:00–13:00  Wearable/sensor data
13:00–15:00  Data fusion + ML
15:00–18:00  Live Digital Twin
18:00–19:00  Explainability
19:00–20:00+ Impact + limitations + future scope
```

---

# 31. Architecture Diagram

**Required submission file**

```text
docs/architecture.pdf
```

> **PLACEHOLDER — upload the final architecture diagram to `docs/architecture.pdf` before submission.**

The architecture diagram should cover:

- EHR data
- Sensor stream
- Data processing
- Feature engineering
- Data fusion
- Digital Twin
- Prediction model
- Explainability
- Doctor dashboard
- Security layer
- Database/infrastructure

---

# 32. Presentation

**Required submission file**

```text
docs/presentation.pdf
```

> **PLACEHOLDER — upload the final presentation to `docs/presentation.pdf` before submission.**

The presentation should cover:

- Problem
- Healthcare use case
- Digital Twin concept
- Data streams
- Fusion methodology
- AI/ML model
- Explainability
- Architecture
- Prototype
- Results
- Healthcare impact
- Limitations
- Future scope

---

# 33. Team Details

## Team Name

**MedSentinels**

## Team Leader

**Jayesh Jadhav**

## Team Members

- Jayesh Jadhav
- Omkar Khade
- Arvind Waghmale
- Omkar Bhagat

## Institution

**Dnyanshree Institute of Engineering and Technology**

## Team Size

**4 members**

---

# 34. Challenge Information

## Happiest Health — Digital Twin Challenge 2026

The project is prepared for the **Digital Twin Challenge 2026** conducted as part of the **Reimagining & Reforming Healthcare in India Summit 2026**.

Challenge page:

https://unstop.com/hackathons/crp-digital-twin-challenge-2026-happiest-health-1757873

### Submission requirements addressed by this repository

- Team details
- College information
- Project title
- Problem statement
- Healthcare use case
- Technical stack
- AI/ML model details
- Prototype demonstration
- Open-source license
- Architecture documentation
- Presentation
- Public GitHub repository
- Accessible project files and links

### Phase 1 deadline

**20 October 2026 · 7:00 PM IST**

---

# 35. Submission Folder Naming

Recommended challenge submission folder:

```text
MedSentinels_Dnyanshree Institute of Engineering and Technology
```

Repository:

https://github.com/JayeshJadhav28/ehr-sentinel

The repository must remain **Public** for evaluation.

---

# 36. Open-Source License

This project is released under the:

## MIT License

The final repository must contain:

```text
LICENSE
```

with the complete MIT License text.

---

# 37. Data and Model Disclaimer

This repository contains a research and demonstration prototype.

The prediction output:

- is not a medical diagnosis
- is not a treatment recommendation
- should not be used as a standalone clinical decision
- is based on synthetic/open/anonymized data
- is intended to demonstrate Digital Twin and predictive-healthcare concepts

Any real-world deployment would require appropriate:

- clinical validation
- data governance
- privacy controls
- cybersecurity controls
- regulatory review
- model validation
- clinical workflow integration

---

# 38. Limitations

The current prototype has several limitations:

1. Demonstration data is synthetic, simulated, or appropriately licensed open data.
2. Physiological streams may not reproduce all real-world sensor noise.
3. The prediction target is intentionally narrow.
4. The model is a proof-of-concept rather than a clinically validated prediction system.
5. Sensor availability and frequency may differ between real devices.
6. The Digital Twin represents a focused health state rather than a complete whole-body physiological model.

---

# 39. Future Scope

### Multi-condition Digital Twins

Extend the platform to:

- Hypertension
- Cardiovascular risk
- Other chronic conditions

### More real-world physiological signals

- Continuous glucose monitoring
- Wearable ECG
- Blood pressure
- Respiratory rate
- Temperature

### Advanced temporal models

Explore:

- Temporal neural networks
- Sequence models
- Transformer-based time-series models
- Personalized longitudinal models

### Clinical interoperability

Future versions could explore:

- HL7
- FHIR
- EHR interoperability

### Real-time integrations

Potential future integrations include:

- Apple Health
- Google Health / Fit ecosystems
- CGM devices
- Medical IoT platforms

### Personalized simulation

The Digital Twin can evolve toward patient-specific simulation rather than only prediction.

---

# 40. Research References

### Digital Twin / Healthcare

Happiest Health — Digital Twin Challenge 2026  
https://unstop.com/hackathons/crp-digital-twin-challenge-2026-happiest-health-1757873

### Synthetic EHR

Synthea — Synthetic Patient Generator  
https://synthetichealth.github.io/synthea/

### Clinical Dataset

MIMIC-IV  
https://physionet.org/content/mimiciv/

### Machine Learning

XGBoost  
https://xgboost.readthedocs.io/

### Explainability

SHAP  
https://shap.readthedocs.io/

### Security Logging

NIST SP 800-92 — Guide to Computer Security Log Management  
https://doi.org/10.6028/NIST.SP.800-92

### Application Security Logging

OWASP Logging Cheat Sheet  
https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

### Existing anomaly-detection research

Isolation Forest — Liu, Ting & Zhou  
https://doi.org/10.1109/ICDM.2008.17

---

# 41. Project Links

| Resource | Link |
|---|---|
| **Live Prototype** | https://ehr-sentinel.onrender.com/ |
| **GitHub Repository** | https://github.com/JayeshJadhav28/ehr-sentinel |
| **Demo Video** | https://youtu.be/RxDb1mqNWrI |
| **Architecture Diagram** | `docs/architecture.pdf` — PLACEHOLDER |
| **Presentation** | `docs/presentation.pdf` — PLACEHOLDER |

---

# 42. Submission Checklist

Before submitting, verify:

- [x] Team details
- [x] College information
- [x] Project title
- [x] Healthcare use case
- [x] Problem statement
- [x] Technical stack
- [x] AI/ML model details
- [x] EHR data source documented
- [x] Wearable/sensor data documented
- [x] Two-stream data fusion documented
- [x] Digital Twin architecture documented
- [x] Doctor-facing dashboard documented
- [x] Demo video linked
- [ ] Final 20+ minute video confirmed
- [ ] Architecture PDF uploaded
- [ ] Presentation PDF uploaded
- [ ] LICENSE file added
- [ ] All repository files publicly accessible
- [ ] All external links accessible without additional permissions
- [ ] Final model evaluation results added
- [ ] Final screenshots added
- [ ] Final README reviewed before submission

---

# 43. Final Vision

Healthcare should move from:

> **“What happened to this patient?”**

toward:

> **“What is happening to this patient, and what could happen next?”**

EHR Sentinel explores that transition through a focused Digital Twin that combines longitudinal clinical information with continuously changing physiological data.

```text
Historical EHR
       +
Dynamic Wearable Data
       ↓
Patient Digital Twin
       ↓
Current Health State
       ↓
Predictive AI
       ↓
Future Risk
       ↓
Explainable Insight
       ↓
Clinical Decision Support
```

### **Understand the Patient. Predict the Risk. Explain the Outcome.**

---

<div align="center">

<img src="https://ehr-sentinel.onrender.com/logo.png" alt="EHR Sentinel" width="48" height="48" />

<br />

<sub>
Research prototype · Synthetic/open data · Not a medical device · Not for autonomous diagnosis
</sub>

<br /><br />

<sub>
<a href="https://github.com/JayeshJadhav28/ehr-sentinel">GitHub</a>
&nbsp;·&nbsp;
<a href="https://ehr-sentinel.onrender.com/">Live Prototype</a>
&nbsp;·&nbsp;
<a href="https://jayeshjadhav.com">jayeshjadhav.com</a>
</sub>

</div>
