"""
Unit tests for the ML Inference FastAPI Service.

Tests endpoints:
- GET /health
- GET /model-info
- POST /predict (valid predictions, validation errors, and leakage prevention)
"""

import sys
import unittest
from pathlib import Path

# Add project root and ml/src to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

src_dir = Path(__file__).resolve().parent.parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from fastapi.testclient import TestClient
from ml.api.main import app


class TestMLInferenceAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Initialize TestClient with lifespan context."""
        cls.client = TestClient(app)
        # Enter lifespan context to trigger startup model loading
        cls.lifespan_ctx = cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        """Exit lifespan context."""
        cls.lifespan_ctx.__exit__(None, None, None)

    def setUp(self):
        """Standard valid payload for inference requests."""
        self.valid_payload = {
            "project_id": "PRJ-TEST-101",
            "snapshot_month": "2024-06",
            "ministry": "Ministry of Road Transport and Highways",
            "sector": "Roads and Highways",
            "implementing_agency": "NHAI",
            "state": "Maharashtra",
            "original_cost_cr": 850.0,
            "planned_duration_months": 36,
            "elapsed_months": 18,
            "physical_progress_pct": 42.0,
            "financial_progress_pct": 51.5,
            "expenditure_cr": 437.75,
            "milestones_total": 10,
            "milestones_delayed": 2,
            "project_status": "Ongoing",
        }

    def test_health_endpoint(self):
        """Test GET /health returns 200 and indicates loaded models."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "ml-inference")
        self.assertTrue(data["models_loaded"])

    def test_model_info_endpoint(self):
        """Test GET /model-info returns metadata for both models."""
        response = self.client.get("/model-info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["service"], "ml-inference")
        self.assertIn("models", data)
        self.assertIn("cost_overrun", data["models"])
        self.assertIn("time_overrun", data["models"])

        # Cost model metadata checks
        cost_meta = data["models"]["cost_overrun"]
        self.assertEqual(cost_meta["target"], "cost_overrun")
        self.assertIn("model_type", cost_meta)
        self.assertIn("test_metrics", cost_meta)
        self.assertIn("roc_auc", cost_meta["test_metrics"])

        # Time model metadata checks
        time_meta = data["models"]["time_overrun"]
        self.assertEqual(time_meta["target"], "time_overrun")
        self.assertIn("model_type", time_meta)
        self.assertIn("test_metrics", time_meta)
        self.assertIn("roc_auc", time_meta["test_metrics"])

    def test_predict_valid_payload(self):
        """Test POST /predict successfully computes dual-target overrun probabilities."""
        response = self.client.post("/predict", json=self.valid_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["project_id"], "PRJ-TEST-101")
        self.assertIn("cost_overrun", data)
        self.assertIn("time_overrun", data)

        # Validate cost prediction
        cost = data["cost_overrun"]
        self.assertTrue(0.0 <= cost["probability"] <= 1.0)
        self.assertIn(cost["prediction"], [0, 1])
        self.assertIn(cost["risk_level"], ["HIGH", "LOW"])
        self.assertIsNotNone(cost.get("drivers"))
        self.assertEqual(len(cost["drivers"]), 5)
        self.assertIn("feature", cost["drivers"][0])
        self.assertIn("display_name", cost["drivers"][0])
        self.assertIn("contribution", cost["drivers"][0])
        self.assertIn("direction", cost["drivers"][0])

        # Validate time prediction
        time_res = data["time_overrun"]
        self.assertTrue(0.0 <= time_res["probability"] <= 1.0)
        self.assertIn(time_res["prediction"], [0, 1])
        self.assertIn(time_res["risk_level"], ["HIGH", "LOW"])
        self.assertIsNotNone(time_res.get("drivers"))
        self.assertEqual(len(time_res["drivers"]), 5)

    def test_predict_without_explanations(self):
        """Test POST /predict?include_explanations=false returns predictions without calculating drivers."""
        response = self.client.post("/predict?include_explanations=false", json=self.valid_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data["cost_overrun"].get("drivers"))
        self.assertIsNone(data["time_overrun"].get("drivers"))

    def test_predict_rejects_leakage_final_cost(self):
        """Ensure post-completion outcome 'final_cost_cr' is rejected with HTTP 422."""
        leaky_payload = dict(self.valid_payload)
        leaky_payload["final_cost_cr"] = 1200.0

        response = self.client.post("/predict", json=leaky_payload)
        self.assertEqual(response.status_code, 422)
        err = response.json()
        self.assertEqual(err["error"], "Validation Error")
        self.assertTrue(any("extra_forbidden" in str(d) for d in err.get("details", [])))

    def test_predict_rejects_leakage_actual_duration(self):
        """Ensure post-completion outcome 'actual_duration_months' is rejected with HTTP 422."""
        leaky_payload = dict(self.valid_payload)
        leaky_payload["actual_duration_months"] = 48

        response = self.client.post("/predict", json=leaky_payload)
        self.assertEqual(response.status_code, 422)

    def test_predict_rejects_leakage_labels(self):
        """Ensure outcome labels 'cost_overrun' and 'time_overrun' are rejected with HTTP 422."""
        for label in ["cost_overrun", "time_overrun"]:
            leaky_payload = dict(self.valid_payload)
            leaky_payload[label] = 1
            response = self.client.post("/predict", json=leaky_payload)
            self.assertEqual(response.status_code, 422, f"Failed to reject label {label}")

    def test_predict_rejects_negative_cost(self):
        """Ensure negative or zero original_cost_cr is rejected."""
        payload = dict(self.valid_payload)
        payload["original_cost_cr"] = -50.0
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_predict_rejects_out_of_bounds_progress(self):
        """Ensure progress percentages > 100 are rejected."""
        payload = dict(self.valid_payload)
        payload["physical_progress_pct"] = 105.0
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_predict_rejects_elapsed_greater_than_planned(self):
        """Ensure elapsed_months > planned_duration_months fails cross-field validation."""
        payload = dict(self.valid_payload)
        payload["elapsed_months"] = 40
        payload["planned_duration_months"] = 30
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_predict_rejects_delayed_milestones_greater_than_total(self):
        """Ensure milestones_delayed > milestones_total fails cross-field validation."""
        payload = dict(self.valid_payload)
        payload["milestones_delayed"] = 8
        payload["milestones_total"] = 5
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_predict_rejects_malformed_snapshot_month(self):
        """Ensure invalid month format (e.g., '2024/06') is rejected."""
        payload = dict(self.valid_payload)
        payload["snapshot_month"] = "2024/06"
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
