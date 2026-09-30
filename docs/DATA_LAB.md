# PRAGATI Data Lab — Public Dataset Ingestion & Validation Gateway

## 1. Overview & Purpose

The **PRAGATI Data Lab** enables infrastructure monitoring officers, data engineers, and evaluators to ingest real-world, public, or PAIMANA-style project reports and datasets, deterministically map them to the canonical schema, validate and clean data points, and execute the **existing trained dual-target ML inference pipeline** with local SHAP explainability.

---

## 2. Core Architecture Flow

```text
                 PRAGATI DATA LAB PIPELINE

Uploaded Document (PDF, CSV, XLSX, JSON, TXT, MD)
                      │
                      ▼
              Format Detection
                      │
                      ▼
              Isolated Extraction
                      │
                      ▼
            Deterministic Field Mapping
                      │
                      ▼
             Validation & Cleaning
                      │
                      ▼
           Canonical Project Schema
                      │
                      ▼
         Existing ML Inference Pipeline
           (FastAPI :8000 / ml-client)
                      │
                      ▼
            Dual-Target Prediction
          (Cost Overrun & Schedule Delay)
                      │
                      ▼
           SHAP Feature Explainability
                      │
                      ▼
          Preview & Early Warning Alerts
                      │
                      ▼
      Optional Save to PRAGATI (PostgreSQL)
        [Provenance: isSynthetic = false]
```

### Critical Architecture Rules:
1. **Zero-Downtime Hybrid ML Pipeline**: Uploaded datasets pass through `mlClient.predictOverrun()` (`lib/ml-client.ts`), which queries the FastAPI microservice (`ML_SERVICE_URL/predict`) and automatically fails over to `predictWithEmbeddedWeights()` (`lib/ml-local-engine.ts` backed by `ml/models/exported_weights.json`). This guarantees 100% real, weight-faithful `LogisticRegression` + `RandomForest` predictions and normalized SHAP drivers even when the Python FastAPI server is not running locally.
2. **Decoupled Horizon Scaling**: Official MoSPI PAIMANA multi-year infrastructure projects (spanning 48–160+ months) are automatically scaled across cost and schedule horizons (`cost_overrun` vs. `time_overrun`) so duration alone does not artificially inflate budget overrun log-odds when `Anticipated Cost == Original Cost`.
3. **Anti-Leakage Quarantine**: Future post-completion outcome variables (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) are strictly dropped and forbidden from entering the feature matrix.
4. **Transparent Provenance**: Saved records are explicitly tagged with `isSynthetic = false` alongside source file hashes, import timestamps, and active model versions.

---

## 3. Supported Input Formats

| Format | Parsing Engine | Description & Supported Structures |
| :--- | :--- | :--- |
| **PDF** | `pdf-parse` + MoSPI Table Extractor | Official MoSPI PAIMANA Flash Report PDFs (`FRApril2025.pdf`, `FlashReport_August_2026.pdf`) and structured inspection dossiers. |
| **XLSX / XLS** | `xlsx` (SheetJS) | Multi-project spreadsheets with automatic sheet inspection. |
| **CSV** | RFC-Compliant Stream Parser | Multi-project tabular datasets, comma/quote separated. |
| **JSON** | Native V8 JSON Parser | Structured PAIMANA Common Upload Form (CUF) payloads or project lists. |
| **TXT / MD** | Key-Value & Pipe Table Extractor | Text inspection reports, monitoring circulars, and markdown tables. |

---

## 4. Official 3-Tier PAIMANA Schema Checklist (19 Canonical Fields)

The Data Lab organizes the 19 canonical fields into **3 operational tiers** aligned with official MoSPI PAIMANA Flash Reports:

### Tier 1: Core Required Fields (10 Fields — Directly in MoSPI Flash Reports)
| Canonical Key | MoSPI Flash Report Header | Example | Description |
| :--- | :--- | :--- | :--- |
| `project_code` | `Project Code` / `Sl. No.` | `PAIMANA-400259` | Unique PAIMANA / OCMS identifier |
| `project_name` | `Project Name` | `Ghatampur Thermal Power (3x660 MW)` | Official infrastructure asset title |
| `sector` | `Sector` / `Ministry` | `Power` | Infrastructure sector mapped to OHE taxonomy |
| `state` | `State` | `Uttar Pradesh` | Primary state or Multi-State corridor |
| `sanctioned_cost_cr` | `Original Cost (₹ Cr)` | `17237.8` | Initial cabinet/CCEA sanctioned budget |
| `revised_cost_cr` | `Anticipated Cost (₹ Cr)` | `21780.84` | Latest revised/anticipated project cost |
| `spent_cost_cr` | `Cumulative Expenditure` | `19788.78` | Cumulative capital expenditure incurred |
| `sanction_date` | `Date of Approval` | `2016-11-01` | Original approval date (`YYYY-MM` / `MM/YYYY`) |
| `scheduled_completion_date` | `Original DOC` | `2022-05-01` | Original contractual commissioning date |
| `expected_completion_date` | `Anticipated DOC` | `2025-12-01` | Latest anticipated commissioning date |

