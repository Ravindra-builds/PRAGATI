"""
Target Quarantine and Outcome Separation Module.

Strictly enforces isolation between observation-time predictor features (X)
and future post-completion outcome variables (y and future costs/durations)
to prevent catastrophic data leakage.
"""

from typing import Tuple, List
import pandas as pd

# Quarantined columns that must NEVER enter the predictor feature matrix X
TARGET_COLUMNS: List[str] = [
    "cost_overrun",
    "time_overrun",
]

NON_TARGET_OUTCOME_COLUMNS: List[str] = [
    "final_cost_cr",
    "actual_duration_months",
]

EXCLUDED_OUTCOME_COLUMNS: List[str] = TARGET_COLUMNS + NON_TARGET_OUTCOME_COLUMNS


def assert_no_leakage(df: pd.DataFrame) -> None:
    """
    Automated assertion verifying that no quarantined outcome columns or labels
    are present in the predictor feature matrix.
    Raises ValueError if any quarantined column is detected.
    """
    leaked_cols = [col for col in EXCLUDED_OUTCOME_COLUMNS if col in df.columns]
    if leaked_cols:
        raise ValueError(
            f"DATA LEAKAGE DETECTED! Quarantined outcome columns found in feature matrix: {leaked_cols}. "
            "These represent post-completion outcomes and must never be provided to the model at prediction time."
        )


def separate_targets(
    df: pd.DataFrame,
    target_col: str = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Separates the input dataframe into:
      1. X: Predictor dataframe with ALL outcome and target columns strictly dropped.
      2. y: Target dataframe containing ground truth labels.

    If target_col is specified (e.g. 'cost_overrun' or 'time_overrun'), y is returned
    as a single-column Series or DataFrame for that target.
    Otherwise, y contains all TARGET_COLUMNS.
    """
    # Verify input validity
    missing_targets = [col for col in TARGET_COLUMNS if col not in df.columns]
    if missing_targets:
        raise KeyError(f"Expected target columns missing from dataset: {missing_targets}")

    # Extract target(s)
    if target_col is not None:
        if target_col not in TARGET_COLUMNS:
            raise ValueError(f"Invalid target_col '{target_col}'. Must be one of {TARGET_COLUMNS}")
        y = df[target_col].copy()
    else:
        y = df[TARGET_COLUMNS].copy()

    # Drop all quarantined outcome columns to construct X
    cols_to_drop = [col for col in EXCLUDED_OUTCOME_COLUMNS if col in df.columns]
    X = df.drop(columns=cols_to_drop).copy()

    # Run verification assertion
    assert_no_leakage(X)

    return X, y
