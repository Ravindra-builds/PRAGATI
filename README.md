# SIH 2026: AI-Powered Infrastructure Project Monitoring & Early Warning System

An intelligent predictive analytics and early warning prototype for national infrastructure project monitoring using PAIMANA / OCMS-style tracking data.

---

## 1. Project Purpose

Large-scale infrastructure initiatives often suffer from compounding schedule slippages and severe budget escalations. This project provides an AI-powered Early Warning System (EWS) to detect delay trajectories and cost-overrun risks early in project execution cycles, enabling proactive interventions by ministry and project authorities.

---

## 2. Current Development Stage

> [!NOTE]
> **Completed Capabilities:**
> - **ML Workspace & Pipeline**: Leakage-safe feature engineering, project-grouped temporal holdouts, and trained models (`Logistic Regression` for Cost Overrun, `Random Forest` for Time Overrun).
> - **ML Inference Microservice**: FastAPI service (`ml/api/main.py`) serving dual-target probability estimates via `/predict` and metadata via `/model-info`.
> - **PostgreSQL Data Layer**: Relational schema managed via Prisma ORM (`projects`, `project_updates`, `predictions`, `early_warnings`).
> - **Next.js Backend API Routes**: App Router endpoints for project querying, snapshot history, prediction retrieval, early warnings, portfolio analytics, and AI assistant chat.
> - **Risk & Early Warning Engine**: Deterministic prototype rule engine evaluating cost escalation, delay trajectories, milestone slippage, and expenditure burn anomalies.
> - **PRAGATI Project Intelligence Assistant**: Grounded LLM reasoning layer (`/dashboard/assistant`) enforcing the zero-calculation rule, XML prompt injection containment, 4-way semantic categorization, advisory verb guardrails, and multi-provider abstraction (Google Gemini, OpenAI-compatible, offline mock).
> - **Testing & Quality**: 34 Python ML unit tests and 44 TypeScript backend/assistant unit and integration tests passing.

---

## 3. Monorepo Repository Structure

```text
sih-infrastructure-monitoring/
│
├── app/                      # Next.js App Router
│   ├── api/                  # Backend API routes
│   │   ├── alerts/           # Early warning alerts filtering and summary endpoints
│   │   ├── analytics/        # Portfolio aggregations, sector distributions, and correlation data
│   │   ├── assistant/        # Grounded AI assistant chat endpoint (POST /api/assistant/chat)
│   │   └── projects/         # Project querying, snapshots, and prediction endpoints
│   ├── dashboard/            # Institutional Web Application Workspaces
│   │   ├── alerts/           # Early Warning Center & triage queue
│   │   ├── analytics/        # Portfolio analytics, scatter plots, and project comparison
│   │   ├── assistant/        # PRAGATI Project Intelligence Assistant workspace
│   │   ├── projects/         # Projects directory and project detail dossiers
│   │   ├── layout.tsx        # Dashboard shell layout with institutional navigation
│   │   └── page.tsx          # Executive Portfolio Overview
│   ├── layout.tsx            # Root HTML layout
│   └── page.tsx              # Application landing portal
│
├── components/               # Reusable frontend UI components
│   ├── alerts/               # Alert triage cards, filters, and evidence modals
│   ├── analytics/            # Sector charts, scatter plots, and project comparison tools
│   ├── layout/               # Institutional header, navbar, and footer
│   └── project-detail/       # Project dossier, SHAP driver bars, and S-curves
│
├── docs/                     # System architecture and design documentation
│   ├── ARCHITECTURE.md       # High-level architecture, layer responsibilities & data flow
│   └── AI_ASSISTANT.md       # Complete PRAGATI Intelligence Assistant architecture & guide
│
├── lib/                      # Backend services and utilities
│   ├── ai/                   # Grounded AI intelligence engine
│   │   ├── providers/        # LLM providers (Mock, Gemini, OpenAI-compatible)
│   │   ├── context-builder.ts# Entity resolution & deterministic context assembly
│   │   ├── conversation-store.ts # In-memory session and audit storage
│   │   ├── prompts.ts        # Dedicated system prompt & grounding formatting
│   │   ├── provider-factory.ts # Dynamic provider instantiator
│   │   └── types.ts          # Strongly-typed schemas and interfaces
│   ├── db.ts                 # Prisma Client singleton
│   ├── ml-client.ts          # Dedicated FastAPI ML service client with Zod validation
│   ├── risk-engine.ts        # Prototype risk scoring and early warning rule triggers
│   └── services/             # Project, analytics, alert, and prediction domain services
│
├── ml/                       # Isolated Python Machine Learning Workspace
│   ├── api/                  # FastAPI inference microservice (main.py, schemas.py, service.py)
│   ├── data/                 # Raw, processed, and synthetic datasets
│   ├── models/               # Serialized pipelines (model.joblib) & metadata (metadata.json)
│   ├── reports/              # Model comparison, EDA figures, and evaluation reports
│   ├── src/                  # Core feature engineering, modeling & validation scripts
│   └── tests/                # ML unit and API test suite (34 passing tests)
│
├── prisma/                   # PostgreSQL schema and migrations
│   ├── schema.prisma         # Relational database models and constraints
│   └── migrations/           # Tracked PostgreSQL SQL migrations
│
├── scripts/                  # Development scripts
│   ├── seed-projects.ts      # Seeds projects and snapshots from synthetic CSV
│   ├── seed-predictions.ts   # Generates batch predictions via ML service
│   └── verify_env.py         # Python environment verification
│
├── tests/                    # TypeScript test suites (44 passing tests)
│   ├── api.test.ts           # ML client boundary checks and risk rules
│   ├── assistant.test.ts     # AI assistant grounding, injection defense & mock provider
│   ├── database.test.ts      # Schema constraints, duplicate prevention & relationships
│   ├── frontend.test.ts      # Frontend component smoke checks
│   └── integration.test.ts   # End-to-end prediction and warning flow
│
├── docker-compose.yml        # Local PostgreSQL container configuration
├── .env.example              # Environment variables template
├── COMMANDS.md               # Master reference for all developer commands
└── package.json              # Next.js project configuration and scripts
```

