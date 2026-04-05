"""
services/codemix/model_codemix.py
──────────────────────────────────
Service layer for the CodeMix model (text classification).

This module is responsible for:
  - Building the HTTP request to the Hugging Face Inference API
  - Attaching the correct Bearer token for the CodeMix model
  - Returning a clean result dict (or raising a descriptive exception)

We use `httpx.AsyncClient` so the server can handle other requests while
waiting for the (potentially slow) HF API to respond.
"""

import logging

import httpx

from app.utils.config import settings

logger = logging.getLogger(__name__)

# How long (seconds) to wait for HF to respond before giving up.
REQUEST_TIMEOUT = 30.0


async def model_codemix_service(payload: dict) -> dict:
    """
    Call Hugging Face CodeMix model with *payload* and return the parsed JSON response.

    Args:
        payload: A dict that will be serialised to JSON and sent to the HF API.
                 For text models this is typically {"inputs": "<your text>"}.

    Returns:
        A dict with the key "result" containing the raw HF API response.

    Raises:
        httpx.HTTPStatusError: When HF returns a 4xx / 5xx response.
        RuntimeError:          On connection errors or timeouts.
    """

    url   = settings.hf_codemix_url
    token = settings.hf_codemix_token

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }

    logger.info("model_codemix_service → calling %s", url)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()   # raises HTTPStatusError on 4xx/5xx

    except httpx.TimeoutException as exc:
        logger.error("model_codemix_service → request timed out: %s", exc)
        raise RuntimeError("CodeMix request timed out. Please try again.") from exc

    except httpx.HTTPStatusError as exc:
        logger.error(
            "model_codemix_service → HF returned %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise  # re-raise so the route layer can map it to an HTTP 502

    except httpx.RequestError as exc:
        logger.error("model_codemix_service → connection error: %s", exc)
        raise RuntimeError(f"Could not reach CodeMix endpoint: {exc}") from exc

    result = response.json()
    logger.info("model_codemix_service → success, response keys: %s", list(result) if isinstance(result, dict) else type(result).__name__)

    return {"result": result}
