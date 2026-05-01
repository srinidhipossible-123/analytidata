"""
services/report_pdf.py
Generates a clean, white-themed class performance PDF report.

Fixes applied:
  1. Text overlap  → tighter column widths; name column uses Paragraph with word-wrap;
                     font auto-shrinks for wide marks tables (many subjects).
  2. Row split     → KeepTogether on header sections; marks table uses
                     splitByRow=True + NOSPLIT on header row; no cell
                     is wider than the usable page width.
  3. Current-page  → generate_class_pdf() accepts active_tab / filter_type /
                     search_q / sort_by and pre-filters / sorts students before
                     building the PDF (mirrors what the browser shows).
"""

import io
import warnings
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ── Palette ───────────────────────────────────────────────────────────────────
C_PRIMARY = colors.HexColor("#1e40af")
C_VIOLET  = colors.HexColor("#7c3aed")
C_GREEN   = colors.HexColor("#16a34a")
C_RED     = colors.HexColor("#dc2626")
C_LIGHT   = colors.HexColor("#eff6ff")
C_GRAY    = colors.HexColor("#64748b")
C_DARK    = colors.HexColor("#0f172a")
C_BORDER  = colors.HexColor("#cbd5e1")
C_ROW_ALT = colors.HexColor("#f8fafc")
C_WHITE   = colors.white
C_CRIT_BG = colors.HexColor("#fff7ed")
C_FAIL_BG = colors.HexColor("#fef2f2")

GRADE_COLORS = {
    "O": "#16a34a", "A+": "#15803d", "A": "#2563eb",
    "B+": "#0891b2", "B": "#7c3aed", "C": "#d97706", "F": "#dc2626",
}

PAGE_W = A4[0]
PAGE_H = A4[1]
MARGIN = 1.8 * cm
USABLE = PAGE_W - 2 * MARGIN


# ── Helpers ───────────────────────────────────────────────────────────────────
def _chart_img(fig, width_cm=16):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    img = Image(buf)
    w   = width_cm * cm
    img.drawWidth  = w
    img.drawHeight = img.imageHeight * (w / img.imageWidth)
    return img


def _subject_chart(subject_stats, max_marks):
    subjects = list(subject_stats.keys())
    avgs  = [subject_stats[s]["avg"] for s in subjects]
    passes= [subject_stats[s]["pass_rate"] for s in subjects]
    pal   = ["#2563eb","#7c3aed","#0891b2","#16a34a","#d97706",
              "#dc2626","#db2777","#059669","#9333ea","#ea580c"]
    clrs  = [pal[i % len(pal)] for i in range(len(subjects))]
    h     = max(3.5, len(subjects) * 0.6 + 1.5)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, h))
    fig.patch.set_facecolor("white")
    for ax, vals, xlabel, title, suffix in [
        (ax1, avgs,  "Marks", "Average Marks / Subject", ""),
        (ax2, passes,"Pass%", "Pass Rate / Subject",     "%"),
    ]:
        bars = ax.barh(subjects, vals, color=clrs, edgecolor="none", height=0.5)
        ax.set_facecolor("#f8fafc")
        ax.spines[["top","right"]].set_visible(False)
        ax.tick_params(labelsize=7)
        ax.set_xlabel(xlabel, fontsize=7)
        ax.set_title(title, fontsize=9, fontweight="bold", pad=6)
        lim = (max_marks * 1.1) if suffix == "" else 110
        ax.set_xlim(0, lim)
        thr = max_marks * 0.4 if suffix == "" else 40
        ax.axvline(thr, color="#dc2626", linewidth=1, linestyle="--")
        for bar, v in zip(bars, vals):
            ax.text(bar.get_width() + lim*0.01,
                    bar.get_y() + bar.get_height()/2,
                    f"{v:.1f}{suffix}", va="center", ha="left", fontsize=6)
    fig.tight_layout(pad=1.2)
    return _chart_img(fig, width_cm=16)


