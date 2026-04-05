from typing import Any

import pandas as pd

from app.services.numerical.anomaly import detect_anomalies, get_rename_suggestions
from app.services.numerical.cleaner import detect_column_types, generate_profile, apply_missing_strategy
from app.services.numerical.flashfill import get_suggestions, apply_transformation


async def dispatch(operation: str, df: pd.DataFrame, col_types: dict = None, **kwargs) -> Any:
    if operation == "profile":
        col_types_result = detect_column_types(df)
        return generate_profile(df, col_types_result)

    elif operation == "duplicates":
        return {
            "count": int(df.duplicated().sum()),
            "rows": df[df.duplicated(keep=False)].fillna("").head(50).to_dict(orient="records"),
        }

    elif operation == "missing":
        return apply_missing_strategy(
            df,
            col=kwargs["column"],
            strategy=kwargs["strategy"],
            value=kwargs.get("value"),
            col_types=col_types,
        )

    elif operation == "flashfill":
        if "transform_id" in kwargs:
            return apply_transformation(df, kwargs["column"], kwargs["transform_id"])
        else:
            result = get_suggestions(df, kwargs["column"], kwargs["c_type"])
            return {"suggestions": result}

    elif operation == "anomaly":
        numeric_cols = [
            col
            for col, info in (col_types or {}).items()
            if info.get("type") == "numeric" and pd.api.types.is_numeric_dtype(df[col])
        ]
        return detect_anomalies(df, numeric_cols, kwargs.get("contamination", 0.05))

    elif operation == "rename":
        if "renames" in kwargs:
            return {"renames": kwargs["renames"]}
        else:
            result = get_rename_suggestions(df)
            return {"suggestions": result}

    else:
        raise ValueError(f"Unknown operation: {operation}")
