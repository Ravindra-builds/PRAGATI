# PRAGATI: AI-Powered Infrastructure Project Monitoring & Early Warning System

An intelligent predictive analytics, early warning, and grounded decision support platform for national infrastructure project monitoring aligned with MoSPI PAIMANA / OCMS tracking conventions.

---

## 1. Project Purpose & Vision

Large-scale national infrastructure initiatives (costing ₹150 Cr and above) often suffer from compounding schedule slippages and severe capital budget escalations. **PRAGATI** provides an AI-powered Early Warning System (EWS) and decision support platform to detect delay trajectories and cost-overrun risks months in advance, enabling timely, data-backed interventions by central ministries, state authorities, and project monitoring directors.

---

## 2. Key Platform Capabilities

> [!NOTE]
> ### Completed Production Capabilities:
> - **PRAGATI Data Lab (`/dashboard/data-lab`)**:
>   - Multi-format ingestion engine supporting **PDF inspection dossiers**, **Excel spreadsheets (`.xlsx`)**, **CSV**, **JSON**, and **Text/Markdown reports**.
>   - Dynamic schema validation and intelligent parameter alignment with PAIMANA/MoSPI aliases.
>   - Strict target outcome quarantine to prevent future label leakage.
>   - Real-time dual-target ML risk scoring and local SHAP feature attribution before persistence.
>   - One-click dataset persistence to PostgreSQL with transaction isolation.
>   - Interactive Expected Parameters Guide and 5 ready-to-run ministry sample datasets.
> - **Interactive State-Wise Projects Map (`/dashboard/projects`)**:
>   - Interactive vector choropleth map of India (`@svg-maps/india`) spanning all 28 states and 8 UTs.
>   - 3 visualization modes: **Project Count**, **AI Risk Exposure Heatmap**, and **Capital Allocation**.
>   - Real-time state telemetry card (sanctioned cost, cumulative expenditure, high-risk count, physical progress %, burn gap %).
>   - Custom searchable state selector and click-to-filter integration with the 850-project directory.
> - **Dual-Target Predictive ML Engine**:
>   - Leakage-safe feature engineering with separate binary classification models: **Logistic Regression** (Cost Overrun) and **Random Forest** (Schedule Delay).
>   - Calibrated 0.00 – 1.00 risk probabilities audited against 850 central assets.
> - **Local SHAP Explainability & Early Warnings (`/dashboard/alerts`)**:
>   - Shapley value factor decomposition surfacing top positive and negative risk contributors.
>   - Deterministic rule engine monitoring financial-physical burn gaps, milestone slippages, and duration elapsed.
> - **PRAGATI Intelligence Assistant (`/dashboard/assistant`)**:
>   - Grounded LLM reasoning layer enforcing zero-calculation rules, prompt injection containment, 4-way semantic classification, and multi-provider abstraction (Google Gemini, OpenAI-compatible, offline mock).
> - **Portfolio Analytics & Comparison (`/dashboard/analytics`)**:
>   - Sector allocations, financial burn curves, cost vs. time overrun scatter plots, and side-by-side asset comparison benchmarks.
> - **Automated Test Coverage**: **93 tests passing** (59 TypeScript backend/Data Lab/assistant integration tests + 34 Python ML tests).

---

## 3. Monorepo Repository Structure

