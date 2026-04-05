# Requirements Document

## Introduction

This document defines the requirements for refactoring and integrating the backend of the **AI Data Cleaning Copilot (ERROR-PROOF Edition)**. The existing backend consists of two separate modules: a monolithic numerical data cleaning engine (`backend/main.py` + supporting files) and a standalone NLP codemix engine (`backend/for codemix/`). The goal is to restructure these into a single, unified FastAPI application with a clean layered architecture — without altering any core ML logic, algorithms, or existing functionality.

The unified backend will be deployed to Hugging Face Spaces and serve a Vercel-hosted frontend via two top-level route groups: `/numerical` and `/categorical`.

## Glossary

- **Backend**: The unified FastAPI application produced by this refactor.
- **Numerical_Engine**: The module responsible for CSV-based numerical data cleaning (anomaly detection, missing value handling, FlashFill, profiling, duplicates, rename).
- **Categorical_Engine**: The module responsible for NLP processing of categorical/text CSV data via Hugging Face-hosted models.
- **Model_Router**: The component inside the Categorical_Engine that inspects uploaded data and selects the appropriate HF model (CodeMix, English, or FakeNews).
- **Numerical_Router**: A new thin dispatcher inside the Numerical_Engine that maps an `operation` string to the correct service function.
- **HF_Service**: An individual async HTTP client wrapper that calls one Hugging Face Inference API endpoint.
- **File_Handler**: The utility responsible for reading uploaded CSV files into a pandas DataFrame.
- **Validator**: The utility responsible for type-safety checks before operations are applied.
- **Config**: The centralised settings loader that reads all secrets and URLs from environment variables / `.env`.
- **Session_State**: In-memory per-process storage of the currently loaded DataFrame and its column type metadata.
- **Operation**: A string parameter passed to `/numerical/process` that identifies which cleaning function to invoke (e.g. `"anomaly"`, `"missing"`, `"flashfill"`, `"profile"`, `"duplicates"`, `"rename"`).

---

## Requirements

### Requirement 1: Unified Project Structure

**User Story:** As a developer, I want all backend code organised under a single `backend/app/` package, so that the project has one entry point, one deployment unit, and a clear separation of concerns.

#### Acceptance Criteria

1. THE Backend SHALL expose a single `app/main.py` as the FastAPI application entry point.
2. THE Backend SHALL organise route handlers under `app/routes/numerical.py` and `app/routes/categorical.py`.
3. THE Backend SHALL organise service logic under `app/services/numerical/` (anomaly, missing, flashfill, and other existing files) and `app/services/codemix/` (router, model_codemix, model_english, model_fakenews).
4. THE Backend SHALL organise shared utilities under `app/utils/` (config, file_handler, validators).
5. THE Backend SHALL preserve all existing ML logic files (`anomaly.py`, `cleaner.py`, `flashfill.py`) by migrating them into `app/services/numerical/` without modifying their core algorithms.
6. THE Backend SHALL preserve all existing codemix service files (`model1.py`, `model2.py`, `model3.py`, `routes/predict.py`) by migrating them into `app/services/codemix/` without modifying their core logic.

---

### Requirement 2: Configuration Management

**User Story:** As a developer, I want all secrets and environment-specific values loaded from a single `.env` file, so that credentials are never hardcoded and the app is portable across environments.

#### Acceptance Criteria

1. THE Config SHALL load the following variables from the environment or `.env` file: `HF_CODEMIX_URL`, `HF_ENGLISH_URL`, `HF_FAKE_NEWS_URL`, `HF_CODEMIX_TOKEN`, `HF_ENGLISH_TOKEN`, `HF_FAKE_NEWS_TOKEN`.
2. THE Config SHALL use `pydantic-settings` `BaseSettings` with `lru_cache` to parse the `.env` file exactly once per process lifetime.
3. IF any required environment variable is missing at startup, THEN THE Config SHALL raise a descriptive `ValidationError` that identifies the missing variable by name.
4. THE Config SHALL expose an `app_env` field (default `"development"`) and a `log_level` field (default `"INFO"`).
5. THE Backend SHALL provide a `.env` template file at `backend/.env` with all six HF variable keys present and empty values as placeholders.

---

### Requirement 3: File Handling Utility

**User Story:** As a developer, I want a shared CSV reading utility, so that all routes parse uploaded files consistently and safely.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE File_Handler SHALL decode the file bytes using UTF-8 encoding with a fallback to `latin-1` if UTF-8 decoding fails.
2. WHEN a CSV file is uploaded, THE File_Handler SHALL return a `pandas.DataFrame`.
3. IF the uploaded file is empty (zero bytes or zero data rows), THEN THE File_Handler SHALL raise a `ValueError` with the message `"Uploaded file is empty"`.
4. IF the uploaded file cannot be parsed as a valid CSV, THEN THE File_Handler SHALL raise a `ValueError` with a descriptive message.
5. WHEN a CSV file contains duplicate column names, THE File_Handler SHALL deduplicate them by appending a numeric suffix (e.g. `col`, `col_1`, `col_2`).
6. THE File_Handler SHALL enforce a maximum file size of 200 MB and raise a `ValueError` with the message `"File exceeds 200 MB limit"` if exceeded.

