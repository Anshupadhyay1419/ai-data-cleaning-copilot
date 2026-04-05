# Implementation Plan: Backend Refactor & Integration

## Overview

Migrate and unify the numerical cleaning engine and the codemix NLP engine into a single FastAPI app under `backend/app/`. Tasks are ordered so each step builds on the previous, ending with full wiring. No core ML logic is modified.

## Tasks

- [x] 1. Create project skeleton and shared utilities
  - Create `backend/app/` package with `__init__.py` files at every level
  - Create `backend/app/utils/__init__.py`, `backend/app/services/__init__.py`, `backend/app/services/numerical/__init__.py`, `backend/app/services/codemix/__init__.py`, `backend/app/routes/__init__.py`
  - Create `backend/.env` template with all six HF variable keys set to empty strings plus `APP_ENV` and `LOG_LEVEL`
  - Create `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `pandas`, `numpy`, `scikit-learn`, `httpx`, `pydantic-settings`, `python-multipart`, `hypothesis`, `pytest`, `pytest-asyncio`
  - _Requirements: 1.1, 1.4, 2.5, 12.1_

- [x] 2. Implement `app/utils/config.py`
  - [x] 2.1 Write `Settings(BaseSettings)` with fields `hf_codemix_url`, `hf_english_url`, `hf_fake_news_url`, `hf_codemix_token`, `hf_english_token`, `hf_fake_news_token`, `app_env="development"`, `log_level="INFO"`
    - Use `SettingsConfigDict(env_file=".env", case_sensitive=False)`
    - Add `get_settings()` with `@lru_cache()` and module-level `settings = get_settings()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property test for config round trip (Property 2)
    - **Property 2: Config Round Trip**
    - **Validates: Requirements 2.1**
    - File: `backend/tests/test_properties_config.py`

  - [ ]* 2.3 Write property test for config singleton idempotence (Property 3)
    - **Property 3: Config Singleton Idempotence**
    - **Validates: Requirements 2.2**
    - File: `backend/tests/test_properties_config.py`

  - [ ]* 2.4 Write property test for config rejects missing variables (Property 4)
    - **Property 4: Config Rejects Missing Variables**
    - **Validates: Requirements 2.3**
    - File: `backend/tests/test_properties_config.py`

