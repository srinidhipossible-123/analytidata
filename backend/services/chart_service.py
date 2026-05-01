import io
import json
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio
from plotly.utils import PlotlyJSONEncoder

DARK_TEMPLATE = "plotly_dark"
COLORS = px.colors.qualitative.Vivid

# Shared layout overrides for clean dark look
_BASE_LAYOUT = dict(
    paper_bgcolor="rgba(10,15,30,1)",
    plot_bgcolor="rgba(10,15,30,1)",
    font=dict(color="#94a3b8", family="Arial, sans-serif", size=12),
    margin=dict(t=60, b=50, l=50, r=30),
)


def _fig_to_dict(fig) -> dict:
    return json.loads(json.dumps(fig.to_dict(), cls=PlotlyJSONEncoder))


def _safe_numeric(df: pd.DataFrame, cols: list[str]) -> list[str]:
    """Return only numeric cols that have at least 2 non-null values."""
    result = []
    for c in cols:
        if c in df.columns:
            s = pd.to_numeric(df[c], errors="coerce").dropna()
            if len(s) >= 2:
                result.append(c)
    return result


def _clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy with infinite values replaced by NaN."""
    return df.replace([np.inf, -np.inf], np.nan)


def _build_figures(df: pd.DataFrame, stats: dict) -> list:
    """Return list of (fig, type_str, title_str) tuples.
    Each figure is only appended when enough valid data exists.
    """
    df = _clean_df(df)
    figs = []
    col_types    = {c: s["type"] for c, s in stats.get("columns", {}).items()}
    numeric_cols = _safe_numeric(df, [c for c, t in col_types.items() if t == "numeric"])
    cat_cols     = [c for c, t in col_types.items() if t == "categorical" and c in df.columns]

    # ── 1. Bar chart ────────────────────────────────────────────────────────
    if cat_cols and numeric_cols:
        try:
            cc, nc = cat_cols[0], numeric_cols[0]
            top     = df[cc].value_counts().head(15).index
            grouped = (
                df[df[cc].isin(top)]
                .groupby(cc, as_index=False)[nc]
                .mean()
                .dropna(subset=[nc])
            )
            if not grouped.empty:
                fig = px.bar(grouped, x=cc, y=nc,
                             title=f"Avg {nc} by {cc}",
                             template=DARK_TEMPLATE, color=nc,
                             color_continuous_scale="Viridis")
                fig.update_layout(**_BASE_LAYOUT)
                figs.append((fig, "bar", f"Avg {nc} by {cc}"))
        except Exception as e:
            print(f"[WARN] Bar chart: {e}")

    # ── 2. Line chart ────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            line_cols = numeric_cols[:3]
            tmp = df[line_cols].copy().reset_index()
            tmp.columns = ["index"] + line_cols
            tmp = tmp.dropna(subset=line_cols, how="all")
            if len(tmp) >= 2:
                fig = px.line(tmp, x="index", y=line_cols,
                              title="Trend Over Records",
                              template=DARK_TEMPLATE,
                              color_discrete_sequence=COLORS)
                fig.update_layout(**_BASE_LAYOUT)
                figs.append((fig, "line", "Trend Analysis"))
        except Exception as e:
            print(f"[WARN] Line chart: {e}")

    # ── 3. Pie chart ─────────────────────────────────────────────────────────
    if cat_cols:
        try:
            cc       = cat_cols[0]
            pie_data = df[cc].dropna().value_counts().head(10)
            if len(pie_data) >= 2:
                fig = px.pie(values=pie_data.values,
                             names=pie_data.index.astype(str),
                             title=f"{cc} Distribution",
                             template=DARK_TEMPLATE,
                             color_discrete_sequence=px.colors.sequential.Plasma_r)
                fig.update_layout(
                    paper_bgcolor="rgba(10,15,30,1)",
                    font=dict(color="#94a3b8", family="Arial, sans-serif", size=12),
                    margin=dict(t=60, b=20, l=20, r=20),
                )
                figs.append((fig, "pie", f"{cc} Distribution"))
        except Exception as e:
            print(f"[WARN] Pie chart: {e}")

    # ── 4. Histogram ─────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            nc  = numeric_cols[0]
            col = df[nc].dropna()
            if len(col) >= 5:
                fig = px.histogram(col.to_frame(), x=nc, nbins=30,
                                   title=f"{nc} Distribution",
                                   template=DARK_TEMPLATE,
                                   color_discrete_sequence=["#3b82f6"])
                fig.update_layout(**_BASE_LAYOUT)
                figs.append((fig, "histogram", f"{nc} Distribution"))
        except Exception as e:
            print(f"[WARN] Histogram: {e}")

    # ── 5. Correlation heatmap ───────────────────────────────────────────────
    if len(numeric_cols) > 1:
        try:
            corr = df[numeric_cols].corr(numeric_only=True).round(2)
            # Drop rows/cols that are all-NaN
            corr = corr.dropna(axis=0, how="all").dropna(axis=1, how="all")
            if corr.shape[0] >= 2:
                fig = px.imshow(corr, text_auto=True,
                                title="Correlation Heatmap",
                                template=DARK_TEMPLATE,
                                color_continuous_scale="RdBu_r",
                                aspect="auto")
                fig.update_layout(
                    paper_bgcolor="rgba(10,15,30,1)",
                    plot_bgcolor="rgba(10,15,30,1)",
                    font=dict(color="#94a3b8", family="Arial, sans-serif", size=11),
                    margin=dict(t=60, b=50, l=80, r=30),
                )
                figs.append((fig, "heatmap", "Correlation Matrix"))
        except Exception as e:
            print(f"[WARN] Heatmap: {e}")

    # ── 6. Box plot ──────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            box_cols = numeric_cols[:5]
            melted   = df[box_cols].melt(var_name="Column", value_name="Value").dropna()
            if len(melted) >= 4:
                fig = px.box(melted, x="Column", y="Value",
                             title="Outlier Detection (Box Plot)",
                             template=DARK_TEMPLATE,
                             color="Column",
                             color_discrete_sequence=COLORS)
                fig.update_layout(**_BASE_LAYOUT, showlegend=False)
                figs.append((fig, "box", "Outlier Detection"))
        except Exception as e:
            print(f"[WARN] Box plot: {e}")

    # ── 7. Scatter plot ──────────────────────────────────────────────────────
    if len(numeric_cols) >= 2:
        try:
            x_col, y_col = numeric_cols[0], numeric_cols[1]
            color_col    = cat_cols[0] if cat_cols else None
            tmp = df[[x_col, y_col] + ([color_col] if color_col else [])].dropna()
            if len(tmp) >= 2:
                fig = px.scatter(tmp, x=x_col, y=y_col, color=color_col,
                                 title=f"{x_col} vs {y_col}",
                                 template=DARK_TEMPLATE,
                                 color_discrete_sequence=COLORS,
                                 opacity=0.75)
                fig.update_layout(**_BASE_LAYOUT)
                figs.append((fig, "scatter", f"{x_col} vs {y_col}"))
        except Exception as e:
            print(f"[WARN] Scatter: {e}")

    return figs


def generate_all_charts(df: pd.DataFrame, stats: dict) -> list:
    """Return JSON-serializable chart list for the frontend."""
    result = []
    for fig, chart_type, title in _build_figures(df, stats):
        result.append({
            "type":  chart_type,
            "title": title,
            "data":  _fig_to_dict(fig),
        })
    return result


def generate_chart_images(df: pd.DataFrame, stats: dict) -> list:
    """Render each chart to PNG bytes for PDF embedding.
    Returns list of {"title": str, "type": str, "png": bytes}.
    """
    images = []
    for fig, chart_type, title in _build_figures(df, stats):
        try:
            png_bytes = pio.to_image(
                fig,
                format="png",
                width=900,
                height=450,
                scale=1.5,
                engine="kaleido",
            )
            images.append({"title": title, "type": chart_type, "png": png_bytes})
        except Exception as exc:
            print(f"[WARN] Could not render chart '{title}': {exc}")
    return images
