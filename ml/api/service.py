"""
Inference Service Engine.

Manages in-memory model pipelines, executes feature transformations via the single
source of truth (ml/src/features.py), and returns calibrated probability estimates.
"""

import time
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import joblib
import pandas as pd

# Add ml/src to sys.path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import config
import features
import explain
from ml.api.schemas import (
    PredictionRequest,
    PredictionResponse,
    TargetPredictionResult,
    RiskDriver,
    ModelInfoResponse,
    ModelInfoItem,
)

logger = logging.getLogger("ml_inference_service")


class ModelService:
    """
    Singleton service managing in-memory machine learning pipelines and local SHAP explainers.
    Guarantees models and explainers are deserialized only once at startup.
    """

    def __init__(self):
        self.cost_pipeline = None
        self.cost_metadata: Optional[Dict[str, Any]] = None
        self.time_pipeline = None
        self.time_metadata: Optional[Dict[str, Any]] = None
        self.explainer: Optional[explain.ModelExplainer] = None
        self.is_loaded: bool = False

    def load_models(self) -> None:
        """
        Loads the trained pipelines and metadata into memory.
        Fails fast if artifacts are missing or corrupt.
        """
        start_time = time.perf_counter()
        logger.info("Initializing ML Model Service: Loading model artifacts...")

        cost_model_path = config.COST_OVERRUN_MODEL_DIR / "model.joblib"
        cost_meta_path = config.COST_OVERRUN_MODEL_DIR / "metadata.json"
        time_model_path = config.TIME_OVERRUN_MODEL_DIR / "model.joblib"
        time_meta_path = config.TIME_OVERRUN_MODEL_DIR / "metadata.json"

        # Verify existence
        for p in [cost_model_path, cost_meta_path, time_model_path, time_meta_path]:
            if not p.exists():
                logger.error("Missing required model artifact: %s", p)
                raise FileNotFoundError(f"Model artifact not found at {p}. Run 'python ml/src/train_models.py' first.")

        # Load pipelines
        try:
            self.cost_pipeline = joblib.load(cost_model_path)
            with open(cost_meta_path, "r", encoding="utf-8") as f:
                self.cost_metadata = json.load(f)

            self.time_pipeline = joblib.load(time_model_path)
            with open(time_meta_path, "r", encoding="utf-8") as f:
                self.time_metadata = json.load(f)

            # Initialize local SHAP explainer
            self.explainer = explain.ModelExplainer(self.cost_pipeline, self.time_pipeline)

            self.is_loaded = True
            elapsed = (time.perf_counter() - start_time) * 1000
            logger.info(
                "Successfully loaded models & SHAP explainers in %.1fms | Cost Model: %s | Time Model: %s",
                elapsed,
                self.cost_metadata.get("model_type"),
                self.time_metadata.get("model_type"),
            )
        except Exception as e:
            logger.exception("Failed to load model artifacts: %s", e)
            self.is_loaded = False
            raise RuntimeError(f"Failed to load model artifacts: {e}") from e

    def predict(
        self,
        request: PredictionRequest,
        include_explanations: bool = True,
        top_n: int = 5,
    ) -> PredictionResponse:
        """
        Executes inference for a single project snapshot:
          Raw Request Payload -> 1-row DataFrame -> Feature Engineering -> Pipeline.predict_proba() -> Local SHAP drivers
        """
        if not self.is_loaded or self.cost_pipeline is None or self.time_pipeline is None:
            raise RuntimeError("Model service is not loaded. Cannot process inference request.")

        t0 = time.perf_counter()

        # Convert request to single-row DataFrame
        raw_dict = request.model_dump()
        raw_df = pd.DataFrame([raw_dict])

        # Step 1: Compute derived domain features using single source of truth
        df_engineered = features.engineer_features(raw_df)

        # Step 2: Model inference
        cost_prob = float(self.cost_pipeline.predict_proba(df_engineered)[:, 1][0])
        time_prob = float(self.time_pipeline.predict_proba(df_engineered)[:, 1][0])

        cost_thresh = self.cost_metadata.get("decision_threshold", config.DEFAULT_DECISION_THRESHOLD)
        time_thresh = self.time_metadata.get("decision_threshold", config.DEFAULT_DECISION_THRESHOLD)

        cost_pred = int(cost_prob >= cost_thresh)
        time_pred = int(time_prob >= time_thresh)

        cost_risk = "HIGH" if cost_pred == 1 else "LOW"
        time_risk = "HIGH" if time_pred == 1 else "LOW"

        # Step 3: Local explainability via SHAP (optional, default enabled)
        cost_drivers = None
        time_drivers = None
        if include_explanations and self.explainer is not None:
            cost_raw = self.explainer.explain(df_engineered, target="cost_overrun", top_n=top_n)
            time_raw = self.explainer.explain(df_engineered, target="time_overrun", top_n=top_n)
            cost_drivers = [RiskDriver(**d) for d in cost_raw]
            time_drivers = [RiskDriver(**d) for d in time_raw]

        latency_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "Inference completed for project %s in %.2fms | Cost Prob: %.4f (%s) | Time Prob: %.4f (%s)",
            request.project_id,
            latency_ms,
            cost_prob,
            cost_risk,
            time_prob,
            time_risk,
        )

        return PredictionResponse(
            project_id=request.project_id,
            cost_overrun=TargetPredictionResult(
                probability=round(cost_prob, 4),
                prediction=cost_pred,
                risk_level=cost_risk,
                drivers=cost_drivers,
            ),
            time_overrun=TargetPredictionResult(
                probability=round(time_prob, 4),
                prediction=time_pred,
                risk_level=time_risk,
                drivers=time_drivers,
            ),
        )

    def get_model_info(self) -> ModelInfoResponse:
        """Returns safe model metadata."""
        if not self.is_loaded:
            raise RuntimeError("Models are not loaded.")

        return ModelInfoResponse(
            service="ml-inference",
            models={
                "cost_overrun": ModelInfoItem(
                    target="cost_overrun",
                    model_type=self.cost_metadata.get("model_type", "Unknown"),
                    decision_threshold=self.cost_metadata.get("decision_threshold", 0.5),
                    training_timestamp=self.cost_metadata.get("training_timestamp", ""),
                    test_metrics=self.cost_metadata.get("test_metrics", {}),
                    top_features=self.cost_metadata.get("top_10_features", [])[:7],
                ),
                "time_overrun": ModelInfoItem(
                    target="time_overrun",
                    model_type=self.time_metadata.get("model_type", "Unknown"),
                    decision_threshold=self.time_metadata.get("decision_threshold", 0.5),
                    training_timestamp=self.time_metadata.get("training_timestamp", ""),
                    test_metrics=self.time_metadata.get("test_metrics", {}),
                    top_features=self.time_metadata.get("top_10_features", [])[:7],
                ),
            }
        )


# Global singleton instance
model_service = ModelService()
