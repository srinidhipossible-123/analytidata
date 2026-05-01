"""
student_analytics.py
Parse student mark-sheet DataFrames and produce rich analytics.

Expected sheet layout (auto-detected):
  Sl No | USN | Name | Subject1 | Subject2 | ... | [Total] | [Percentage]

Key fix: subject columns are ONLY those appearing AFTER the Name column.
Sl No / serial-number columns are explicitly excluded.
"""

import numpy as np
import pandas as pd

CRITICAL_THRESHOLD = 40   # % below which a student is flagged


# ── Grade mapping ─────────────────────────────────────────────────────────────
def _grade(pct: float) -> str:
    if pct >= 90:  return "O"
    if pct >= 80:  return "A+"
    if pct >= 70:  return "A"
    if pct >= 60:  return "B+"
    if pct >= 50:  return "B"
    if pct >= 40:  return "C"
    return "F"


def _grade_color(pct: float) -> str:
    if pct >= 75:  return "green"
    if pct >= 50:  return "yellow"
    if pct >= 40:  return "orange"
    return "red"


# ── Column detection ──────────────────────────────────────────────────────────
_SERIAL_KEYS = ["sl", "sl no", "slno", "s.no", "sno", "serial", "sr", "sr no", "srno", "#"]
_ROLL_KEYS   = ["usn", "roll", "reg no", "regno", "reg", "enroll", "id", "student id", "student_id"]
_NAME_KEYS   = ["name", "student name", "student_name"]
_TOTAL_KEYS  = ["total", "grand total", "tot", "marks obtained", "total marks"]
_PCT_KEYS    = ["percent", "percentage", "%", "pct"]


def _match(col_lower: str, keywords: list) -> bool:
    return any(col_lower == k or col_lower.startswith(k) for k in keywords)


def _detect_columns(df: pd.DataFrame):
    """
    Returns: (serial_col, roll_col, name_col, subject_cols, total_col, pct_col)

    Strategy:
      1. Find serial/roll/name/total/pct columns by name keywords.
      2. subject_cols = numeric columns that appear AFTER the name column
         in the original column order, excluding serial/total/pct cols.
    """
    cols = list(df.columns)
    cl   = {c: str(c).lower().strip() for c in cols}   # col → lower

    serial_col = next((c for c in cols if _match(cl[c], _SERIAL_KEYS)), None)
    roll_col   = next((c for c in cols if _match(cl[c], _ROLL_KEYS)),   None)
    name_col   = next((c for c in cols if _match(cl[c], _NAME_KEYS)),   None)
    total_col  = next((c for c in cols if _match(cl[c], _TOTAL_KEYS)),  None)
    pct_col    = next((c for c in cols if _match(cl[c], _PCT_KEYS)),    None)

    # Columns that are definitely NOT subject marks
    meta_cols = {c for c in [serial_col, roll_col, name_col, total_col, pct_col] if c}

    # Subject candidates: numeric columns AFTER the name column
    # If name_col not found, fall back to after roll_col, then after serial_col
    anchor = name_col or roll_col or serial_col
    if anchor:
        anchor_idx = cols.index(anchor)
        candidate_cols = cols[anchor_idx + 1:]
    else:
        candidate_cols = cols  # no anchor, consider all

    subject_cols = []
    for c in candidate_cols:
        if c in meta_cols:
            continue
        numeric_vals = pd.to_numeric(df[c], errors="coerce").dropna()
        # At least 30% of rows should be numeric (handles blank rows / merged cells)
        if len(numeric_vals) >= max(1, len(df) * 0.30):
            subject_cols.append(c)

    return serial_col, roll_col, name_col, subject_cols, total_col, pct_col


