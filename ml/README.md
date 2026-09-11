# ML Workspace: Infrastructure Project Monitoring & Early Warning System

Welcome to the Machine Learning workspace for the **SIH 2026 AI-Powered Predictive Analytics & Early Warning System for Infrastructure Project Monitoring**.

This workspace is dedicated to data analysis, model research, and experiment tracking using PAIMANA/OCMS-style infrastructure project tracking data.

---

## 1. What This Workspace Is For

Large-scale infrastructure projects (such as highways, railways, bridges, and power stations) are tracked through monthly progress reporting systems (similar to PAIMANA and the Online Computerized Monitoring System / OCMS in India). 

This workspace provides an isolated, reproducible environment to:
- Ingest and validate project monitoring records (both synthetic prototypes and public/official records).
- Conduct Exploratory Data Analysis (EDA) on key project bottlenecks.
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

To keep collaboration clear across engineering disciplines, here are the core concepts used throughout this workspace:

- **Input Features ($X$)**: The known snapshot indicators observable at prediction time. For example: `physical_progress_pct`, `financial_progress_pct`, `original_cost_cr`, `elapsed_months`, and `milestones_delayed`.
- **Target / Label ($y$)**: The future outcome we want the model to predict, such as `time_overrun` (will the project finish late?) or `cost_overrun` (will it exceed budget?). Crucially, targets are unknown during ongoing project execution.
- **Training**: The phase where algorithms analyze historical completed projects, learning patterns between input features and known outcomes to tune internal mathematical parameters.
- **Testing**: Evaluating the trained model on unseen historical projects to objectively measure how accurately it generalizes to new, real-world data.
- **Prediction**: Running new, active project data through the trained model during ongoing monitoring to generate risk scores, predicted delays, and warning flags.

---

## 4. Planned End-to-End Pipeline

The ML lifecycle is planned as a disciplined, staged progression:

```text
Dataset (Synthetic / Public)
       │
       ▼
Exploratory Data Analysis (EDA)
       │
       ▼
Data Validation (Schema & Bounds)
       │
       ▼
Data Cleaning (Missing Values & Outliers)
       │
       ▼
Preprocessing (Scaling & Encoding)
       │
       ▼
Feature Engineering (Burn Rates, Cost Velocity, Lag Metrics)
       │
       ▼
Train / Test Strategy (Temporal / Group Splits)
       │
       ▼
Baseline Model (Heuristics & Simple Regressors/Classifiers)
       │
       ▼
ML Models (Gradient Boosted Trees, Random Forests, etc.)
       │
       ▼
Model Evaluation (PR-AUC, F1-Score, RMSE, Calibration)
       │
       ▼
Explainability (SHAP / Feature Importances for Auditability)
       │
       ▼
Saved Model Artifacts (.joblib format)
       │
       ▼
Prediction Service (Inference API integration)
```

> [!IMPORTANT]
> **Current Status**: Only the foundation, workspace structure, environment, configuration, and data dictionary are implemented at this stage. Data generation, feature engineering, and model training will proceed systematically in subsequent tasks.

---

## 5. Directory Overview

- `data/`: Contains `raw/`, `processed/`, and `synthetic/` subdirectories. Raw data and processed artifacts are ignored by version control.
- `notebooks/`: Jupyter notebooks for visual data exploration and prototyping.
- `src/`: Reusable Python modules (configurations, dataset loaders, transformers).
- `models/`: Destination for serialized model checkpoints and preprocessing pipelines.
- `reports/eda/`: Generated figures, summary tables, and analytical reports.
- `tests/`: Automated unit and integration tests for data loading and feature pipelines.
- `DATA_DICTIONARY.md`: Full specification of fields, data types, and data leakage safeguards.
