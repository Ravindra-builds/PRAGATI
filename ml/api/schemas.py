"""
Pydantic Request & Response Schemas for the ML Inference API.

Enforces strict input typing, physical domain constraints, and anti-leakage guards
(extra fields such as post-completion outcomes are explicitly forbidden).
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator


class PredictionRequest(BaseModel):
    """
    Observation-time snapshot payload for a single infrastructure project.
    Strictly forbids post-completion outcome variables (extra='forbid').
    """
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
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
            }
        }
    )

    project_id: str = Field(..., min_length=1, description="Unique project identifier")
    snapshot_month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Observation month (YYYY-MM)")
    ministry: str = Field(..., min_length=1, description="Nodal central ministry")
    sector: str = Field(..., min_length=1, description="Infrastructure sector domain")
    implementing_agency: str = Field(..., min_length=1, description="Executing agency / PSU")
    state: str = Field(..., min_length=1, description="State / Union Territory location")
    original_cost_cr: float = Field(..., gt=0.0, description="Sanctioned project cost in ₹ Crores (must be > 0)")
    planned_duration_months: int = Field(..., gt=0, description="Approved contractual duration in months (must be > 0)")
    elapsed_months: int = Field(..., gt=0, description="Months elapsed at snapshot date (must be > 0)")
    physical_progress_pct: float = Field(..., ge=0.0, le=100.0, description="Physical progress percentage [0.0 - 100.0]")
    financial_progress_pct: float = Field(..., ge=0.0, le=100.0, description="Financial progress percentage [0.0 - 100.0]")
    expenditure_cr: float = Field(..., ge=0.0, description="Cumulative expenditure incurred in ₹ Crores (must be >= 0)")
    milestones_total: int = Field(..., gt=0, description="Total planned milestones (must be > 0)")
    milestones_delayed: int = Field(..., ge=0, description="Number of milestones delayed (must be >= 0)")
    project_status: str = Field(..., min_length=1, description="Operational status at snapshot (Ongoing, Delayed, Critical, etc.)")

    @model_validator(mode="after")
    def validate_logical_constraints(self):
        """Cross-field validation for lifecycle bounds and milestone consistency."""
        if self.elapsed_months > self.planned_duration_months:
            raise ValueError(
                f"elapsed_months ({self.elapsed_months}) cannot exceed planned_duration_months ({self.planned_duration_months}) "
                "for active project monitoring snapshots."
            )
        if self.milestones_delayed > self.milestones_total:
            raise ValueError(
                f"milestones_delayed ({self.milestones_delayed}) cannot exceed milestones_total ({self.milestones_total})."
            )
        return self


from typing import Dict, Any, List, Optional, Union


class RiskDriver(BaseModel):
    """Local feature attribution representing model-supported risk drivers."""
    feature: str = Field(..., description="Transformed feature key")
    display_name: str = Field(..., description="Human-readable feature title")
    value: Optional[Union[float, int, str]] = Field(None, description="Actual unscaled observed value")
    contribution: float = Field(..., description="Local SHAP attribution score")
    direction: str = Field(..., description="Directional impact: increases_risk, decreases_risk, or neutral")


class TargetPredictionResult(BaseModel):
    """Prediction outcome for an individual target."""
    probability: float = Field(..., description="Estimated overrun probability between 0.00 and 1.00")
    prediction: int = Field(..., description="Binary classification outcome (1 = Overrun, 0 = Within Tolerance)")
    risk_level: str = Field(..., description="Risk tier: HIGH (probability >= threshold) or LOW")
    drivers: Optional[List[RiskDriver]] = Field(None, description="Ranked top local risk drivers (if requested)")


class PredictionResponse(BaseModel):
    """Response payload containing predictions for both overrun targets."""
    project_id: str
    cost_overrun: TargetPredictionResult
    time_overrun: TargetPredictionResult


class HealthResponse(BaseModel):
    """Health status response."""
    status: str
    service: str
    models_loaded: bool


class ModelInfoItem(BaseModel):
    """Safe summary of model metadata."""
    target: str
    model_type: str
    decision_threshold: float
    training_timestamp: str
    test_metrics: Dict[str, Any]
    top_features: List[Dict[str, Any]]


class ModelInfoResponse(BaseModel):
    """Detailed model metadata response."""
    service: str
    models: Dict[str, ModelInfoItem]