# ── Core analytics ────────────────────────────────────────────────────────────
def analyze_students(
    df: pd.DataFrame,
    section: str = "Section",
    exam_type: str = "Exam",
    max_marks: int = 100,
    critical_min_fails: int = 1,     # flag student if they failed >= this many subjects
) -> dict:
    """Returns the full analytics dict for a student mark sheet."""

    # ── Clean up ──────────────────────────────────────────────────────────────
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    # Drop completely empty rows
    df = df.dropna(how="all").reset_index(drop=True)

    # Drop rows where every column is the header text repeated (merged-cell artifacts)
    if len(df) > 0:
        first_col = df.columns[0]
        df = df[df[first_col].astype(str).str.lower() != str(first_col).lower()]
        df = df.reset_index(drop=True)

    serial_col, roll_col, name_col, subject_cols, total_col, pct_col = _detect_columns(df)

    if not subject_cols:
        raise ValueError(
            "No subject columns detected. Ensure the mark sheet has numeric subject columns "
            "after the Name column. Detected columns: " + ", ".join(df.columns.tolist())
        )

    # Convert subject columns to numeric
    for sc in subject_cols:
        df[sc] = pd.to_numeric(df[sc], errors="coerce")

    # Drop rows with no subject data at all (footer rows, blank rows)
    df = df.dropna(subset=subject_cols, how="all").reset_index(drop=True)

    # ── Compute totals / percentages ──────────────────────────────────────────
    if total_col and total_col in df.columns:
        df["__total"] = pd.to_numeric(df[total_col], errors="coerce")
    else:
        df["__total"] = df[subject_cols].sum(axis=1, skipna=True)

    if pct_col and pct_col in df.columns:
        df["__pct"] = pd.to_numeric(df[pct_col], errors="coerce")
    else:
        df["__pct"] = (df["__total"] / (len(subject_cols) * max_marks)) * 100

    df["__pct"]   = df["__pct"].clip(0, 100).round(2)
    df["__grade"] = df["__pct"].apply(_grade)

    total_students = len(df)

    # ── Subject-level stats ───────────────────────────────────────────────────
    subject_stats = {}
    for sc in subject_cols:
        vals = df[sc].dropna()
        if vals.empty:
            continue
        avg      = round(float(vals.mean()), 2)
        pass_thr = max_marks * 0.40
        pass_cnt = int((vals >= pass_thr).sum())
        subject_stats[sc] = {
            "avg":        avg,
            "max":        round(float(vals.max()), 2),
            "min":        round(float(vals.min()), 2),
            "pass_rate":  round(pass_cnt / len(vals) * 100, 1) if len(vals) else 0,
            "pass_count": pass_cnt,
            "fail_count": int(len(vals) - pass_cnt),
        }

    # ── Grade distribution ────────────────────────────────────────────────────
    grade_order = ["O", "A+", "A", "B+", "B", "C", "F"]
    grade_dist  = {g: int((df["__grade"] == g).sum()) for g in grade_order}

    # ── Class averages ────────────────────────────────────────────────────────
    class_avg_pct     = round(float(df["__pct"].mean()), 2)
    pass_all          = int((df["__pct"] >= CRITICAL_THRESHOLD).sum())
    overall_pass_rate = round(pass_all / total_students * 100, 1) if total_students else 0

    # ── Individual student records ────────────────────────────────────────────
    students = []
    for idx, row in df.iterrows():
        # Roll number: prefer USN/roll col; fall back to Sl No
        if roll_col and pd.notna(row.get(roll_col)):
            roll = str(row[roll_col]).strip()
        elif serial_col and pd.notna(row.get(serial_col)):
            roll = str(int(row[serial_col])) if str(row[serial_col]).replace('.','').isdigit() else str(row[serial_col]).strip()
        else:
            roll = str(idx + 1)

        # Name
        if name_col and pd.notna(row.get(name_col)):
            name = str(row[name_col]).strip()
        else:
            name = f"Student {idx + 1}"

        # Per-subject data
        subj_marks = {}
        for sc in subject_cols:
            val = row[sc]
            subj_marks[sc] = {
                "marks":  None  if pd.isna(val) else round(float(val), 1),
                "max":    max_marks,
                "pct":    None  if pd.isna(val) else round(float(val) / max_marks * 100, 1),
                "passed": False if pd.isna(val) else float(val) >= (max_marks * 0.40),
            }

        total = round(float(row["__total"]), 1) if not pd.isna(row["__total"]) else None
        pct   = round(float(row["__pct"]),   2) if not pd.isna(row["__pct"])   else 0.0
        grade = _grade(pct)
        color = _grade_color(pct)

        weak_subjects = [
            sc for sc in subject_cols
            if not pd.isna(row[sc]) and float(row[sc]) < (max_marks * 0.40)
        ]

        is_critical = len(weak_subjects) >= critical_min_fails

        students.append({
            "roll":          roll,
            "name":          name,
            "subjects":      subj_marks,
            "total":         total,
            "percentage":    pct,
            "grade":         grade,
            "grade_color":   color,
            "weak_subjects": weak_subjects,
            "is_critical":   is_critical,
        })

    # Sort by percentage descending
    students.sort(key=lambda x: x["percentage"], reverse=True)
    for i, s in enumerate(students):
        s["rank"] = i + 1

    # ── Topper / critical list ────────────────────────────────────────────────
    topper          = students[0] if students else None
    critical_students = [s for s in students if s["is_critical"]]
    top5            = students[:5]

    return {
        "section":               section,
        "exam_type":             exam_type,
        "total_students":        total_students,
        "subject_cols":          subject_cols,
        "subject_stats":         subject_stats,
        "class_avg_pct":         class_avg_pct,
        "overall_pass_rate":     overall_pass_rate,
        "grade_distribution":    grade_dist,
        "topper":                topper,
        "top5":                  top5,
        "critical_students":     critical_students,
        "students":              students,
        "critical_threshold":      CRITICAL_THRESHOLD,
        "critical_min_fails":      critical_min_fails,
        "max_marks_per_subject":   max_marks,
        # Debug info
        "_detected": {
            "serial_col":  serial_col,
            "roll_col":    roll_col,
            "name_col":    name_col,
            "subject_cols": subject_cols,
            "total_col":   total_col,
            "pct_col":     pct_col,
        },
    }
