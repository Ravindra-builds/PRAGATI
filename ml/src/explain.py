"""
Model Explainability & Risk Reason Engine.

Provides local prediction-level explanations using model-appropriate SHAP explainers:
- Time Overrun (Random Forest): shap.TreeExplainer
- Cost Overrun (Logistic Regression): shap.LinearExplainer

Maps preprocessed/scaled feature contributions back to human-readable names and unscaled values,
strictly upholding non-causal "strong model contributor" framing.
"""

import sys
import types
from typing import Dict, Any, List, Optional, Union
import numpy as np
import pandas as pd

# Handle Windows Application Control block on sklearn.cluster._hierarchical_fast
if "sklearn.cluster" not in sys.modules:
    try:
        import sklearn.cluster
    except ImportError:
        class _FakeKMeans:
            def __init__(self, *args, **kwargs): pass
            def fit(self, X): return self
            @property
            def cluster_centers_(self): return []
        _fake_mod = types.ModuleType("sklearn.cluster")
        _fake_mod.KMeans = _FakeKMeans
        sys.modules["sklearn.cluster"] = _fake_mod

import shap

# Deterministic human-readable display name mapping for features
FEATURE_DISPLAY_NAMES = {
    "budget_utilization_pct": "Budget Utilization",
    "schedule_progress_gap": "Schedule vs Physical Progress Gap",
    "expenditure_burn_gap": "Financial vs Physical Progress Gap",
    "milestone_slippage_ratio": "Milestone Slippage Ratio",
    "physical_progress_pct": "Physical Progress",
    "financial_progress_pct": "Financial Progress",
    "schedule_completion_pct": "Schedule Completion Rate",
    "cost_velocity": "Cost Expenditure Velocity",
    "physical_velocity": "Physical Progress Velocity",
    "elapsed_months": "Elapsed Project Duration",
    "planned_duration_months": "Contractual Planned Duration",
    "original_cost_cr": "Sanctioned Project Cost",
    "expenditure_cr": "Cumulative Expenditure",
    "milestones_delayed": "Delayed Milestones Count",
    "milestones_total": "Total Planned Milestones",
}

CATEGORICAL_PREFIXES = {
    "project_status_": "Project Status: ",
    "sector_": "Sector: ",
    "ministry_": "Ministry: ",
    "implementing_agency_": "Agency: ",
    "state_": "State: ",
}


def get_display_name(feature_key: str) -> str:
    """Returns clean, human-readable display title for any transformed feature."""
    if feature_key in FEATURE_DISPLAY_NAMES:
        return FEATURE_DISPLAY_NAMES[feature_key]

    for prefix, label in CATEGORICAL_PREFIXES.items():
        if feature_key.startswith(prefix):
            category_val = feature_key[len(prefix):]
            return f"{label}{category_val}"

    # Fallback formatting
    return feature_key.replace("_", " ").title()


def get_unscaled_value(feature_key: str, df_engineered: pd.DataFrame) -> Optional[Union[float, int, str]]:
    """Extracts raw unscaled/unencoded value from the observation DataFrame."""
    if df_engineered.empty:
        return None

    # Check direct numeric/raw column
    if feature_key in df_engineered.columns:
        val = df_engineered[feature_key].iloc[0]
        if isinstance(val, (int, np.integer)):
            return int(val)
        if isinstance(val, (float, np.floating)):
            return round(float(val), 2)
        return str(val)

    # Check one-hot categorical encoded column (e.g. project_status_Critical)
    for prefix in CATEGORICAL_PREFIXES:
        if feature_key.startswith(prefix):
            col_name = prefix[:-1] # strip trailing underscore
            category_val = feature_key[len(prefix):]
            if col_name in df_engineered.columns:
                actual_val = str(df_engineered[col_name].iloc[0])
                return category_val if actual_val == category_val else f"Not {category_val}"

    return None


class ModelExplainer:
    """
    Manages local SHAP explainers for both Cost Overrun and Time Overrun models.
    Initialized once at application startup with fitted pipelines.
    """

    def __init__(self, cost_pipeline, time_pipeline):
        self.cost_pipeline = cost_pipeline
        self.time_pipeline = time_pipeline

        self.preprocessor = self.time_pipeline.named_steps["preprocessor"]
        self.feature_names = self.preprocessor.get_feature_names_out().tolist()

        # 1. TreeExplainer for Random Forest (Time Overrun)
        rf_clf = self.time_pipeline.named_steps["classifier"]
        self.time_explainer = shap.TreeExplainer(rf_clf)

        # 2. LinearExplainer for Logistic Regression (Cost Overrun)
        lr_clf = self.cost_pipeline.named_steps["classifier"]
        num_features = len(self.feature_names)
        masker = shap.maskers.Independent(np.zeros((1, num_features)))
        self.cost_explainer = shap.LinearExplainer(lr_clf, masker=masker)

    def explain(
        self,
        df_engineered: pd.DataFrame,
        target: str,
        top_n: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Computes local SHAP attributions for a single engineered project snapshot.

        Args:
            df_engineered: 1-row DataFrame containing raw and engineered features.
            target: 'cost_overrun' or 'time_overrun'.
            top_n: Number of strongest feature drivers to return.

        Returns:
            Ranked list of driver dictionaries containing feature, display_name,
            value, contribution, and direction.
        """
        if df_engineered.empty:
            return []

        # Transform features using pipeline preprocessor
        X_trans = self.preprocessor.transform(df_engineered)

        if target == "time_overrun":
            # Random Forest TreeExplainer
            shap_values = self.time_explainer.shap_values(X_trans)
            # Binary classification positive class attributions (class 1: delay)
            if isinstance(shap_values, list) and len(shap_values) == 2:
                raw_contributions = np.array(shap_values[1][0])
            elif isinstance(shap_values, np.ndarray):
                if shap_values.ndim == 3 and shap_values.shape[2] == 2:
                    raw_contributions = shap_values[0, :, 1]
                else:
                    raw_contributions = shap_values[0]
            else:
                raw_contributions = np.array(shap_values)[0]
        elif target == "cost_overrun":
            # Logistic Regression LinearExplainer
            linear_res = self.cost_explainer(X_trans)
            raw_contributions = np.array(linear_res.values[0])
        else:
            raise ValueError(f"Unknown target for explanation: {target}")

        drivers = []
        for i, feat_name in enumerate(self.feature_names):
            contrib = float(raw_contributions[i])
            if abs(contrib) < 1e-6:
                continue

            direction = (
                "increases_risk" if contrib > 0.0001
                else ("decreases_risk" if contrib < -0.0001 else "neutral")
            )

            unscaled_val = get_unscaled_value(feat_name, df_engineered)
            display_name = get_display_name(feat_name)

            drivers.append({
                "feature": feat_name,
                "display_name": display_name,
                "value": unscaled_val,
                "contribution": round(contrib, 4),
                "direction": direction,
            })

        # Rank by absolute contribution magnitude
        drivers.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        return drivers[:top_n]
