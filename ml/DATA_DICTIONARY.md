# Data Dictionary: Infrastructure Project Monitoring

This data dictionary documents the complete schema for the PAIMANA/OCMS-style infrastructure project monitoring dataset. It categorizes fields into **Raw Predictor Features**, **Derived Engineered Features**, and **Quarantined Future Outcome Variables**.

---

## 1. Raw Input Features (Observation-Time Data)

These features represent project status, administrative metadata, and progress metrics recorded at regular snapshot intervals (e.g. monthly). These are observable at prediction time.

| Field Name | Type | Category | Description | Example / Unit |
| :--- | :--- | :--- | :--- | :--- |
| `project_id` | String | Identifier | Unique identifier assigned to the infrastructure project | `"PRJ-0001"` |
| `snapshot_month` | String (YYYY-MM) | Temporal | Reporting calendar month of the observation | `"2023-07"` |
| `ministry` | String | Categorical | Nodal central ministry overseeing the project | `"Ministry of Railways"` |
| `sector` | String | Categorical | Infrastructure sector domain | `"Railways"`, `"Roads and Highways"` |
| `implementing_agency`| String | Categorical | Public sector authority executing works | `"NHAI"`, `"RVNL"`, `"NTPC"` |
| `state` | String | Categorical | Indian State / UT where work is situated | `"Maharashtra"`, `"Uttar Pradesh"` |
| `original_cost_cr` | Float | Numeric | Sanctioned / approved project budget | In ₹ Crores (e.g., `450.75`) |
| `planned_duration_months` | Integer | Numeric | Originally approved duration from sanction to completion | In months (e.g., `36`) |
| `elapsed_months` | Integer | Numeric | Months passed since project commencement at snapshot date ($0 < \text{elapsed} \le \text{planned}$) | In months (e.g., `14`) |
| `physical_progress_pct` | Float | Numeric | Cumulative physical milestone completion verified on ground | Percentage `0.0` - `100.0` |
| `financial_progress_pct`| Float | Numeric | Cumulative funds utilized relative to sanctioned budget | Percentage `0.0` - `100.0` |
| `expenditure_cr` | Float | Numeric | Total cumulative expenditure incurred up to the snapshot date | In ₹ Crores (e.g., `189.32`) |
| `milestones_total` | Integer | Numeric | Total scheduled deliverables or contractual milestones | Count (e.g., `12`) |
| `milestones_delayed` | Integer | Numeric | Number of scheduled milestones currently behind deadline | Count ($0 \le \text{delayed} \le \text{total}$) |
| `project_status` | Categorical | Categorical | Operational reporting status at snapshot date | `"Ongoing"`, `"Delayed"`, `"Critical"` |

---

## 2. Derived Features (Engineered Domain Signals)

These indicators are mathematically engineered from raw observation-time data to provide non-linear risk signals to the machine learning algorithms.

| Derived Feature Name | Type | Mathematical Formula | Zero-Division Handling | Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `schedule_completion_pct` | Float | $\frac{\text{elapsed\_months}}{\max(\text{planned\_duration\_months}, 1)} \times 100$ | Denominator clipped to $\ge 1$ | Percentage of planned timeline exhausted at snapshot. |
| `schedule_progress_gap` | Float | $\text{schedule\_completion\_pct} - \text{physical\_progress\_pct}$ | None needed | Slippage gap; positive value indicates delivery is trailing contractual timeline. |
| `expenditure_burn_gap` | Float | $\text{financial\_progress\_pct} - \text{physical\_progress\_pct}$ | None needed | Capital burn gap; positive value indicates funds exhausted faster than physical assets built. |
| `milestone_slippage_ratio`| Float | $\frac{\text{milestones\_delayed}}{\max(\text{milestones\_total}, 1)}$ | Denominator clipped to $\ge 1$, clipped $[0, 1]$ | Normalized deliverable bottleneck density. |
| `budget_utilization_pct` | Float | $\frac{\text{expenditure\_cr}}{\max(\text{original\_cost\_cr}, 10^{-6})} \times 100$ | Denominator clipped to $\ge 10^{-6}$ | Cumulative expenditure as % of sanctioned budget. |
| `progress_velocity` | Float | $\frac{\Delta \text{physical\_progress\_pct}}{\Delta \text{elapsed\_months}}$ (recent) or $\frac{\text{physical\_progress\_pct}}{\text{elapsed\_months}}$ (cumulative) | Fallback to cumulative pace on snapshot 1 or $\Delta m \le 0$ | Rate of physical completion (% per month). |
| `cost_velocity` | Float | $\frac{\Delta \text{expenditure\_cr}}{\Delta \text{elapsed\_months}}$ (recent) or $\frac{\text{expenditure\_cr}}{\text{elapsed\_months}}$ (cumulative) | Fallback to cumulative burn on snapshot 1 or $\Delta m \le 0$ | Monthly capital expenditure burn rate (₹ Cr / month). |

---

## 3. Target & Outcome Variables (Quarantined Post-Completion Metrics)

> [!CAUTION]
> **STRICT DATA LEAKAGE QUARANTINE**
> All four variables in this table represent information observed **only after** project completion.
> They are strictly excluded from the predictor matrix $X$ and enforced via automated assertions (`targets.assert_no_leakage(X)`).

| Outcome Field | Type | Role | Description |
| :--- | :--- | :--- | :--- |
| `cost_overrun` | Binary (`0` or `1`) | Target Label $y_1$ | `1` if $\text{final\_cost\_cr} > 1.10 \times \text{original\_cost\_cr}$ else `0` *(Prototype threshold)* |
| `time_overrun` | Binary (`0` or `1`) | Target Label $y_2$ | `1` if $\text{actual\_duration\_months} > 1.10 \times \text{planned\_duration\_months}$ else `0` *(Prototype threshold)* |
| `final_cost_cr` | Float | Non-Target Outcome | Total actual cumulative expenditure upon final project completion ($\ge \text{expenditure\_cr}$). |
| `actual_duration_months`| Integer | Non-Target Outcome | Total actual duration from commencement to commissioning ($\ge \text{elapsed\_months}$). |

---

## 4. Feature Groupings for Machine Learning

The Python ML workspace in `ml/src/features.py` defines the following explicit lists:

- **Identifiers**: `ID_COLUMNS = ['project_id', 'snapshot_month']`
- **Raw Numerical**: `RAW_NUMERIC_FEATURES = ['original_cost_cr', 'planned_duration_months', 'elapsed_months', 'physical_progress_pct', 'financial_progress_pct', 'expenditure_cr', 'milestones_total', 'milestones_delayed']`
- **Raw Categorical**: `RAW_CATEGORICAL_FEATURES = ['ministry', 'sector', 'implementing_agency', 'state', 'project_status']`
- **Derived Features**: `DERIVED_FEATURES = ['schedule_completion_pct', 'schedule_progress_gap', 'expenditure_burn_gap', 'milestone_slippage_ratio', 'budget_utilization_pct', 'progress_velocity', 'cost_velocity']`
- **Predictor Feature Matrix $X$**: `ALL_MODELING_FEATURES = MODELING_NUMERIC_FEATURES (15) + MODELING_CATEGORICAL_FEATURES (5)`
- **Excluded Columns**: `EXCLUDED_OUTCOME_COLUMNS = ['cost_overrun', 'time_overrun', 'final_cost_cr', 'actual_duration_months']`