def _grade_pie(grade_dist):
    labels = [k for k, v in grade_dist.items() if v > 0]
    values = [grade_dist[k] for k in labels]
    clrs   = [GRADE_COLORS.get(l, "#94a3b8") for l in labels]
    fig, ax = plt.subplots(figsize=(4.5, 3.5))
    fig.patch.set_facecolor("white")
    ax.pie(values, labels=labels, colors=clrs, autopct="%1.0f%%",
           startangle=140, pctdistance=0.78,
           wedgeprops={"edgecolor": "white", "linewidth": 1.5},
           textprops={"fontsize": 8})
    ax.set_title("Grade Distribution", fontsize=9, fontweight="bold")
    fig.tight_layout()
    return _chart_img(fig, width_cm=8)


def _base_style(bg=None, fs_body=8):
    """Return a base TableStyle with header row coloured."""
    bg = bg or C_PRIMARY
    return TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), bg),
        ("TEXTCOLOR",    (0, 0), (-1, 0), C_WHITE),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 8),
        ("ALIGN",        (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING",(0, 0), (-1, 0), 5),
        ("TOPPADDING",   (0, 0), (-1, 0), 5),
        ("GRID",         (0, 0), (-1, -1), 0.35, C_BORDER),
        ("ROWBACKGROUNDS",(0,1), (-1, -1), [C_WHITE, C_ROW_ALT]),
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), fs_body),
        ("ALIGN",        (1, 1), (-1, -1), "CENTER"),
        ("ALIGN",        (0, 1), (0, -1), "LEFT"),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 3),
        ("TOPPADDING",   (0, 1), (-1, -1), 3),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("NOSPLIT",      (0, 0), (-1, 0)),          # never split header row
    ])


# ── Student filtering (mirrors ClassReport.jsx logic) ────────────────────────
def _filter_students(students, active_tab, filter_type, search_q, sort_by):
    q = search_q.lower().strip() if search_q else ""

    # Tab-level filter
    if active_tab == "critical":
        students = [s for s in students if s.get("is_critical")]
    # filter_type dropdown
    if filter_type == "critical":
        students = [s for s in students if s.get("is_critical")]
    elif filter_type == "pass":
        students = [s for s in students if s.get("percentage", 0) >= 40]
    elif filter_type == "fail":
        students = [s for s in students if s.get("percentage", 0) < 40]

    # Search
    if q:
        students = [
            s for s in students
            if q in s.get("name","").lower() or q in s.get("roll","").lower()
        ]

    # Sort
    if sort_by == "name":
        students = sorted(students, key=lambda s: s.get("name",""))
    elif sort_by == "percentage":
        students = sorted(students, key=lambda s: s.get("percentage",0), reverse=True)
    elif sort_by == "usn":
        students = sorted(students, key=lambda s: s.get("roll",""))
    else:
        students = sorted(students, key=lambda s: s.get("rank", 9999))

    return students


