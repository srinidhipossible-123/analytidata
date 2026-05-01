from fastapi import APIRouter, Depends, Query
from routers.auth import get_current_user
from routers.upload import get_df
from services.stats import analyze

router = APIRouter()


@router.get("/analysis/{file_id}")
async def run_analysis(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df = await get_df(file_id, sheet, current_user)
    stats = analyze(df)
    return stats
