# SIH 2026: AI-Powered Infrastructure Project Monitoring & Early Warning System

An intelligent predictive analytics and early warning prototype for national infrastructure project monitoring using PAIMANA / OCMS-style tracking data.

---

## 1. Project Purpose

Large-scale infrastructure initiatives often suffer from compounding schedule slippages and severe budget escalations. This project provides an AI-powered Early Warning System (EWS) to detect delay trajectories and cost-overrun risks early in project execution cycles, enabling proactive interventions by ministry and project authorities.

---

## 2. Current Development Stage

> [!NOTE]
> **Stage 1: Project Initialization & ML Workspace Setup (Current)**
> - Next.js TypeScript application structure configured.
> - Python machine learning environment configured inside `ml/` with minimal, dedicated dependencies.
> - Dataset schemas and anti-leakage guidelines documented in `ml/DATA_DICTIONARY.md`.
> - Data-source flexibility architecture established in `ml/src/config.py`.
> - **Note**: Machine learning models, prediction APIs, databases, dashboards, and LLM features have not been built yet and will be implemented in subsequent phases.

---

## 3. Monorepo Repository Structure

```text
sih-infrastructure-monitoring/
│
├── app/                      # Next.js App Router (pages, layout, routing)
├── components/               # Reusable frontend UI components
├── lib/                      # Client & shared utility functions
├── public/                   # Static web assets & icons
│
├── ml/                       # Isolated Python Machine Learning Workspace
│   ├── data/
│   │   ├── raw/              # Ingested raw datasets (git-ignored)
│   │   ├── processed/        # Cleaned & feature-engineered data (git-ignored)
│   │   └── synthetic/        # Synthetic dataset workspace & documentation
│   ├── notebooks/            # Jupyter notebooks for visual EDA & experiments
│   ├── src/                  # Core ML source code
│   │   ├── __init__.py
│   │   └── config.py         # Configurable paths, random seeds & data sources
│   ├── models/               # Saved model artifacts & checkpoints (git-ignored)
│   ├── reports/
│   │   └── eda/              # EDA visualization plots and summary reports
│   ├── tests/                # ML test suite
│   │   ├── __init__.py
│   │   └── test_environment.py
│   ├── .venv/                # Python virtual environment (git-ignored)
│   ├── requirements.txt      # Core data science & ML dependencies
│   ├── README.md             # ML workspace guide, lifecycle pipeline & concepts
│   └── DATA_DICTIONARY.md    # Candidate schema, units & anti-leakage rules
│
├── docs/                     # Architecture designs and project documentation
├── scripts/                  # Cross-cutting development and verification scripts
│   └── verify_env.py         # Environment verification script
│
├── .gitignore                # Git ignore rules for Next.js and Python artifacts
├── package.json              # Next.js project configuration and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project root documentation (this file)
```

---

## 4. Setup & Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on v24.x) & npm
- **Python**: v3.10+ (tested on v3.13.x)
- **Git**

### A. Next.js Web Application Setup

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Build for production:
   ```bash
   npm run build
   ```

---

### B. Python ML Workspace Setup

The ML workspace lives inside `ml/` and operates in an isolated virtual environment.

1. **Create the Python Virtual Environment** (if not already created):
   - **Windows (PowerShell / Command Prompt)**:
     ```bash
     python -m venv ml/.venv
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv ml/.venv
     ```

2. **Activate the Virtual Environment**:
   - **Windows PowerShell**:
     ```powershell
     .\ml\.venv\Scripts\Activate.ps1
     ```
   - **Windows Command Prompt**:
     ```cmd
     ml\.venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     source ml/.venv/bin/activate
     ```

3. **Install ML Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r ml/requirements.txt
   ```

4. **Verify the ML Environment**:
   Run the verification script from the repository root:
   ```bash
   python scripts/verify_env.py
   ```
   Or run the unit tests:
   ```bash
   python -m unittest discover -s ml/tests
   ```

---

## 5. Architectural Separation

The Python ML workspace is intentionally decoupled from the web application:
- **No tight coupling**: Data science experimentation and modeling can evolve without breaking frontend builds.
- **Configurable Data Source**: `ml/src/config.py` supports seamlessly switching between synthetic test data and official/public data without changing ML logic.
- **Future Integration**: The models produced in `ml/models/` will later be served via an API layer to the Next.js frontend.
