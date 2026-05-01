"""
routers/admin.py — Admin-only endpoints:
  - Upload & push student mark sheet → saves PushedReport to MongoDB
  - List / delete pushed reports
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from bson import ObjectId
from models.mongo import get_db
from routers.auth import require_admin
from services.parser import parse_file
from services.student_analytics import analyze_students

router = APIRouter()


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")


# ── Preview sheet names only (no save) ───────────────────────────────────────
@router.post("/admin/sheets")
async def get_sheet_names_route(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    """Return the sheet names in an uploaded file without saving it."""
    contents = await file.read()
    from services.parser import get_sheet_names
    try:
        sheets = get_sheet_names(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"sheets": sheets, "filename": file.filename}


# ── Push a report ─────────────────────────────────────────────────────────────
@router.post("/admin/push-report", status_code=201)
async def push_report(
    file:          UploadFile = File(...),
    section:       str = Form(...),
    exam_type:     str = Form("IA-1"),
    academic_year: str = Form("2025-26"),
    max_marks:          int = Form(100),
    sheet_name:         str = Form(""),
    critical_min_fails: int = Form(1),           # ← flag if failed >= N subjects
    admin=Depends(require_admin),
):
    allowed = {"xlsx", "xls", "csv"}
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    # Parse all sheets, then pick the requested one
    dfs = parse_file(contents, file.filename)
    available = list(dfs.keys())

    # Use specified sheet or default to first
    chosen = sheet_name if sheet_name and sheet_name in dfs else available[0]
    df     = dfs[chosen]

    try:
        analytics = analyze_students(
            df, section=section, exam_type=exam_type,
            max_marks=max_marks, critical_min_fails=critical_min_fails,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Persist to MongoDB
    db  = get_db()
    doc = {
        "section":        section,
        "exam_type":      exam_type,
        "academic_year":  academic_year,
        "filename":       file.filename,
        "sheet_name":     chosen,
        "pushed_by":      str(admin["_id"]),
        "pushed_by_name": admin["username"],
        "pushed_at":      datetime.utcnow(),
        "analytics":      analytics,
    }
    result = await db.pushed_reports.insert_one(doc)

    return {
        "id":             str(result.inserted_id),
        "section":        section,
        "exam_type":      exam_type,
        "sheet_name":     chosen,
        "pushed_at":      doc["pushed_at"].isoformat(),
        "total_students": analytics["total_students"],
    }



# ── List all pushed reports ───────────────────────────────────────────────────
@router.get("/admin/reports")
async def list_reports(admin=Depends(require_admin)):
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
            "filename":       doc.get("filename", ""),
            "sheet_name":     doc.get("sheet_name", ""),
            "pushed_by_name": doc.get("pushed_by_name", ""),
            "pushed_at":      str(doc.get("pushed_at", "")),
            "total_students": a.get("total_students", 0),
            "class_avg_pct":  a.get("class_avg_pct", 0),
            "critical_count": len(a.get("critical_students", [])),
        })
    return reports


# ── Delete a pushed report ────────────────────────────────────────────────────
@router.delete("/admin/reports/{report_id}")
async def delete_report(report_id: str, admin=Depends(require_admin)):
    db  = get_db()
    res = await db.pushed_reports.delete_one({"_id": _oid(report_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted"}
