import traceback
import logging
from typing import List, Dict, Any, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from app.services.numerical.anomaly import detect_anomalies, get_rename_suggestions
from app.services.numerical.cleaner import detect_column_types, generate_profile, apply_missing_strategy
from app.services.numerical.flashfill import get_suggestions, apply_transformation
from app.utils.file_handler import parse_csv
from app.utils.validators import validate_missing_strategy, validate_operation
import app.services.numerical.router as numerical_router

logger = logging.getLogger(__name__)

router = APIRouter()

# Module-level session state (in-memory, single-process)
current_state = {"df": None, "col_types": None, "filename": None}


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class ColumnTypeOverride(BaseModel):
    column: str
    new_type: str


class MissingValueRequest(BaseModel):
    column: str
    strategy: str
    value: Optional[str] = None


class FlashFillSuggestRequest(BaseModel):
    column: str


class FlashFillApplyRequest(BaseModel):
    column: str
    transform_id: str


class AnomalyRequest(BaseModel):
    contamination: float


class AnomalyActionRequest(BaseModel):
    action: str  # "remove" or "flag"
    indices: List[int]


class RenameApplyRequest(BaseModel):
    renames: Dict[str, str]  # {original: new_name}


class ProcessRequest(BaseModel):
    operation: str
    column: Optional[str] = None
    strategy: Optional[str] = None
    value: Optional[str] = None
    transform_id: Optional[str] = None
    contamination: Optional[float] = 0.05
    renames: Optional[Dict[str, str]] = None


# ---------------------------------------------------------------------------
# Unified process endpoint
# ---------------------------------------------------------------------------

@router.post("/process")
async def process(file: UploadFile = File(...), operation: str = Form(...)):
    try:
        file_bytes = await file.read()
        df = parse_csv(file_bytes)
        col_types = detect_column_types(df)

        err = validate_operation(operation)
        if err:
            raise HTTPException(status_code=400, detail=err)

        kwargs: Dict[str, Any] = {}

        result = await numerical_router.dispatch(operation, df, col_types=col_types, **kwargs)

        # Update session state for operations that mutate the dataframe
        if operation in ("missing", "flashfill"):
            if isinstance(result, dict) and "df" in result:
                current_state["df"] = result["df"]
                current_state["col_types"] = detect_column_types(result["df"])
                current_state["filename"] = file.filename

        return {
            "status": "success",
            "module": "numerical",
            "model_used": None,
            "result": result,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Legacy fine-grained endpoints (backward compatibility)
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    try:
        content = await file.read()
        df = parse_csv(content)

        current_state["df"] = df
        current_state["filename"] = file.filename
        current_state["col_types"] = detect_column_types(df)

        preview = df.head(10).fillna("").to_dict(orient="records")

        return {
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "preview": preview,
            "col_types": current_state["col_types"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/override_type")
def override_type(req: ColumnTypeOverride):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    if req.column not in current_state["col_types"]:
        raise HTTPException(status_code=400, detail="Column not found")

    current_state["col_types"][req.column]["type"] = req.new_type
    return {"status": "success", "col_types": current_state["col_types"]}


@router.get("/profile")
def get_profile():
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    return generate_profile(current_state["df"], current_state["col_types"])


@router.get("/duplicates")
def get_duplicates():
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    df = current_state["df"]
    dups = df[df.duplicated(keep=False)]
    return {
        "count": len(df[df.duplicated()]),
        "rows": dups.fillna("").head(50).to_dict(orient="records"),
    }


@router.post("/remove_duplicates")
def remove_duplicates():
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    df = current_state["df"]
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    current_state["df"] = df
    after = len(df)
    return {"removed": before - after}


@router.post("/missing_strategy")
def apply_missing(req: MissingValueRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")

    col_type = current_state["col_types"].get(req.column, {}).get("type", "categorical")
    err = validate_missing_strategy(col_type, req.strategy)
    if err:
        raise HTTPException(status_code=400, detail=err)

    try:
        res = apply_missing_strategy(
            current_state["df"], req.column, req.strategy, req.value, current_state["col_types"]
        )
        current_state["df"] = res["df"]
        return {
            "rows_affected": res["rows_affected"],
            "before": res["before_missing"],
            "after": res["after_missing"],
            "preview": current_state["df"][[req.column]].head(10).fillna("").to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/flashfill/suggest")
def flashfill_suggest(req: FlashFillSuggestRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    if req.column not in current_state["col_types"]:
        raise HTTPException(status_code=400, detail="Column not found")

    c_type = current_state["col_types"][req.column]["type"]
    suggestions = get_suggestions(current_state["df"], req.column, c_type)
    return {"suggestions": suggestions}


@router.post("/flashfill/apply")
def flashfill_apply(req: FlashFillApplyRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    try:
        res = apply_transformation(current_state["df"], req.column, req.transform_id)
        current_state["df"] = res["df"]
        current_state["col_types"] = detect_column_types(current_state["df"])
        return {
            "new_column": res["new_column"],
            "success_count": res["success_count"],
            "fail_count": res["fail_count"],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/anomalies/detect")
def anomalies_detect(req: AnomalyRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")

    df = current_state["df"]
    numeric_cols = [
        c
        for c, t in current_state["col_types"].items()
        if t["type"] == "numeric" and pd.api.types.is_numeric_dtype(df[c])
    ]

    res = detect_anomalies(df, numeric_cols, req.contamination)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@router.post("/anomalies/action")
def anomalies_action(req: AnomalyActionRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")

    df = current_state["df"]

    if req.action == "remove":
        df = df.drop(index=req.indices).reset_index(drop=True)
    elif req.action == "flag":
        df["is_anomaly"] = False
        df.loc[req.indices, "is_anomaly"] = True

    current_state["df"] = df
    current_state["col_types"] = detect_column_types(df)
    return {"status": "success"}


@router.get("/rename/suggest")
def rename_suggest():
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    return {"suggestions": get_rename_suggestions(current_state["df"])}


@router.post("/rename/apply")
def rename_apply(req: RenameApplyRequest):
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")

    current_state["df"] = current_state["df"].rename(columns=req.renames)
    current_state["col_types"] = detect_column_types(current_state["df"])
    return {"status": "success", "new_columns": list(current_state["df"].columns)}


@router.get("/export/data")
def export_data():
    if current_state["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")

    df = current_state["df"]

    df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
    for col in df_clean.select_dtypes(include=["datetime64", "datetimetz"]).columns:
        df_clean[col] = df_clean[col].astype(str).replace({"NaT": None})

    return {
        "filename": f"cleaned_{current_state['filename']}",
        "data": df_clean.to_dict(orient="records"),
        "columns": list(df_clean.columns),
    }
