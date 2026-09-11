# Validation Strategy: Multi-Snapshot Infrastructure Project Monitoring

**Document**: `ml/reports/eda/VALIDATION_STRATEGY.md`  
**Purpose**: Document the design, mathematical rationale, and architectural safeguards of the train/test validation strategy for multi-snapshot project monitoring.

---

## 1. The Core Challenge: Dual Leakage Vectors

In project monitoring datasets (such as PAIMANA/OCMS), projects are tracked over extended time horizons with repeated monthly snapshot observations. Evaluating machine learning models on this type of tabular panel data presents two severe risks if conventional splitting techniques (such as naive `train_test_split` or standard `KFold`) are applied:

### Leakage Vector A: Intra-Project Identity Leakage (Group Leakage)
If snapshots from the same project (`PRJ-0042`) appear in both the training set (e.g. at Month 6) and the test set (e.g. at Month 12):
- The model memorizes project-specific signatures (e.g., exact sanctioned cost ₹452.17 Cr, specific contractor agency, terrain/state combination).
- The test evaluation measures **memorization of familiar projects** rather than true predictive generalization to newly sanctioned projects.
- In production deployment, new infrastructure projects will have **zero** prior snapshots in the training database. A model evaluated under intra-project leakage will suffer dramatic real-world performance collapse.

### Leakage Vector B: Look-Ahead Bias (Temporal Leakage)
If future snapshots (e.g. 2025 observations) are used to train a model that is then tested on past snapshots (e.g. 2022 observations):
- Macroeconomic conditions, sector-wide inflation patterns, and policy shifts from the future leak backward.
- This violates the fundamental causality of early warning systems: predicting future outcomes using only information known up to time $T$.

---

## 2. Implemented Strategy: Project-Grouped Temporal Holdout

To resolve both leakage vectors simultaneously, we implemented an explicit **Project-Grouped Temporal Holdout Split** in [`ml/src/split.py`](../../src/split.py).

### Conceptual Architecture

```text
[All 850 Unique Infrastructure Projects]
                     │
                     ▼
  Determine Earliest Observation Month per Project
  (Project Commencement / Inception Horizon)
                     │
                     ▼
  Order Projects Chronologically by Start Horizon
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
Older Inception Cohort   Newer Inception Cohort
   (First ~75% Projects)    (Last ~25% Projects)
         │                       │
         ▼                       ▼
  ALL Snapshots of        ALL Snapshots of
  Training Projects        Testing Projects
         │                       │
         ▼                       ▼
   TRAIN SPLIT             TEST SPLIT
  (6,435 snapshots)       (1,739 snapshots)
  (638 projects)          (212 projects)
```

### Mathematical Guarantees
1. **Strict Project Disjointness**:
   $$\mathcal{P}_{\text{train}} \cap \mathcal{P}_{\text{test}} = \emptyset$$
   Every snapshot row of project $p_i$ is mapped exclusively to either the training partition or the testing partition.
2. **Temporal Precedence**:
   $$\max_{p \in \mathcal{P}_{\text{train}}}(\text{start\_month}_p) \le \min_{p \in \mathcal{P}_{\text{test}}}(\text{start\_month}_p)$$
   Projects entering the portfolio earlier constitute the training history, while later-commissioned projects form the unseen forward evaluation holdout.

---

## 3. Split Diagnostics & Balance Check

The table below summarizes the empirical partition produced on `ml/data/synthetic/projects_snapshot.csv`:

| Diagnostic Metric | Training Set | Testing Set (Holdout) | Total / Combined |
| :--- | :--- | :--- | :--- |
| **Unique Projects** | 638 (75.06%) | 212 (24.94%) | 850 (100.0%) |
| **Snapshot Rows** | 6,435 (78.73%) | 1,739 (21.27%) | 8,174 (100.0%) |
| **Avg Snapshots / Project** | 10.08 | 8.20 | 9.62 |
| **Earliest Project Start** | 2021-02 | 2023-08 | 2021-02 |
| **Cost Overrun Rate ($y_1$)** | 43.75% | 46.58% | 44.35% |
| **Time Overrun Rate ($y_2$)** | 45.38% | 52.90% | 46.98% |

### Key Observations:
- **Class Stability**: Target prevalence remains stable across both partitions (~44–47% cost overrun, ~45–53% time overrun), avoiding label distribution drift.
- **Snapshot Density**: Newer projects in the test partition have slightly fewer snapshots (mean 8.2 vs 10.1), accurately mimicking active, maturing infrastructure portfolios.

---

## 4. Known Trade-offs & Chosen Compromises

In real-world multi-year infrastructure monitoring, long projects (e.g. 5–7 years) started in 2021 may still have ongoing snapshots in 2024–2025. 

### Why Pure Calendar-Date Cutoff Was Not Chosen Alone:
If an absolute calendar date cutoff (e.g. `snapshot_month <= 2023-12` as Train, `> 2023-12` as Test) were applied **without** project grouping:
- Month 1–24 snapshots of Project X would be in Train.
- Month 25–36 snapshots of the **exact same Project X** would be in Test.
- This reintroduces **Intra-Project Identity Leakage**.

### Chosen Compromise: Project-Inception Grouping
By grouping on `project_id` and splitting on project inception horizons:
- Project identity leakage is **100% eliminated**.
- The model is tested on its ability to forecast risks on entirely unfamiliar projects.
- **Limitation**: Some long-duration training projects may have later snapshots that temporally overlap with the early snapshots of test projects. However, because the projects themselves are completely disjoint and contractors/locations are distinct, no project identity or outcome information leaks across the boundary.

---

## 5. Future Stage Enhancements

When progressing to hyperparameter tuning and model cross-validation in Task 4:
1. **GroupKFold Cross-Validation**: Use `sklearn.model_selection.GroupKFold(groups=X_train['project_id'])` within the training split for tuning hyperparameters.
2. **Expanding Window Grouped Time Series**: For rolling backtesting, simulate multiple expanding yearly cohorts (Train on 2021 cohort -> Test on 2022; Train on 2021–2022 -> Test on 2023).
