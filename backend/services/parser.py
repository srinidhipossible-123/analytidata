import pandas as pd
import io

# Keywords that identify the true header row
_HEADER_KEYWORDS = {
    "sl", "sl no", "slno", "usn", "roll", "name", "student",
    "reg", "regno", "subject", "total", "marks", "percent",
}


def _find_header_row(file_bytes: bytes, sheet_name: str, ext: str) -> int:
    """
    Scan the first 15 rows of the sheet to find which row is the actual
    column header (the row containing 'Sl No', 'USN', 'Name', etc.).
    Returns the 0-based row index, defaulting to 0 if not found.
    """
    try:
        if ext == "csv":
            # CSV – try reading top rows as plain text
            raw = pd.read_csv(
                io.BytesIO(file_bytes), header=None, nrows=15,
                encoding="utf-8", on_bad_lines="skip",
            )
        else:
            raw = pd.read_excel(
                io.BytesIO(file_bytes), sheet_name=sheet_name,
                header=None, nrows=15, engine="openpyxl",
            )

        for i, row in raw.iterrows():
            row_text = " ".join(str(v).lower().strip() for v in row if pd.notna(v))
            hits = sum(1 for kw in _HEADER_KEYWORDS if kw in row_text)
            if hits >= 2:          # at least 2 keyword matches → this is the header row
                return int(i)
    except Exception:
        pass
    return 0                       # default: first row is the header


def parse_file(file_bytes: bytes, filename: str) -> dict:
    """Parse Excel or CSV and return {sheet_name: DataFrame} with correct headers."""
    ext = filename.lower().split(".")[-1]
    sheets = {}

    if ext == "csv":
        header_row = _find_header_row(file_bytes, "Sheet1", ext)
        df = pd.read_csv(
            io.BytesIO(file_bytes),
            header=header_row,
            encoding="utf-8",
            on_bad_lines="skip",
        )
        df.columns = [str(c).strip() for c in df.columns]
        sheets["Sheet1"] = df

    elif ext in ("xlsx", "xls"):
        xls = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
        for sheet_name in xls.sheet_names:
            header_row = _find_header_row(file_bytes, sheet_name, ext)
            df = pd.read_excel(
                io.BytesIO(file_bytes),
                sheet_name=sheet_name,
                header=header_row,
                engine="openpyxl",
            )
            df.columns = [str(c).strip() for c in df.columns]
            sheets[sheet_name] = df
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return sheets


def df_to_records(df: pd.DataFrame, limit: int = 200) -> dict:
    """Convert dataframe to JSON-safe records for preview."""
    preview = df.head(limit).copy()
    for col in preview.select_dtypes(include=["datetime64"]).columns:
        preview[col] = preview[col].astype(str)
    return {
        "columns":   list(preview.columns),
        "rows":      preview.fillna("").astype(str).to_dict(orient="records"),
        "total_rows": len(df),
    }


def get_sheet_names(file_bytes: bytes, filename: str) -> list:
    ext = filename.lower().split(".")[-1]
    if ext == "csv":
        return ["Sheet1"]
    xls = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
    return xls.sheet_names
