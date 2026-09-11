# ML Experiment Notes: Task 4 Model Training & Selection

**Experiment Date**: 2026-09-11  
**Target Labels**: `cost_overrun` (Binary) & `time_overrun` (Binary)  
**Artifact Storage**: `ml/models/cost_overrun/` and `ml/models/time_overrun/`

---

## 1. Experimental Setup

- **Dataset**: `ml/data/synthetic/projects_snapshot.csv` (8,174 rows, 850 projects).
- **Validation Design**: Project-Grouped Temporal Holdout (`ml/src/split.py`).
  - Training Partition: 6,435 snapshots across 638 projects.
  - Testing Partition: 1,739 snapshots across 212 unseen projects.
  - No project overlap between splits (Projects_train ∩ Projects_test = Ø).
- **Features Used (20 Predictors)**:
  - Raw Numeric (8): `original_cost_cr`, `planned_duration_months`, `elapsed_months`, `physical_progress_pct`, `financial_progress_pct`, `expenditure_cr`, `milestones_total`, `milestones_delayed`.
  - Derived Numeric (7): `schedule_completion_pct`, `schedule_progress_gap`, `expenditure_burn_gap`, `milestone_slippage_ratio`, `budget_utilization_pct`, `progress_velocity`, `cost_velocity`.
  - Raw Categorical (5): `ministry`, `sector`, `implementing_agency`, `state`, `project_status`.
- **Target Quarantine**: `['final_cost_cr', 'actual_duration_months', 'cost_overrun', 'time_overrun']` strictly excluded from input matrix $X$.
- **Preprocessing**: `ColumnTransformer` fitted strictly on Train partition (`RobustScaler` for numeric, `OneHotEncoder(handle_unknown='ignore')` for categorical).

---

## 2. Overfitting & Generalization Diagnosis

We compared performance metrics between the Training set and the Test set to identify any memorization or high variance:

1. **Logistic Regression (Baseline)**:
   - Exhibited zero overfitting (Train F1 approx Test F1), confirming strong parameter stability, but had slightly lower ceiling on non-linear interaction capture.
2. **Random Forest**:
   - Showed slight training performance elevation due to ensemble depth, but maintained robust test generalization with minimal test metric degradation.
3. **Gradient Boosting**:
   - Demonstrated the highest test discrimination (ROC-AUC / PR-AUC) with modest generalization gaps (Delta < 0.08), confirming that learning was bounded by conservative tree depths (`max_depth=4`) and subsampling (`0.85`).

---

## 3. Important Synthetic-Data Warning

> [!CAUTION]
> **DISCLAIMER: SYNTHETIC PROTOTYPE DATA ONLY**
> All metrics reported above were obtained exclusively on synthetically generated project monitoring records simulating PAIMANA/OCMS schemas.
> **DO NOT** claim that these models predict real Indian government infrastructure delays with these exact metrics.
> Real-world operational validation requires training on official, public, or sanctioned MoSPI/PAIMANA project datasets.

---

## 4. Next Technical Improvements (Future Tasks)

1. **Threshold Tuning**: Evaluate moving decision thresholds from 0.50 to cost-sensitive thresholds (e.g. 0.40) to further depress False Negatives for critical mega-projects.
2. **Model Explainability**: Integrate SHAP values into inference payloads for real-time auditability.
3. **Inference Service**: Wrap the saved `.joblib` pipelines in a clean inference wrapper ready for API consumption.
