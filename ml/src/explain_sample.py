"""
Sample Local Explainability Demonstration.

Demonstrates local SHAP risk-driver explanations on unseen holdout test projects.
Extracts model-supported contributors for both Cost Overrun and Time Overrun predictions.

Usage:
    .\\ml\\.venv\\Scripts\\python.exe ml/src/explain_sample.py
"""

import sys
from pathlib import Path
import joblib
import pandas as pd

# Add ml/src to sys.path
src_dir = Path(__file__).resolve().parent
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import config
import features
import explain


def run_demo():
    print("=" * 75)
    print("SIH 2026: Local Model Explainability Demonstration (SHAP)")
    print("=" * 75)

    # 1. Load Trained Pipelines
    cost_model_path = config.COST_OVERRUN_MODEL_DIR / "model.joblib"
    time_model_path = config.TIME_OVERRUN_MODEL_DIR / "model.joblib"

    if not cost_model_path.exists() or not time_model_path.exists():
        print("❌ Model artifacts not found. Please train models first:")
        print("   .\\ml\\.venv\\Scripts\\python.exe ml/src/train_models.py")
        sys.exit(1)

    print("Loading serialized pipelines and initializing SHAP explainers...")
    cost_pipe = joblib.load(cost_model_path)
    time_pipe = joblib.load(time_model_path)
    explainer = explain.ModelExplainer(cost_pipe, time_pipe)

    # 2. Sample Unseen Projects (One High Risk, One Low Risk)
    sample_projects = [
        {
            "label": "High-Risk Distressed Project Snapshot",
            "data": {
                "project_id": "PRJ-0714",
                "snapshot_month": "2025-06",
                "ministry": "Ministry of Housing and Urban Affairs",
                "sector": "Urban Development",
                "implementing_agency": "NBCC",
                "state": "Madhya Pradesh",
                "original_cost_cr": 1200.0,
                "planned_duration_months": 27,
                "elapsed_months": 22,
                "physical_progress_pct": 47.6,
                "financial_progress_pct": 63.6,
                "expenditure_cr": 763.0,
                "milestones_total": 6,
                "milestones_delayed": 2,
                "project_status": "Critical",
            },
        },
        {
            "label": "Low-Risk Healthy Project Snapshot",
            "data": {
                "project_id": "PRJ-0722",
                "snapshot_month": "2027-01",
                "ministry": "Ministry of Power",
                "sector": "Power",
                "implementing_agency": "NTPC",
                "state": "Madhya Pradesh",
                "original_cost_cr": 2100.0,
                "planned_duration_months": 46,
                "elapsed_months": 43,
                "physical_progress_pct": 94.5,
                "financial_progress_pct": 93.2,
                "expenditure_cr": 1957.2,
                "milestones_total": 11,
                "milestones_delayed": 1,
                "project_status": "Ongoing",
            },
        },
    ]

    for p in sample_projects:
        raw_df = pd.DataFrame([p["data"]])
        df_eng = features.engineer_features(raw_df)

        # Cost Overrun
        cost_prob = float(cost_pipe.predict_proba(df_eng)[:, 1][0])
        cost_pred = int(cost_prob >= 0.50)
        cost_risk = "HIGH" if cost_pred == 1 else "LOW"
        cost_drivers = explainer.explain(df_eng, target="cost_overrun", top_n=5)

        # Time Overrun
        time_prob = float(time_pipe.predict_proba(df_eng)[:, 1][0])
        time_pred = int(time_prob >= 0.50)
        time_risk = "HIGH" if time_pred == 1 else "LOW"
        time_drivers = explainer.explain(df_eng, target="time_overrun", top_n=5)

        print("\n" + "-" * 75)
        print(f"Scenario: {p['label']}")
        print(f"Project ID : {p['data']['project_id']}")
        print(f"Context    : {p['data']['sector']} | {p['data']['implementing_agency']} ({p['data']['state']})")
        print(f"Status     : Physical={p['data']['physical_progress_pct']}% | Financial={p['data']['financial_progress_pct']}% | Month {p['data']['elapsed_months']}/{p['data']['planned_duration_months']}")

        # Print Cost Explanation
        print(f"\n  [Target 1: Cost Overrun]")
        print(f"  Probability : {cost_prob * 100:.2f}%")
        print(f"  Risk Tier   : {cost_risk}")
        print(f"  Top Model-Supported Drivers:")
        for idx, d in enumerate(cost_drivers, 1):
            arrow = "(+)" if d["direction"] == "increases_risk" else "(-)"
            val_str = f" [Value: {d['value']}]" if d["value"] is not None else ""
            print(f"    {idx}. {d['display_name']}{val_str} {arrow} (SHAP: {d['contribution']:+.4f} | {d['direction']})")

        # Print Time Explanation
        print(f"\n  [Target 2: Time Overrun]")
        print(f"  Probability : {time_prob * 100:.2f}%")
        print(f"  Risk Tier   : {time_risk}")
        print(f"  Top Model-Supported Drivers:")
        for idx, d in enumerate(time_drivers, 1):
            arrow = "(+)" if d["direction"] == "increases_risk" else "(-)"
            val_str = f" [Value: {d['value']}]" if d["value"] is not None else ""
            print(f"    {idx}. {d['display_name']}{val_str} {arrow} (SHAP: {d['contribution']:+.4f} | {d['direction']})")

    print("\n" + "=" * 75)
    print("Notice: Drivers represent statistical model contributions, not causal proof.")
    print("=" * 75)


if __name__ == "__main__":
    run_demo()
