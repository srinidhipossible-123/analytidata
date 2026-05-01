from fastapi import APIRouter, Depends, Query
from routers.auth import get_current_user
from routers.upload import get_df
from services.stats import analyze
from services.insights_service import generate_insights

router = APIRouter()


@router.get("/insights/{file_id}")
async def get_insights(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df = await get_df(file_id, sheet, current_user)
    stats = analyze(df)
    insights = generate_insights(stats, list(df.columns), file_id)
    return {"insights": insights}