---

### Requirement 4: Validation Utility

**User Story:** As a developer, I want a centralised validation layer, so that type-incompatible operations are rejected with clear error messages before any data mutation occurs.

#### Acceptance Criteria

1. WHEN the `mean` or `median` strategy is requested for a non-numeric column, THE Validator SHALL return an error with the message `"Type Error: Cannot apply Mean/Median to categorical data"`.
2. WHEN the `interpolate` strategy is requested for a non-numeric column, THE Validator SHALL return an error with the message `"Type Error: Cannot apply Interpolate to non-numeric data"`.
3. WHEN an unknown `operation` string is passed to the Numerical_Router, THE Validator SHALL return an error with the message `"Unknown operation: <operation>"`.
4. THE Validator SHALL accept a column type map (as produced by `detect_column_types`) and a strategy string, and return either `None` (valid) or a string error message.

---

### Requirement 5: Numerical Router

**User Story:** As a developer, I want a single dispatcher function for numerical operations, so that the route handler stays thin and each operation is delegated to the correct service without duplicated branching logic.

#### Acceptance Criteria

1. THE Numerical_Router SHALL accept an `operation` string and a `pandas.DataFrame` plus optional parameters, and dispatch to the correct service function.
2. WHEN `operation` is `"profile"`, THE Numerical_Router SHALL call `generate_profile` and return the profile dict.
3. WHEN `operation` is `"duplicates"`, THE Numerical_Router SHALL return duplicate row data without modifying the DataFrame.
4. WHEN `operation` is `"missing"`, THE Numerical_Router SHALL call `apply_missing_strategy` with the provided column, strategy, and optional fixed value.
5. WHEN `operation` is `"flashfill"`, THE Numerical_Router SHALL call `get_suggestions` or `apply_transformation` depending on whether a `transform_id` is provided.
6. WHEN `operation` is `"anomaly"`, THE Numerical_Router SHALL call `detect_anomalies` with the provided contamination parameter.
7. WHEN `operation` is `"rename"`, THE Numerical_Router SHALL call `get_rename_suggestions` or `apply_rename_rules` depending on whether a rename map is provided.
8. IF an unrecognised `operation` is passed, THEN THE Numerical_Router SHALL raise a `ValueError` with the message `"Unknown operation: <operation>"`.

---

### Requirement 6: Numerical API Endpoint

**User Story:** As a frontend developer, I want a single `/numerical/process` endpoint, so that all numerical cleaning operations are accessible through one consistent interface.

#### Acceptance Criteria

1. THE Backend SHALL expose `POST /numerical/process` accepting a multipart form with a CSV `file` field and an `operation` string field.
2. WHEN a valid request is received, THE Backend SHALL return a JSON response with the shape `{ "status": "success", "module": "numerical", "result": <operation_result> }`.
3. IF the file is invalid or the operation fails, THEN THE Backend SHALL return a JSON error response with HTTP status 400 and the shape `{ "status": "error", "detail": "<message>" }`.
4. THE Backend SHALL also expose the existing fine-grained endpoints (`/upload`, `/profile`, `/duplicates`, `/missing_strategy`, `/flashfill/suggest`, `/flashfill/apply`, `/anomalies/detect`, `/anomalies/action`, `/rename/suggest`, `/rename/apply`, `/export/data`) to preserve backward compatibility with the existing frontend.
5. WHEN `operation` is `"profile"`, THE Backend SHALL return rows count, columns count, per-column data types, and missing value percentages.
6. WHEN `operation` is `"export"`, THE Backend SHALL return the cleaned DataFrame as a UTF-8 encoded CSV download with the filename prefixed by `"cleaned_"`.

---

### Requirement 7: Categorical NLP API Endpoint

**User Story:** As a frontend developer, I want a single `/categorical/process` endpoint, so that NLP analysis of CSV text data is accessible through one consistent interface.

#### Acceptance Criteria

1. THE Backend SHALL expose `POST /categorical/process` accepting a multipart form with a CSV `file` field.
2. WHEN a valid CSV is uploaded, THE Categorical_Engine SHALL pass the text content to the Model_Router to determine which HF model to invoke.
3. WHEN the Model_Router selects a model, THE Categorical_Engine SHALL call the corresponding HF_Service and return the result.
4. WHEN a valid request succeeds, THE Backend SHALL return `{ "status": "success", "module": "categorical", "model_used": "<model_name>", "result": <hf_response> }`.
5. IF the HF API returns a 4xx or 5xx response, THEN THE Backend SHALL return HTTP 502 with `{ "status": "error", "detail": "Hugging Face API error (<status_code>): <message>" }`.
6. IF the HF API times out, THEN THE Backend SHALL return HTTP 503 with `{ "status": "error", "detail": "Model request timed out. Please try again." }`.

