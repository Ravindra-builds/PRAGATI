"""
Leakage-Safe Validation Splitting Module.

Implements a Project-Grouped Temporal Holdout Strategy.
Guarantees that:
  1. A project's snapshots never cross the train/test boundary (zero project-ID leakage).
  2. Training data precedes test data chronologically (temporal realism).
"""

from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np


def project_grouped_temporal_split(
    df: pd.DataFrame,
    test_size: float = 0.25,
    project_id_col: str = "project_id",
    time_col: str = "snapshot_month",
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Partitions a multi-snapshot dataset into Train and Test splits respecting
    both project grouping and temporal ordering.

    Methodology:
      1. Finds the earliest snapshot month (commencement horizon) for each unique project.
      2. Orders all unique projects chronologically by their earliest snapshot month.
      3. Splits the unique projects into Train (1 - test_size) and Test (test_size).
      4. Assigns ALL snapshot rows belonging to a project to that project's designated split.

    Guarantees:
      - Disjoint Projects: set(train_projects) ∩ set(test_projects) == ∅.
      - Temporal Precedence: Training projects started at or before test projects.

    Returns:
      (train_df, test_df, split_summary_dict)
    """
    if project_id_col not in df.columns:
        raise KeyError(f"Project ID column '{project_id_col}' not found in dataframe.")
    if time_col not in df.columns:
        raise KeyError(f"Time column '{time_col}' not found in dataframe.")

    # 1. Determine earliest snapshot month for each unique project
    project_starts = (
        df.groupby(project_id_col)[time_col]
        .min()
        .reset_index()
        .rename(columns={time_col: "earliest_snapshot"})
    )

    # Sort projects chronologically by start horizon
    project_starts.sort_values(by=["earliest_snapshot", project_id_col], inplace=True)
    project_starts.reset_index(drop=True, inplace=True)

    n_total_projects = len(project_starts)
    n_test_projects = int(np.round(n_total_projects * test_size))
    n_train_projects = n_total_projects - n_test_projects

    train_project_ids = set(project_starts.iloc[:n_train_projects][project_id_col])
    test_project_ids = set(project_starts.iloc[n_train_projects:][project_id_col])

    # Enforce disjointness assertion
    intersection = train_project_ids.intersection(test_project_ids)
    if intersection:
        raise ValueError(f"Project leakage detected! {len(intersection)} projects in both train and test.")

    # 2. Extract snapshot rows for each partition
    train_df = df[df[project_id_col].isin(train_project_ids)].copy()
    test_df = df[df[project_id_col].isin(test_project_ids)].copy()

    # Sort each partition chronologically
    train_df.sort_values(by=[project_id_col, time_col], inplace=True)
    test_df.sort_values(by=[project_id_col, time_col], inplace=True)

    # 3. Generate diagnostic summary
    summary = {
        "total_snapshots": len(df),
        "total_projects": n_total_projects,
        "train_snapshots": len(train_df),
        "train_projects": len(train_project_ids),
        "train_snapshot_pct": round(len(train_df) / len(df) * 100, 2),
        "train_date_range": (train_df[time_col].min(), train_df[time_col].max()),
        "test_snapshots": len(test_df),
        "test_projects": len(test_project_ids),
        "test_snapshot_pct": round(len(test_df) / len(df) * 100, 2),
        "test_date_range": (test_df[time_col].min(), test_df[time_col].max()),
    }

    # Target distributions across splits if target columns exist
    if "cost_overrun" in df.columns:
        summary["train_cost_overrun_pct"] = round(train_df["cost_overrun"].mean() * 100, 2)
        summary["test_cost_overrun_pct"] = round(test_df["cost_overrun"].mean() * 100, 2)
    if "time_overrun" in df.columns:
        summary["train_time_overrun_pct"] = round(train_df["time_overrun"].mean() * 100, 2)
        summary["test_time_overrun_pct"] = round(test_df["time_overrun"].mean() * 100, 2)

    return train_df, test_df, summary