```text
infrastructure-monitoring/
│
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API Endpoints
│   │   ├── alerts/               # Early warning triage & summary endpoints
│   │   ├── analytics/            # Portfolio metrics, sector distributions & scatter data
│   │   │   └── compare/          # Side-by-side project comparison endpoint
│   │   ├── assistant/chat/       # Grounded AI assistant chat endpoint
│   │   ├── dashboard/summary/    # Executive summary metrics endpoint
│   │   ├── data-lab/             # PRAGATI Data Lab ingestion & inference endpoints
│   │   │   ├── parse/            # Multi-format document parser (PDF, Excel, CSV, JSON)
│   │   │   ├── predict/          # In-memory ML risk scoring & SHAP driver computation
│   │   │   └── save/             # Database persistence endpoint
│   │   └── projects/             # Projects directory, detail dossiers, snapshots & predictions
│   ├── dashboard/                # Institutional Web Workspaces
│   │   ├── alerts/               # Early Warning Center & alert triage queue
│   │   ├── analytics/            # Portfolio analytics, scatter plots & project comparison
│   │   ├── assistant/            # PRAGATI Intelligence Assistant workspace
│   │   ├── data-lab/             # Data Lab ingestion, parameter mapping & validation UI
│   │   ├── projects/             # Projects directory & interactive State Map section
│   │   │   └── [projectId]/      # Comprehensive project dossier & SHAP waterfall charts
│   │   ├── layout.tsx            # Dashboard workspace layout
│   │   └── page.tsx              # Executive Portfolio Overview
│   ├── layout.tsx                # Root layout with metadata, favicon suite & navigation
│   ├── not-found.tsx             # Branded 404 handler
│   └── page.tsx                  # Home landing page with horizontal How It Works pipeline
│
├── components/                   # Reusable UI Component Library
│   ├── ai/                       # Floating chat bot & assistant components
│   ├── alerts/                   # Alert triage cards, filters & evidence dialogs
│   ├── analytics/                # Sector breakdown, scatter plots & comparison matrix
│   ├── data-lab/                 # Multi-format uploader, column mapper & parameter guide
│   ├── layout/                   # Navbar, footer, and institutional headers
│   ├── project-detail/           # Project dossier, S-curves, milestones & SHAP drivers
│   └── projects/                 # India State Map & State Projects telemetry section
│
├── docs/                         # System Architecture Documentation
│   ├── ARCHITECTURE.md           # High-level architecture, layer responsibilities & data flow
│   └── AI_ASSISTANT.md           # Complete PRAGATI Intelligence Assistant architecture
│
├── lib/                          # Core Business Logic & Services
│   ├── ai/                       # Grounded AI assistant engine & LLM providers
│   ├── data-lab/                 # Data Lab extractors, normalizers, validators & persistence
│   │   ├── cleaners.ts           # Currency, percentage & date normalizers
│   │   ├── extractors.ts         # PDF, XLSX, CSV, JSON & Text extractors
│   │   ├── mapping.ts            # Dynamic column mapper & MoSPI alias dictionary
│   │   ├── service.ts            # Persistence & Prisma database service
│   │   ├── types.ts              # Data Lab schemas & type definitions
│   │   └── validators.ts         # Schema validation & anti-leakage quarantine rules
│   ├── db.ts                     # Prisma Client singleton
│   ├── ml-client.ts              # Dedicated ML service client with Zod schema validation
│   ├── risk-engine.ts            # Risk index calculator & early warning rules
│   └── services/                 # Project, analytics, alert, and synthetic dataset services
│
├── ml/                           # Python Machine Learning Workspace
│   ├── api/                      # FastAPI inference microservice (`main.py`, `service.py`)
│   ├── data/                     # Raw, processed, and synthetic datasets
│   ├── models/                   # Serialized pipelines (`model.joblib`) & `metadata.json`
│   ├── src/                      # Feature engineering, training & SHAP explainers
│   └── tests/                    # ML test suite (34 passing unit & API tests)
│
├── prisma/                       # PostgreSQL Relational Schema
│   ├── schema.prisma             # Relational data models & constraints
│   └── migrations/               # SQL migrations
│
├── public/                       # Static Assets & Branding
│   ├── favicon.ico               # Official platform favicon
│   ├── favicon-16x16.png         # 16x16 Favicon
│   ├── favicon-32x32.png         # 32x32 Favicon
│   ├── apple-touch-icon.png      # 180x180 Apple touch icon
│   ├── android-chrome-192x192.png# 192x192 Android icon
│   ├── android-chrome-512x512.png# 512x512 Android icon
│   ├── site.webmanifest          # PWA Web Manifest
│   ├── logo.png                  # Official PRAGATI brand logo
│   └── images/                   # HD hero montage & vector emblem
│
├── scripts/                      # Utility & Seeding Scripts
│   ├── seed-projects.ts          # Seeds projects from synthetic dataset
│   └── seed-predictions.ts       # Generates batch ML predictions
│
├── tests/                        # Automated TypeScript Test Suites (59 passing tests)
│   ├── api.test.ts               # ML client boundary & risk rules tests
│   ├── assistant.test.ts         # AI assistant grounding & prompt injection tests
│   ├── data-lab.test.ts          # Multi-format extraction, mapping, validation & ML tests
│   ├── database.test.ts          # Schema constraints & foreign key tests
│   ├── frontend.test.ts          # Component smoke tests
│   └── integration.test.ts       # End-to-end prediction & alert flow tests
│
├── COMMANDS.md                   # Developer operational reference
└── package.json                  # Next.js configuration and dependencies
```

