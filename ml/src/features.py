"""
Feature Engineering and Schema Organization Module.

Implements domain-informed infrastructure project monitoring indicators,
enforces separation between raw and derived features, and safely handles
edge cases (division by zero, missing historical snapshots).
"""

from typing import List, Tuple
import numpy as np
import pandas as pd

# Explicit feature groupings
ID_COLUMNS: List[str] = ["project_id", "snapshot_month"]

RAW_NUMERIC_FEATURES: List[str] = [
    "original_cost_cr",
    "planned_duration_months",
    "elapsed_months",
    "physical_progress_pct",
    "financial_progress_pct",
    "expenditure_cr",
    "milestones_total",
    "milestones_delayed",
]

RAW_CATEGORICAL_FEATURES: List[str] = [
    "ministry",
    "sector",
    "implementing_agency",
    "state",
    "project_status",
]

RAW_FEATURES: List[str] = ID_COLUMNS + RAW_NUMERIC_FEATURES + RAW_CATEGORICAL_FEATURES

DERIVED_FEATURES: List[str] = [
    "schedule_completion_pct",
    "schedule_progress_gap",
    "expenditure_burn_gap",
    "milestone_slippage_ratio",
    "budget_utilization_pct",
    "progress_velocity",
    "cost_velocity",
]

# Features designated for predictive machine learning models
MODELING_NUMERIC_FEATURES: List[str] = RAW_NUMERIC_FEATURES + DERIVED_FEATURES
MODELING_CATEGORICAL_FEATURES: List[str] = RAW_CATEGORICAL_FEATURES
ALL_MODELING_FEATURES: List[str] = MODELING_NUMERIC_FEATURES + MODELING_CATEGORICAL_FEATURES


def calculate_schedule_completion(
    elapsed_months: pd.Series,
    planned_duration_months: pd.Series
) -> pd.Series:
    """
    Percentage of planned project schedule elapsed at observation time.
    Safely handles planned_duration <= 0 by clipping denominator to 1.
    Formula: (elapsed_months / max(planned_duration_months, 1)) * 100
    """
    safe_planned = np.maximum(planned_duration_months, 1)
    res = (elapsed_months / safe_planned) * 100.0
    return res.round(2)


def calculate_schedule_progress_gap(
    schedule_completion_pct: pd.Series,
    physical_progress_pct: pd.Series
) -> pd.Series:
    """
    Measures schedule slippage deficit: expected progress vs physical execution.
    Positive value indicates physical progress is lagging behind contractual schedule.
    Formula: schedule_completion_pct - physical_progress_pct
    """
    return (schedule_completion_pct - physical_progress_pct).round(2)


def calculate_expenditure_burn_gap(
    financial_progress_pct: pd.Series,
    physical_progress_pct: pd.Series
) -> pd.Series:
    """
    Measures budget burn relative to physical ground reality.
    Positive value indicates funds are being spent faster than assets are delivered.
    Formula: financial_progress_pct - physical_progress_pct
    """
    return (financial_progress_pct - physical_progress_pct).round(2)


def calculate_milestone_slippage_ratio(
    milestones_delayed: pd.Series,
    milestones_total: pd.Series
) -> pd.Series:
    """
    Normalized ratio of delayed milestones to total deliverables.
    Safely handles milestones_total == 0. Bounded between 0.0 and 1.0.
    Formula: milestones_delayed / max(milestones_total, 1)
    """
    safe_total = np.maximum(milestones_total, 1)
    ratio = milestones_delayed / safe_total
    return np.clip(ratio, 0.0, 1.0).round(4)


def calculate_budget_utilization(
    expenditure_cr: pd.Series,
    original_cost_cr: pd.Series
) -> pd.Series:
    """
    Actual financial expenditure as a percentage of sanctioned budget.
    Safely handles original_cost_cr <= 0.
    Formula: (expenditure_cr / max(original_cost_cr, 1e-6)) * 100
    """
    safe_cost = np.maximum(original_cost_cr, 1e-6)
    res = (expenditure_cr / safe_cost) * 100.0
    return np.maximum(res, 0.0).round(2)


