from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from routers.auth import get_current_user
from routers.upload import get_df

router = APIRouter()


class Filter(BaseModel):
    column: str
    operator: str   # eq, ne, gt, lt, gte, lte, contains, not_null, is_null
    value: Optional[str] = None


class CustomQuery(BaseModel):
    columns: List[str] = []
    filters: List[Filter] = []
    group_by: Optional[str] = None
    aggregation: Optional[str] = None   # sum, mean, count, min, max
    agg_column: Optional[str] = None
    limit: int = 500


def _apply_filters(df: pd.DataFrame, filters: List[Filter]) -> pd.DataFrame:
    for f in filters:
        if f.column not in df.columns:
            continue
        col = df[f.column]
        op = f.operator
        v  = f.value

        try:
            if op == "eq":        df = df[col.astype(str) == v]
            elif op == "ne":      df = df[col.astype(str) != v]
            elif op == "gt":      df = df[pd.to_numeric(col, errors="coerce") > float(v)]
            elif op == "lt":      df = df[pd.to_numeric(col, errors="coerce") < float(v)]
            elif op == "gte":     df = df[pd.to_numeric(col, errors="coerce") >= float(v)]
            elif op == "lte":     df = df[pd.to_numeric(col, errors="coerce") <= float(v)]
            elif op == "contains":df = df[col.astype(str).str.contains(v, case=False, na=False)]
            elif op == "not_null":df = df[col.notna()]
            elif op == "is_null": df = df[col.isna()]
        except Exception:
            pass
    return df


@router.post("/custom/{file_id}")
async def run_custom_query(
    file_id: str,
    query: CustomQuery,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df = await get_df(file_id, sheet, current_user)

    # Column selection
    sel_cols = [c for c in query.columns if c in df.columns] or list(df.columns)
    df = df[sel_cols]

    # Filters
    df = _apply_filters(df, query.filters)

    # Group by + aggregation
    if query.group_by and query.group_by in df.columns and query.aggregation and query.agg_column:
        agg_col = query.agg_column
        if agg_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{agg_col}' not found")
        agg_map = {"sum": "sum", "mean": "mean", "count": "count", "min": "min", "max": "max"}
        agg_fn = agg_map.get(query.aggregation, "count")
        if agg_fn == "count":
            result = df.groupby(query.group_by)[agg_col].count().reset_index()
        else:
            result = df.groupby(query.group_by)[agg_col].agg(agg_fn).reset_index()
        result.columns = [query.group_by, f"{agg_fn}_{agg_col}"]
        df = result

    df = df.head(query.limit)

    return {
        "columns": list(df.columns),
        "rows":    df.fillna("").astype(str).to_dict(orient="records"),
        "total":   len(df),
    }
