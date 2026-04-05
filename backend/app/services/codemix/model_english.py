"""
services/codemix/model_english.py
───────────────────────────────────
Service layer for the English model (e.g. Text Generation / GPT-style model).

Identical contract to model_codemix.py – different URL and token come from
environment variables, so swapping models requires only a .env change.
"""

import logging

import httpx

from app.utils.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30.0


async def model_english_service(payload: dict) -> dict:
    """
    Call Hugging Face English model with *payload* and return the parsed JSON.

    Args:
        payload: e.g. {"inputs": "Once upon a time", "parameters": {"max_new_tokens": 50}}

    Returns:
        {"result": <raw HF response>}

    Raises:
        httpx.HTTPStatusError: On 4xx / 5xx from HF.
        RuntimeError:          On network / timeout errors.
    """

    url   = settings.hf_english_url
    token = settings.hf_english_token

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }

    logger.info("model_english_service → calling %s", url)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()

    except httpx.TimeoutException as exc:
        logger.error("model_english_service → request timed out: %s", exc)
        raise RuntimeError("English request timed out. Please try again.") from exc

    except httpx.HTTPStatusError as exc:
        logger.error(
            "model_english_service → HF returned %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise

    except httpx.RequestError as exc:
        logger.error("model_english_service → connection error: %s", exc)
        raise RuntimeError(f"Could not reach English endpoint: {exc}") from exc

    result = response.json()
    logger.info("model_english_service → success")

    return {"result": result}
