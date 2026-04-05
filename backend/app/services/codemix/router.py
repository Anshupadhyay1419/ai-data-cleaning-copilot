"""
services/codemix/router.py
───────────────────────────
Automatic model-selection router for codemix NLP services.

Analyses the text content of a DataFrame and selects the most appropriate
model based on heuristics:
  - Hinglish / mixed-script patterns  → "codemix"
  - Misinformation / sensational text → "fakenews"
  - Everything else                   → "english"
"""

import logging
import re
from typing import Any

import pandas as pd

from app.services.codemix.model_codemix import model_codemix_service
from app.services.codemix.model_english import model_english_service
from app.services.codemix.model_fakenews import model_fakenews_service

logger = logging.getLogger(__name__)

# ── Heuristic constants ───────────────────────────────────────────────────────

# Common Hinglish words (romanised Hindi used in code-mixed text)
_HINGLISH_WORDS = {"hai", "nahi", "kya", "aur", "bhi", "toh", "yaar", "matlab"}

# Sensational / misinformation trigger words (uppercase in source text)
_FAKENEWS_WORDS = {"BREAKING", "EXCLUSIVE", "SHOCKING", "FAKE", "HOAX", "VIRAL", "UNVERIFIED"}

# Devanagari Unicode block
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")

# Excessive-caps threshold (fraction of alpha chars that are uppercase)
_CAPS_RATIO_THRESHOLD = 0.3


# ── Internal helpers ──────────────────────────────────────────────────────────

def _extract_text(df: pd.DataFrame) -> str:
    """Concatenate all string/object columns into a single text sample for analysis.

    Takes the first 100 rows and only string/object-typed columns, then joins
    all cell values with a single space.
    """
    sample = df.head(100)
    string_cols = sample.select_dtypes(include=["object", "string"]).columns
    parts = []
    for col in string_cols:
        parts.extend(sample[col].dropna().astype(str).tolist())
    return " ".join(parts)


def _select_model(text: str) -> str:
    """Return 'codemix', 'english', or 'fakenews' based on text heuristics.

    Checks in priority order:
      1. Devanagari script or common Hinglish words → "codemix"
      2. Sensational keywords or excessive caps ratio → "fakenews"
      3. Default → "english"
    """
    # ── Hinglish / mixed-script check ────────────────────────────────────────
    if _DEVANAGARI_RE.search(text):
        logger.debug("_select_model → Devanagari script detected → codemix")
        return "codemix"

    lower_words = set(text.lower().split())
    if lower_words & _HINGLISH_WORDS:
        logger.debug("_select_model → Hinglish words detected → codemix")
        return "codemix"

    # ── Misinformation / sensational check ───────────────────────────────────
    upper_words = set(text.split())
    if upper_words & _FAKENEWS_WORDS:
        logger.debug("_select_model → sensational keywords detected → fakenews")
        return "fakenews"

    alpha_chars = [c for c in text if c.isalpha()]
    if alpha_chars:
        caps_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
        if caps_ratio > _CAPS_RATIO_THRESHOLD:
            logger.debug("_select_model → high caps ratio (%.2f) → fakenews", caps_ratio)
            return "fakenews"

    # ── Default ───────────────────────────────────────────────────────────────
    logger.debug("_select_model → no special patterns → english")
    return "english"


# ── Public API ────────────────────────────────────────────────────────────────

async def route(df: pd.DataFrame) -> tuple[str, Any]:
    """Analyse df text content, select model, call service, return (model_name, result).

    Args:
        df: Input DataFrame whose text columns are used for model selection.

    Returns:
        A tuple of (model_name, result) where model_name is one of
        "codemix", "english", or "fakenews", and result is the raw
        Hugging Face API response payload.
    """
    text = _extract_text(df)
    model_name = _select_model(text)

    logger.info("route → selected model: %s", model_name)

    payload = {"inputs": text[:512]}  # truncate to avoid HF token limits

    if model_name == "codemix":
        result = await model_codemix_service(payload)
    elif model_name == "english":
        result = await model_english_service(payload)
    else:
        result = await model_fakenews_service(payload=payload)

    return model_name, result["result"]
