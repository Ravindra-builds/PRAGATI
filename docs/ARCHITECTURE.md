# System Architecture: SIH 2026 Infrastructure Project Monitoring

This document details the architectural layers, system boundaries, data contracts, and security/anti-leakage principles of the **AI-Powered Predictive Analytics and Early Warning System for Infrastructure Project Monitoring**.

---

## 1. High-Level System Architecture

```text
                             BROWSER / CLIENT
                                    │
                                    ▼
                        Next.js 16 App Router (UI)
          [Dashboard • Projects & India Map • Project Dossier •
           Portfolio Analytics • Alerts • Data Lab • AI Assistant]
                                    │
                                    ▼
                        Next.js Backend API Layer
          [app/api/projects/..., app/api/data-lab/..., app/api/assistant/chat]
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
Application Database      Hybrid Dual-Target ML     LLM Intelligence Layer
  (PostgreSQL/Prisma)        Inference Layer         [Gemini 2.5 Flash /
           │                        │                 OpenAI / Grounded Mock]
    ┌──────┴──────┐        ┌────────┴────────┐               │
    ▼             ▼        ▼                 ▼               │
 projects  project_updates FastAPI Server   Embedded Weight  │
    │             │        [ml/api/main.py] Engine (<2ms)    │
    └──────┬──────┘        (Railway/Local)  [ml-local-engine]│
           ▼                        │        │               │
  predictions & deduplicated        └────┬───┘               ▼
      early_warnings                     ▼           ContextBuilder &
                             Normalized SHAP Drivers <untrusted_retrieved_data>
```

---

## 2. Responsibilities of Each Layer

### Layer 1: Client & Next.js Presentation Layer
- **Responsibility**: Renders responsive analytical dashboards, state-wise India choropleth map, project dossiers with S-curves and deduplicated diagnostic warning cards, probability bracket histograms, Data Lab ingestion workbench, and the AI Intelligence Assistant.
- **Access Pattern**: Communicates **only** with the Next.js Backend API routes.
- **Rule**: The browser **never** calls the Python ML Service directly, preventing client-side tampering of model parameters and exposing internal ML endpoints.

### Layer 2: Next.js Backend API Layer (`app/api/`)
- **Responsibility**:
  - Validates API request parameters and route contexts (`await context.params`).
  - Handles business authorization, filtering, pagination, and data access.
  - Serves as the orchestration layer: reads project snapshots from PostgreSQL, constructs observation-time payloads, invokes the hybrid ML client, persists predictions, and evaluates deduplicated early warning rules.
- **Components**:
  - `ProjectService`: Queries projects, filters by sector/ministry/state/risk, deduplicates active warnings by rule (`warningType`), and retrieves historical snapshots.
  - `PredictionService`: Orchestrates the prediction flow inside an atomic database transaction, resolving prior active warnings for the project before persisting fresh rule evaluations.
  - `MLClient` & `predictWithEmbeddedWeights`: Dedicated HTTP client (`lib/ml-client.ts`) with runtime Zod validation and automatic zero-downtime failover to the embedded weight-faithful engine (`lib/ml-local-engine.ts` backed by `ml/models/exported_weights.json`).
  - `RiskEngine`: Risk tier classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and deterministic early warning evaluation.

### Layer 3: Application Data Layer (PostgreSQL & Prisma ORM)
- **Responsibility**: Persistent storage of project master records, monthly monitoring snapshots, model predictions, and active/resolved early warning notifications.
- **Data Model**:
  - `projects`: One record per project, marked with `is_synthetic: true/false`.
  - `project_updates`: Chronological monthly snapshots. Uses composite uniqueness `@@unique([projectId, snapshotMonth])` to prevent duplicate reporting periods.
  - `predictions`: Stored dual-target probability estimates, binary classifications, model versions, and risk tiers.
  - `early_warnings`: Actionable warnings linked to projects, snapshots, and predictions (deduplicated per active rule).
- **Anti-Leakage Rule**: Quarantined post-completion fields (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) are **strictly excluded** from the database schema and snapshot storage.

### Layer 4: Hybrid Dual-Target ML Inference Layer (`ml/api/` & `lib/ml-local-engine.ts`)
- **Responsibility**: Stateless inference serving calibrated probability predictions and normalized local SHAP feature attributions (`LinearExplainer` for Cost Overrun + `TreeExplainer` for Schedule Delay).
- **Components**:
  - **Primary FastAPI Service (`ml/api/main.py`)**: Deserializes trained pipelines (`model.joblib`) into memory on startup, includes a Windows Smart App Control C-extension shim (`_safe_import`), and enforces Pydantic `extra="forbid"`. Deployed standalone via `ml/Dockerfile` and `ml/railway.json`.
  - **Embedded Weight-Faithful Failover (`lib/ml-local-engine.ts`)**: Loads the exact exported `RobustScaler` centers/IQRs, `OneHotEncoder` categories, 75-feature `LogisticRegression` weights, and all 150 `RandomForest` decision trees from `ml/models/exported_weights.json` to execute `<2ms` model-authentic inference whenever the external FastAPI server is offline.

