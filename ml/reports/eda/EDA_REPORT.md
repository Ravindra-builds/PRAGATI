# Exploratory Data Analysis (EDA) Report: PAIMANA-Style Infrastructure Monitoring Dataset

**Date**: 2026-09-11  
**Dataset**: `ml/data/synthetic/projects_snapshot.csv`  
**Evaluation Scope**: Data quality, structural integrity, distribution analysis, risk indicator identification, and feature engineering recommendations.

---

## 1. What Does the Dataset Look Like?

The dataset simulates monthly infrastructure project monitoring records modeled after the Indian Ministry of Statistics and Programme Implementation (MoSPI) Online Computerized Monitoring System (OCMS) and PAIMANA dashboards.

- **Total Snapshot Records (Rows)**: 8,174
- **Unique Infrastructure Projects**: 850
- **Snapshots Per Project**: Varies between 4 and 18 snapshots (mean = 9.62 snapshots per project).
- **Total Columns**: 19 (15 observation-time monitoring fields, 4 future outcome/target fields).
- **Administrative Dimensions**:
  - **Ministries**: 6 central ministries (MoRTH, MoR, MoP, MoHUA, MoPSW, MoPNG).
  - **Sectors**: 7 core sectors (Roads & Highways, Railways, Power, Urban Development, Shipping & Ports, Petroleum & Natural Gas, Water Resources).
  - **Implementing Agencies**: 15 public sector authorities (NHAI, RVNL, DFCCIL, NTPC, DMRC, ONGC, etc.).
  - **States**: 22 Indian States and Union Territories.
  - **Cost Scale**: Sanctioned budgets range from ₹25.0 Cr to ₹15,000+ Cr (median = ₹330.5 Cr).
  - **Planned Durations**: 14 to 84 months.

---

## 2. Is It Reasonably Realistic?

**Yes.** The dataset displays key physical, economic, and procedural patterns observed in real-world infrastructure delivery:

1. **Non-Uniform Snapshot Trajectories**: Projects are observed at multiple irregular snapshot intervals across their active lifecycles rather than artificial fixed matrices.
2. **Size and Timeline Scaling**: Project costs follow a log-normal distribution where larger projects realistically command longer planned durations and more complex milestone networks.
3. **Execution Archetypes**: Rather than purely random noise, projects follow 5 distinct operational profiles:
   - *Healthy* (steady S-curve progress, tight alignment between physical output and financial spend).
   - *Delayed* (physical milestones slip while expenditure continues, leading to schedule overrun).
   - *Cost-Pressure* (rapid financial disbursement exceeding physical execution, leading to budget escalation).
   - *High-Risk* (compounding failure: severe physical lag, high expenditure, cascading milestone bottlenecks).
   - *Mixed-Risk* (seasonal stagnation periods, contractor remobilization delays).
4. **Realistic Stagnation & Non-Determinism**: Progressive S-curves feature realistic variation, ensuring relationships are non-trivial for machine learning algorithms.

---

## 3. Are There Missing Values?

**No.** An exhaustive check across all 8,174 records and 19 columns identified **0 missing or null values** (100.0% completeness).

| Column Category | Columns Evaluated | Missing Count | Missing % |
| :--- | :--- | :--- | :--- |
| Administrative Identifiers | `project_id`, `snapshot_month`, `ministry`, `sector`, `implementing_agency`, `state` | 0 | 0.0% |
| Progress & Financials | `original_cost_cr`, `planned_duration_months`, `elapsed_months`, `physical_progress_pct`, `financial_progress_pct`, `expenditure_cr` | 0 | 0.0% |
| Milestones & Status | `milestones_total`, `milestones_delayed`, `project_status` | 0 | 0.0% |
| Future Ground Truth | `final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun` | 0 | 0.0% |

---

## 4. Are There Duplicates?

**No.** A composite key uniqueness check on `(project_id, snapshot_month)` confirmed **0 duplicate records**. Each project has at most one snapshot entry per calendar month.

---

## 5. Are There Suspicious or Impossible Values?

All candidate data integrity rules passed automated validation:

- **Progress Bounds**: `physical_progress_pct` and `financial_progress_pct` strictly reside in $[0.0, 100.0]$.
- **Cost & Expenditure Logic**:
  - `original_cost_cr` and `final_cost_cr` are strictly positive ($> 0$).
  - In 100.0% of snapshots, cumulative `expenditure_cr` is non-negative and strictly $\le \text{final\_cost\_cr}$.
- **Lifecycle Logic**: In 100.0% of snapshots, $\text{elapsed\_months} \le \text{planned\_duration\_months}$ and $\text{elapsed\_months} \le \text{actual\_duration\_months}$, ensuring snapshots strictly represent observations recorded *prior to* project conclusion.
- **Milestone Consistency**: Total milestones are positive ($\ge 5$), and delayed milestones satisfy $0 \le \text{milestones\_delayed} \le \text{milestones\_total}$.
- **Progress Monotonicity**: Neither physical progress nor financial progress regresses backwards over elapsed time for any project.

---

## 6. How Balanced Are the Target Classes?

Both target outcome classes are well-balanced, avoiding severe class imbalance:

### Cost Overrun ($\text{final\_cost\_cr} > 1.10 \times \text{original\_cost\_cr}$)
- **Class 0 (Within 10% Budget)**: 4,549 snapshots (**55.7%**)
- **Class 1 (Cost Overrun)**: 3,625 snapshots (**44.3%**)

