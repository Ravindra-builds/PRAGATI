"""
End-to-End Pipeline Demonstration Script.

Demonstrates the transformation stages:
  Raw Snapshot Row
         ↓
  Engineered Row (7 derived features)
         ↓
  Quarantined Predictor Matrix X & Targets y
         ↓
  Project-Grouped Temporal Split (Train / Test)
         ↓
  Preprocessed & Scaled Feature Matrices

NOTE: This script performs ONLY feature transformation and validation.
NO machine learning models are trained.
"""

import sys
from pathlib import Path
import pandas as pd

# Add ml/src to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config
import targets
import features
import preprocessing
import split


def run_demo():
    print("=" * 70)
    print("SIH 2026: End-to-End Feature Engineering & Preprocessing Pipeline")
    print("=" * 70)

    # 1. Load Raw Dataset
    data_path = config.get_active_dataset_path("synthetic")
    print(f"\n[Stage 1] Loading Raw Dataset from: {data_path}")
    raw_df = pd.read_csv(data_path)
    print(f"Loaded {len(raw_df):,} snapshot rows across {raw_df['project_id'].nunique()} unique projects.")

    # Display Raw Sample Row
    sample_pid = raw_df["project_id"].iloc[0]
    sample_raw_row = raw_df[raw_df["project_id"] == sample_pid].iloc[0]
    print("\n--- Raw Snapshot Row (Sample) ---")
    for col in features.RAW_FEATURES:
        if col in sample_raw_row:
            print(f"  {col:<26}: {sample_raw_row[col]}")

    # 2. Feature Engineering
    print("\n" + "-" * 70)
    print("[Stage 2] Computing Domain Feature Engineering (7 Derived Metrics)")
    engineered_df = features.engineer_features(raw_df)
    sample_eng_row = engineered_df[engineered_df["project_id"] == sample_pid].iloc[0]

    print("\n--- Engineered Features Added ---")
    for col in features.DERIVED_FEATURES:
        print(f"  {col:<26}: {sample_eng_row[col]}")

    # 3. Target Quarantine & Separation
    print("\n" + "-" * 70)
    print("[Stage 3] Target Quarantine & Separation")
    print(f"Quarantined Outcome Columns Excluded from X: {targets.EXCLUDED_OUTCOME_COLUMNS}")
    X_full, y_full = targets.separate_targets(engineered_df)
    targets.assert_no_leakage(X_full)

    print(f"Full X shape : {X_full.shape} (Predictor features only)")
    print(f"Full y shape : {y_full.shape} (Target labels: {list(y_full.columns)})")
    print("Leakage Check: PASSED - Zero post-completion columns in X.")

    # 4. Project-Grouped Temporal Split
    print("\n" + "-" * 70)
    print("[Stage 4] Project-Grouped Temporal Split (75% Train / 25% Test)")
    train_df, test_df, split_stats = split.project_grouped_temporal_split(
        engineered_df,
        test_size=0.25,
        project_id_col="project_id",
        time_col="snapshot_month",
    )

    print(f"Train Split : {split_stats['train_snapshots']:,} snapshots ({split_stats['train_projects']} projects) | Date: {split_stats['train_date_range']}")
    print(f"Test Split  : {split_stats['test_snapshots']:,} snapshots ({split_stats['test_projects']} projects) | Date: {split_stats['test_date_range']}")
    print(f"Cost Overrun Rate -> Train: {split_stats['train_cost_overrun_pct']}% | Test: {split_stats['test_cost_overrun_pct']}%")
    print(f"Time Overrun Rate -> Train: {split_stats['train_time_overrun_pct']}% | Test: {split_stats['test_time_overrun_pct']}%")

    # Separate X and y within each split partition
    X_train, y_train = targets.separate_targets(train_df)
    X_test, y_test = targets.separate_targets(test_df)

    # 5. Preprocessing Pipeline
    print("\n" + "-" * 70)
    print("[Stage 5] Preprocessing & Feature Encoding")
    print(f"Numeric Features to Scale ({len(features.MODELING_NUMERIC_FEATURES)}):")
    print(f"  {features.MODELING_NUMERIC_FEATURES}")
    print(f"\nCategorical Features to One-Hot Encode ({len(features.MODELING_CATEGORICAL_FEATURES)}):")
    print(f"  {features.MODELING_CATEGORICAL_FEATURES}")

    preprocessor = preprocessing.build_preprocessor()
    X_train_proc, X_test_proc, out_feature_names = preprocessing.fit_transform_train_test(
        preprocessor, X_train, X_test, return_df=True
    )

    print("\nPreprocessing Completed (Strictly fitted on Train split only):")
    print(f"Transformed X_train shape: {X_train_proc.shape}")
    print(f"Transformed X_test shape : {X_test_proc.shape}")
    print(f"Total Transformed Columns: {len(out_feature_names)}")
    print(f"Sample Transformed Feature Columns: {out_feature_names[:8]} ...")

    print("\n" + "=" * 70)
    print("PIPELINE DEMONSTRATION COMPLETE - ALL STAGES VALIDATED")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()
