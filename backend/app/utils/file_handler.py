import io
import pandas as pd


def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    """Parse CSV bytes into a cleaned DataFrame.

    Raises:
        ValueError: If the file is empty, exceeds 200 MB, or results in zero rows.
    """
    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty")

    if len(file_bytes) > 200 * 1024 * 1024:
        raise ValueError("File exceeds 200 MB limit")

    # Read the raw header line to get original column names before pandas
    # auto-renames duplicates (e.g. col -> col.1, col.2).
    encoding = _detect_encoding(file_bytes)
    raw_header = _read_raw_header(file_bytes, encoding)
    deduped_names = _deduplicate_columns(raw_header)

    df = pd.read_csv(
        io.BytesIO(file_bytes),
        encoding=encoding,
        header=None,
        names=deduped_names,
        skiprows=1,
    )

    if len(df) == 0:
        raise ValueError("Uploaded file is empty")

    return df


def _detect_encoding(file_bytes: bytes) -> str:
    """Return 'utf-8' if the bytes decode cleanly, otherwise 'latin-1'."""
    try:
        file_bytes.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return "latin-1"


def _read_raw_header(file_bytes: bytes, encoding: str) -> list[str]:
    """Read the first line of the CSV and return column names as strings."""
    first_line = file_bytes.split(b"\n")[0].decode(encoding).rstrip("\r")
    # Use pandas to parse the header line so quoting/escaping is handled correctly
    header_df = pd.read_csv(io.StringIO(first_line), header=None)
    return [str(c) for c in header_df.iloc[0].tolist()]


def _deduplicate_columns(columns: list[str]) -> list[str]:
    """Deduplicate column names by appending _1, _2, etc. to duplicates.

    The first occurrence of a name keeps the original; subsequent occurrences
    get numeric suffixes.
    """
    seen: dict[str, int] = {}
    result: list[str] = []

    for col in columns:
        if col not in seen:
            seen[col] = 0
            result.append(col)
        else:
            seen[col] += 1
            new_name = f"{col}_{seen[col]}"
            # Ensure the generated name is also unique
            while new_name in seen:
                seen[col] += 1
                new_name = f"{col}_{seen[col]}"
            seen[new_name] = 0
            result.append(new_name)

    return result
