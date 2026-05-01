import io
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether,
)
from reportlab.lib.units import inch


def export_pdf(filename: str, stats: dict, insights: list, chart_images: list | None = None) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            topMargin=0.75*inch, bottomMargin=0.75*inch,
                            leftMargin=0.75*inch, rightMargin=0.75*inch)
    styles = getSampleStyleSheet()
    story = []

    page_w = letter[0] - 1.5*inch   # usable width

    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  fontSize=22, textColor=colors.HexColor("#3b82f6"))
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
                               fontSize=14, textColor=colors.HexColor("#8b5cf6"),
                               spaceAfter=6)
    h3_style = ParagraphStyle("H3", parent=styles["Heading3"],
                               fontSize=11, textColor=colors.HexColor("#06b6d4"),
                               spaceBefore=10, spaceAfter=4)
    body_style = styles["BodyText"]

    story.append(Paragraph("DataLens AI — Analysis Report", title_style))
    story.append(Paragraph(f"File: {filename}", body_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#3b82f6")))
    story.append(Spacer(1, 0.2*inch))

    # ── Dataset Overview ────────────────────────────────────────────────────
    shape = stats.get("shape", {})
    story.append(Paragraph("Dataset Overview", h2_style))
    overview_data = [
        ["Metric", "Value"],
        ["Total Rows",    str(shape.get("rows", "N/A"))],
        ["Total Columns", str(shape.get("cols", "N/A"))],
        ["Numeric Cols",  str(sum(1 for s in stats["columns"].values() if s["type"] == "numeric"))],
        ["Categorical",   str(sum(1 for s in stats["columns"].values() if s["type"] == "categorical"))],
    ]
    tbl = Table(overview_data, colWidths=[2.5*inch, 3.5*inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("PADDING",    (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.3*inch))

    # ── Column Statistics table ─────────────────────────────────────────────
    story.append(Paragraph("Column Statistics", h2_style))
    stat_rows = [["Column", "Type", "Mean/Top", "Std/Unique", "Missing %"]]
    for col, s in stats.get("columns", {}).items():
        missing_pct = stats.get("missing", {}).get(col, {}).get("percentage", 0)
        if s["type"] == "numeric":
            stat_rows.append([col, "Numeric",
                               f"{s.get('mean', '')}",
                               f"{s.get('std', '')}",
                               f"{missing_pct}%"])
        else:
            top = list(s.get("top_values", {}).keys())
            stat_rows.append([col, s["type"].capitalize(),
                               top[0] if top else "—",
                               str(s.get("unique_count", "—")),
                               f"{missing_pct}%"])
    tbl2 = Table(stat_rows, colWidths=[1.8*inch, 1.0*inch, 1.5*inch, 1.2*inch, 1.0*inch])
    tbl2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8b5cf6")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID",       (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("PADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl2)
    story.append(Spacer(1, 0.3*inch))

    # ── AI Insights ─────────────────────────────────────────────────────────
    if insights:
        story.append(Paragraph("AI-Generated Insights", h2_style))
        for i, ins in enumerate(insights, 1):
            story.append(Paragraph(f"<b>{i}. {ins.get('title', '')}</b>", body_style))
            story.append(Paragraph(ins.get("insight", ""), body_style))
            story.append(Spacer(1, 0.1*inch))

    # ── Charts ───────────────────────────────────────────────────────────────
    if chart_images:
        story.append(Spacer(1, 0.2*inch))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#8b5cf6")))
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph("Data Visualisations", h2_style))
        story.append(Spacer(1, 0.1*inch))

        for chart in chart_images:
            title     = chart.get("title", "Chart")
            type_lbl  = chart.get("type", "").capitalize()
            png_bytes = chart.get("png", b"")

            if not png_bytes:
                continue

            # Build image flowable from raw bytes
            img_buf = io.BytesIO(png_bytes)
            img     = Image(img_buf)

            # Scale to fit page width while keeping aspect ratio
            orig_w, orig_h = img.imageWidth, img.imageHeight
            scale   = page_w / orig_w
            img.drawWidth  = page_w
            img.drawHeight = orig_h * scale

            heading = Paragraph(
                f"<b>[{type_lbl}]</b>  {title}",
                h3_style,
            )

            story.append(KeepTogether([heading, Spacer(1, 0.05*inch), img, Spacer(1, 0.25*inch)]))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def export_excel(filename: str, df: pd.DataFrame, stats: dict) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Raw Data", index=False)

        stat_rows = []
        for col, s in stats.get("columns", {}).items():
            missing = stats.get("missing", {}).get(col, {})
            row = {
                "Column": col, "Type": s["type"],
                "Missing Count": missing.get("count", 0),
                "Missing %": missing.get("percentage", 0),
            }
            if s["type"] == "numeric":
                row.update({k: s.get(k) for k in ["mean", "median", "std", "min", "max", "q1", "q3"]})
            stat_rows.append(row)

        pd.DataFrame(stat_rows).to_excel(writer, sheet_name="Statistics", index=False)

        missing_data = [
            {"Column": col, **v}
            for col, v in stats.get("missing", {}).items()
            if v["count"] > 0
        ]
        if missing_data:
            pd.DataFrame(missing_data).to_excel(writer, sheet_name="Missing Values", index=False)

    buffer.seek(0)
    return buffer.read()
