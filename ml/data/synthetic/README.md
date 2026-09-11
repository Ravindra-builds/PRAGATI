# Synthetic Data Workspace: Projects Snapshot Dataset

This directory contains the synthetic multi-snapshot project-monitoring dataset (`projects_snapshot.csv`) generated for developing and benchmarking the SIH 2026 infrastructure early warning system prototype.

---

## 1. Important Disclaimers

> [!CAUTION]
> - **100% Synthetic Nature**: This dataset is completely synthetically simulated for algorithmic development, pipeline testing, and academic evaluation.
> - **Not Official Government / PAIMANA Data**: This dataset must **NEVER** be cited, represented, published, or interpreted as official PAIMANA, OCMS, or MoSPI data.
> - **No Real-World Claims**: Named ministries, implementing agencies, states, and project IDs are used purely to simulate realistic administrative metadata and category cardinality; they do not reflect actual performance, audit ratings, or financial health of any real entity or infrastructure project.

---

## 2. Dataset Overview

- **Primary Data File**: `projects_snapshot.csv`
- **Total Snapshots (Rows)**: 8,174
- **Unique Projects**: 850
- **Snapshots Per Project**: 4 to 18 (Mean: 9.62)
- **Snapshot Calendar Range**: 2021-01 to 2025-12
- **Generator Script**: `ml/src/generate_synthetic_data.py`
- **Reproducibility Seed**: `RANDOM_SEED = 42` (configured in `ml/src/config.py`)

---

## 3. Field Descriptions

### A. Observation-Time Features (Available for Prediction)
- `project_id`: Unique identifier (`PRJ-0001` to `PRJ-0850`).
- `snapshot_month`: Calendar month of observation (`YYYY-MM`).
- `ministry`: Nodal central ministry (e.g. Ministry of Railways, MoRTH).
- `sector`: Infrastructure domain (Roads, Railways, Power, Urban Development, etc.).
- `implementing_agency`: Executing PSU or authority (NHAI, RVNL, NTPC, etc.).
- `state`: Indian state or union territory.
- `original_cost_cr`: Sanctioned project cost in ₹ Crores.
- `planned_duration_months`: Sanctioned duration in months.
- `elapsed_months`: Months elapsed from project start at the snapshot date ($0 < \text{elapsed} \le \text{planned}$).
- `physical_progress_pct`: Verified physical progress ($0.0 - 100.0\%$).
- `financial_progress_pct`: Financial fund utilization ($0.0 - 100.0\%$).
- `expenditure_cr`: Cumulative expenditure incurred up to the snapshot date.
- `milestones_total`: Total deliverable milestones scheduled.
- `milestones_delayed`: Milestones currently slipping behind schedule ($0 \le \text{delayed} \le \text{total}$).
- `project_status`: Operational reporting status (`"Ongoing"`, `"Delayed"`, `"Critical"`).

### B. Future Outcomes & Labels (Quarantined from Prediction Features)
- `final_cost_cr`: Actual total expenditure upon final completion ($\ge \text{expenditure\_cr}$).
- `actual_duration_months`: Actual months from start to commissioning ($\ge \text{elapsed\_months}$).
- `cost_overrun`: Binary classification label (`1` if $\text{final\_cost\_cr} > 1.10 \times \text{original\_cost\_cr}$, else `0`).
- `time_overrun`: Binary classification label (`1` if $\text{actual\_duration\_months} > 1.10 \times \text{planned\_duration\_months}$, else `0`).

---

## 4. Generation Assumptions & Logic

1. **Log-Normal Cost Distribution**: Projects span from ₹25 Cr to ₹15,000+ Cr, reflecting real-world infrastructure skew where a minority of mega-projects account for vast capital.
2. **Co-Dependence**: Larger projects realistically correlate with longer planned schedules and greater milestone density.
3. **5 Operational Archetypes**:
   - *Healthy* (~35%): Smooth S-curve physical delivery, financial spend tracks physical output, low milestone delay.
   - *Delayed* (~25%): Physical delivery lags schedule; accumulates milestone delays; leads to schedule overrun.
   - *Cost-Pressure* (~15%): Financial burn outpaces physical progress; leads to budget escalation.
   - *High-Risk* (~15%): Severe physical lag coupled with high expenditure and heavy milestone bottlenecks.
   - *Mixed-Risk* (~10%): Erratic progress with stagnation intervals.
4. **Target Overrun Assumptions**: 10% tolerance thresholds applied to cost and time escalations for this prototype.

---

## 5. Regeneration & Validation Commands

To regenerate the dataset from scratch:
```powershell
.\ml\.venv\Scripts\python.exe ml\src\generate_synthetic_data.py
```

To run the automated validation suite:
```powershell
.\ml\.venv\Scripts\python.exe ml\src\validate_dataset.py
```

To run exploratory data analysis and generate visualization figures:
```powershell
.\ml\.venv\Scripts\python.exe ml\src\run_eda.py
```

---

## 6. Known Limitations

- Real infrastructure delays often involve complex exogenous variables (e.g. legal injunctions, forest clearance delays, local geological surprises) that cannot be fully modeled in synthetic tabular records.
- Multi-contractor subcontracting tiers and vendor disputes are abstracted into milestone delay counts and progress lags.
- The pipeline is designed so that official or public datasets conforming to the same schema can replace this synthetic data without code refactoring.
