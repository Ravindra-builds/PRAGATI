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
1. **Single Unified ML Pipeline**: Uploaded datasets pass through the exact same feature transformations (`features.py`), model pipelines (`model.joblib`), and FastAPI inference service (`ml/api/main.py`) as the rest of the PRAGATI platform. No secondary or ad-hoc ML model is created.
2. **Anti-Leakage Quarantine**: Future outcome variables (`final_cost_cr`, `actual_duration_months`, `cost_overrun`, `time_overrun`) are strictly dropped and forbidden from entering the feature matrix.
3. **Transparent Provenance**: Saved records are explicitly tagged with `isSynthetic = false` alongside source file hashes, import timestamps, parser versions, and model versions.

---

## 3. Supported Input Formats

| Format | Parsing Engine | Description & Supported Structures |
| :--- | :--- | :--- |
| **CSV** | RFC-Compliant Stream Parser | Multi-project tabular datasets, comma/quote separated. |
| **XLSX / XLS** | `xlsx` (SheetJS) | Multi-project spreadsheets with automatic sheet inspection. |
| **JSON** | Native V8 JSON Parser | Structured PAIMANA Common Upload Form (CUF) payloads or project lists. |
| **TXT** | Line-by-Line Key-Value Splitter | Text inspection reports, monitoring circulars, and unstructured dossier key-values. |
| **MD** | Markdown Table & Key-Value Extractor | Formatted project dossiers with pipes (`|`) or key-value markdown pairs. |
| **PDF** | `pdf-parse` Safe Extractor | Structured project monitoring PDFs and telemetry summary sheets. |

---

## 4. Canonical Project Schema (15 Required Prediction Fields)

| Canonical Key | Type | Description | Unit / Constraint |
| :--- | :--- | :--- | :--- |
| `project_id` | string | Unique project identifier | Required, non-empty |
| `snapshot_month` | date | Observation period | `YYYY-MM` |
| `ministry` | string | Central/State nodal ministry | Required |
| `sector` | string | Infrastructure domain | Required |
| `implementing_agency`| string | Executing agency / PSU | Required |
| `state` | string | Geographic location / State | Required |
| `original_cost_cr` | number | Approved sanction cost | Float $> 0$ (₹ Crores) |
| `planned_duration_months` | number | Contractual planned schedule | Integer $> 0$ (Months) |
| `elapsed_months` | number | Months since commencement | Integer $\ge 0$ (Months) |
| `physical_progress_pct` | number | Physical delivery completion | Float $[0.0 - 100.0]$ (%) |
| `financial_progress_pct`| number | Financial fund utilization | Float $[0.0 - 100.0]$ (%) |
| `expenditure_cr` | number | Incurred cumulative spending | Float $\ge 0$ (₹ Crores) |
| `milestones_total` | number | Total planned milestones | Integer $> 0$ |
| `milestones_delayed` | number | Delayed milestone count | Integer $\ge 0$ |
| `project_status` | string | Operational status | Ongoing, Delayed, Critical, etc. |

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
