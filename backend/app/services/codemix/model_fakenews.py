"""
services/codemix/model_fakenews.py
────────────────────────────────────
Service layer for the FakeNews model (e.g. Image Classification – ViT or similar).

For image models the HF Inference API expects raw binary image bytes in the
request body, NOT JSON.  The route layer passes `raw_bytes` when the input
is an image; this service switches Content-Type accordingly.
"""

import logging
from typing import Optional

import httpx

from app.utils.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 60.0   # image inference can be slower


async def model_fakenews_service(
    payload: Optional[dict] = None,
    raw_bytes: Optional[bytes] = None,
    content_type: str = "application/octet-stream",
) -> dict:
    """
    Call Hugging Face FakeNews model.

    Supports two calling modes:
      1. JSON mode  – pass `payload` (dict).  Used for text-based tasks.
      2. Binary mode – pass `raw_bytes` + `content_type`.  Used for images.

    Args:
        payload:      Dict payload for JSON mode.
        raw_bytes:    Raw image bytes for binary mode.
        content_type: MIME type of the binary data (e.g. "image/jpeg").

    Returns:
        {"result": <raw HF response>}

    Raises:
        ValueError:            If neither payload nor raw_bytes is provided.
        httpx.HTTPStatusError: On 4xx / 5xx from HF.
        RuntimeError:          On network / timeout errors.
    """

    if payload is None and raw_bytes is None:
        raise ValueError("Provide either 'payload' (dict) or 'raw_bytes' (bytes).")

    url   = settings.hf_fake_news_url
    token = settings.hf_fake_news_token

    logger.info("model_fakenews_service → calling %s", url)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            if raw_bytes is not None:
                # ── Binary / image mode ──────────────────────────────────
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  content_type,
                }
                response = await client.post(url, content=raw_bytes, headers=headers)
            else:
                # ── JSON mode ────────────────────────────────────────────
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                }
                response = await client.post(url, json=payload, headers=headers)

            response.raise_for_status()

    except httpx.TimeoutException as exc:
        logger.error("model_fakenews_service → request timed out: %s", exc)
        raise RuntimeError("FakeNews request timed out. Please try again.") from exc

    except httpx.HTTPStatusError as exc:
        logger.error(
            "model_fakenews_service → HF returned %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise

    except httpx.RequestError as exc:
        logger.error("model_fakenews_service → connection error: %s", exc)
        raise RuntimeError(f"Could not reach FakeNews endpoint: {exc}") from exc

    result = response.json()
    logger.info("model_fakenews_service → success")

    return {"result": result}