def calculate_velocities(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """
    Computes project-history-aware physical progress velocity and cost burn rate.

    Methodology:
      1. For each project sorted chronologically by elapsed_months:
         - Computes delta_progress = phys_pct[t] - phys_pct[t-1]
         - Computes delta_expenditure = exp_cr[t] - exp_cr[t-1]
         - Computes delta_months = elapsed[t] - elapsed[t-1]
         - Recent velocity = delta / delta_months
      2. For the initial observation snapshot (t=0) or where delta_months <= 0:
         - Gracefully falls back to cumulative velocity:
           progress_velocity = phys_pct[t] / max(elapsed[t], 1)
           cost_velocity = exp_cr[t] / max(elapsed[t], 1)

    Returns:
      (progress_velocity_series, cost_velocity_series)
    """
    req_cols = ["project_id", "elapsed_months", "physical_progress_pct", "expenditure_cr"]
    for col in req_cols:
        if col not in df.columns:
            raise KeyError(f"Missing required column for velocity calculation: {col}")

    # Work on a sorted index to preserve original ordering
    sorted_df = df.sort_values(by=["project_id", "elapsed_months"])

    # Groupby shifts for incremental metrics
    grp = sorted_df.groupby("project_id")
    prev_elapsed = grp["elapsed_months"].shift(1)
    prev_phys = grp["physical_progress_pct"].shift(1)
    prev_exp = grp["expenditure_cr"].shift(1)

    delta_elapsed = sorted_df["elapsed_months"] - prev_elapsed
    delta_phys = sorted_df["physical_progress_pct"] - prev_phys
    delta_exp = sorted_df["expenditure_cr"] - prev_exp

    # Recent incremental velocity
    recent_valid = (delta_elapsed > 0) & (~prev_elapsed.isna())
    safe_delta_m = np.where(recent_valid, delta_elapsed, 1.0)

    recent_phys_vel = np.where(recent_valid, delta_phys / safe_delta_m, np.nan)
    recent_cost_vel = np.where(recent_valid, delta_exp / safe_delta_m, np.nan)

    # Cumulative fallback for initial snapshot
    safe_elapsed = np.maximum(sorted_df["elapsed_months"], 1.0)
    cum_phys_vel = sorted_df["physical_progress_pct"] / safe_elapsed
    cum_cost_vel = sorted_df["expenditure_cr"] / safe_elapsed

    # Merge recent with fallback
    final_phys_vel = np.where(np.isnan(recent_phys_vel), cum_phys_vel, recent_phys_vel)
    final_cost_vel = np.where(np.isnan(recent_cost_vel), cum_cost_vel, recent_cost_vel)

    # Clip negative drift to 0 (non-decreasing assumption)
    final_phys_vel = np.clip(final_phys_vel, 0.0, 100.0)
    final_cost_vel = np.maximum(final_cost_vel, 0.0)

    # Reindex back to original dataframe row order
    phys_vel_series = pd.Series(final_phys_vel, index=sorted_df.index).loc[df.index].round(3)
    cost_vel_series = pd.Series(final_cost_vel, index=sorted_df.index).loc[df.index].round(3)

    return phys_vel_series, cost_vel_series


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main feature engineering transformer.
    Takes a project-monitoring dataframe, computes all 7 derived features,
    and returns an enriched copy of the dataframe.
    Guarantees no outcome variables are accessed or leaked.
    """
    df_out = df.copy()

    # 1. Schedule completion percentage
    df_out["schedule_completion_pct"] = calculate_schedule_completion(
        df_out["elapsed_months"],
        df_out["planned_duration_months"]
    )

    # 2. Schedule progress gap
    df_out["schedule_progress_gap"] = calculate_schedule_progress_gap(
        df_out["schedule_completion_pct"],
        df_out["physical_progress_pct"]
    )

    # 3. Expenditure burn gap
    df_out["expenditure_burn_gap"] = calculate_expenditure_burn_gap(
        df_out["financial_progress_pct"],
        df_out["physical_progress_pct"]
    )

    # 4. Milestone slippage ratio
    df_out["milestone_slippage_ratio"] = calculate_milestone_slippage_ratio(
        df_out["milestones_delayed"],
        df_out["milestones_total"]
    )

    # 5. Budget utilization percentage
    df_out["budget_utilization_pct"] = calculate_budget_utilization(
        df_out["expenditure_cr"],
        df_out["original_cost_cr"]
    )

    # 6 & 7. Progress velocity & cost velocity
    phys_vel, cost_vel = calculate_velocities(df_out)
    df_out["progress_velocity"] = phys_vel
    df_out["cost_velocity"] = cost_vel

    return df_out
