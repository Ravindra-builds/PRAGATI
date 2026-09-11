"""
Unit tests for Local Model Explainability (SHAP) Engine.

Tests:
1. Explainer initialization (TreeExplainer on Random Forest, LinearExplainer on Logistic Regression).
2. Local driver extraction for both Cost Overrun and Time Overrun.
3. Top-N driver truncation and sorting by absolute contribution magnitude.
4. Probability invariance: requesting explanations does NOT alter model predictions.
5. Direction assignments (increases_risk vs decreases_risk).
6. Deterministic human-readable display name mapping.
"""

import sys
import unittest
from pathlib import Path
import joblib
import pandas as pd

# Add ml/src to sys.path
src_dir = Path(__file__).resolve().parent.parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import config
import features
import explain


class TestModelExplainability(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Load trained model pipelines and instantiate ModelExplainer."""
        cls.cost_model_path = config.COST_OVERRUN_MODEL_DIR / "model.joblib"
        cls.time_model_path = config.TIME_OVERRUN_MODEL_DIR / "model.joblib"

        if not cls.cost_model_path.exists() or not cls.time_model_path.exists():
            raise FileNotFoundError("Model artifacts missing. Run train_models.py first.")

        cls.cost_pipe = joblib.load(cls.cost_model_path)
        cls.time_pipe = joblib.load(cls.time_model_path)
        cls.explainer = explain.ModelExplainer(cls.cost_pipe, cls.time_pipe)

    def setUp(self):
        """Standard test snapshot row."""
        self.sample_row = pd.DataFrame([{
            "project_id": "PRJ-TEST-001",
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
        }])
        self.df_eng = features.engineer_features(self.sample_row)

    def test_explainer_initialization(self):
        """Test that ModelExplainer initializes feature names and both explainers."""
        self.assertIsNotNone(self.explainer.time_explainer)
        self.assertIsNotNone(self.explainer.cost_explainer)
        self.assertGreater(len(self.explainer.feature_names), 20)
        self.assertIn("budget_utilization_pct", self.explainer.feature_names)

    def test_explain_cost_overrun(self):
        """Test that local drivers are extracted for Cost Overrun."""
        drivers = self.explainer.explain(self.df_eng, target="cost_overrun", top_n=5)
        self.assertEqual(len(drivers), 5)

        for d in drivers:
            self.assertIn("feature", d)
            self.assertIn("display_name", d)
            self.assertIn("value", d)
            self.assertIn("contribution", d)
            self.assertIn("direction", d)
            self.assertIn(d["direction"], ["increases_risk", "decreases_risk", "neutral"])

    def test_explain_time_overrun(self):
        """Test that local drivers are extracted for Time Overrun."""
        drivers = self.explainer.explain(self.df_eng, target="time_overrun", top_n=5)
        self.assertEqual(len(drivers), 5)

        for d in drivers:
            self.assertIn("feature", d)
            self.assertIn("display_name", d)
            self.assertIn("value", d)
            self.assertIn("contribution", d)
            self.assertIn("direction", d)
            self.assertIn(d["direction"], ["increases_risk", "decreases_risk", "neutral"])

    def test_top_n_truncation_and_ordering(self):
        """Test that drivers are sorted by absolute contribution and truncated to top_n."""
        for top_n in [3, 5, 8]:
            drivers = self.explainer.explain(self.df_eng, target="cost_overrun", top_n=top_n)
            self.assertEqual(len(drivers), top_n)

            # Assert strictly descending order of absolute contribution
            magnitudes = [abs(d["contribution"]) for d in drivers]
            self.assertEqual(magnitudes, sorted(magnitudes, reverse=True))

    def test_probability_invariance(self):
        """Ensure that generating explanations has zero side effects on prediction probabilities."""
        base_cost_prob = float(self.cost_pipe.predict_proba(self.df_eng)[:, 1][0])
        base_time_prob = float(self.time_pipe.predict_proba(self.df_eng)[:, 1][0])

        _ = self.explainer.explain(self.df_eng, target="cost_overrun", top_n=5)
        _ = self.explainer.explain(self.df_eng, target="time_overrun", top_n=5)

        after_cost_prob = float(self.cost_pipe.predict_proba(self.df_eng)[:, 1][0])
        after_time_prob = float(self.time_pipe.predict_proba(self.df_eng)[:, 1][0])

        self.assertAlmostEqual(base_cost_prob, after_cost_prob, places=6)
        self.assertAlmostEqual(base_time_prob, after_time_prob, places=6)

    def test_human_readable_display_names(self):
        """Test that transformed features have human-readable display names."""
        self.assertEqual(
            explain.get_display_name("budget_utilization_pct"),
            "Budget Utilization"
        )
        self.assertEqual(
            explain.get_display_name("schedule_progress_gap"),
            "Schedule vs Physical Progress Gap"
        )
        self.assertEqual(
            explain.get_display_name("project_status_Critical"),
            "Project Status: Critical"
        )
        self.assertEqual(
            explain.get_display_name("sector_Power"),
            "Sector: Power"
        )

    def test_direction_consistency(self):
        """Test that direction matches the arithmetic sign of the contribution."""
        drivers = self.explainer.explain(self.df_eng, target="cost_overrun", top_n=10)
        for d in drivers:
            if d["contribution"] > 0.0001:
                self.assertEqual(d["direction"], "increases_risk")
            elif d["contribution"] < -0.0001:
                self.assertEqual(d["direction"], "decreases_risk")
            else:
                self.assertEqual(d["direction"], "neutral")


if __name__ == "__main__":
    unittest.main()