---

## 4. Setup & Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on v24.x) & npm
- **Python**: v3.10+ (tested on v3.13.x)
- **PostgreSQL**: Local instance or Docker (`docker compose up -d`)

---

### Step 1: Environment Setup
Copy the template configuration:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL database and `ML_SERVICE_URL` points to `http://127.0.0.1:8000`.

---

### Step 2: Database Initialization (Prisma & PostgreSQL)
1. **Start PostgreSQL** (if using Docker):
   ```bash
   docker compose up -d
   ```
2. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```
3. **Push Schema to PostgreSQL**:
   ```bash
   npm run db:push
   ```
4. **Seed Project Data**:
   ```bash
   npm run seed
   ```

---

### Step 3: Start the ML Inference Microservice
From the repository root (PowerShell):
```powershell
.\ml\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --reload --port 8000
```
- Interactive docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 4: Start the Next.js Web Application
```bash
npm run dev
```
- Access the web application at: [http://localhost:3000](http://localhost:3000)

---

## 5. Backend API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/projects` | List projects with filtering (`sector`, `ministry`, `state`, `status`, `risk`) |
| `GET` | `/api/projects/:projectId` | Single project metadata, latest update, and active warnings |
| `GET` | `/api/projects/:projectId/updates` | Chronological historical monitoring snapshots |
| `GET` | `/api/projects/:projectId/predictions` | Stored prediction history and linked warning alerts |
| `POST` | `/api/projects/:projectId/predict` | Server-side prediction orchestration via ML service + warning generation |
| `GET` | `/api/alerts` | Filter early warning queue by severity, type, sector, or project ID |
| `GET` | `/api/analytics` | Portfolio metrics, sector aggregations, and scatter plot correlations |
| `POST` | `/api/assistant/chat` | PRAGATI Intelligence Assistant grounded Q&A with multi-provider fallback |

---

## 6. Running Tests

### Backend, Assistant & UI Unit Tests (TypeScript)
```bash
npm run test:backend
```
*Runs all 44 automated tests across database constraints, ML client boundary validation, risk engine rules, early warnings, analytics, and PRAGATI Intelligence Assistant grounding.*

To run only the Assistant test suite:
```bash
npx tsx --test tests/assistant.test.ts
```

### Machine Learning Unit Tests (Python)
```powershell
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
```
*Runs 34 tests across feature engineering, split disjointness, model pipelines, SHAP explainers, and FastAPI endpoints.*

### Production Build Verification
```bash
npm run build
```

---

*For detailed commands and operational guides, refer to [`COMMANDS.md`](COMMANDS.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).*