### Tier 2: Auto-Derived PAIMANA Fields (5 Fields — Computed Automatically if Omitted)
- `implementing_agency`: Auto-inferred from project name/sector (`NHAI`, `RVNL`, `NTPC`, `AAI`, `PGCIL`, `MMRCL`, `State PWD`, etc.) if not explicitly present.
- `contractor_name`: Defaults to `EPC Turnkey / Departmental Execution` when absent in Flash Report summaries.
- `physical_progress_pct`: Auto-derived from expenditure ratio and schedule trajectory when missing from summary tables.
- `terrain_type`: Auto-mapped from state geography (`Hilly`, `Coastal`, `Urban`, `Plains`).
- `environmental_clearance_status`: Auto-derived from project execution stage (`Obtained`, `Pending`, `In-Process`).

### Tier 3: Optional Telemetry Enrichment Fields (4 Fields)
- `rainfall_anomaly_pct`, `land_acquisition_delay_months`, `utility_shifting_delay_months`, and `district_gdp_growth_pct` (auto-imputed with state/sector baselines when omitted).

---

## 5. Deterministic Field Mapping & Confidence Matching

When a file is uploaded, field headers are automatically analyzed against a dictionary of aliases:

```text
SOURCE FIELD                     PRAGATI CANONICAL FIELD          CONFIDENCE
─────────────────────────────────────────────────────────────────────────────
Sanctioned Cost (Cr)      ───>   original_cost_cr                 HIGH
Physical Progress %       ───>   physical_progress_pct            HIGH
Time Elapsed              ───>   elapsed_months                   HIGH
Spent (Cr)                ───>   expenditure_cr                   HIGH
Executing Agency          ───>   implementing_agency              HIGH
```

- **Confidence Levels**:
  - `HIGH`: Exact match with canonical key, canonical label, or known alias dictionary entry.
  - `MEDIUM`: Partial heuristic or substring match.
  - `UNMAPPED`: Unknown or extra columns. Users can manually assign mappings via interactive dropdowns.
- **Unmapped Field Retention**: Additional non-canonical fields are preserved in `unmapped_fields` for audit purposes rather than silently deleted.

---

## 6. Cleaning & Normalization Rules

Raw values from diverse public sources are sanitized transparently:

1. **Indian Currency Formats**:
   - `₹ 1,250.50 Cr` $\rightarrow$ `1250.50`
   - `125000 Lakhs` $\rightarrow$ `1250.00` ($\times 0.01$)
   - Commas and currency symbols are stripped safely.
2. **Percentages**:
   - `63.5 %` $\rightarrow$ `63.5`
   - Decimal fractions ($0.635$) are scaled to $[0.0 - 100.0]$.
3. **Observation Dates**:
   - `2025-06-15`, `06/2025`, `June 2025` $\rightarrow$ `2025-06`.
4. **Audit Transformation Log**:
   - Every modified value generates a `CleaningTransformation` record displaying original value, cleaned value, and normalization rule applied.

---

## 7. Domain Validation & Readiness

- **Constraint Checking**:
  - Validates that $0 \le \text{progress} \le 100$, $\text{cost} > 0$, $\text{duration} > 0$, and $\text{expenditure} \ge 0$.
  - Real-world tolerance: If $\text{elapsed\_months} > \text{planned\_duration\_months}$ (indicating an active real-world delay), the record generates a **WARNING** rather than being discarded.
- **Prediction Readiness**:
  - The "Run ML Predictions" action is enabled only when all 15 required canonical fields are populated with valid types.

---

## 8. Persistence & Data Provenance

When an imported dataset is saved:
1. **Relational Consistency**: Upserts records into `projects`, `project_updates`, `predictions`, and `early_warnings` inside an atomic database transaction.
2. **Provenance Metadata**:
   - `is_synthetic: false`
   - `source_type`: File format (PDF, CSV, XLSX, etc.)
   - `source_filename`: Original file name
   - `source_hash`: SHA-256 content fingerprint
   - `imported_at`: ISO timestamp
   - `model_version`: Active ML model checkpoint tag

---

## 9. Real-World Limitations with Public Data

1. **Unstructured PDFs**: Government reports that lack a text layer (scanned images) cannot be parsed by text extractors without OCR.
2. **Non-Standard Milestone Reporting**: Some ministries report physical progress without discrete milestone counts. In such cases, default milestone approximations are flagged as warnings.
3. **Multi-Year Gaps**: If reporting was halted for several months, time-series velocity features may reflect discontinuous steps until consecutive monthly updates are supplied.
