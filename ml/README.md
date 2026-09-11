# ML Workspace: Infrastructure Project Monitoring & Early Warning System

Welcome to the Machine Learning workspace for the **SIH 2026 AI-Powered Predictive Analytics & Early Warning System for Infrastructure Project Monitoring**.

This workspace is dedicated to data analysis, model research, and experiment tracking using PAIMANA/OCMS-style infrastructure project tracking data.

---

## 1. What This Workspace Is For

Large-scale infrastructure projects (such as highways, railways, bridges, and power stations) are tracked through monthly progress reporting systems (similar to PAIMANA and the Online Computerized Monitoring System / OCMS in India). 

This workspace provides an isolated, reproducible environment to:
- Ingest and validate project monitoring records (both synthetic prototypes and public/official records).
- Conduct Exploratory Data Analysis (EDA) on key project bottlenecks.
- Engineer leakage-safe predictive indicators and build preprocessing pipelines.
- Train predictive machine learning models that assess the probability and scale of project delays and budget overruns.
- Package lightweight, validated model artifacts that can later be served via backend APIs to dashboard users.

---

## 2. What Problem the Model Will Solve

Infrastructure projects frequently suffer from:
- **Cost Overruns**: Final expenditures significantly exceeding original sanctioned estimates.
- **Time Overruns**: Milestone delays accumulating and pushing final commissioning years past deadlines.

Traditional monitoring identifies delays **after** they have already occurred. The goal of this ML system is to act as an **Early Warning System (EWS)**: by analyzing monthly physical progress, financial utilization, agency track record, and milestone slippage early in the project lifecycle, the model predicts risk before delays become irreversible.

---

## 3. Core Machine Learning Concepts Explained

- **Input Features ($X$)**: The known snapshot indicators observable at prediction time (e.g. `physical_progress_pct`, `financial_progress_pct`, `original_cost_cr`, `elapsed_months`, `schedule_progress_gap`, `cost_velocity`).
- **Target / Label ($y$)**: The future outcome we want the model to predict (`time_overrun` and `cost_overrun`). Crucially, targets are unknown during ongoing project execution and quarantined from $X$.
- **Training**: The phase where algorithms analyze historical projects, learning patterns between input features and known outcomes to tune internal mathematical parameters.
- **Testing**: Evaluating the trained model on unseen future/separate projects to objectively measure how accurately it generalizes.
- **Prediction**: Running new, active project data through the trained model during ongoing monitoring to generate risk scores and early warning flags.

---

## 4. End-to-End Pipeline & Current Progress

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
[x] Baseline Models (Logistic Regression)
       │
       ▼
[x] Advanced ML Models (Random Forest & Gradient Boosting)
       │
       ▼
[x] Model Evaluation & Overfitting Diagnosis (Precision, Recall, F1, ROC-AUC, PR-AUC)
       │
       ▼
[x] Explainability (Permutation Feature Importance)
       │
       ▼
[x] Saved Model Artifacts (model.joblib + metadata.json)
       │
       ▼
[ ] Prediction Service (Inference API integration - Next Phase)
```

---

## 5. ML Source Modules (`ml/src/`)

- [`config.py`](src/config.py): Centralized paths, random seeds, threshold definitions, and data source abstraction.
- [`generate_synthetic_data.py`](src/generate_synthetic_data.py): Multi-snapshot synthetic data generator with 5 risk archetypes.
- [`validate_dataset.py`](src/validate_dataset.py): 10-point data validation suite.
- [`targets.py`](src/targets.py): Target quarantine module enforcing zero leakage of future outcome variables into $X$.
- [`features.py`](src/features.py): Feature engineering module computing 7 derived metrics (schedule completion, gaps, slippage ratios, velocities) with zero-division safety.
- [`preprocessing.py`](src/preprocessing.py): Scikit-learn `ColumnTransformer` (median imputation, `RobustScaler`, `OneHotEncoder`) strictly fitted only on training data.
- [`split.py`](src/split.py): Project-grouped temporal splitting ensuring projects never overlap across train and test partitions.
- [`train_models.py`](src/train_models.py): Model training harness, evaluation, overfitting diagnostics, permutation importance, and artifact serialization.
- [`predict_sample.py`](src/predict_sample.py): Inference demonstration loading saved pipelines and predicting on unseen test projects.
- [`demo_pipeline.py`](src/demo_pipeline.py): End-to-end demonstration running `raw row -> engineered row -> X, y -> split -> preprocessed matrices`.

---

## 6. How to Run the Modules

Activate the virtual environment first:
```powershell
.\ml\.venv\Scripts\Activate.ps1
```

1. **Train & Evaluate All Models**:
   ```bash
   python ml/src/train_models.py
   ```
2. **Run Sample Inference on Test Projects**:
   ```bash
   python ml/src/predict_sample.py
   ```
3. **Run Automated Unit Tests (15 Tests)**:
   ```bash
   python -m unittest discover -s ml/tests
   ```
4. **Run Dataset Validation Suite**:
   ```bash
   python ml/src/validate_dataset.py
   ```

