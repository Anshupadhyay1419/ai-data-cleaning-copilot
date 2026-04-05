import io
import pytest
import pandas as pd

from app.utils.file_handler import parse_csv


def _make_csv(content: str, encoding: str = "utf-8") -> bytes:
    return content.encode(encoding)


def test_empty_bytes_raises():
    with pytest.raises(ValueError, match="Uploaded file is empty"):
        parse_csv(b"")


def test_exceeds_size_limit_raises():
    big = b"a" * (200 * 1024 * 1024 + 1)
    with pytest.raises(ValueError, match="File exceeds 200 MB limit"):
        parse_csv(big)


def test_zero_row_csv_raises():
    csv = _make_csv("col1,col2\n")
    with pytest.raises(ValueError, match="Uploaded file is empty"):
        parse_csv(csv)


def test_valid_utf8_csv():
    csv = _make_csv("name,age\nAlice,30\nBob,25\n")
    df = parse_csv(csv)
    assert list(df.columns) == ["name", "age"]
    assert len(df) == 2


def test_latin1_fallback():
    # ñ is not valid UTF-8 in latin-1 context but latin-1 encoded bytes differ
    content = "city,value\nMünchen,1\nParis,2\n"
    csv_bytes = content.encode("latin-1")
    df = parse_csv(csv_bytes)
    assert len(df) == 2
    assert "city" in df.columns


def test_duplicate_columns_deduplicated():
    csv = _make_csv("a,b,a,a\n1,2,3,4\n")
    df = parse_csv(csv)
    assert list(df.columns) == ["a", "b", "a_1", "a_2"]


def test_no_duplicate_columns_unchanged():
    csv = _make_csv("x,y,z\n1,2,3\n")
    df = parse_csv(csv)
    assert list(df.columns) == ["x", "y", "z"]
