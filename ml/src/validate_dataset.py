"""
Automated Data Validation Suite for Infrastructure Project Monitoring Datasets.

Validates schema conformity, range boundaries, temporal monotonicity,
relational integrity, and target label consistency.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Add ml/src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config

REQUIRED_INPUT_COLUMNS = [
    "project_id",
    "snapshot_month",
    "ministry",
    "sector",
    "implementing_agency",
    "state",
    "original_cost_cr",
    "planned_duration_months",
    "elapsed_months",
    "physical_progress_pct",
    "financial_progress_pct",
    "expenditure_cr",
    "milestones_total",
    "milestones_delayed",
    "project_status",
]

REQUIRED_OUTCOME_COLUMNS = [
    "final_cost_cr",
    "actual_duration_months",
    "cost_overrun",
    "time_overrun",
]


def validate_dataset(file_path: Path = None) -> bool:
    """
    Validates the dataset against business logic, schema, and statistical integrity rules.
    Returns True if all critical checks pass, False otherwise.
    """
    if file_path is None:
        file_path = config.get_active_dataset_path()

    print("=" * 65)
    print("PAIMANA-Style Dataset Validation Suite")
    print(f"Target File: {file_path}")
    print("=" * 65)

    if not file_path.exists():
        print(f"ERROR: Dataset file does not exist at {file_path}")
        return False

    df = pd.read_csv(file_path)
    all_passed = True
    results = []

    def record_check(name: str, passed: bool, details: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
        status = "PASS" if passed else "FAIL"
        results.append((name, status, details))

    # 1. Row count & unique projects
    total_rows = len(df)
    unique_projects = df["project_id"].nunique() if "project_id" in df.columns else 0
    row_check = (7000 <= total_rows <= 10000) and (500 <= unique_projects <= 1500)
    record_check(
        "Dataset Dimensions",
        row_check,
        f"{total_rows} rows, {unique_projects} unique projects",
    )

    # 2. Required columns
    all_req_cols = REQUIRED_INPUT_COLUMNS + REQUIRED_OUTCOME_COLUMNS
    missing_cols = [col for col in all_req_cols if col not in df.columns]
    record_check(
        "Required Columns",
        len(missing_cols) == 0,
        f"Missing: {missing_cols}" if missing_cols else f"All {len(all_req_cols)} columns present",
    )

    if missing_cols:
        print("Cannot continue deeper validation due to missing columns.")
        return False

    # 3. Missing values check
    null_counts = df[all_req_cols].isnull().sum()
    total_nulls = null_counts.sum()
    record_check(
        "Missing Values",
        total_nulls == 0,
        f"{total_nulls} null values found" if total_nulls > 0 else "0 null values",
    )

    # 4. Duplicate snapshots check (project_id + snapshot_month)
    duplicates = df.duplicated(subset=["project_id", "snapshot_month"]).sum()
    record_check(
        "Duplicate Snapshots",
        duplicates == 0,
        f"{duplicates} duplicate (project_id, snapshot_month) pairs",
    )

    # 5. Progress percentage ranges [0, 100]
    phys_invalid = ((df["physical_progress_pct"] < 0) | (df["physical_progress_pct"] > 100)).sum()
    fin_invalid = ((df["financial_progress_pct"] < 0) | (df["financial_progress_pct"] > 100)).sum()
    progress_ok = (phys_invalid == 0) and (fin_invalid == 0)
    record_check(
        "Progress Ranges (0-100%)",
        progress_ok,
        f"Invalid physical: {phys_invalid}, Invalid financial: {fin_invalid}",
    )

    # 6. Cost bounds & expenditure <= final_cost
    cost_positive = (df["original_cost_cr"] > 0).all() and (df["final_cost_cr"] > 0).all()
    exp_positive = (df["expenditure_cr"] >= 0).all()
    # Allow 1 cent rounding margin
    exp_le_final = (df["expenditure_cr"] <= df["final_cost_cr"] + 0.05).all()
    cost_ok = cost_positive and exp_positive and exp_le_final
    record_check(
        "Cost & Expenditure Validity",
        cost_ok,
        f"Pos costs: {cost_positive}, Pos exp: {exp_positive}, Exp <= Final Cost: {exp_le_final}",
    )

    # 7. Duration bounds & elapsed <= planned
    dur_positive = (df["planned_duration_months"] > 0).all() and (df["elapsed_months"] > 0).all()
    elapsed_le_planned = (df["elapsed_months"] <= df["planned_duration_months"]).all()
    elapsed_le_actual = (df["elapsed_months"] <= df["actual_duration_months"]).all()
    dur_ok = dur_positive and elapsed_le_planned and elapsed_le_actual
    record_check(
        "Duration & Elapsed Validity",
        dur_ok,
        f"Elapsed <= Planned: {elapsed_le_planned}, Elapsed <= Actual: {elapsed_le_actual}",
    )

    # 8. Milestones validity (0 <= delayed <= total)
    milestones_positive = (df["milestones_total"] > 0).all()
    milestones_range = (
        (df["milestones_delayed"] >= 0) & (df["milestones_delayed"] <= df["milestones_total"])
    ).all()
    record_check(
        "Milestones Validity",
        milestones_positive and milestones_range,
        f"0 <= delayed <= total: {milestones_range}",
    )

    # 9. Temporal Monotonicity per project (progress doesn't decrease over time)
    monotonic_errors = 0
    for _, proj_df in df.groupby("project_id"):
        sorted_proj = proj_df.sort_values(by="elapsed_months")
        phys_diffs = sorted_proj["physical_progress_pct"].diff().dropna()
        fin_diffs = sorted_proj["financial_progress_pct"].diff().dropna()
        if (phys_diffs < -0.01).any() or (fin_diffs < -0.01).any():
            monotonic_errors += 1

    record_check(
        "Progress Monotonicity",
        monotonic_errors == 0,
        f"{monotonic_errors} projects with decreasing progress over time",
    )

    # 10. Target label definition consistency
    # Cost overrun: final_cost > original_cost * 1.10
    expected_cost_overrun = (
        df["final_cost_cr"] > (df["original_cost_cr"] * (1.0 + config.COST_OVERRUN_THRESHOLD)).round(2)
    ).astype(int)
    cost_label_match = (df["cost_overrun"] == expected_cost_overrun).all()

    # Time overrun: actual_duration > planned_duration * 1.10
    expected_time_overrun = (
        df["actual_duration_months"] > (df["planned_duration_months"] * (1.0 + config.TIME_OVERRUN_THRESHOLD)).round()
    ).astype(int)
    time_label_match = (df["time_overrun"] == expected_time_overrun).all()

    target_labels_binary = (
        df["cost_overrun"].isin([0, 1]).all() and df["time_overrun"].isin([0, 1]).all()
    )
    targets_ok = cost_label_match and time_label_match and target_labels_binary
    record_check(
        "Target Label Consistency",
        targets_ok,
        f"Cost match: {cost_label_match}, Time match: {time_label_match}, Binary: {target_labels_binary}",
    )

    # Print summary report
    print("\nDataset Validation Summary Table:")
    print("-" * 65)
    for name, status, details in results:
        print(f"{name:<28} : [{status:<4}]  {details}")
    print("-" * 65)

    if all_passed:
        print("OVERALL RESULT: ALL VALIDATION CHECKS PASSED.")
    else:
        print("OVERALL RESULT: VALIDATION FAILED ON ONE OR MORE CHECKS.")
    print("=" * 65)

    return all_passed


if __name__ == "__main__":
    success = validate_dataset()
    sys.exit(0 if success else 1)
