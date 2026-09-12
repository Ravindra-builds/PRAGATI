# SIH 2026 Infrastructure Monitoring: Team Command Reference

Welcome to the command reference manual for the **AI-Powered Predictive Analytics & Early Warning System for Infrastructure Project Monitoring**.

This document is written for all team members. Whether you are working on the Next.js frontend, Python data science modules, or testing, this guide explains every command, what it does, when to run it, and what output to expect.

---

## Table of Contents

1. [First-Time Project Setup](#1-first-time-project-setup)
2. [Running the Next.js Application](#2-running-the-nextjs-application)
3. [Python / ML Environment](#3-python--ml-environment)
4. [Synthetic Data Workflow](#4-synthetic-data-workflow)
5. [ML Training Workflow](#5-ml-training-workflow)
6. [Model Artifacts](#6-model-artifacts)
7. [Data Replacement / Adding New Data](#7-data-replacement--adding-new-data)
8. [ML Testing](#8-ml-testing)
9. [Frontend / Application Testing](#9-frontend--application-testing)
10. [Database Commands](#10-database-commands)
11. [Backend / ML Service Commands](#11-backend--ml-service-commands)
12. [PRAGATI AI Intelligence Assistant](#12-pragati-ai-intelligence-assistant)
13. [Git Workflow](#13-git-workflow)
14. [Full Project Verification ("Before Saying It Works")](#14-full-project-verification-before-saying-it-works)
15. [Retraining Cheat Sheet](#15-retraining-cheat-sheet)
16. [Troubleshooting & Common Fixes](#16-troubleshooting--common-fixes)
17. [Command Safety Notes](#17-command-safety-notes)

---

# 1. First-Time Project Setup

When you first clone or pull the repository to a new computer, set up both the Node.js frontend and Python ML workspace.

### Understanding `npm install` vs `pip install`

> [!NOTE]
> - **`npm install`**: Downloads **JavaScript/TypeScript libraries** (Next.js, React, Tailwind CSS) needed for the web dashboard into the `node_modules/` directory.
> - **`pip install -r ml/requirements.txt`**: Downloads **Python data science libraries** (pandas, scikit-learn, numpy) needed for data analysis and machine learning into the isolated `ml/.venv/` directory.

---

### Step 1: Verify Installed Runtimes
Make sure you have Node.js and Python installed on your system.

- **Check Node.js & npm version**:
  ```bash
  # Run from repository root
  node -v
  npm -v
  ```
  - **What it does**: Confirms Node.js and npm are recognized by your terminal.
  - **When to use**: Before running any frontend commands.
  - **Expected output**: Node version `v18.x` or higher (tested on `v24.x`), npm version `v10.x` or higher.

- **Check Python version**:
  ```bash
  # Run from repository root
  python --version
  ```
  - **What it does**: Confirms Python is recognized.
  - **When to use**: Before creating virtual environments.
  - **Expected output**: Python `3.10.x` or higher (tested on `3.13.15`).

---

### Step 2: Install Node Dependencies
```bash
# Run from repository root
npm install
```
- **What it does**: Reads `package.json` and installs Next.js, React, TypeScript, and Tailwind CSS.
- **When to use**: Once after cloning, or whenever a teammate updates `package.json`.
- **Expected output**: `added XXX packages ... found 0 vulnerabilities`.

---

### Step 3: Create the Python Virtual Environment
An isolated virtual environment ensures ML libraries do not conflict with your computer's global Python.

- **On Windows (PowerShell / Command Prompt)**:
  ```powershell
  # Run from repository root
  python -m venv ml/.venv
  ```
- **On macOS / Linux**:
  ```bash
  # Run from repository root
  python3 -m venv ml/.venv
  ```
- **What it does**: Creates a self-contained Python installation inside the `ml/.venv` folder.
- **When to use**: Exactly once when setting up the repository for the first time.
- **Expected output**: A new directory `ml/.venv/` appears (this is git-ignored and not committed).

---

### Step 4: Activate the Virtual Environment
Activating tells your current terminal window to use the Python inside `ml/.venv`.

- **Windows PowerShell**:
  ```powershell
  .\ml\.venv\Scripts\Activate.ps1
  ```
  *(If PowerShell blocks activation with an execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` once in that session).*
- **Windows Command Prompt (cmd)**:
  ```cmd
  ml\.venv\Scripts\activate.bat
  ```
- **macOS / Linux / Git Bash**:
  ```bash
  source ml/.venv/bin/activate
  ```
- **What it does**: Prepends `(.venv)` to your command prompt.
- **When to use**: Every time you open a new terminal window to work on Python/ML scripts.
- **Expected output**: Your prompt changes to `(.venv) PS C:\...>`

---

### Step 5: Install ML Dependencies
```powershell
# With virtual environment activated, or prefix with explicit python path
python -m pip install --upgrade pip
python -m pip install -r ml/requirements.txt
```
- **What it does**: Installs pandas, numpy, scikit-learn, matplotlib, seaborn, jupyter, and openpyxl into `ml/.venv`.
- **When to use**: First-time setup, or whenever `ml/requirements.txt` is modified.
- **Expected output**: `Successfully installed pandas-... scikit-learn-... numpy-...`.

---

### Step 6: Verify Environment Setup
```powershell
# Run from repository root
python scripts/verify_env.py
```
- **What it does**: Validates that all Python libraries load properly and workspace directory paths exist.
- **When to use**: Immediately after setup to confirm everything is working.
- **Expected output**: `SUCCESS: All packages and paths verified successfully!`

---

# 2. Running the Next.js Application

All frontend commands are run from the repository root directory.

### Start Local Development Server
```bash
npm run dev
```
- **What it does**: Launches the local development server with hot-reloading (changes in code appear instantly in the browser).
- **When to use**: While developing frontend pages, components, or UI layouts.
- **Expected output**: `▲ Next.js 16.x.x - Local: http://localhost:3000`.
- **How to stop**: Press `Ctrl + C` in the terminal.

### Compile Production Build
```bash
npm run build
```
- **What it does**: Checks TypeScript types, checks ESLint rules, and bundles all pages into optimized static production code inside `.next/`.
- **When to use**: Before committing frontend changes or deploying to production.
- **Expected output**: `✓ Compiled successfully ... ✓ Generating static pages ... Finalizing page optimization`.

### Start Production Server
```bash
npm run start
```
- **What it does**: Serves the compiled production build from `.next/`. (Must run `npm run build` first).
- **When to use**: To test the final production build locally before deployment.
- **Expected output**: `Ready on http://localhost:3000`.

### Lint Frontend Code
```bash
npm run lint
```
- **What it does**: Scans TypeScript and JSX files for syntax and formatting violations using ESLint.
- **When to use**: Before opening a pull request.
- **Expected output**: `✔ No ESLint warnings or errors`.

### PRAGATI Application Routes
- **`http://localhost:3000/`**: Landing Portal & institutional architecture overview.
- **`http://localhost:3000/dashboard`**: Portfolio Overview, executive KPI cards, risk distribution, and Early Warning Feed.
- **`http://localhost:3000/dashboard/projects`**: Projects Directory with search, sector/ministry/state filters, and pagination.
- **`http://localhost:3000/dashboard/projects/[projectId]`**: Detailed Project Dossier with dual-target ML probabilities, SHAP local risk drivers, physical vs financial indicators, and chronological snapshot history.
- **`http://localhost:3000/dashboard/alerts`**: Early Warning Center with KPI triage cards, multi-criteria filtering (severity, warning type, sector, project ID), and "Why this warning was generated" evidence modal.
- **`http://localhost:3000/dashboard/analytics`**: Portfolio Analytics workspace with sector distributions, schedule vs progress scatter plots, and multi-project comparative analysis.
- **`http://localhost:3000/dashboard/assistant`**: PRAGATI Project Intelligence Assistant workspace for grounded Q&A, risk diagnosis, and comparative telemetry evaluation.
- **`http://localhost:3000/api/assistant/chat`**: AI Assistant chat API endpoint accepting `{ message, activeProjectId?, conversationId? }`.
- **`http://localhost:3000/api/alerts`**: Alerts API endpoint supporting multi-criteria filtering and summary statistics.
- **`http://localhost:3000/api/analytics`**: Analytics API endpoint providing aggregated portfolio metrics.

---

# 3. Python / ML Environment

### Preferred Way to Run Python Commands on Windows
If you do not want to worry about whether your virtual environment is currently activated, you can execute the virtual environment's Python executable directly from the repository root:

```powershell
# Windows direct interpreter execution
.\ml\.venv\Scripts\python.exe <script_path>
```
This guarantees you are using the correct Python interpreter and installed packages every single time.

### Check Installed ML Packages
```powershell
python -m pip list
# Or: .\ml\.venv\Scripts\python.exe -m pip list
```
- **What it does**: Lists every library installed inside `ml/.venv` with its exact version.
- **When to use**: When troubleshooting dependency issues.

### Deactivate Virtual Environment
```bash
deactivate
```
- **What it does**: Exits the virtual environment and restores your terminal to your computer's global Python.
- **When to use**: When you are done working on Python tasks.

---

# 4. Synthetic Data Workflow

All synthetic data scripts are located under `ml/src/`.

> [!CAUTION]
> **Synthetic Data Notice**: The dataset generated by these commands is strictly synthetic and simulated for SIH prototype development. It is **NOT** real government data and must never be cited as official PAIMANA/OCMS data.

### Generate Synthetic Dataset
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/generate_synthetic_data.py
```
- **What it does**: Generates approximately 8,000 multi-snapshot monitoring records across 850 unique infrastructure projects across 5 risk archetypes using a fixed seed (`42`).
- **When to use**: When you need to regenerate the synthetic dataset from scratch.
- **Output location**: Overwrites `ml/data/synthetic/projects_snapshot.csv`.
- **Safe to commit**: Yes, the CSV is tracked in git for consistent team benchmarking.
- **Expected output**:
  ```text
  Generated 8174 snapshots for 850 unique projects.
  Saved to: ...\ml\data\synthetic\projects_snapshot.csv
  ```

### Validate Dataset Integrity
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/validate_dataset.py
```
- **What it does**: Runs 10 automated health checks (missing values, duplicates, progress bounds $[0, 100]$, cost bounds, elapsed time bounds, milestone logic, monotonicity, and target definitions).
- **When to use**: After generating a dataset or when introducing a new data file.
- **Modifies data?**: No, read-only audit.
- **Expected output**:
  ```text
  OVERALL RESULT: ALL VALIDATION CHECKS PASSED.
  ```

### Run Exploratory Data Analysis (EDA)
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/run_eda.py
```
- **What it does**: Computes summary statistics and generates 9 publication-quality analytical plots.
- **When to use**: After generating data to inspect distributions, correlations, and risk signals.
- **Output location**: Writes 9 `.png` images to `ml/reports/eda/figures/`.
- **Safe to commit**: Yes, plots and reports are tracked in version control.
- **Expected output**:
  ```text
  EDA Completed Successfully. All 9 plots saved to: ...\ml\reports\eda\figures
  ```

---

# 5. ML Training Workflow

### Demonstrate Feature Engineering Pipeline (Without Training)
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/demo_pipeline.py
```
- **What it does**: Demonstrates the step-by-step feature engineering process on a sample project row without training any machine learning model:
  `raw snapshot row -> 7 derived features -> target quarantine -> temporal split -> preprocessed feature matrix`.
- **When to use**: To inspect how raw inputs are transformed into numeric and one-hot encoded features.
- **Modifies models?**: No, read-only transformation test.

---

### Train, Evaluate & Save Models
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
```
- **What it does**:
  1. Loads dataset and computes 7 derived features (`ml/src/features.py`).
  2. Applies project-grouped temporal holdout split (`ml/src/split.py`).
  3. Trains 3 candidate algorithms (`LogisticRegression`, `RandomForestClassifier`, `GradientBoostingClassifier`) for both **Cost Overrun** and **Time Overrun**.
  4. Evaluates accuracy, precision, recall, F1, ROC-AUC, PR-AUC, and confusion matrices.
  5. Diagnoses overfitting (Train vs Test metric gap).
  6. Selects the winning prototype models:
     - **Cost Overrun**: `Logistic Regression`
     - **Time Overrun**: `Random Forest`
  7. Computes permutation feature importance on unseen test data.
  8. Serializes the complete pipelines (`preprocessor` + `classifier`) into `ml/models/`.
  9. Updates comparison reports in `ml/reports/model_comparison/`.
- **When to use**: Whenever feature engineering, data, or model hyperparameters change.
- **What gets replaced/overwritten**:
  - `ml/models/cost_overrun/model.joblib`
  - `ml/models/cost_overrun/metadata.json`
  - `ml/models/time_overrun/model.joblib`
  - `ml/models/time_overrun/metadata.json`
  - `ml/reports/model_comparison/MODEL_COMPARISON.md`
  - `ml/reports/model_comparison/EXPERIMENT_NOTES.md`
- **Expected output**: Full evaluation tables for both targets, selected model announcements, and confirmation that artifacts were saved.

---

### Run Sample Inference on Unseen Test Projects
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```
- **What it does**: Loads the saved `model.joblib` pipelines from disk and runs early-warning predictions on 4 randomly sampled projects from the unseen test split.
- **When to use**: To verify that the saved model artifacts can be loaded and make valid predictions.
- **Expected output**:
  ```text
  Project ID               : PRJ-0714
  Cost Overrun Probability : 0.9993 -> Prediction: HIGH RISK [OVERRUN] (Ground Truth: 1)
  Time Overrun Probability : 0.9285 -> Prediction: HIGH RISK [DELAY] (Ground Truth: 1)
  ```

---

### Run Local SHAP Model Explanations on Test Projects
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe ml/src/explain_sample.py
```
- **What it does**: Generates local, prediction-level feature attributions using `TreeExplainer` (Random Forest) and `LinearExplainer` (Logistic Regression), showing the top 5 model-supported risk drivers for both targets on unseen projects.
- **When to use**: To audit and inspect why a specific project received a particular overrun prediction.
- **Expected output**: Formatted report ranking top risk contributors with human-readable display names, unscaled observed values, and directional impacts (`increases_risk` / `decreases_risk`).

---

# 6. Model Artifacts

Trained model artifacts live in:
```text
ml/models/
├── cost_overrun/
│   ├── model.joblib      # Serialized scikit-learn Pipeline (preprocessor + model)
│   └── metadata.json     # Hyperparameters, metrics, feature names & timestamp
└── time_overrun/
    ├── model.joblib      # Serialized scikit-learn Pipeline (preprocessor + model)
    └── metadata.json     # Hyperparameters, metrics, feature names & timestamp
```

### Key Concepts:
1. **`model.joblib`**: This is a complete Python binary file containing the fitted `ColumnTransformer` (scaler + one-hot encoder) and the fitted classification model. It allows feeding raw feature rows directly into `predict_proba()`.
   *(Note: `.joblib` files are large binary weights and are git-ignored to keep the repository fast and lightweight).*
2. **`metadata.json`**: A readable JSON file documenting the model type, decision threshold (default `0.50`), train/test performance metrics, confusion matrix, and top 10 permutation feature importances.
   *(This file IS committed to Git for version tracking).*
3. **When do these files change?**: Only when you explicitly run `python ml/src/train_models.py`.

---

# 7. Data Replacement / Adding New Data

This repository is designed so the machine learning pipeline is **decoupled** from the data source.

### Scenario A: Re-Running with the Existing Synthetic Dataset
If you only changed feature engineering code or model hyperparameters:
```powershell
# 1. Retrain models on existing dataset
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
# 2. Verify predictions
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```

---

### Scenario B: Generating a Fresh Synthetic Dataset
If you want to simulate different project sizes or seed configurations:
```powershell
# 1. Regenerate synthetic data
.\ml\.venv\Scripts\python.exe ml/src/generate_synthetic_data.py
# 2. Validate data
.\ml\.venv\Scripts\python.exe ml/src/validate_dataset.py
# 3. Retrain models
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
```

---

### Scenario C: Replacing with Public / Official PAIMANA-Style Data
When official or public project monitoring datasets become available:

1. **Place the raw file** at:
   ```text
   ml/data/raw/public_paimana_projects.csv
   ```
2. **Ensure schema alignment**: The dataset must contain the 15 candidate fields documented in [`ml/DATA_DICTIONARY.md`](ml/DATA_DICTIONARY.md).
3. **Switch the active data source** in [`ml/src/config.py`](ml/src/config.py):
   ```python
   ACTIVE_DATA_SOURCE: DataSourceType = "public"
   ```
4. **Execute the standard workflow** without rewriting pipeline code:
   ```powershell
   # Step 1: Validate incoming dataset
   .\ml\.venv\Scripts\python.exe ml/src/validate_dataset.py

   # Step 2: Run EDA to check distributions
   .\ml\.venv\Scripts\python.exe ml/src/run_eda.py

   # Step 3: Retrain and compare models on the new dataset
   .\ml\.venv\Scripts\python.exe ml/src/train_models.py

   # Step 4: Run test predictions
   .\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
   ```

---

# 8. ML Testing

Run all automated unit tests using Python's built-in `unittest` runner:

```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
```
*(Or if venv is active: `python -m unittest discover -s ml/tests -v`)*

- **What it does**: Executes all 34 automated unit tests across:
  - `test_environment.py`: Verifies imports, config paths, and synthetic data validation.
  - `test_features_pipeline.py`: Verifies feature formulas, zero-division protection, target quarantine, and train/test project disjointness.
  - `test_model_pipeline.py`: Verifies model artifact loading, metadata integrity, and inference probability ranges.
  - `test_explain.py`: Verifies SHAP TreeExplainer and LinearExplainer attributions, probability invariance, top-N sorting, direction labels, and human-readable feature mappings.
  - `test_api.py`: Verifies FastAPI lifespan startup, `/health`, `/model-info`, `/predict` (with and without explanations), input bounds validation, cross-field rules, and strict leakage prevention (`422 Unprocessable Entity`).
- **When to use**: Before committing any Python or API code changes.
- **Expected output**:
  ```text
  ----------------------------------------------------------------------
  Ran 34 tests in 1.61s

  OK
  ```
- **What passing tests mean**: All mathematical formulas, anti-leakage quarantines, model serialization pipelines, SHAP explainers, and API validation boundaries are functioning as designed.

---

# 9. Frontend / Application Testing

```bash
# Run from repository root
npm run build
npm run lint
```
- **What it does**: Validates TypeScript compilation and ESLint code quality.
- **When to use**: Before committing any frontend UI changes.
- **Expected output**: `✓ Compiled successfully` and `✔ No ESLint warnings or errors`.

---

# 10. Database Commands

The data layer uses **PostgreSQL** managed through **Prisma ORM** (`@prisma/client` and `prisma`).

### Start Local PostgreSQL (Docker)
```powershell
docker compose up -d
```
- **What it does**: Starts a PostgreSQL 16 Alpine container listening on port `5432` with credentials `postgres:postgres` and database `sih_monitoring`.
- **How to stop**: `docker compose down`.

---

### Generate Prisma Client
```powershell
npm run db:generate
```
- **What it does**: Generates strongly-typed TypeScript Prisma Client artifacts into `node_modules/@prisma/client` based on `prisma/schema.prisma`.
- **When to use**: After modifying `prisma/schema.prisma` or pulling repository updates.

---

### Apply Migrations / Push Schema to PostgreSQL
```powershell
# Fast schema sync (ideal for local prototype development)
npm run db:push

# Or deploy tracked SQL migrations
npx prisma migrate deploy
```
- **What it does**: Creates all required tables (`projects`, `project_updates`, `predictions`, `early_warnings`), foreign keys, and indexes in PostgreSQL.

---

### Open Prisma Studio (Interactive Database GUI)
```powershell
npm run db:studio
```
- **What it does**: Launches a local web-based database browser on `http://localhost:5555` to inspect and query records visually.
- **How to stop**: Press `Ctrl + C` in the terminal.

---

### Seed Projects & Monitoring Snapshots
```powershell
npm run seed
```
- **What it does**: Ingests unique projects and monthly snapshots from `ml/data/synthetic/projects_snapshot.csv` into `projects` and `project_updates`.
- **Target Quarantine**: Strictly omits post-completion outcome columns (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`).
- **Synthetic Flag**: Explicitly sets `is_synthetic: true` on all seeded rows.

---

### Generate Batch Predictions & Warnings
```powershell
# Generates predictions for active projects by calling the FastAPI ML service
npm run seed:predictions
```
- **What it does**: Queries projects with active snapshots, calls `POST /predict` on the FastAPI ML service, persists dual-target probabilities into `predictions`, and triggers prototype `early_warnings`.
- **Note**: Ensure the ML service is running first (`uvicorn ml.api.main:app --port 8000`).

---

### Run Backend, Assistant & UI Unit Tests
```powershell
npm run test:backend
```
- **What it does**: Runs all 44 TypeScript backend, assistant, and UI tests covering:
  - Database schema constraints & duplicate protections (`tests/database.test.ts`)
  - ML Client validation & risk engine warning rules (`tests/api.test.ts`)
  - Grounded AI Assistant reasoning & injection defense (`tests/assistant.test.ts`)
  - Frontend component smoke tests (`tests/frontend.test.ts`)
  - End-to-end integration inference flow (`tests/integration.test.ts`)

---

# 11. Backend / ML Service Commands

The ML inference microservice is built using **FastAPI** and **Uvicorn**, serving real-time early-warning predictions for infrastructure projects.

### Start ML Inference Service (Local Development)
```powershell
# Run from repository root
.\ml\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --reload --port 8000
```
*(Or if venv is active: `uvicorn ml.api.main:app --reload --port 8000`)*

- **What it does**: Starts the FastAPI ASGI server on `http://127.0.0.1:8000`. Deserializes both model pipelines (`cost_overrun` and `time_overrun`) into memory **once** during startup lifespan.
- **Interactive Documentation**:
  - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
  - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **How to stop**: Press `Ctrl + C` in the terminal.

---

### Test Service Health
```powershell
curl http://localhost:8000/health
```
- **Expected response (`200 OK`)**:
  ```json
  {"status":"healthy","service":"ml-inference","models_loaded":true}
  ```

---

### Inspect Model Metadata
```powershell
curl http://localhost:8000/model-info
```
- **Expected response (`200 OK`)**: Returns active model architectures, decision thresholds (0.50), test set metrics (accuracy, ROC-AUC, PR-AUC), and top predictive features.

---

### Test Real-Time Prediction Endpoint
```powershell
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "project_id": "PRJ-0714",
    "snapshot_month": "2025-06",
    "ministry": "Ministry of Housing and Urban Affairs",
    "sector": "Urban Development",
    "implementing_agency": "NBCC",
    "state": "Madhya Pradesh",
    "original_cost_cr": 1200.0,
    "planned_duration_months": 27,
    "elapsed_months": 22,
    "physical_progress_pct": 47.6,
    "financial_progress_pct": 63.6,
    "expenditure_cr": 763.0,
    "milestones_total": 6,
    "milestones_delayed": 2,
    "project_status": "Critical"
  }'
```
- **Expected response (`200 OK`)**:
  ```json
  {
    "project_id": "PRJ-0714",
    "cost_overrun": {"probability": 0.9993, "prediction": 1, "risk_level": "HIGH"},
    "time_overrun": {"probability": 0.9285, "prediction": 1, "risk_level": "HIGH"}
  }
  ```

---

### Verify Anti-Leakage Protection
The API strictly forbids post-completion outcome fields (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`). Submitting any forbidden field produces an immediate HTTP 422:
```powershell
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "project_id": "PRJ-0714",
    "snapshot_month": "2025-06",
    "ministry": "Ministry of Housing and Urban Affairs",
    "sector": "Urban Development",
    "implementing_agency": "NBCC",
    "state": "Madhya Pradesh",
    "original_cost_cr": 1200.0,
    "planned_duration_months": 27,
    "elapsed_months": 22,
    "physical_progress_pct": 47.6,
    "financial_progress_pct": 63.6,
    "expenditure_cr": 763.0,
    "milestones_total": 6,
    "milestones_delayed": 2,
    "project_status": "Critical",
    "final_cost_cr": 1400.0
  }'
```
- **Expected response (`422 Unprocessable Entity`)**:
  ```json
  {
    "error": "Validation Error",
    "message": "The request payload failed schema validation or contained forbidden outcome fields.",
    "details": [{"field": "body -> final_cost_cr", "message": "Extra inputs are not permitted", "type": "extra_forbidden"}]
  }
  ```

---

# 12. PRAGATI AI Intelligence Assistant

The PRAGATI Project Intelligence Assistant provides grounded natural-language explanations, multi-project comparisons, and advisory review steps strictly tied to model predictions and database telemetry.

### Run AI Assistant Unit Tests
```powershell
npx tsx --test tests/assistant.test.ts
```
- **What it does**: Runs all 9 assistant tests covering:
  - Grounded context assembly & project extraction (`PRJ-XXXX`)
  - Numerical telemetry preservation & probability exactness
  - Prototype data limitation disclaimers
  - Advisory verb guardrails (`review`, `investigate`, `audit`)
  - XML-based prompt injection quarantine defense
  - Portfolio risk aggregations & multi-project comparisons
  - Provider factory fallback & in-memory audit store
- **When to use**: Before committing changes to `lib/ai/` or `/api/assistant/chat`.

---

### Test Assistant API via cURL / PowerShell
```powershell
curl -X POST http://localhost:3000/api/assistant/chat `
  -H "Content-Type: application/json" `
  -d '{
    "message": "Why is PRJ-0016 flagged for high risk?",
    "activeProjectId": "PRJ-0016"
  }'
```
- **Expected response (`200 OK`)**: Returns structured JSON conforming to `AssistantResponse` with `executiveAnswer`, `observedTelemetry`, `modelRiskSignals`, `recommendedActions`, and `limitationsAdvisory`.

---

### Switch LLM Provider
Set environment variables in `.env`:
```bash
# 1. Deterministic Grounded Offline Mock (Default - Zero API Keys Needed)
LLM_PROVIDER=mock

# 2. Google Gemini (Recommended for Production / Evaluation)
LLM_PROVIDER=gemini
GEMINI_API_KEY="your-gemini-api-key"
LLM_MODEL="gemini-1.5-flash"

# 3. OpenAI-Compatible API (OpenAI, Groq, Ollama)
LLM_PROVIDER=openai
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://api.groq.com/openai/v1" # Optional
LLM_MODEL="llama-3.3-70b-versatile"
```

---

# 13. Git Workflow

Follow this clean, disciplined workflow when collaborating with teammates.

### Daily Development Sequence
```bash
# 1. Check current status and see modified files
git status

# 2. Pull the latest updates from teammates
git pull

# 3. Work on your feature or bugfix...

# 4. Run automated tests to verify nothing broke
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests
npm run build

# 5. Check what changed
git status

# 6. Stage your modified files
git add <file_path>  # or git add .

# 7. Commit with a clear message
git commit -m "feat(ml): update feature engineering for cost velocity"

# 8. Push your commits to remote
git push
```

### Helpful Git Commands
- **`git status`**: Shows modified, staged, and untracked files. Run this frequently!
- **`git branch`**: Lists local branches and marks your active branch with `*`.
- **`git switch -c feature/new-dashboard`**: Creates and switches to a new feature branch.
- **`git switch main`**: Switches back to the `main` branch.
- **`git log --oneline -n 5`**: Shows the last 5 commits in compact format.

---

# 14. Full Project Verification ("Before Saying It Works")

Before telling teammates "the project works" or opening a pull request, run through this verification checklist:

| Check Item | Command to Run | Expected Pass Criteria |
| :--- | :--- | :--- |
| **1. Python Environment** | `python scripts/verify_env.py` | `SUCCESS: All packages and paths verified` |
| **2. Dataset Health** | `python ml/src/validate_dataset.py` | `ALL VALIDATION CHECKS PASSED` |
| **3. ML Unit Tests** | `python -m unittest discover -s ml/tests -v` | `Ran 34 tests ... OK` |
| **4. ML Service Health** | `curl http://localhost:8000/health` | `{"status":"healthy","models_loaded":true}` |
| **5. Model Inference** | `python ml/src/predict_sample.py` | Prints predicted probabilities for 4 test projects |
| **6. Local Explainability** | `python ml/src/explain_sample.py` | Prints SHAP risk drivers for test projects |
| **7. Database Client** | `npm run db:generate` | `✔ Generated Prisma Client` |
| **8. Backend & Assistant Tests** | `npm run test:backend` | `pass 44 ... fail 0` |
| **9. Frontend Build** | `npm run build` | `✓ Compiled successfully in X.Xs` |
| **10. Git Cleanliness** | `git status` | No unintended binary or `.venv` files untracked |

---

# 15. Retraining Cheat Sheet

Use this practical guide to know what to run based on what you changed:

### "I changed the synthetic-data generator"
```powershell
.\ml\.venv\Scripts\python.exe ml/src/generate_synthetic_data.py
.\ml\.venv\Scripts\python.exe ml/src/validate_dataset.py
.\ml\.venv\Scripts\python.exe ml/src/run_eda.py
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```

### "I added a new raw dataset file"
```powershell
# (After updating ACTIVE_DATA_SOURCE in ml/src/config.py)
.\ml\.venv\Scripts\python.exe ml/src/validate_dataset.py
.\ml\.venv\Scripts\python.exe ml/src/run_eda.py
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```

### "I modified feature engineering in `ml/src/features.py`"
```powershell
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```

### "I tuned model hyperparameters in `ml/src/train_models.py`"
```powershell
.\ml\.venv\Scripts\python.exe ml/src/train_models.py
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py
```

### "I only edited frontend code in `app/` or `components/`"
```bash
npm run build
npm run lint
```

### "I pulled teammate changes via `git pull`"
```powershell
npm install
.\ml\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests
npm run build
```

### "I want to verify everything before pushing"
```powershell
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests
npm run build
git status
```

---

# 16. Troubleshooting & Common Fixes

### 1. `python: command not found` or uses wrong Python
- **Problem**: Terminal cannot find Python or is using global Python 3.9 instead of `ml/.venv` Python 3.13.
- **Fix**: Use the explicit path directly:
  ```powershell
  .\ml\.venv\Scripts\python.exe <script>
  ```

### 2. PowerShell blocks virtual environment activation
- **Problem**: `File ...\Activate.ps1 cannot be loaded because running scripts is disabled on this system.`
- **Fix**: Run this command once in your PowerShell window:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\ml\.venv\Scripts\Activate.ps1
  ```

### 3. Missing module (e.g. `ModuleNotFoundError: No module named 'sklearn'`)
- **Problem**: Library is not installed in the active environment.
- **Fix**: Reinstall requirements into the virtual environment:
  ```powershell
  .\ml\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
  ```

### 4. Next.js port 3000 already in use
- **Problem**: `Port 3000 is in use, trying another one...`
- **Fix**: A previous development server is still running in another terminal. Stop it with `Ctrl + C`, or Next.js will automatically run on `http://localhost:3001`.

### 5. `npm run build` fails with TypeScript error
- **Problem**: Type mismatch in frontend code.
- **Fix**: Run `npm run build` and inspect the error message. It will tell you the exact file and line number where the type error occurred.

### 6. Model file not found (`FileNotFoundError: .../model.joblib`)
- **Problem**: Model has not been trained yet or was deleted.
- **Fix**: Run the training script to regenerate the model artifacts:
  ```powershell
  .\ml\.venv\Scripts\python.exe ml/src/train_models.py
  ```

### 7. Unit tests fail after code changes
- **Problem**: An edit to feature engineering or quarantine broke an assertion.
- **Fix**: Run `.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests` to see the exact assertion that failed.

---

# 18. PRAGATI Data Lab Commands

The **PRAGATI Data Lab** enables ingestion, deterministic field mapping, cleaning, and ML inference on external public/official project reports.

### Run Data Lab Tests
```bash
# Run all backend and Data Lab tests
npm run test:backend
```
- **What it does**: Executes unit and integration test suites for CSV, JSON, XLSX, TXT, MD, and PDF extraction, field mapping, currency normalizers, anti-leakage quarantine, and live ML inference.
- **Expected output**: `✔ PRAGATI Data Lab ... (pass 59, fail 0)`.

### Testing Local Data Lab File Upload via cURL
```bash
# Test Data Lab parsing endpoint with a sample CSV file
curl.exe -F "file=@data/sample.csv" http://localhost:3000/api/data-lab/parse
```

---

# 19. Command Safety Notes

| Command | Modifies Dataset? | Retrains Models? | Overwrites Files? | Destructive Risk |
| :--- | :---: | :---: | :---: | :--- |
| `python ml/src/generate_synthetic_data.py` | **YES** | No | Overwrites `projects_snapshot.csv` | **Medium** (Regenerates entire synthetic dataset) |
| `python ml/src/validate_dataset.py` | No | No | None (Read-only) | **Zero** (Completely safe) |
| `python ml/src/run_eda.py` | No | No | Overwrites figures in `ml/reports/eda/figures/` | **Low** (Safe plot regeneration) |
| `python ml/src/demo_pipeline.py` | No | No | None (Read-only) | **Zero** (Completely safe) |
| `python ml/src/train_models.py` | No | **YES** | Overwrites `model.joblib`, `metadata.json`, and reports | **Medium** (Retrains and saves new model weights) |
| `python ml/src/predict_sample.py` | No | No | None (Read-only inference) | **Zero** (Completely safe) |
| `python ml/src/explain_sample.py` | No | No | None (Read-only local explainability) | **Zero** (Completely safe) |
| `uvicorn ml.api.main:app --port 8000` | No | No | None (Stateless inference server) | **Zero** (Completely safe) |
| `python -m unittest discover -s ml/tests` | No | No | None (Read-only) | **Zero** (Completely safe) |
| `npm run dev` / `npm run build` | No | No | Overwrites `.next/` cache | **Zero** (Standard web builds) |
| `npm run test:backend` | No | No | None (Read-only test execution) | **Zero** (Completely safe) |
| `git push --force` | No | No | Overwrites remote repository history | **HIGH DANGER** (Never use `--force` unless instructed) |

---

*Last verified: 2026-09-12*

> *Note: This document is continuously updated as new backend, database, ML-service, Data Lab, and deployment commands are introduced.*
