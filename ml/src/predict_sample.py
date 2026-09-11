"""
Inference & Prediction Demonstration Script.

Loads the trained, serialized model pipelines from:
  - ml/models/cost_overrun/model.joblib
  - ml/models/time_overrun/model.joblib
and generates calibrated probabilities and risk classifications on unseen test projects.
"""

import sys
import json
from pathlib import Path
import joblib
import pandas as pd

# Add ml/src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config
import features
import split
import targets


def load_model_and_metadata(model_dir: Path):
    """Loads a serialized pipeline and its accompanying metadata."""
    model_path = model_dir / "model.joblib"
    metadata_path = model_dir / "metadata.json"

    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(f"Model artifacts missing in {model_dir}")

    pipeline = joblib.load(model_path)
    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    return pipeline, metadata


def predict_unseen_samples():
    print("=" * 70)
    print("SIH 2026: Infrastructure Monitoring Model Prediction Test")
    print("=" * 70)

    # 1. Load Trained Pipelines & Metadata
    cost_pipeline, cost_meta = load_model_and_metadata(config.COST_OVERRUN_MODEL_DIR)
    time_pipeline, time_meta = load_model_and_metadata(config.TIME_OVERRUN_MODEL_DIR)

    threshold = cost_meta.get("decision_threshold", config.DEFAULT_DECISION_THRESHOLD)
    print(f"Loaded Cost Overrun Model : {cost_meta['model_type']} (Threshold = {threshold})")
    print(f"Loaded Time Overrun Model : {time_meta['model_type']} (Threshold = {threshold})")

    # 2. Load Dataset & Extract Unseen Test Split
    data_path = config.get_active_dataset_path("synthetic")
    raw_df = pd.read_csv(data_path)
    df_eng = features.engineer_features(raw_df)

    _, test_df, _ = split.project_grouped_temporal_split(df_eng, test_size=0.25)
    X_test, y_test = targets.separate_targets(test_df)
    targets.assert_no_leakage(X_test)

    # 3. Select 4 Distinct Unseen Test Projects
    sample_pids = test_df["project_id"].drop_duplicates().sample(4, random_state=123).tolist()

    print("\nEvaluating Predictions on 4 Randomly Sampled Unseen Test Projects:")
    print("-" * 70)

    for pid in sample_pids:
        # Take the most recent snapshot available for this project
        proj_snapshots = X_test[X_test["project_id"] == pid].sort_values("elapsed_months")
        latest_snapshot = proj_snapshots.iloc[[-1]]
        latest_idx = latest_snapshot.index[0]

        actual_cost_overrun = y_test.loc[latest_idx, "cost_overrun"]
        actual_time_overrun = y_test.loc[latest_idx, "time_overrun"]

        # Run Predictions through full pipelines
        cost_prob = float(cost_pipeline.predict_proba(latest_snapshot)[:, 1][0])
        time_prob = float(time_pipeline.predict_proba(latest_snapshot)[:, 1][0])

        cost_pred = int(cost_prob >= threshold)
        time_pred = int(time_prob >= threshold)

        snap = latest_snapshot.iloc[0]

        print(f"\nProject ID               : {pid}")
        print(f"Sector / Agency          : {snap['sector']} | {snap['implementing_agency']} ({snap['state']})")
        print(f"Observation Snapshot     : Month {snap['elapsed_months']} of {snap['planned_duration_months']} ({snap['snapshot_month']})")
        print(f"Progress Status          : Physical = {snap['physical_progress_pct']:.1f}% | Financial = {snap['financial_progress_pct']:.1f}% | Operational = {snap['project_status']}")
        print(f"Delayed Milestones       : {snap['milestones_delayed']} / {snap['milestones_total']} (Slippage: {snap['milestone_slippage_ratio']:.2f})")
        print(f"Schedule Progress Gap    : {snap['schedule_progress_gap']:+.1f}% | Burn Gap: {snap['expenditure_burn_gap']:+.1f}%")
        print("--- Model Inference ---")
        print(f"Cost Overrun Probability : {cost_prob:.4f} -> Prediction: {'HIGH RISK [OVERRUN]' if cost_pred else 'LOW RISK [NORMAL]'} (Ground Truth: {actual_cost_overrun})")
        print(f"Time Overrun Probability : {time_prob:.4f} -> Prediction: {'HIGH RISK [DELAY]' if time_pred else 'LOW RISK [NORMAL]'} (Ground Truth: {actual_time_overrun})")

    print("\n" + "=" * 70)
    print("PREDICTION TEST COMPLETED SUCCESSFULLY.")
    print("=" * 70)


if __name__ == "__main__":
    predict_unseen_samples()