### Layer 5: PRAGATI Project Intelligence Assistant Layer (`lib/ai/`, `app/api/assistant/`)
- **Responsibility**: Grounded natural-language reasoning, multi-project comparison, and advisory monitoring assistance.
- **Zero-Calculation Rule**: The LLM is **never** the predictive model. All probabilities, risk tiers, and feature attributions originate strictly from the ML inference layer and PostgreSQL / canonical dataset.
- **Components**:
  - `ContextBuilder`: Extracts entities (`PRJ-XXXX`, sector/state comparisons, burn-gap leaders, portfolio aggregations) and assembles quarantined structured payloads (`<untrusted_retrieved_data>`).
  - `LLMProvider` abstraction: Prioritizes live **Google Gemini (`gemini-2.5-flash`)** when `GEMINI_API_KEY` is configured (automatically upgrading legacy `gemini-1.5-*` model identifiers), supports OpenAI-compatible endpoints, and provides a **question-aware** deterministic `MockGroundedProvider` for offline execution.
  - `ConversationStore`: Session tracking and audit logging in memory without saving secrets or sensitive credentials.
  - `Structured AssistantResponse`: Schema-enforced output format categorizing answers into Executive Summary, Observed Telemetry & Evidence, Model-Supported Risk Signals, Recommended Review Actions, and Limitations.

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

## 4. PRAGATI Intelligence Assistant Grounding Flow

```text
1. User Query Received
   POST /api/assistant/chat  { message: "Why is PRJ-0016 at high risk?", activeProjectId: "PRJ-0016" }
               │
2. Entity Extraction & Routing
   ContextBuilder detects:
   - Target Project: PRJ-0016
   - Query Type: Single project risk explanation
               │
3. Deterministic Grounding Assembly
   ContextBuilder queries ProjectService:
   - Project master metadata (sector, ministry, budget, timeline)
   - Latest monitoring snapshot (progress, expenditure, milestones)
   - Pre-computed ML predictions & calibrated probabilities
   - Model-supported SHAP risk drivers & directional impact
   - Active early warning flags and trigger criteria
               │
4. Prompt Injection Containment
   Data encapsulated in isolated XML block:
   <untrusted_retrieved_data>
     { ... structured JSON telemetry & ML outputs ... }
   </untrusted_retrieved_data>
               │
5. LLM Provider Execution (Gemini / OpenAI / Mock)
   System Prompt enforces:
   - Zero-Calculation Rule: LLM never computes or alters probabilities
   - 4-Way Semantic Categorization
   - Strictly advisory action recommendations
   - Prototype dataset limitation disclaimer
               │
6. Schema Validation & Audit Logging
   Response parsed into AssistantResponse schema
   Interaction recorded in ConversationStore (secrets excluded)
               │
7. Render Structured Intelligence Card
   Client UI renders:
   - Executive Summary
   - Observed Telemetry & Evidence (table)
   - Model-Supported Risk Drivers (SHAP bars)
   - Recommended Review Actions (advisory chips)
   - System Limitations & Advisory Note
```

---

## 5. Key Architectural Safeguards

1. **No Duplicate Feature Engineering**:
   Feature math (`budget_utilization_pct`, `schedule_progress_gap`, `burn_gap`, etc.) is calculated exclusively inside Python (`ml/src/features.py`). TypeScript never re-implements model math.
2. **Zero Outcome Leakage**:
   Post-completion outcome fields (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) cannot enter the API or database snapshot tables.
3. **Decoupled Data Ingestion**:
   Project data importing (`npm run seed`) is completely independent from prediction generation (`npm run seed:predictions`). Real/public data can replace synthetic data without rewriting the data layer.
4. **Hermetic Testing**:
   Backend unit tests mock the ML service and run in sub-second time without requiring external database or ML server daemons.
5. **Zero-Calculation LLM Boundary**:
   The LLM assistant is mathematically prohibited from generating predictions, altering probabilities, or diagnosing risk independently of the trained ML models and database telemetry.
6. **Prompt Injection Quarantine**:
   All user-supplied text and retrieved database fields are quarantined in `<untrusted_retrieved_data>` tags, with strict system prompt defenses prohibiting code execution, prompt extraction, or role overrides.
7. **Advisory Recommendation Verbs**:
   The AI assistant is hardcoded to suggest only institutional oversight and verification actions (`review`, `investigate`, `verify`, `audit`, `clarify`), strictly forbidding imperative administrative orders.

---

## 6. PRAGATI Data Lab Architecture & Ingestion Flow

The **Data Lab** allows external public project dossiers and datasets (PDF, CSV, XLSX, JSON, TXT, MD) to be extracted, validated, and processed through the **existing trained ML pipeline** without duplicating model code.

```text
                               DATA LAB
                                  │
                             File Upload
                                  │
                                  ▼
                           Format Detection
                                  │
                                  ▼
                              Extraction
                                  │
                                  ▼
                            Schema Mapping
                                  │
                                  ▼
                              Validation
                                  │
                                  ▼
                       Cleaning / Normalization
                                  │
                                  ▼
                       Canonical Project Schema
                                  │
                                  ▼
                         Existing ML Pipeline
                                  │
                                  ▼
                              Prediction
                                  │
                                  ▼
                           SHAP Explanation
                                  │
                                  ▼
                               Preview
                                  │
                                  ▼
                            Optional Save
                                  │
                                  ▼
                             PostgreSQL
```

### Architectural Safeguards in Data Lab:
1. **Single Source of Truth for ML**: Uploaded records use the existing FastAPI microservice and model artifacts without creating a secondary preprocessing path.
2. **Anti-Leakage Quarantine**: Future outcome columns are detected, flagged in validation warnings, and quarantined from the ML payload.
3. **Explicit Provenance**: Persisted records are marked with `is_synthetic: false` and accompanied by SHA-256 source hash and metadata.
