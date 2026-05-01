"""
routers/teacher.py — Teacher/Mentor view endpoints:
  - List all pushed reports
  - Get full detail of a pushed report
  - Get individual student detail
  - Download class report as PDF
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
import io
from models.mongo import get_db
from routers.auth import get_current_user

router = APIRouter()


def _require_staff(user=Depends(get_current_user)):
    """Allow teachers, mentors AND admins to view reports."""
    if user.get("role") not in ("teacher", "mentor", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return user


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")


# ── List all pushed reports (summary cards) ───────────────────────────────────
@router.get("/teacher/reports")
async def list_reports(user=Depends(_require_staff)):
    db     = get_db()
    cursor = db.pushed_reports.find({}).sort("pushed_at", -1)
    reports = []
    async for doc in cursor:
        a = doc.get("analytics", {})
        reports.append({
            "id":             str(doc["_id"]),
            "section":        doc.get("section", ""),
            "exam_type":      doc.get("exam_type", ""),
            "academic_year":  doc.get("academic_year", ""),
            "sheet_name":     doc.get("sheet_name", ""),
            "pushed_by_name": doc.get("pushed_by_name", ""),
            "pushed_at":      str(doc.get("pushed_at", "")),
            "total_students": a.get("total_students", 0),
            "class_avg_pct":  a.get("class_avg_pct", 0),
            "critical_count": len(a.get("critical_students", [])),
            "grade_distribution": a.get("grade_distribution", {}),
        })
    return reports


# ── Full report detail ────────────────────────────────────────────────────────
@router.get("/teacher/reports/{report_id}")
async def get_report(report_id: str, user=Depends(_require_staff)):
    db  = get_db()
    doc = await db.pushed_reports.find_one({"_id": _oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── Individual student detail ─────────────────────────────────────────────────
@router.get("/teacher/reports/{report_id}/student/{roll}")
async def get_student(report_id: str, roll: str, user=Depends(_require_staff)):
    db  = get_db()
    doc = await db.pushed_reports.find_one({"_id": _oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    analytics = doc.get("analytics", {})
    students  = analytics.get("students", [])
    student   = next((s for s in students if str(s.get("roll", "")).strip() == roll.strip()), None)
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{roll}' not found")

    return {
        **student,
        "section":       doc.get("section"),
        "exam_type":     doc.get("exam_type"),
        "academic_year": doc.get("academic_year"),
        "class_avg_pct": analytics.get("class_avg_pct"),
        "subject_stats": analytics.get("subject_stats", {}),
        "max_marks":     analytics.get("max_marks_per_subject", 100),
    }


# ── Download class report as PDF ─────────────────────────────────────────────
@router.get("/teacher/reports/{report_id}/pdf")
async def download_report_pdf(
    report_id:   str,
    active_tab:  str = "overview",   # overview | students | critical
    filter_type: str = "all",        # all | pass | fail | critical
    search_q:    str = "",
    sort_by:     str = "rank",       # rank | name | percentage | usn
    user=Depends(_require_staff),
):
    """
    Generate and stream a white-themed class performance PDF.
    Mirrors the current browser tab / filter / search / sort state.
    """
    db  = get_db()
    doc = await db.pushed_reports.find_one({"_id": _oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    doc["id"] = str(doc.pop("_id"))

    try:
        from services.report_pdf import generate_class_pdf
        pdf_bytes = generate_class_pdf(
            doc,
            active_tab=active_tab,
            filter_type=filter_type,
            search_q=search_q,
            sort_by=sort_by,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    section   = doc.get("section", "report").replace(" ", "_")
    exam_type = doc.get("exam_type", "").replace(" ", "-")
    filename  = f"Performance_{section}_{exam_type}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
