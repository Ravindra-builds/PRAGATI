# ML Inference Service (FastAPI)

Lightweight, production-grade Python inference microservice exposing the trained predictive models for the **SIH 2026 AI-Powered Infrastructure Project Monitoring Prototype**.

This service bridges the scikit-learn model pipelines with any future backend (Next.js server actions, Node.js API routes, or Python backends).

---

## 1. Architecture

```text
                  CLIENT / FUTURE BACKEND
                             │
                             ▼
                    POST /predict (HTTP)
                             │
                     FastAPI Application
                       [ml/api/main.py]
                             │
               Pydantic Schema & Anti-Leakage Guard
                     [ml/api/schemas.py]
              (Forbids post-completion outcome fields)
                             │
                             ▼
                    ModelService (Singleton)
                      [ml/api/service.py]
                             │
              1. Feature Transformation Engine
                  [ml/src/features.py]
                (Computes 7 derived domain features)
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     Cost Overrun Pipeline         Time Overrun Pipeline
    [ml/models/cost_overrun/]     [ml/models/time_overrun/]
    - LogisticRegression (L2)     - RandomForestClassifier
    - RobustScaler + OHE          - RobustScaler + OHE
    - Threshold: 0.50             - Threshold: 0.50
              │                             │
              └──────────────┬──────────────┘
                             ▼
                   PredictionResponse
              {
                "project_id": "...",
                "cost_overrun": {"probability": 0.5088, "risk_level": "HIGH"},
                "time_overrun": {"probability": 0.4090, "risk_level": "LOW"}
              }
```

---

## 2. Key Design Principles

1. **Lifespan Initialization (Single Load)**:
   - Model weights (`model.joblib`) and metadata (`metadata.json`) are deserialized **once** at application startup via FastAPI's `lifespan` context manager.
   - Per-request latency is bounded to feature engineering and matrix multiplication / tree traversal (~5–15ms).
2. **Single Source of Truth**:
   - The API uses `features.engineer_features()` directly from `ml/src/features.py`. There is zero duplicate or hand-rolled feature transformation code.
3. **Anti-Leakage Quarantine**:
   - Pydantic v2 `ConfigDict(extra="forbid")` guarantees that any payload containing future outcome variables (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) is rejected immediately with HTTP 422.
4. **Physical Domain Validation**:
   - Cross-field validation prevents physically impossible states:
     - `elapsed_months <= planned_duration_months`
     - `milestones_delayed <= milestones_total`
     - `0.0 <= physical_progress_pct <= 100.0`
     - `0.0 <= financial_progress_pct <= 100.0`
     - `original_cost_cr > 0`

---

## 3. Quickstart: Running the Server

### Start the Service (Windows / PowerShell)
From the repository root:
```powershell
.\ml\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --reload --port 8000
```
*(Or if `ml/.venv` is active: `uvicorn ml.api.main:app --reload --port 8000`)*

### Interactive Documentation
Once started, open your browser:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 4. API Endpoints

### 1. Health Check
`GET /health`

Verifies that the inference service is operational and both pipelines are loaded in memory.

**Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "service": "ml-inference",
  "models_loaded": true
}
```

---

### 2. Model Metadata
`GET /model-info`

Provides operational metadata, evaluation metrics, decision thresholds, and top predictive features for both active models.

**Response (`200 OK`)**:
```json
{
  "service": "ml-inference",
  "models": {
    "cost_overrun": {
      "target": "cost_overrun",
      "model_type": "Logistic Regression",
      "decision_threshold": 0.5,
      "training_timestamp": "2026-09-11T06:55:00Z",
      "test_metrics": {
        "accuracy": 0.742,
        "precision": 0.718,
        "recall": 0.740,
        "f1": 0.729,
        "roc_auc": 0.814,
        "pr_auc": 0.762
      },
      "top_features": [
        {"feature": "expenditure_burn_gap", "importance_mean": 0.125},
        {"feature": "budget_utilization_pct", "importance_mean": 0.089}
      ]
    },
    "time_overrun": {
      "target": "time_overrun",
      "model_type": "Random Forest",
      "decision_threshold": 0.5,
      "training_timestamp": "2026-09-11T06:55:00Z",
      "test_metrics": {
        "accuracy": 0.884,
        "precision": 0.852,
        "recall": 0.896,
        "f1": 0.873,
        "roc_auc": 0.942,
        "pr_auc": 0.918
      },
      "top_features": [
        {"feature": "schedule_progress_gap", "importance_mean": 0.182},
        {"feature": "milestone_slippage_ratio", "importance_mean": 0.134}
      ]
    }
  }
}
```

---

### 3. Dual-Target Prediction with Local Explainability
`POST /predict`

Computes calibrated probabilities, binary risk assignments, and top model-supported risk drivers for both cost and time overruns.

**Query Parameters (Optional)**:
- `include_explanations` (boolean, default: `true`): Whether to compute SHAP feature contributions.
- `top_n` (integer, default: `5`): Number of strongest drivers to return for each target.

**Request (`application/json`)**:
```json
{
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
  "project_status": "Critical"
}
```

**Response (`200 OK`)**:
```json
{
  "project_id": "PRJ-0714",
  "cost_overrun": {
    "probability": 0.9016,
    "prediction": 1,
    "risk_level": "HIGH",
    "drivers": [
      {
        "feature": "schedule_progress_gap",
        "display_name": "Schedule vs Physical Progress Gap",
        "value": 33.88,
        "contribution": 5.8739,
        "direction": "increases_risk"
      },
      {
        "feature": "budget_utilization_pct",
        "display_name": "Budget Utilization",
        "value": 63.58,
        "contribution": 4.5830,
        "direction": "increases_risk"
      },
      {
        "feature": "schedule_completion_pct",
        "display_name": "Schedule Completion Rate",
        "value": 81.48,
        "contribution": -3.5366,
        "direction": "decreases_risk"
      }
    ]
  },
  "time_overrun": {
    "probability": 0.9151,
    "prediction": 1,
    "risk_level": "HIGH",
    "drivers": [
      {
        "feature": "schedule_progress_gap",
        "display_name": "Schedule vs Physical Progress Gap",
        "value": 33.88,
        "contribution": 0.1526,
        "direction": "increases_risk"
      },
      {
        "feature": "project_status_Ongoing",
        "display_name": "Project Status: Ongoing",
        "value": "Not Ongoing",
        "contribution": 0.0910,
        "direction": "increases_risk"
      },
      {
        "feature": "milestone_slippage_ratio",
        "display_name": "Milestone Slippage Ratio",
        "value": 0.33,
        "contribution": 0.0842,
        "direction": "increases_risk"
      }
    ]
  }
}
```

---

## 5. Error Handling & Leakage Rejection

### Leakage Rejection Example (`422 Unprocessable Entity`)
If a client attempts to submit post-completion outcome data:
```json
{
  "project_id": "PRJ-0714",
  "snapshot_month": "2025-06",
  ...
  "final_cost_cr": 1450.0
}
```

The API rejects the request immediately:
```json
{
  "error": "Validation Error",
  "message": "The request payload failed schema validation or contained forbidden outcome fields.",
  "details": [
    {
      "field": "body -> final_cost_cr",
      "message": "Extra inputs are not permitted",
      "type": "extra_forbidden"
    }
  ]
}
```

---

## 6. Testing

Execute the automated test suite with Python's built-in `unittest`:
```powershell
.\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
```

This tests:
- Startup lifespan and model loading.
- `/health` endpoint response.
- `/model-info` metadata contract.
- Valid dual-target inference calculations.
- Input validation bounds (percentages, non-positive numbers).
- Cross-field logical validation (elapsed vs planned, milestones delayed vs total).
- Target leakage rejection (`final_cost_cr`, `actual_duration_months`, labels).
