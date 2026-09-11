# ML Workspace: Infrastructure Project Monitoring & Early Warning System

Welcome to the Machine Learning workspace for the **SIH 2026 AI-Powered Predictive Analytics & Early Warning System for Infrastructure Project Monitoring**.

This workspace is dedicated to data analysis, model research, experiment tracking, and local explainability using PAIMANA/OCMS-style infrastructure project tracking data.

---

## 1. What This Workspace Is For

Large-scale infrastructure projects (such as highways, railways, bridges, and power stations) are tracked through monthly progress reporting systems (similar to PAIMANA and the Online Computerized Monitoring System / OCMS in India). 

This workspace provides an isolated, reproducible environment to:
- Ingest and validate project monitoring records (both synthetic prototypes and public/official records).
- Conduct Exploratory Data Analysis (EDA) on key project bottlenecks.
- Engineer leakage-safe predictive indicators and build preprocessing pipelines.
- Train predictive machine learning models assessing the probability of project delays and budget overruns.
- Provide local prediction-level explainability (SHAP) attributing risk to specific project drivers.
- Expose lightweight, validated model artifacts via an ASGI microservice (`ml/api/`) to dashboard backends.

---

## 2. What Problem the Model Solves

Infrastructure projects frequently suffer from:
- **Cost Overruns**: Final expenditures significantly exceeding original sanctioned estimates.
- **Time Overruns**: Milestone delays accumulating and pushing final commissioning years past deadlines.

Traditional monitoring identifies delays **after** they have already occurred. The goal of this ML system is to act as an **Early Warning System (EWS)**: by analyzing monthly physical progress, financial utilization, agency track record, and milestone slippage early in the project lifecycle, the model predicts risk before delays become irreversible.

---

## 3. End-to-End Pipeline Progress

```text
[x] Dataset (Synthetic Multi-Snapshot PAIMANA Generation)
       │
       ▼
[x] Exploratory Data Analysis (EDA & Visualizations)
       │
       ▼
[x] Data Validation (Automated 10-point Suite)
       │
       ▼
[x] Target Quarantine (Strict Post-Completion Isolation)
       │
       ▼
[x] Feature Engineering (Burn Rates, Gaps, Velocities)
       │
       ▼
[x] Preprocessing Pipeline (Imputation, RobustScaler, OneHotEncoder)
       │
       ▼
[x] Validation Strategy (Project-Grouped Temporal Holdout)
       │
       ▼
[x] Model Training & Overfitting Diagnosis (Precision, Recall, F1, ROC-AUC, PR-AUC)
       │
       ▼
[x] Global Feature Importance (Permutation Feature Importance)
       │
       ▼
[x] Saved Model Artifacts (model.joblib + metadata.json)
       │
       ▼
[x] Local Explainability Engine (SHAP TreeExplainer & LinearExplainer)
       │
       ▼
[x] ML Inference Microservice (FastAPI /health, /model-info, /predict with drivers)
```

---

## 4. Local Explainability & Risk Drivers (SHAP)

### What is SHAP?
SHAP (SHapley Additive exPlanations) is a game-theoretic approach to explain the output of any machine learning model. It connects optimal credit allocation with local explanations using the classic Shapley values from cooperative game theory.

### Global Importance vs Local Explanations
- **Global Feature Importance** (e.g. Permutation Importance in model evaluation): Answers *"What features generally matter most across all infrastructure projects?"*
  - Example: `budget_utilization_pct` and `schedule_progress_gap` are globally the most influential metrics.
- **Local Prediction Explanations** (SHAP local attribution): Answers *"Why did THIS specific project snapshot (e.g. PRJ-0714 at Month 22) receive a 99.93% risk score?"*
  - Example: For PRJ-0714, the model identified that a 33.8% Schedule vs Physical Progress Gap contributed +5.87 to log-odds, while an active Critical status added +0.07.

### Explainers Selected
1. **Time Overrun Model (`RandomForestClassifier`)**:
   - Uses `shap.TreeExplainer` directly on the fitted ensemble of 150 decision trees.
   - Computes exact tree-based Shapley values for positive class 1 (schedule delay).
2. **Cost Overrun Model (`LogisticRegression`)**:
   - Uses `shap.LinearExplainer` on the fitted linear model using the preprocessor feature expectation.
   - Computes exact linear attributions: $\phi_i(x) = w_i \cdot (x_i - E[x_i])$.

### Handling Preprocessing & Human-Readable Mapping
Because the underlying algorithms receive preprocessed, scaled, and one-hot encoded feature matrices (75 dimensions), `ml/src/explain.py`:
1. Calculates attributions on the preprocessed representation.
2. Maps one-hot encoded categorical columns (e.g. `project_status_Critical`) to clean labels (`Project Status: Critical`).
3. Re-attaches unscaled, human-interpretable observed values (e.g. 33.88% gap, 63.58% utilization) from the raw snapshot.
4. Identifies directionality:
   - `increases_risk`: positive contribution pushing probability toward overrun.
   - `decreases_risk`: negative contribution mitigating overrun risk.

### Non-Causal Framing
SHAP values represent statistical model associations, not causal proofs. All user-facing text uses:
> *"Strong model contributor"*
rather than:
> *"This factor caused the project to fail."*

---

## 5. Future LLM Boundary Architecture

The local explainability layer serves as the foundation for the future generative LLM:

```text
Project Monitoring Snapshot
           │
           ▼
    Trained ML Models
           │
     ┌─────┴─────┐
     ▼           ▼
Probability   Top SHAP Risk Drivers
 (99.93%)     (Budget Utilization, Progress Gap, etc.)
     │           │
     └─────┬─────┘
           ▼
Structured Prediction Object
{
  "probability": 0.9993,
  "risk_level": "HIGH",
  "drivers": [ ... ]
}
           │
           ▼
      Future LLM
           │
           ▼
- Grounded Natural-Language Narrative
- Plain-English Executive Summary
- Suggested Operational Next Steps
```

> [!IMPORTANT]
> **Strict Separation Rule**: The LLM will **never** invent or recalculate risk probabilities. It acts purely as an interpreter and synthesizer, consuming the verified, mathematically grounded predictions and SHAP drivers output by the ML model.

---

## 6. ML Source Modules (`ml/src/`)

- [`config.py`](src/config.py): Centralized paths, seeds, thresholds, and data source abstractions.
- [`features.py`](src/features.py): Single source of truth for domain feature engineering (7 derived metrics).
- [`preprocessing.py`](src/preprocessing.py): ColumnTransformer pipeline with RobustScaler and OneHotEncoder.
- [`explain.py`](src/explain.py): Local SHAP explainability engine (`ModelExplainer`).
- [`explain_sample.py`](src/explain_sample.py): Terminal demonstration of local explanations on test projects.
- [`predict_sample.py`](src/predict_sample.py): Sample inference on holdout test projects.
- [`train_models.py`](src/train_models.py): Model training harness, evaluation, and serialization.
- [`validate_dataset.py`](src/validate_dataset.py): 10-point automated dataset validation suite.

---

## 7. How to Run

From repository root:

```powershell
# 1. Run local explanation demo on test projects
.\ml\.venv\Scripts\python.exe ml/src/explain_sample.py

# 2. Run sample inference
.\ml\.venv\Scripts\python.exe ml/src/predict_sample.py

# 3. Run all automated ML unit tests (34 tests)
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v

# 4. Start the ML inference service
.\ml\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --reload --port 8000
```
