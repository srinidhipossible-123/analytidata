import os, uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from models.mongo import get_db
from routers.auth import get_current_user
from services.parser import parse_file, df_to_records, get_sheet_names
from bson import ObjectId

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory cache: {file_id: {sheet_name: DataFrame}}
_df_cache: dict = {}


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file ID")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    allowed = {"xlsx", "xls", "csv"}
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not supported")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}.{ext}"
    save_path = os.path.join(UPLOAD_DIR, saved_name)
    with open(save_path, "wb") as f:
        f.write(contents)

    sheets = get_sheet_names(contents, file.filename)
    parsed = parse_file(contents, file.filename)
    _df_cache[file_id] = parsed

    db = get_db()
    doc = {
        "file_id":       file_id,
        "original_name": file.filename,
        "saved_path":    save_path,
        "sheets":        sheets,
        "size_bytes":    len(contents),
        "user_id":       str(current_user["_id"]),
        "upload_time":   datetime.utcnow(),
    }
    await db.files.insert_one(doc)

    return {
        "file_id":  file_id,
        "filename": file.filename,
        "sheets":   sheets,
        "size":     len(contents),
    }


@router.get("/files")
async def list_files(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.files.find({"user_id": str(current_user["_id"])}).sort("upload_time", -1).limit(50)
    files = []
    async for doc in cursor:
        files.append({
            "file_id":       doc["file_id"],
            "filename":      doc["original_name"],
            "sheets":        doc.get("sheets", []),
            "size":          doc.get("size_bytes", 0),
            "upload_time":   str(doc.get("upload_time", "")),
        })
    return files


@router.get("/files/{file_id}/preview")
async def preview_file(
    file_id: str,
    sheet: str = Query("Sheet1"),
    current_user=Depends(get_current_user),
):
    dfs = await _get_cached_dfs(file_id, current_user)
    if sheet not in dfs:
        raise HTTPException(status_code=404, detail=f"Sheet '{sheet}' not found")
    return df_to_records(dfs[sheet])


@router.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    doc = await db.files.find_one({"file_id": file_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        os.remove(doc["saved_path"])
    except FileNotFoundError:
        pass
    await db.files.delete_one({"file_id": file_id})
    _df_cache.pop(file_id, None)
    return {"message": "File deleted"}


async def _get_cached_dfs(file_id: str, current_user) -> dict:
    if file_id in _df_cache:
        return _df_cache[file_id]
    db = get_db()
    doc = await db.files.find_one({"file_id": file_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    with open(doc["saved_path"], "rb") as f:
        contents = f.read()
    dfs = parse_file(contents, doc["original_name"])
    _df_cache[file_id] = dfs
    return dfs


# Export helper for other routers
async def get_df(file_id: str, sheet: str, current_user) -> "pd.DataFrame":
    dfs = await _get_cached_dfs(file_id, current_user)
    if sheet not in dfs:
        raise HTTPException(status_code=404, detail=f"Sheet '{sheet}' not found")
    return dfs[sheet]