- [x] 3. Implement `app/utils/file_handler.py`
  - [x] 3.1 Write `parse_csv(file_bytes: bytes) -> pd.DataFrame`
    - Reject zero-byte input with `ValueError("Uploaded file is empty")`
    - Reject input > 200 MB with `ValueError("File exceeds 200 MB limit")`
    - Try `pd.read_csv` with UTF-8; on `UnicodeDecodeError` retry with latin-1
    - Reject zero-row result with `ValueError("Uploaded file is empty")`
    - Deduplicate column names with numeric suffix (`col`, `col_1`, `col_2`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.2 Write property test for encoding fallback (Property 5)
    - **Property 5: File Handler Encoding Fallback**
    - **Validates: Requirements 3.1, 3.2**
    - File: `backend/tests/test_properties_file_handler.py`

  - [ ]* 3.3 Write property test for invalid CSV rejection (Property 6)
    - **Property 6: File Handler Rejects Invalid CSV**
    - **Validates: Requirements 3.4**
    - File: `backend/tests/test_properties_file_handler.py`

  - [ ]* 3.4 Write property test for column deduplication uniqueness (Property 7)
    - **Property 7: Column Deduplication Uniqueness**
    - **Validates: Requirements 3.5**
    - File: `backend/tests/test_properties_file_handler.py`

- [x] 4. Implement `app/utils/validators.py`
  - [x] 4.1 Write `validate_missing_strategy(col_type: str, strategy: str) -> Optional[str]`
    - Return `"Type Error: Cannot apply Mean/Median to categorical data"` for mean/median on non-numeric
    - Return `"Type Error: Cannot apply Interpolate to non-numeric data"` for interpolate on non-numeric
    - Return `None` for valid combinations
    - Write `validate_operation(operation: str) -> Optional[str]` returning `"Unknown operation: <op>"` or `None`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write property test for validator rejects incompatible strategies (Property 8)
    - **Property 8: Validator Rejects Incompatible Strategies**
    - **Validates: Requirements 4.1, 4.2, 4.4**
    - File: `backend/tests/test_properties_validators.py`

- [x] 5. Migrate numerical service files
  - [x] 5.1 Copy `backend/anomaly.py` → `backend/app/services/numerical/anomaly.py` with only import path updates (no logic changes)
    - _Requirements: 1.5_

  - [x] 5.2 Copy `backend/cleaner.py` → `backend/app/services/numerical/cleaner.py` with only import path updates (no logic changes)
    - _Requirements: 1.5_

  - [x] 5.3 Copy `backend/flashfill.py` → `backend/app/services/numerical/flashfill.py` with only import path updates (no logic changes)
    - _Requirements: 1.5_

  - [ ]* 5.4 Write property test for migration equivalence (Property 1)
    - **Property 1: Migration Equivalence**
    - **Validates: Requirements 1.5, 1.6**
    - For any valid DataFrame, output of migrated functions must be structurally identical to original
    - File: `backend/tests/test_properties_migration.py`

- [x] 6. Implement `app/services/numerical/router.py`
  - [x] 6.1 Write `async def dispatch(operation: str, df: pd.DataFrame, **kwargs) -> Any`
    - Map `"profile"` → `generate_profile(df, detect_column_types(df))`
    - Map `"duplicates"` → return duplicate row data (count + rows, no mutation)
    - Map `"missing"` → `apply_missing_strategy(df, **kwargs)`
    - Map `"flashfill"` → `get_suggestions` if no `transform_id`, else `apply_transformation`
    - Map `"anomaly"` → `detect_anomalies(df, numeric_cols, contamination)`
    - Map `"rename"` → `get_rename_suggestions` if no `renames`, else `apply_rename_rules` per column
    - Raise `ValueError(f"Unknown operation: {operation}")` for anything else
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 6.2 Write property test for numerical router dispatch completeness (Property 9)
    - **Property 9: Numerical Router Dispatch Completeness**
    - **Validates: Requirements 5.1–5.8**
    - File: `backend/tests/test_properties_numerical.py`

- [x] 7. Migrate codemix service files
  - [x] 7.1 Adapt `model1.py` → `backend/app/services/codemix/model_codemix.py`
    - Rename function to `model_codemix_service`; update config fields to `settings.hf_codemix_url` / `settings.hf_codemix_token`
    - Update timeout message to `"CodeMix request timed out. Please try again."`
    - Update connection error message to `"Could not reach CodeMix endpoint: {exc}"`
    - _Requirements: 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 7.2 Adapt `model2.py` → `backend/app/services/codemix/model_english.py`
    - Rename function to `model_english_service`; update config fields to `settings.hf_english_url` / `settings.hf_english_token`
    - Update timeout/connection error messages to use "English" naming
    - _Requirements: 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 7.3 Adapt `model3.py` → `backend/app/services/codemix/model_fakenews.py`
    - Rename function to `model_fakenews_service`; update config fields to `settings.hf_fake_news_url` / `settings.hf_fake_news_token`
    - Update timeout/connection error messages to use "FakeNews" naming
    - _Requirements: 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.4 Write property test for HF service error mapping (Property 15)
    - **Property 15: HF Service Error Mapping**
    - **Validates: Requirements 9.3, 9.4, 9.5**
    - Mock `httpx.AsyncClient.post` to raise `TimeoutException`, `HTTPStatusError`, `RequestError` in turn; assert correct exception types and message substrings
    - File: `backend/tests/test_properties_codemix.py`

- [x] 8. Implement `app/services/codemix/router.py`
  - [x] 8.1 Extract `_select_model(text: str) -> str` from `routes/predict.py` `_dispatch` heuristic (preserved verbatim)
    - Returns exactly one of `"codemix"`, `"english"`, `"fakenews"`
    - Write `async def route(df: pd.DataFrame) -> tuple[str, Any]`
    - Extract text from DataFrame, call `_select_model`, call the matching service, return `(model_name, result)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.2 Write property test for model router exhaustiveness (Property 14)
    - **Property 14: Model Router Exhaustiveness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    - File: `backend/tests/test_properties_codemix.py`

- [x] 9. Implement `app/routes/numerical.py`
  - [x] 9.1 Define module-level `current_state` dict and `ProcessRequest` Pydantic model
    - Implement `POST /numerical/process` delegating to `numerical_router.dispatch()`; wrap in try/except mapping `ValueError` → 400, `Exception` → 500
    - Return `{ "status": "success", "module": "numerical", "model_used": None, "result": ... }`
    - _Requirements: 6.1, 6.2, 6.3, 11.1, 11.2, 11.3_

  - [x] 9.2 Implement all legacy fine-grained endpoints preserving backward compatibility
    - `/upload` (POST), `/profile` (GET), `/duplicates` (GET), `/remove_duplicates` (POST), `/missing_strategy` (POST), `/flashfill/suggest` (POST), `/flashfill/apply` (POST), `/anomalies/detect` (POST), `/anomalies/action` (POST), `/rename/suggest` (GET), `/rename/apply` (POST), `/export/data` (GET), `/override_type` (POST)
    - All check `current_state["df"] is None` and return 400 `"No dataset loaded"` if unset
    - `/export/data` returns filename prefixed with `"cleaned_"` and UTF-8 CSV data
    - _Requirements: 6.4, 6.5, 6.6_

  - [ ]* 9.3 Write property test for profile result completeness (Property 12)
    - **Property 12: Profile Result Completeness**
    - **Validates: Requirements 6.5**
    - File: `backend/tests/test_properties_numerical.py`

  - [ ]* 9.4 Write property test for export round trip (Property 13)
    - **Property 13: Export Round Trip**
    - **Validates: Requirements 6.6**
    - File: `backend/tests/test_properties_numerical.py`

- [x] 10. Implement `app/routes/categorical.py`
  - [x] 10.1 Implement `POST /categorical/process` accepting multipart CSV upload
    - Call `file_handler.parse_csv`, then `codemix_router.route(df)`
    - Return `{ "status": "success", "module": "categorical", "model_used": model_name, "result": result }`
    - Map `httpx.HTTPStatusError` → 502, `RuntimeError` → 503, `ValueError` → 400, `Exception` → 500
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.1, 11.4_

  - [ ]* 10.2 Write property test for HTTP 502 on HF API error (Property 16)
    - **Property 16: HTTP 502 on HF API Error**
    - **Validates: Requirements 7.5, 11.4**
    - File: `backend/tests/test_properties_codemix.py`

- [x] 11. Implement `app/main.py` and wire everything together
  - [x] 11.1 Create `FastAPI` app with title, CORS middleware (`allow_origins=["*"]`, all methods/headers)
    - Include `numerical_router` under prefix `/numerical` and `categorical_router` under prefix `/categorical`
    - Implement `GET /` returning `{ "status": "ok", "message": "AI Data Cleaning Copilot backend is running." }`
    - Implement `GET /health` returning `{ "app_env": str, "models": { "codemix": bool, "english": bool, "fakenews": bool } }` (bool = URL field is non-empty)
    - Log `app_env` and `log_level` at INFO on startup
    - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write property test for response envelope shape (Property 10)
    - **Property 10: Response Envelope Shape**
    - **Validates: Requirements 6.2, 7.4, 11.2**
    - File: `backend/tests/test_properties_routes.py`

  - [ ]* 11.3 Write property test for HTTP 400 on validation failure (Property 11)
    - **Property 11: HTTP 400 on Validation Failure**
    - **Validates: Requirements 6.3, 11.3**
    - File: `backend/tests/test_properties_routes.py`

  - [ ]* 11.4 Write property test for HTTP 500 on unexpected error (Property 17)
    - **Property 17: HTTP 500 on Unexpected Error**
    - **Validates: Requirements 11.1, 11.5**
    - File: `backend/tests/test_properties_routes.py`

  - [ ]* 11.5 Write property test for health endpoint completeness (Property 18)
    - **Property 18: Health Endpoint Completeness**
    - **Validates: Requirements 10.4**
    - File: `backend/tests/test_properties_codemix.py`

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run: `cd backend && pytest tests/ -v`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `hypothesis`; unit tests use `pytest` + `httpx.AsyncClient`
- Core ML logic in `anomaly.py`, `cleaner.py`, `flashfill.py` must not be modified — only import paths change
- The app starts with: `uvicorn app.main:app --host 0.0.0.0 --port 7860` from `backend/`
