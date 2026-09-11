# System Architecture: SIH 2026 Infrastructure Project Monitoring

This document details the architectural layers, system boundaries, data contracts, and security/anti-leakage principles of the **AI-Powered Predictive Analytics and Early Warning System for Infrastructure Project Monitoring**.

---

## 1. High-Level System Architecture

```text
                             BROWSER / CLIENT
                                    │
                                    ▼
                         Next.js App Router (UI)
                                    │
                                    ▼
                         Next.js Backend API Layer
                            [app/api/projects/...]
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
       Application Database (PostgreSQL)    FastAPI ML Inference Service
            [Prisma ORM Client]                 [ml/api/main.py]
                    │                               │
        ┌───────────┴───────────┐                   ▼
        ▼                       ▼            Saved Model Pipelines
     projects           project_updates     - Cost Overrun (Logistic Regression)
        │                       │           - Time Overrun (Random Forest)
        └───────────┬───────────┘
                    ▼
          predictions & warnings
```

---

## 2. Responsibilities of Each Layer

### Layer 1: Client & Next.js Presentation Layer
- **Responsibility**: Renders responsive analytical dashboards, project detail views, historical S-curves, and alert feeds.
- **Access Pattern**: Communicates **only** with the Next.js Backend API routes.
- **Rule**: The browser **never** calls the Python ML Service directly, preventing client-side tampering of model parameters and exposing internal ML endpoints.

### Layer 2: Next.js Backend API Layer (`app/api/`)
- **Responsibility**:
  - Validates API request parameters and route contexts (`await context.params`).
  - Handles business authorization, filtering, pagination, and data access.
  - Serves as the orchestration layer: reads project snapshots from PostgreSQL, constructs observation-time payloads, invokes the ML service, persists predictions, and triggers early warning rules.
- **Components**:
  - `ProjectService`: Queries projects, filters by sector/ministry/state/risk, and retrieves historical snapshots.
  - `PredictionService`: Orchestrates the prediction flow inside an atomic database transaction.
  - `MLClient`: Dedicated HTTP client with runtime Zod schema validation.
  - `RiskEngine`: Heuristic risk scoring (LOW, MEDIUM, HIGH) and deterministic early warning evaluation.

### Layer 3: Application Data Layer (PostgreSQL & Prisma ORM)
- **Responsibility**: Persistent storage of project master records, monthly monitoring snapshots, model predictions, and active/resolved early warning notifications.
- **Data Model**:
  - `projects`: One record per project, marked with `is_synthetic: true/false`.
  - `project_updates`: Chronological monthly snapshots. Uses composite uniqueness `@@unique([projectId, snapshotMonth])` to prevent duplicate reporting periods.
  - `predictions`: Stored dual-target probability estimates, binary classifications, model versions, and risk tiers.
  - `early_warnings`: Actionable warnings linked to projects, snapshots, and predictions.
- **Anti-Leakage Rule**: Quarantined post-completion fields (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) are **strictly excluded** from the database schema and snapshot storage.

### Layer 4: FastAPI ML Inference Service (`ml/api/`)
- **Responsibility**: Stateless microservice serving calibrated probability predictions.
- **Components**:
  - Deserializes trained pipelines (`model.joblib`) into memory **once** on application startup.
  - Executes feature transformations using the single source of truth: `ml/src/features.py`.
  - Enforces Pydantic `extra="forbid"` to reject any payload containing post-completion outcome data.

---

## 3. End-to-End Prediction & Early Warning Flow

```text
1. Client Triggers Prediction
   POST /api/projects/:projectId/predict
               │
2. Backend Data Retrieval
   ProjectService fetches project metadata & latest monitoring update
               │
3. Payload Construction (Anti-Leakage Guard)
   Builds PredictPayload containing ONLY observation-time features:
   [original_cost_cr, elapsed_months, physical_progress_pct, expenditure_cr, ...]
               │
4. ML Inference Execution
   MLClient sends POST /predict to FastAPI service (port 8000)
   FastAPI loads fitted preprocessor -> executes predict_proba()
               │
5. Runtime Response Validation
   MLClient verifies response with Zod:
   - 0.0 <= cost_overrun.probability <= 1.0
   - 0.0 <= time_overrun.probability <= 1.0
   - prediction in {0, 1}
               │
6. Risk Scoring & Warning Engine
   - calculateOverallRisk(costProb, timeProb) -> "HIGH" | "MEDIUM" | "LOW"
   - evaluateEarlyWarnings() evaluates:
     * COST_OVERRUN_RISK (if cost_prediction == 1)
     * SCHEDULE_DELAY_RISK (if time_prediction == 1)
     * CRITICAL_MILESTONE_SLIPPAGE (if delayed / total >= 30%)
     * EXPENDITURE_BURN_ANOMALY (if financial% - physical% >= 15%)
               │
7. Transactional Persistence
   PostgreSQL stores:
   - predictions record
   - early_warnings records (linked via foreign keys)
               │
8. API Response
   Returns JSON with prediction probabilities, risk tier, and created warnings
```

---

## 4. Key Architectural Safeguards

1. **No Duplicate Feature Engineering**:
   Feature math (`budget_utilization_pct`, `schedule_progress_gap`, `burn_gap`, etc.) is calculated exclusively inside Python (`ml/src/features.py`). TypeScript never re-implements model math.
2. **Zero Outcome Leakage**:
   Post-completion outcome fields (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) cannot enter the API or database snapshot tables.
3. **Decoupled Data Ingestion**:
   Project data importing (`npm run seed`) is completely independent from prediction generation (`npm run seed:predictions`). Real/public data can replace synthetic data without rewriting the data layer.
4. **Hermetic Testing**:
   Backend unit tests mock the ML service and run in sub-second time without requiring external database or ML server daemons.