### Time Overrun ($\text{actual\_duration\_months} > 1.10 \times \text{planned\_duration\_months}$)
- **Class 0 (Within 10% Schedule)**: 4,334 snapshots (**53.0%**)
- **Class 1 (Time Overrun)**: 3,840 snapshots (**47.0%**)

### Target Cross-Tabulation
| Target Matrix | Time Overrun = 0 | Time Overrun = 1 | Total |
| :--- | :--- | :--- | :--- |
| **Cost Overrun = 0** | 3,118 (38.1%) | 1,431 (17.5%) | 4,549 (55.7%) |
| **Cost Overrun = 1** | 1,216 (14.9%) | 2,409 (29.5%) | 3,625 (44.3%) |
| **Total** | 4,334 (53.0%) | 3,840 (47.0%) | 8,174 (100.0%) |

*Implication for Modeling*: With overrun prevalence between 44% and 47%, standard classification metrics (ROC-AUC, PR-AUC, F1-Score) and standard cost-sensitive learning can be applied without requiring aggressive artificial oversampling (e.g. SMOTE).

---

## 7. Which Variables Appear Related to Overruns?

Exploratory bivariate analysis and correlation checks revealed clear associations:

1. **Progress Gap ($\text{financial\_progress\_pct} - \text{physical\_progress\_pct}$)**:
   - Projects without cost overruns have a median progress gap near $\approx 0$ percentage points.
   - Projects suffering cost overruns exhibit positive progress gaps (often $+10$ to $+25$ points), reflecting substantial fund utilization outstripping physical ground execution.
2. **Milestones Delayed**:
   - `milestones_delayed` exhibits a positive linear correlation ($r \approx 0.52$) with `time_overrun`.
   - Projects in `"Critical"` operational status average $4.8$ delayed milestones, versus $0.8$ for `"Ongoing"` projects.
3. **Schedule Utilization vs. Physical Progress**:
   - A high ratio of $\frac{\text{elapsed\_months}}{\text{planned\_duration\_months}}$ combined with low `physical_progress_pct` is strongly associated with eventual schedule failure.
4. **Sector Variation**:
   - Complex civil works (Railways, Urban Metro Development) exhibit slightly higher overrun incidence compared to centralized industrial sectors (Power transmission).

*(Note: These associations describe empirical correlations within this prototype dataset; they do not prove direct causal mechanisms.)*

---

## 8. Which Variables Might Be Useful Features?

Based on the EDA findings, the following raw and derived features are prime candidates for Task 3:

| Candidate Feature | Formulation | Rationale |
| :--- | :--- | :--- |
| **Progress Deficit** | $\frac{\text{elapsed\_months}}{\text{planned\_duration\_months}} \times 100 - \text{physical\_progress\_pct}$ | Measures whether physical delivery is keeping pace with elapsed contractual time. |
| **Expenditure Burn Gap** | $\text{financial\_progress\_pct} - \text{physical\_progress\_pct}$ | Flags projects exhausting capital faster than executing physical assets. |
| **Milestone Slippage Ratio**| $\frac{\text{milestones\_delayed}}{\text{milestones\_total}}$ | Normalized measure of deliverable bottlenecks agnostic to project size. |
| **Cost Velocity** | $\frac{\text{expenditure\_cr}}{\text{elapsed\_months}}$ | Average capital expenditure burn rate per month. |
| **Progress Velocity** | $\frac{\text{physical\_progress\_pct}}{\text{elapsed\_months}}$ | Speed of physical milestone realization per month. |
| **Administrative Encodings**| Target/Frequency encoding on `sector`, `agency`, `state` | Captures domain and regional execution differences. |

---

## 9. Which Variables Must NOT Be Used as Prediction Features?

> [!CAUTION]
> **STRICT DATA LEAKAGE QUARANTINE**

The following columns represent post-completion outcomes and **must be strictly excluded** from any model input feature matrix $X$:

1. `final_cost_cr`: The total finalized expenditure upon completion. Unknown during execution.
2. `actual_duration_months`: The final project lifecycle duration. Unknown during execution.
3. `cost_overrun`: The target ground truth label for cost escalation.
4. `time_overrun`: The target ground truth label for schedule slippage.
5. **Any retrospective post-mortem calculations** (e.g. $\text{final\_cost\_cr} - \text{original\_cost\_cr}$ or $\frac{\text{expenditure\_cr}}{\text{final\_cost\_cr}}$).

*Rule*: At inference time, only metrics available on or before `snapshot_month` ($X$) are valid inputs.

---

## 10. Recommendations for Next Stage (Preprocessing & Feature Engineering)

For Task 3, we recommend the following disciplined steps:

1. **Leakage-Safe Preprocessing Pipeline**:
   - Construct a `scikit-learn` `Pipeline` or `ColumnTransformer` that explicitly separates feature columns $X$ from labels $y$.
2. **Feature Engineering Module**:
   - Implement the derived indicators identified above (`progress_deficit`, `expenditure_burn_gap`, `milestone_slippage_ratio`, `cost_velocity`).
3. **Temporal Split Strategy**:
   - Evaluate splitting strategies: Group-based split by `project_id` (so snapshots of the same project do not leak into both train and test) or temporal cutoff split (train on earlier snapshot dates, test on subsequent dates).
4. **Categorical Handling**:
   - One-hot encode lower cardinality nominal fields (`sector`, `project_status`); target-encode or frequency-encode higher cardinality fields (`implementing_agency`, `state`).
5. **Numerical Scaling**:
   - Apply `RobustScaler` or `StandardScaler` to heavily skewed financial columns (`original_cost_cr`, `expenditure_cr`).