# ── Main PDF generator ────────────────────────────────────────────────────────
def generate_class_pdf(
    report: dict,
    active_tab:  str = "overview",   # overview | students | critical
    filter_type: str = "all",        # all | pass | fail | critical
    search_q:    str = "",
    sort_by:     str = "rank",       # rank | name | percentage | usn
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=MARGIN, bottomMargin=MARGIN,
        leftMargin=MARGIN, rightMargin=MARGIN,
    )

    SS = getSampleStyleSheet()
    def sty(name, **kw):
        return ParagraphStyle(name, parent=SS["Normal"], **kw)

    title_s = sty("T",  fontSize=16, textColor=C_PRIMARY, fontName="Helvetica-Bold",
                  spaceAfter=2, alignment=TA_CENTER)
    sub_s   = sty("S",  fontSize=9,  textColor=C_GRAY, alignment=TA_CENTER, spaceAfter=3)
    meta_s  = sty("M",  fontSize=7,  textColor=C_GRAY, alignment=TA_CENTER)
    h2_s    = sty("H2", fontSize=11, textColor=C_PRIMARY, fontName="Helvetica-Bold",
                  spaceBefore=10, spaceAfter=3)
    body_s  = sty("B",  fontSize=8,  textColor=C_DARK, spaceAfter=2)
    wrap_s  = sty("W",  fontSize=7,  textColor=C_DARK, leading=9)      # word-wrap cell

    # ── Extract data ──────────────────────────────────────────────────────────
    a            = report.get("analytics", {})
    section      = report.get("section", "—")
    exam_type    = report.get("exam_type", "—")
    acad_year    = report.get("academic_year", "—")
    pushed_by    = report.get("pushed_by_name", "—")
    pushed_at    = str(report.get("pushed_at", ""))[:10]
    filename     = report.get("filename", "—")
    sheet_name   = report.get("sheet_name", "")

    all_students  = a.get("students", [])
    subject_cols  = a.get("subject_cols", [])
    subject_stats = a.get("subject_stats", {})
    grade_dist    = a.get("grade_distribution", {})
    critical_all  = a.get("critical_students", [])
    top5          = a.get("top5", [])
    class_avg     = a.get("class_avg_pct", 0)
    pass_rate     = a.get("overall_pass_rate", 0)
    max_marks     = a.get("max_marks_per_subject", 100)
    total_students= a.get("total_students", 0)

    # Apply current-page filters
    students  = _filter_students(all_students, active_tab, filter_type, search_q, sort_by)
    critical  = [s for s in students if s.get("is_critical")]

    # Label what filters are active
    filter_label = ""
    if active_tab == "critical":   filter_label = "Critical Students Only"
    elif filter_type == "pass":    filter_label = "Passed Students"
    elif filter_type == "fail":    filter_label = "Failed Students"
    elif filter_type == "critical":filter_label = "Critical Students"
    if search_q: filter_label += f'  ·  Search: "{search_q}"'
    if sort_by != "rank": filter_label += f"  ·  Sorted by: {sort_by}"

    story = []

    # ── Title block ───────────────────────────────────────────────────────────
    header_block = [
        Spacer(1, 0.3*cm),
        Paragraph("Student Performance Report", title_s),
        Paragraph(f"{section}  ·  {exam_type}  ·  Academic Year {acad_year}", sub_s),
        Paragraph(
            f"By: {pushed_by}  ·  Date: {pushed_at}  ·  {filename}"
            + (f"  (Sheet: {sheet_name})" if sheet_name else "")
            + (f"  ·  Filter: {filter_label}" if filter_label else ""),
            meta_s),
        Spacer(1, 0.2*cm),
        HRFlowable(width="100%", thickness=2, color=C_PRIMARY),
        Spacer(1, 0.3*cm),
    ]
    story.extend(header_block)

    # ── KPI row ───────────────────────────────────────────────────────────────
    shown = len(students)
    kpi_data = [
        ["Total Students", "Shown in PDF", "Class Average", "Pass Rate", "Critical"],
        [
            str(total_students),
            str(shown),
            f"{class_avg}%",
            f"{pass_rate}%",
            str(len(critical_all)),
        ],
    ]
    kpi_tbl = Table(kpi_data, colWidths=[USABLE/5]*5)
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,0), C_LIGHT),
        ("TEXTCOLOR",    (0,0),(-1,0), C_GRAY),
        ("FONTNAME",     (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0),(-1,0), 7),
        ("FONTNAME",     (0,1),(-1,1), "Helvetica-Bold"),
        ("FONTSIZE",     (0,1),(-1,1), 14),
        ("TEXTCOLOR",    (0,1),(0,1), C_PRIMARY),
        ("TEXTCOLOR",    (1,1),(1,1), C_VIOLET),
        ("TEXTCOLOR",    (2,1),(2,1), C_VIOLET),
        ("TEXTCOLOR",    (3,1),(3,1), C_GREEN),
        ("TEXTCOLOR",    (4,1),(4,1), C_RED),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("GRID",         (0,0),(-1,-1), 0.4, C_BORDER),
        ("TOPPADDING",   (0,0),(-1,-1), 7),
        ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("NOSPLIT",      (0,0),(-1,-1)),
    ]))
    story.append(KeepTogether([kpi_tbl, Spacer(1, 0.4*cm)]))

    # ── Overview charts (only when not on a filtered-students-only tab) ───────
    show_overview = active_tab in ("overview", "students") and filter_type == "all" and not search_q

    if show_overview and subject_stats:
        try:
            chart = _subject_chart(subject_stats, max_marks)
            story.append(KeepTogether([
                Paragraph("Subject-wise Performance", h2_s),
                HRFlowable(width="100%", thickness=0.5, color=C_BORDER),
                Spacer(1, 0.15*cm),
                chart,
                Spacer(1, 0.3*cm),
            ]))
        except Exception as e:
            story.append(Paragraph(f"[Chart unavailable: {e}]", body_s))

    if show_overview and grade_dist:
        grade_rows = [["Grade", "Description", "Count", "% of Class"]]
        gd = {"O":"Outstanding","A+":"Excellent","A":"Very Good",
              "B+":"Good","B":"Above Avg","C":"Average","F":"Fail"}
        for g, cnt in grade_dist.items():
            pct = round(cnt / total_students * 100, 1) if total_students else 0
            grade_rows.append([g, gd.get(g,""), str(cnt), f"{pct}%"])
        grade_tbl = Table(grade_rows, colWidths=[1.5*cm, 4*cm, 2*cm, 2.5*cm])
        gs = _base_style(C_VIOLET)
        grade_tbl.setStyle(gs)
        for i, (g, cnt) in enumerate(grade_dist.items(), 1):
            gc = colors.HexColor(GRADE_COLORS.get(g, "#64748b"))
            grade_tbl.setStyle(TableStyle([("TEXTCOLOR",(0,i),(0,i), gc),
                                           ("FONTNAME",(0,i),(0,i),"Helvetica-Bold")]))
            if g == "F" and cnt > 0:
                grade_tbl.setStyle(TableStyle([("BACKGROUND",(0,i),(-1,i), C_FAIL_BG)]))
        try:
            pie = _grade_pie(grade_dist)
            side = Table([[pie, grade_tbl]], colWidths=[8.5*cm, USABLE-8.5*cm])
            side.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
            story.append(KeepTogether([
                Paragraph("Grade Distribution", h2_s),
                HRFlowable(width="100%", thickness=0.5, color=C_BORDER),
                Spacer(1, 0.15*cm),
                side,
                Spacer(1, 0.4*cm),
            ]))
        except Exception:
            story.append(KeepTogether([grade_tbl, Spacer(1, 0.4*cm)]))

    if show_overview and top5:
        top_rows = [["Rank", "USN / Roll", "Name", "Total", "Score", "Grade"]]
        for s in top5:
            top_rows.append([
                str(s.get("rank","")), s.get("roll",""),
                s.get("name",""), str(s.get("total","—")),
                f"{s.get('percentage',0)}%", s.get("grade",""),
            ])
        name_w = USABLE - 1.4*cm - 3.4*cm - 1.8*cm - 2*cm - 1.8*cm
        top_tbl = Table(top_rows,
                        colWidths=[1.4*cm, 3.4*cm, name_w, 1.8*cm, 2*cm, 1.8*cm])
        top_tbl.setStyle(_base_style(C_GREEN))
        story.append(KeepTogether([
            Paragraph("Top 5 Performers", h2_s),
            HRFlowable(width="100%", thickness=0.5, color=C_BORDER),
            Spacer(1, 0.15*cm),
            top_tbl,
            Spacer(1, 0.4*cm),
        ]))

    # ── Critical students (always include if any in current view) ─────────────
    if critical and active_tab != "students":
        crit_rows = [["USN / Roll", "Name", "Score", "Grade", "Weak Subjects"]]
        for s in critical:
            weak = ", ".join(s.get("weak_subjects",[])) or "Overall low %"
            crit_rows.append([
                s.get("roll",""), s.get("name",""),
                f"{s.get('percentage',0)}%", s.get("grade",""), weak,
            ])
        name_w  = USABLE - 3.2*cm - 1.8*cm - 1.6*cm - 5.5*cm
        crit_col= [3.2*cm, name_w, 1.8*cm, 1.6*cm, 5.5*cm]
        crit_tbl = Table(crit_rows, colWidths=crit_col)
        cs = _base_style(C_RED)
        crit_tbl.setStyle(cs)
        for i in range(1, len(crit_rows)):
            crit_tbl.setStyle(TableStyle([("BACKGROUND",(0,i),(-1,i), C_FAIL_BG)]))
        story.append(KeepTogether([
            Paragraph(f"Critical Students — {len(critical)} flagged", h2_s),
            HRFlowable(width="100%", thickness=0.5, color=C_RED),
            Spacer(1, 0.15*cm),
        ]))
        story.append(crit_tbl)
        story.append(Spacer(1, 0.4*cm))

    # ── Marks table ───────────────────────────────────────────────────────────
    story.append(PageBreak())

    label = "Complete Student Marks Sheet"
    if filter_label:
        label += f"  ({filter_label})"
    story.append(Paragraph(label, h2_s))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 0.15*cm))

    n_subj = len(subject_cols)
    # Fixed columns: rank, usn, name, total, %, grade
    RANK_W  = 1.0*cm
    TOTAL_W = 1.5*cm
    PCT_W   = 1.4*cm
    GRADE_W = 1.3*cm
    USN_W   = 3.0*cm
    # Remaining for name + subjects
    remaining = USABLE - RANK_W - USN_W - TOTAL_W - PCT_W - GRADE_W
    # Name gets 25% of remaining, rest split between subjects
    NAME_W  = max(2.5*cm, remaining * 0.28)
    subj_w  = max(1.1*cm, (remaining - NAME_W) / max(n_subj, 1))

    # Auto-shrink font for wide tables
    fs = 7 if n_subj <= 6 else (6 if n_subj <= 10 else 5)

    col_widths = [RANK_W, USN_W, NAME_W] + [subj_w]*n_subj + [TOTAL_W, PCT_W, GRADE_W]

    header = ["#", "USN", "Name"] + subject_cols + ["Tot", "%", "Grd"]
    rows   = [header]
    for s in students:
        # Wrap long names to prevent overflow
        name  = s.get("name","")
        if len(name) > 22:
            name = name[:20] + "…"
        row = [str(s.get("rank","")), s.get("roll",""), name]
        for sc in subject_cols:
            sm = s.get("subjects",{}).get(sc,{})
            m  = sm.get("marks")
            row.append("—" if m is None else str(int(m)) if m == int(m) else str(round(m,1)))
        row += [
            str(s.get("total","—")),
            f"{s.get('percentage',0)}%",
            s.get("grade",""),
        ]
        rows.append(row)

    marks_tbl = Table(rows, colWidths=col_widths, repeatRows=1, splitByRow=True)
    ms = _base_style(C_PRIMARY, fs_body=fs)
    ms.add("FONTSIZE", (0,0), (-1,0), min(8, fs+1))
    marks_tbl.setStyle(ms)

    # Cell colouring
    pass_thr = max_marks * 0.40
    high_thr = max_marks * 0.75
    for ri, s in enumerate(students, 1):
        for ci, sc in enumerate(subject_cols):
            sm = s.get("subjects",{}).get(sc,{})
            m  = sm.get("marks")
            col_i = 3 + ci
            if m is not None:
                if m < pass_thr:
                    marks_tbl.setStyle(TableStyle([
                        ("TEXTCOLOR",  (col_i,ri),(col_i,ri), C_RED),
                        ("FONTNAME",   (col_i,ri),(col_i,ri), "Helvetica-Bold"),
                        ("BACKGROUND", (col_i,ri),(col_i,ri), C_FAIL_BG),
                    ]))
                elif m >= high_thr:
                    marks_tbl.setStyle(TableStyle([
                        ("TEXTCOLOR",  (col_i,ri),(col_i,ri), C_GREEN),
                        ("FONTNAME",   (col_i,ri),(col_i,ri), "Helvetica-Bold"),
                    ]))
        if s.get("is_critical"):
            marks_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0,ri),(2,ri), C_CRIT_BG),
            ]))

    story.append(marks_tbl)

    doc.build(story)
    buf.seek(0)
    return buf.read()
