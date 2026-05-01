import pandas as pd
import numpy as np
from scipy import stats as scipy_stats


def detect_type(series: pd.Series) -> str:
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    try:
        converted = pd.to_datetime(series, infer_datetime_format=True)
        if converted.notna().sum() > len(series) * 0.8:
            return "datetime"
    except Exception:
        pass
    try:
        pd.to_numeric(series, errors="raise")
        return "numeric"
    except Exception:
        pass
    return "categorical"


def analyze(df: pd.DataFrame) -> dict:
    result = {
        "shape": {"rows": len(df), "cols": len(df.columns)},
        "columns": {},
        "missing": {},
        "correlation": None,
        "outliers": {},
    }

    numeric_cols = []

    for col in df.columns:
        col_type = detect_type(df[col])
        missing_count = int(df[col].isna().sum())
        result["missing"][col] = {
            "count": missing_count,
            "percentage": round(missing_count / max(len(df), 1) * 100, 2),
        }

        if col_type == "numeric":
            numeric_cols.append(col)
            s = pd.to_numeric(df[col], errors="coerce").dropna()
            q1, q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
            iqr = q3 - q1
            outlier_mask = (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)
            mode_val = s.mode()
            result["columns"][col] = {
                "type": "numeric",
                "mean":     round(float(s.mean()), 4),
                "median":   round(float(s.median()), 4),
                "mode":     round(float(mode_val.iloc[0]), 4) if not mode_val.empty else None,
                "std":      round(float(s.std()), 4),
                "min":      round(float(s.min()), 4),
                "max":      round(float(s.max()), 4),
                "q1":       round(q1, 4),
                "q3":       round(q3, 4),
                "iqr":      round(iqr, 4),
                "skewness": round(float(s.skew()), 4),
                "kurtosis": round(float(s.kurtosis()), 4),
                "count":    int(s.count()),
            }
            result["outliers"][col] = {
                "count": int(outlier_mask.sum()),
                "percentage": round(float(outlier_mask.sum()) / max(len(s), 1) * 100, 2),
            }

        elif col_type == "datetime":
            s = pd.to_datetime(df[col], errors="coerce")
            result["columns"][col] = {
                "type": "datetime",
                "min": str(s.min()),
                "max": str(s.max()),
                "range_days": int((s.max() - s.min()).days) if s.notna().any() else 0,
                "count": int(s.count()),
            }

        else:
            vc = df[col].value_counts().head(10)
            result["columns"][col] = {
                "type": "categorical",
                "unique_count": int(df[col].nunique()),
                "top_values": {str(k): int(v) for k, v in vc.items()},
                "most_frequent": str(df[col].mode().iloc[0]) if not df[col].mode().empty else None,
                "count": int(df[col].count()),
            }

    if len(numeric_cols) > 1:
        corr = df[numeric_cols].corr(numeric_only=True).round(3)
        result["correlation"] = corr.fillna(0).to_dict()

    return result
