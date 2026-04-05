import traceback
import logging

import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.utils.file_handler import parse_csv
import app.services.codemix.router as codemix_router

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process")
async def process(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        df = parse_csv(file_bytes)
        model_name, result = await codemix_router.route(df)
        return {
            "status": "success",
            "module": "categorical",
            "model_used": model_name,
            "result": result,
        }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Hugging Face API error ({e.response.status_code}): {e.response.text}",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")
