"""
ML Inference API Application.

Provides prediction services for cost overrun and time overrun risks in
infrastructure project monitoring snapshots.

Endpoints:
    GET  /health      - Service liveness and model load status
    GET  /model-info  - Model versions, architectures, and evaluation metrics
    POST /predict     - Real-time dual-target inference on project snapshot data
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from ml.api.schemas import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
    ModelInfoResponse,
)
from ml.api.service import model_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ml_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Loads trained machine learning pipelines into memory exactly once on startup.
    """
    logger.info("FastAPI Application Startup: initializing ML model service...")
    try:
        model_service.load_models()
        logger.info("ML models successfully loaded into memory and ready for inference.")
    except Exception as e:
        logger.critical("Failed to load models during startup: %s", e)
        raise e
    yield
    logger.info("FastAPI Application Shutdown: releasing resources.")


app = FastAPI(
    title="SIH 2026 Infrastructure Project Monitoring - ML Inference API",
    description=(
        "Specialized inference service for predicting infrastructure project cost overruns "
        "and schedule delays based on monthly monitoring snapshots. Built for PAIMANA / OCMS style data."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs incoming HTTP requests with execution latency."""
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "%s %s -> %d (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom handler for validation errors.
    Returns clear, structured feedback on parameter validation failures and forbidden fields.
    """
    details = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg")
        err_type = err.get("type")
        details.append({
            "field": field_path,
            "message": msg,
            "type": err_type,
        })

    logger.warning("Validation error on %s: %s", request.url.path, details)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "The request payload failed schema validation or contained forbidden outcome fields.",
            "details": details,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Global handler for unhandled internal exceptions."""
    logger.exception("Unhandled server error processing %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred while processing the inference request.",
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """
    Health check endpoint.
    Verifies that the inference API is running and both ML pipelines are loaded in memory.
    """
    return HealthResponse(
        status="healthy" if model_service.is_loaded else "degraded",
        service="ml-inference",
        models_loaded=model_service.is_loaded,
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["Metadata"])
async def get_model_info():
    """
    Returns metadata about active ML models including architectures, thresholds, and performance metrics.
    """
    if not model_service.is_loaded:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Models are not loaded yet."},
        )
    return model_service.get_model_info()


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict_overrun(payload: PredictionRequest):
    """
    Dual-target inference endpoint.
    Calculates cost overrun probability and time overrun probability for a single project snapshot.
    Strictly forbids post-completion outcome fields to guarantee leakage-free prediction.
    """
    if not model_service.is_loaded:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Models are not loaded yet."},
        )

    try:
        response = model_service.predict(payload)
        return response
    except Exception as e:
        logger.exception("Prediction failed for project %s: %s", payload.project_id, e)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Prediction failed: {str(e)}"},
        )
