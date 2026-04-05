from typing import Optional

KNOWN_OPERATIONS = {"profile", "duplicates", "missing", "flashfill", "anomaly", "rename", "export"}


def validate_missing_strategy(col_type: str, strategy: str) -> Optional[str]:
    """Validate that a missing-value strategy is compatible with the column type.

    Returns an error string if invalid, or None if valid.
    """
    if strategy in ("mean", "median") and col_type != "numeric":
        return "Type Error: Cannot apply Mean/Median to categorical data"
    if strategy == "interpolate" and col_type != "numeric":
        return "Type Error: Cannot apply Interpolate to non-numeric data"
    return None


def validate_operation(operation: str) -> Optional[str]:
    """Validate that an operation name is known.

    Returns an error string if unknown, or None if valid.
    """
    if operation not in KNOWN_OPERATIONS:
        return f"Unknown operation: {operation}"
    return None
