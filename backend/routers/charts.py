from fastapi import APIRouter, Depends, Query
from routers.auth import get_current_user
from routers.upload import get_df
from services.stats import analyze
from services.chart_service import generate_all_charts

router = APIRouter()


@router.get("/charts/{file_id}")
async def get_charts(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df = await get_df(file_id, sheet, current_user)
    stats = analyze(df)
    charts = generate_all_charts(df, stats)
    return {"charts": charts}
