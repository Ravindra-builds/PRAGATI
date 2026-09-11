"""
Preprocessing and Scikit-Learn Pipeline Module.

Builds leakage-safe ColumnTransformer pipelines for numeric and categorical attributes.
Strictly isolates fitting on training data to prevent statistical leakage into test splits.
"""

from typing import List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, RobustScaler

import features


def build_preprocessor(
    numeric_features: Optional[List[str]] = None,
    categorical_features: Optional[List[str]] = None,
) -> ColumnTransformer:
    """
    Constructs an unfitted ColumnTransformer pipeline.

    - Numeric Pipeline:
        1. SimpleImputer (median strategy)
        2. RobustScaler (scales using median and IQR, robust to capital cost outliers)
    - Categorical Pipeline:
        1. SimpleImputer (constant fill "Unknown")
        2. OneHotEncoder (handle_unknown='ignore', dense output)

    Returns:
        Unfitted ColumnTransformer instance ready for train-set fitting.
    """
    if numeric_features is None:
        numeric_features = features.MODELING_NUMERIC_FEATURES

    if categorical_features is None:
        categorical_features = features.MODELING_CATEGORICAL_FEATURES

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )

    return preprocessor


def fit_transform_train_test(
    preprocessor: ColumnTransformer,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    return_df: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]:
    """
    Fits the preprocessor STRICTLY on X_train, and transforms both X_train and X_test.
    Guarantees no statistical data from X_test leaks into scaler medians or encoder categories.

    Args:
        preprocessor: Unfitted ColumnTransformer instance.
        X_train: Training feature dataframe.
        X_test: Testing/holdout feature dataframe.
        return_df: If True, returns DataFrames with feature names; else numpy arrays.

    Returns:
        (X_train_trans, X_test_trans, feature_names)
    """
    # 1. Fit ONLY on training data
    preprocessor.fit(X_train)

    # 2. Transform train and test splits
    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # Extract output feature names
    feature_names = preprocessor.get_feature_names_out().tolist()

    if return_df:
        X_train_out = pd.DataFrame(X_train_trans, columns=feature_names, index=X_train.index)
        X_test_out = pd.DataFrame(X_test_trans, columns=feature_names, index=X_test.index)
        return X_train_out, X_test_out, feature_names

    return X_train_trans, X_test_trans, feature_names
