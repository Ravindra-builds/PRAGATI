"""
Configuration settings for the ML workspace.

This module centralizes filesystem paths, random seeds, and dataset sources.
Designed to ensure that the pipeline remains agnostic to whether data originates
from synthetic generators or public/official project monitoring datasets (e.g. PAIMANA/OCMS).
"""

from pathlib import Path
from typing import Literal

# Base directories
SRC_DIR = Path(__file__).resolve().parent
ML_ROOT_DIR = SRC_DIR.parent
PROJECT_ROOT_DIR = ML_ROOT_DIR.parent

# Data directories
DATA_DIR = ML_ROOT_DIR / "data"
DATA_RAW_DIR = DATA_DIR / "raw"
DATA_PROCESSED_DIR = DATA_DIR / "processed"
DATA_SYNTHETIC_DIR = DATA_DIR / "synthetic"

# Models and reporting directories
MODELS_DIR = ML_ROOT_DIR / "models"
REPORTS_DIR = ML_ROOT_DIR / "reports"
EDA_REPORTS_DIR = REPORTS_DIR / "eda"

# Reproducibility
RANDOM_SEED: int = 42

# Data source selection: 'synthetic' or 'public'
DataSourceType = Literal["synthetic", "public"]
ACTIVE_DATA_SOURCE: DataSourceType = "synthetic"

# Default file names
SYNTHETIC_DATASET_FILENAME = "synthetic_paimana_projects.csv"
PUBLIC_DATASET_FILENAME = "public_paimana_projects.csv"
PROCESSED_DATASET_FILENAME = "processed_features.parquet"


def get_active_dataset_path(source: DataSourceType = ACTIVE_DATA_SOURCE) -> Path:
    """
    Returns the resolved path to the active dataset based on the chosen source.
    Ensures downstream pipeline components ingest data from the same uniform interface.
    """
    if source == "synthetic":
        return DATA_SYNTHETIC_DIR / SYNTHETIC_DATASET_FILENAME
    elif source == "public":
        return DATA_RAW_DIR / PUBLIC_DATASET_FILENAME
    else:
        raise ValueError(f"Unknown data source type: {source}")


def get_processed_dataset_path() -> Path:
    """Path to save or load cleaned and preprocessed feature tables."""
    return DATA_PROCESSED_DIR / PROCESSED_DATASET_FILENAME


def get_model_output_path(model_name: str = "baseline_model.joblib") -> Path:
    """Path to persist trained model artifacts."""
    return MODELS_DIR / model_name