---

### Requirement 8: Model Router (Categorical)

**User Story:** As a developer, I want the existing codemix routing logic preserved and reused, so that the correct HF model is selected automatically without rewriting the detection algorithm.

#### Acceptance Criteria

1. THE Model_Router SHALL analyse the text content of the uploaded CSV and select exactly one of: `codemix`, `english`, or `fakenews`.
2. WHEN the text contains Hinglish or mixed-script patterns, THE Model_Router SHALL select the `codemix` model.
3. WHEN the text is clean English without suspicious metadata patterns, THE Model_Router SHALL select the `english` model.
4. WHEN the text contains metadata or misinformation-indicative patterns, THE Model_Router SHALL select the `fakenews` model.
5. THE Model_Router SHALL reuse the routing logic already present in `backend/for codemix/app/routes/predict.py` without rewriting the detection algorithm.

---

### Requirement 9: HF Service Layer (Categorical)

**User Story:** As a developer, I want each HF model wrapped in its own async service module, so that authentication, timeout handling, and retry logic are encapsulated and consistent.

#### Acceptance Criteria

1. THE HF_Service for each model SHALL use `httpx.AsyncClient` with a `Bearer` token from Config.
2. THE HF_Service SHALL set a request timeout of 30 seconds for text models.
3. IF a request times out, THEN THE HF_Service SHALL raise a `RuntimeError` with the message `"<Model> request timed out. Please try again."`.
4. IF the HF API returns a non-2xx status, THEN THE HF_Service SHALL re-raise `httpx.HTTPStatusError` so the route layer can map it to HTTP 502.
5. IF a network connection error occurs, THEN THE HF_Service SHALL raise a `RuntimeError` with a message identifying the unreachable endpoint.
6. THE HF_Service SHALL log the target URL at INFO level before each request and log success or failure at the appropriate level after.

---

### Requirement 10: Application Entry Point & CORS

**User Story:** As a developer, I want a clean `main.py` that wires all routes and middleware, so that the app starts with a single `uvicorn` command and is compatible with Hugging Face Spaces.

#### Acceptance Criteria

1. THE Backend SHALL start with `uvicorn app.main:app --host 0.0.0.0 --port 7860`.
2. THE Backend SHALL register CORS middleware allowing all origins (`"*"`) with all methods and headers, so the Vercel frontend can call it without CORS errors.
3. THE Backend SHALL expose `GET /` returning `{ "status": "ok", "message": "AI Data Cleaning Copilot backend is running." }`.
4. THE Backend SHALL expose `GET /health` returning environment name and a boolean readiness flag for each configured HF model.
5. THE Backend SHALL include the numerical router under the `/numerical` prefix and the categorical router under the `/categorical` prefix.
6. WHEN the application starts, THE Backend SHALL log the environment name and log level at INFO level.

---

### Requirement 11: Error Handling & Response Envelope

**User Story:** As a frontend developer, I want all API responses to follow a consistent JSON envelope, so that error handling in the UI is uniform regardless of which operation was called.

#### Acceptance Criteria

1. THE Backend SHALL wrap all route handler bodies in `try/except` blocks and return structured JSON errors instead of unhandled 500 responses.
2. WHEN an operation succeeds, THE Backend SHALL return `{ "status": "success", "module": "<numerical|categorical>", "model_used": "<name_or_null>", "result": <data> }`.
3. WHEN a validation error occurs, THE Backend SHALL return HTTP 400 with `{ "status": "error", "detail": "<message>" }`.
4. WHEN an upstream HF API error occurs, THE Backend SHALL return HTTP 502 with `{ "status": "error", "detail": "<message>" }`.
5. WHEN an unexpected server error occurs, THE Backend SHALL return HTTP 500 with `{ "status": "error", "detail": "Internal server error" }` and log the full traceback at ERROR level.

---

### Requirement 12: Dependencies & Deployment Readiness

**User Story:** As a developer, I want a single `requirements.txt` that lists all dependencies, so that the app can be installed and deployed to Hugging Face Spaces without manual dependency resolution.

#### Acceptance Criteria

1. THE Backend SHALL provide a `backend/requirements.txt` that includes: `fastapi`, `uvicorn[standard]`, `pandas`, `numpy`, `scikit-learn`, `httpx`, `pydantic-settings`, `python-multipart`.
2. THE Backend SHALL be startable with `pip install -r requirements.txt` followed by `uvicorn app.main:app --host 0.0.0.0 --port 7860` from the `backend/` directory.
3. THE Backend SHALL NOT require any external LLM API keys (OpenAI, Gemini, etc.) to function.
4. THE Backend SHALL preserve all existing ML model imports (`IsolationForest`, `PCA`) without adding new ML dependencies.
