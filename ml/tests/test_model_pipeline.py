"""
Unit tests for Trained Model Pipelines, Deserialization, and Inference Consistency.
"""

import sys
import unittest
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

# Add ml/src to sys.path
src_dir = Path(__file__).resolve().parent.parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import config
import features
import targets


class TestModelArtifacts(unittest.TestCase):
    def setUp(self):
        """Prepare sample input data for pipeline inference."""
        self.cost_model_path = config.COST_OVERRUN_MODEL_DIR / "model.joblib"
        self.cost_meta_path = config.COST_OVERRUN_MODEL_DIR / "metadata.json"
        self.time_model_path = config.TIME_OVERRUN_MODEL_DIR / "model.joblib"
        self.time_meta_path = config.TIME_OVERRUN_MODEL_DIR / "metadata.json"

        self.sample_row = pd.DataFrame([{
            "project_id": "TEST-001",
            "snapshot_month": "2024-06",
            "ministry": "Ministry of Railways",
            "sector": "Railways",
            "implementing_agency": "RVNL",
            "state": "Maharashtra",
            "original_cost_cr": 450.0,
            "planned_duration_months": 36,
            "elapsed_months": 18,
            "physical_progress_pct": 35.0,
            "financial_progress_pct": 42.0,
            "expenditure_cr": 189.0,
            "milestones_total": 12,
            "milestones_delayed": 2,
            "project_status": "Ongoing",
        }])

    def test_artifacts_exist(self):
        """Test that model serialized binaries and metadata JSONs exist on disk."""
        self.assertTrue(self.cost_model_path.exists(), f"Missing {self.cost_model_path}")
        self.assertTrue(self.cost_meta_path.exists(), f"Missing {self.cost_meta_path}")
        self.assertTrue(self.time_model_path.exists(), f"Missing {self.time_model_path}")
        self.assertTrue(self.time_meta_path.exists(), f"Missing {self.time_meta_path}")

    def test_metadata_structure(self):
        """Test that metadata JSONs contain required schema elements."""
        for meta_path, expected_target in [(self.cost_meta_path, "cost_overrun"), (self.time_meta_path, "time_overrun")]:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

            self.assertEqual(meta["target"], expected_target)
            self.assertIn("model_type", meta)
            self.assertIn("test_metrics", meta)
            self.assertIn("accuracy", meta["test_metrics"])
            self.assertIn("recall", meta["test_metrics"])
            self.assertIn("precision", meta["test_metrics"])
            self.assertIn("roc_auc", meta["test_metrics"])
            self.assertIn("pr_auc", meta["test_metrics"])
            self.assertIn("top_10_features", meta)

    def test_pipeline_deserialization_and_inference(self):
        """Test that saved pipelines load cleanly and produce valid probabilities in [0.0, 1.0]."""
        cost_pipeline = joblib.load(self.cost_model_path)
        time_pipeline = joblib.load(self.time_model_path)

        # Engineer features on sample input
        eng_row = features.engineer_features(self.sample_row)

        # Predict cost overrun
        cost_probs = cost_pipeline.predict_proba(eng_row)[:, 1]
        self.assertEqual(len(cost_probs), 1)
        self.assertTrue(0.0 <= cost_probs[0] <= 1.0)

        # Predict time overrun
        time_probs = time_pipeline.predict_proba(eng_row)[:, 1]
        self.assertEqual(len(time_probs), 1)
        self.assertTrue(0.0 <= time_probs[0] <= 1.0)


if __name__ == "__main__":
    unittest.main()