---

## 4. Setup & Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on v20.x / v22.x / v24.x) & npm
- **Python**: v3.10+ (tested on v3.11 / v3.13)
- **PostgreSQL**: Local instance, Neon Cloud, or Docker (`docker compose up -d`)

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
3. **Push Schema to Database**:
   ```bash
   npm run db:push
   ```
4. **Seed Monitored Infrastructure Assets**:
   ```bash
   npm run seed
   ```

---

### Step 3: Start the ML Inference Microservice
From the repository root (PowerShell / Bash):
```powershell
.\ml\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --reload --port 8000
```
- Interactive OpenAPI documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 4: Start the Next.js Web Application
```bash
npm run dev
```
- Access the web application at: [http://localhost:3000](http://localhost:3000)

---

## 5. Complete Backend API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/projects` | List projects with filtering (`sector`, `ministry`, `state`, `status`, `risk`) |
| `GET` | `/api/projects/:projectId` | Single project metadata, latest update, and active warnings |
| `GET` | `/api/projects/:projectId/updates` | Chronological historical monitoring snapshots |
| `GET` | `/api/projects/:projectId/predictions` | Stored prediction history and linked warning alerts |
| `POST` | `/api/projects/:projectId/predict` | Server-side prediction orchestration via ML service + warning generation |
| `GET` | `/api/alerts` | Filter early warning queue by severity, type, sector, or project ID |
| `GET` | `/api/analytics` | Portfolio metrics, sector aggregations, and scatter plot correlations |
| `GET` | `/api/analytics/compare` | Side-by-side comparative analytics between two projects |
| `GET` | `/api/dashboard/summary` | Executive summary metrics, risk distribution, and urgent attention assets |
| `POST` | `/api/data-lab/parse` | Parse uploaded multi-format project files (PDF, XLSX, CSV, JSON, TXT) |
| `POST` | `/api/data-lab/predict` | Execute dual ML risk predictions & SHAP driver attribution on in-memory records |
| `POST` | `/api/data-lab/save` | Validate and persist ingested project datasets into PostgreSQL database |
| `POST` | `/api/assistant/chat` | PRAGATI Intelligence Assistant grounded Q&A with multi-provider fallback |

---

## 6. Running Tests & Verification

### Automated Full-Stack Test Suite

#### 1. TypeScript Backend, Data Lab & Assistant Tests (59 Tests)
```bash
npm run test:backend
```
*Runs 59 automated tests covering:*
- ML client boundary validation & risk calculation logic.
- PRAGATI Data Lab multi-format file extraction (PDF, XLSX, CSV, JSON, TXT).
- Column alias auto-mapping & target outcome quarantine validation.
- Currency, percentage, and date string cleaning and normalizers.
- Database schema constraints, composite uniqueness, and anti-leakage rules.
- Grounded AI assistant context assembly, prompt injection containment, and fallback handling.

#### 2. Machine Learning Unit Tests (Python - 34 Tests)
```powershell
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
```
*Runs 34 tests across feature engineering, split disjointness, model pipelines, SHAP explainers, and FastAPI endpoints.*

#### 3. Production Build Compilation
```bash
npm run build
```
*Compiles all static, dynamic, and icon routes with zero TypeScript or bundling errors.*

---

## 7. Institutional Governance & Compliance

- **Target Outcome Quarantine Enforced**: Downstream actual outcomes (`cost_overrun`, `time_overrun`, `delay_months`, etc.) are strictly prohibited from entering input features, ingestion mapping, or prediction payloads to guarantee zero target leakage.
- **SHAP Local Explainability**: Every ML prediction is accompanied by Shapley value attributions, explaining feature impacts with directional indicators.
- **MoSPI PAIMANA / OCMS Standards Alignment**: Metric definitions, burn gap formulas, milestone structures, and reporting terminology are calibrated to official Indian infrastructure monitoring conventions.

---

*For developer operations and command shortcuts, refer to [`COMMANDS.md`](COMMANDS.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).*
