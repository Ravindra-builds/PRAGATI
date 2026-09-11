# Data Dictionary: Infrastructure Project Monitoring

This data dictionary documents the candidate schema for the PAIMANA/OCMS-style infrastructure project monitoring dataset. It details the input features observed during ongoing project monitoring cycles and delineates them strictly from future target outcomes.

---

## 1. Candidate Input Features (Observation-Time Data)

These features represent project status, administrative metadata, and progress metrics recorded at regular snapshot intervals (e.g. monthly). These are the only features permitted for use by the model at prediction time.

| Field Name | Type | Description | Example / Unit |
| :--- | :--- | :--- | :--- |
| `project_id` | String | Unique identifier assigned to the infrastructure project | `"PRJ-2024-001"` |
| `snapshot_month` | String (YYYY-MM) | Reporting snapshot period for the monitoring record | `"2025-03"` |
| `ministry` | String | Nodal central ministry overseeing the project | `"Ministry of Road Transport and Highways"` |
| `sector` | String | Infrastructure sector domain | `"Roads and Highways"`, `"Railways"`, `"Power"` |
| `implementing_agency`| String | Public sector undertaking or authority executing works | `"NHAI"`, `"RVNL"`, `"NTPC"` |
| `state` | String | Indian State / Union Territory where work is situated | `"Maharashtra"`, `"Uttar Pradesh"` |
| `original_cost_cr` | Float | Sanctioned / approved project budget | In ₹ Crores (e.g., `450.75`) |
| `planned_duration_months` | Integer | Originally approved duration from sanction to completion | In months (e.g., `36`) |
| `elapsed_months` | Integer | Months passed since project commencement at snapshot date | In months (e.g., `14`) |
| `physical_progress_pct` | Float | Cumulative physical milestone completion verified on ground | Percentage `0.0` - `100.0` (e.g., `35.5`) |
| `financial_progress_pct`| Float | Cumulative funds utilized relative to sanctioned budget | Percentage `0.0` - `100.0` (e.g., `42.0`) |
| `expenditure_cr` | Float | Total cumulative expenditure incurred up to the snapshot date | In ₹ Crores (e.g., `189.32`) |
| `milestones_total` | Integer | Total scheduled deliverables or contractual milestones | Count (e.g., `12`) |
| `milestones_delayed` | Integer | Number of scheduled milestones currently behind deadline | Count (e.g., `3`) |
| `project_status` | Categorical | Current operational reporting status | `"Ongoing"`, `"Delayed"`, `"Critical"`, `"Completed"` |

---

## 2. Target Variables (Future Outcomes)

Target variables measure project failure modes or project deviations observed **only after** projects conclude or significantly mature. They are supervised learning labels.

| Target Field | Type | Description | Objective |
| :--- | :--- | :--- | :--- |
| `cost_overrun` | Binary / Float | Indicates whether cumulative final cost exceeds sanctioned budget (or percentage overrun $\frac{\text{Final Cost} - \text{Original Cost}}{\text{Original Cost}} \times 100\%$) | Classification (`0` or `1`) or Regression (₹ Cr / %) |
| `time_overrun` | Binary / Integer | Indicates whether project completion extends beyond scheduled finish date (or delay duration in months) | Classification (`0` or `1`) or Regression (Months) |

---

## 3. Data Leakage Prevention

> [!CAUTION]
> **CRITICAL ARCHITECTURAL RULE: TARGET FIELDS CANNOT BE USED AS INPUT FEATURES**

### What is Data Leakage?
Data leakage occurs when information from outside the training dataset (specifically, information from the future that would not be available at the exact moment a prediction is made) is mistakenly included as an input feature during model training.

### Why This Is Dangerous in Infrastructure Monitoring
1. **False High Performance**: If `cost_overrun` or post-completion figures (e.g., final revised cost, final completion date, post-mortem audit metrics) are present in the feature matrix during training, an ML model will easily correlate these direct indicators and achieve an artificially high metric (e.g., 99% accuracy or $R^2 \approx 1.0$).
2. **Catastrophic Failure in Production**: When deployed to monitor active ongoing projects (e.g. at month 12 of a 36-month railway project), the future final cost and final completion dates are unknown. A model trained on leaky features cannot function or will produce nonsense predictions on active projects.
3. **Derived Feature Caution**: Features like $\frac{\text{expenditure\_cr}}{\text{original\_cost\_cr}}$ are valid snapshot metrics *only if* using expenditure incurred up to the snapshot month, not final expenditure. Any feature that computes differences against future revised estimates must be strictly quarantined.

### Pipeline Enforcement
- **Strict Separation**: During data preprocessing, target columns (`cost_overrun`, `time_overrun`) must be split into a target vector $y$ and removed from the feature matrix $X$.
- **Temporal Integrity**: When splitting data into train and test sets, splits should ideally be temporal (training on earlier snapshot months, testing on subsequent snapshot months) to prevent look-ahead bias.
