# Synthetic Data Workspace

This directory is designated for synthetic datasets used during the development and testing of the SIH 2026 infrastructure project monitoring prototype.

## Important Disclaimers

> [!CAUTION]
> - **Synthetic Nature**: All datasets generated or stored within this directory are strictly synthetic, simulated for algorithmic development and testing.
> - **Not Official Data**: These datasets must **NEVER** be presented, cited, or published as official government or PAIMANA/OCMS data.
> - **No Real Project Claims**: Synthetic records do not represent real contractors, project performance, or official ministry ratings.

## Purpose and Objectives

1. **Algorithm & Pipeline Prototyping**: Allows validating data validation, preprocessing, feature engineering, and model training pipelines without requiring initial access to proprietary or sensitive production records.
2. **Schema Alignment**: The synthetic dataset is engineered to mirror the structure and statistical characteristics of real infrastructure project monitoring data.
3. **Pluggable Data Source**: Downstream ML pipelines accept either synthetic data or real/public data adhering to the same schema (as configured in [`ml/src/config.py`](../../src/config.py)).

For full schema details, see [`ml/DATA_DICTIONARY.md`](../../DATA_DICTIONARY.md).
