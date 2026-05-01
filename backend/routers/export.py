from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import io
from routers.auth import get_current_user
from routers.upload import get_df
from services.stats import analyze
from services.insights_service import generate_insights
from services.pdf_charts import generate_pdf_charts   # ← Matplotlib, not kaleido
from services.exporter import export_pdf, export_excel

router = APIRouter()


@router.get("/export/{file_id}/pdf")
async def export_as_pdf(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df         = await get_df(file_id, sheet, current_user)
    stats      = analyze(df)
    insights   = generate_insights(stats, list(df.columns), file_id)
    chart_imgs = generate_pdf_charts(df, stats)      # fast, synchronous, no subprocess
    pdf_bytes  = export_pdf(f"{file_id} / {sheet}", stats, insights, chart_imgs)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="datalens_report.pdf"'},
    )


@router.get("/export/{file_id}/excel")
async def export_as_excel(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    df          = await get_df(file_id, sheet, current_user)
    stats       = analyze(df)
    excel_bytes = export_excel(f"{file_id} / {sheet}", df, stats)
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="datalens_export.xlsx"'},
    )
