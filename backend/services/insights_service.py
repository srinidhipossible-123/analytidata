import os, json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def _build_prompt(stats: dict, columns: list, filename: str) -> str:
    shape = stats.get("shape", {})
    missing_summary = [
        f"{col}: {v['percentage']}% missing"
        for col, v in stats.get("missing", {}).items()
        if v["percentage"] > 0
    ]
    numeric_summary = []
    for col, s in stats.get("columns", {}).items():
        if s["type"] == "numeric":
            numeric_summary.append(
                f"{col} — mean={s['mean']}, std={s['std']}, min={s['min']}, max={s['max']}, outliers={stats['outliers'].get(col, {}).get('percentage', 0)}%"
            )

    corr_pairs = []
    corr = stats.get("correlation", {})
    seen = set()
    for c1 in corr:
        for c2, val in corr[c1].items():
            if c1 != c2 and (c2, c1) not in seen:
                seen.add((c1, c2))
                if abs(val) > 0.6:
                    corr_pairs.append(f"{c1} & {c2}: r={val}")

    prompt = f"""You are an expert data analyst. Analyze this dataset and generate 6 key insights.

File: {filename}
Shape: {shape.get('rows', 0)} rows × {shape.get('cols', 0)} columns
Columns: {', '.join(columns)}

Numeric Statistics:
{chr(10).join(numeric_summary) if numeric_summary else 'No numeric columns'}

Missing Data:
{chr(10).join(missing_summary) if missing_summary else 'No missing values'}

Strong Correlations (|r| > 0.6):
{chr(10).join(corr_pairs) if corr_pairs else 'None detected'}

Return ONLY a valid JSON array (no markdown, no explanation) with exactly this structure:
[
  {{
    "title": "Short title (max 6 words)",
    "insight": "One or two sentence explanation with specific numbers.",
    "type": "trend|anomaly|correlation|summary|recommendation",
    "severity": "info|warning|success"
  }}
]"""
    return prompt


def generate_insights(stats: dict, columns: list, filename: str) -> list:
    prompt = _build_prompt(stats, columns, filename)
    try:
        response = _client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        return [
            {
                "title": "Dataset Overview",
                "insight": f"Dataset has {stats['shape']['rows']} rows and {stats['shape']['cols']} columns.",
                "type": "summary",
                "severity": "info",
            },
            {
                "title": "Insight Generation Note",
                "insight": f"Could not generate AI insights: {str(e)}",
                "type": "summary",
                "severity": "warning",
            },
        ]
