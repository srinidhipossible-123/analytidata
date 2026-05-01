"""
pdf_charts.py — Matplotlib-based chart renderer for PDF export.

Replaces kaleido/Plotly rendering which hangs on Windows.
Generates the same 7 chart types as chart_service.py but as PNG bytes
via matplotlib (Agg backend, no display required).
"""

import io
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # non-interactive, no display needed
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from matplotlib.colors import to_rgba

warnings.filterwarnings("ignore")

# ── Dark theme matching the dashboard ─────────────────────────────────────────
BG       = "#0a0f1e"
GRID     = "#1e293b"
TEXT     = "#94a3b8"
ACCENT   = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#ec4899",
             "#f59e0b", "#ef4444", "#14b8a6", "#a78bfa", "#fb923c"]

def _apply_dark(ax, fig):
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.tick_params(colors=TEXT, labelsize=8)
    ax.xaxis.label.set_color(TEXT)
    ax.yaxis.label.set_color(TEXT)
    ax.title.set_color("#e2e8f0")
    for spine in ax.spines.values():
        spine.set_edgecolor(GRID)
    ax.grid(True, color=GRID, linewidth=0.5, alpha=0.6)
    ax.set_axisbelow(True)


def _savefig(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight",
                facecolor=BG, edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _safe_numeric(df: pd.DataFrame, cols: list) -> list:
    result = []
    for c in cols:
        if c in df.columns:
            s = pd.to_numeric(df[c], errors="coerce").dropna()
            if len(s) >= 2:
                result.append(c)
    return result


def generate_pdf_charts(df: pd.DataFrame, stats: dict) -> list:
    """
    Return list of {"title": str, "type": str, "png": bytes} for each chart.
    All rendering is done synchronously with Matplotlib — no kaleido required.
    """
    df = df.replace([np.inf, -np.inf], np.nan)
    col_types    = {c: s["type"] for c, s in stats.get("columns", {}).items()}
    numeric_cols = _safe_numeric(df, [c for c, t in col_types.items() if t == "numeric"])
    cat_cols     = [c for c, t in col_types.items()
                    if t == "categorical" and c in df.columns]

    charts = []

    # ── 1. Bar chart ──────────────────────────────────────────────────────────
    if cat_cols and numeric_cols:
        try:
            cc, nc = cat_cols[0], numeric_cols[0]
            top     = df[cc].value_counts().head(15).index
            grouped = (df[df[cc].isin(top)]
                       .groupby(cc, as_index=False)[nc]
                       .mean()
                       .dropna(subset=[nc])
                       .sort_values(nc, ascending=False))
            if not grouped.empty:
                fig, ax = plt.subplots(figsize=(9, 4))
                colors  = [ACCENT[i % len(ACCENT)] for i in range(len(grouped))]
                ax.bar(range(len(grouped)), grouped[nc].values, color=colors, edgecolor="none")
                ax.set_xticks(range(len(grouped)))
                ax.set_xticklabels(grouped[cc].astype(str).values,
                                   rotation=30, ha="right", fontsize=7)
                ax.set_title(f"Average {nc} by {cc}", fontsize=11, fontweight="bold", pad=10)
                ax.set_ylabel(nc, fontsize=9)
                _apply_dark(ax, fig)
                charts.append({"type": "bar", "title": f"Avg {nc} by {cc}", "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Bar chart: {e}")

    # ── 2. Line chart ─────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            line_cols = numeric_cols[:4]
            tmp = df[line_cols].reset_index(drop=True)
            tmp = tmp.dropna(how="all")
            if len(tmp) >= 2:
                fig, ax = plt.subplots(figsize=(9, 4))
                for i, col in enumerate(line_cols):
                    vals = pd.to_numeric(tmp[col], errors="coerce")
                    ax.plot(vals.index, vals.values,
                            color=ACCENT[i % len(ACCENT)],
                            linewidth=1.5, label=col, alpha=0.9)
                ax.set_title("Trend Over Records", fontsize=11, fontweight="bold", pad=10)
                ax.set_xlabel("Record Index", fontsize=9)
                ax.legend(fontsize=8, facecolor=GRID, edgecolor="none",
                          labelcolor=TEXT)
                _apply_dark(ax, fig)
                charts.append({"type": "line", "title": "Trend Analysis", "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Line chart: {e}")

    # ── 3. Pie chart ──────────────────────────────────────────────────────────
    if cat_cols:
        try:
            cc       = cat_cols[0]
            pie_data = df[cc].dropna().value_counts().head(10)
            if len(pie_data) >= 2:
                fig, ax = plt.subplots(figsize=(7, 5))
                fig.patch.set_facecolor(BG)
                ax.set_facecolor(BG)
                colors_pie = [ACCENT[i % len(ACCENT)] for i in range(len(pie_data))]
                wedges, texts, autotexts = ax.pie(
                    pie_data.values,
                    labels=pie_data.index.astype(str),
                    autopct="%1.1f%%",
                    colors=colors_pie,
                    startangle=140,
                    pctdistance=0.82,
                    wedgeprops={"edgecolor": BG, "linewidth": 1.5},
                )
                for t in texts:
                    t.set_color(TEXT); t.set_fontsize(8)
                for at in autotexts:
                    at.set_color("#e2e8f0"); at.set_fontsize(7)
                ax.set_title(f"{cc} Distribution", fontsize=11,
                             fontweight="bold", color="#e2e8f0", pad=12)
                charts.append({"type": "pie", "title": f"{cc} Distribution", "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Pie chart: {e}")

    # ── 4. Histogram ─────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            nc  = numeric_cols[0]
            col = pd.to_numeric(df[nc], errors="coerce").dropna()
            if len(col) >= 5:
                fig, ax = plt.subplots(figsize=(9, 4))
                ax.hist(col.values, bins=30, color=ACCENT[0], edgecolor=BG,
                        linewidth=0.4, alpha=0.9)
                ax.set_title(f"{nc} — Frequency Distribution",
                             fontsize=11, fontweight="bold", pad=10)
                ax.set_xlabel(nc, fontsize=9)
                ax.set_ylabel("Count", fontsize=9)
                _apply_dark(ax, fig)
                charts.append({"type": "histogram",
                                "title": f"{nc} Distribution",
                                "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Histogram: {e}")

    # ── 5. Correlation heatmap ────────────────────────────────────────────────
    if len(numeric_cols) > 1:
        try:
            corr = df[numeric_cols].apply(pd.to_numeric, errors="coerce").corr().round(2)
            corr = corr.dropna(axis=0, how="all").dropna(axis=1, how="all")
            n    = len(corr)
            if n >= 2:
                fig_h = max(4, n * 0.55)
                fig_w = max(5, n * 0.75)
                fig, ax = plt.subplots(figsize=(fig_w, fig_h))
                cmap = plt.get_cmap("RdBu_r")
                im   = ax.imshow(corr.values, cmap=cmap, vmin=-1, vmax=1, aspect="auto")

                # Annotate cells
                for i in range(n):
                    for j in range(n):
                        val = corr.values[i, j]
                        if not np.isnan(val):
                            ax.text(j, i, f"{val:.2f}",
                                    ha="center", va="center",
                                    fontsize=max(6, 9 - n // 3),
                                    color="white" if abs(val) > 0.4 else TEXT)

                ax.set_xticks(range(n))
                ax.set_yticks(range(n))
                ax.set_xticklabels(corr.columns, rotation=30, ha="right", fontsize=7)
                ax.set_yticklabels(corr.index, fontsize=7)
                ax.set_title("Correlation Matrix", fontsize=11, fontweight="bold", pad=10)

                cbar = fig.colorbar(im, ax=ax, shrink=0.8)
                cbar.ax.tick_params(colors=TEXT, labelsize=7)
                cbar.outline.set_edgecolor(GRID)

                fig.patch.set_facecolor(BG)
                ax.set_facecolor(BG)
                ax.tick_params(colors=TEXT)
                for spine in ax.spines.values():
                    spine.set_edgecolor(GRID)

                charts.append({"type": "heatmap",
                                "title": "Correlation Matrix",
                                "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Heatmap: {e}")

    # ── 6. Box plot ───────────────────────────────────────────────────────────
    if numeric_cols:
        try:
            box_cols = numeric_cols[:6]
            data     = [pd.to_numeric(df[c], errors="coerce").dropna().values
                        for c in box_cols]
            data     = [d for d in data if len(d) >= 2]
            if data:
                fig, ax = plt.subplots(figsize=(9, 4))
                bp = ax.boxplot(
                    data,
                    patch_artist=True,
                    medianprops={"color": "#e2e8f0", "linewidth": 2},
                    whiskerprops={"color": TEXT},
                    capprops={"color": TEXT},
                    flierprops={"marker": ".", "color": TEXT,
                                "markersize": 3, "alpha": 0.5},
                )
                for patch, color in zip(bp["boxes"], ACCENT):
                    patch.set_facecolor(color)
                    patch.set_alpha(0.75)
                    patch.set_edgecolor("none")

                ax.set_xticks(range(1, len(box_cols) + 1))
                ax.set_xticklabels(box_cols[:len(data)],
                                   rotation=20, ha="right", fontsize=7)
                ax.set_title("Outlier Detection — Box Plot",
                             fontsize=11, fontweight="bold", pad=10)
                ax.set_ylabel("Value", fontsize=9)
                _apply_dark(ax, fig)
                charts.append({"type": "box", "title": "Outlier Detection", "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Box plot: {e}")

    # ── 7. Scatter plot ───────────────────────────────────────────────────────
    if len(numeric_cols) >= 2:
        try:
            x_col, y_col = numeric_cols[0], numeric_cols[1]
            tmp = pd.DataFrame({
                x_col: pd.to_numeric(df[x_col], errors="coerce"),
                y_col: pd.to_numeric(df[y_col], errors="coerce"),
            }).dropna()

            if len(tmp) >= 2:
                fig, ax = plt.subplots(figsize=(9, 4))

                if cat_cols and cat_cols[0] in df.columns:
                    cc       = cat_cols[0]
                    cats     = df.loc[tmp.index, cc].fillna("N/A")
                    uniq     = cats.unique()[:10]
                    for i, cat in enumerate(uniq):
                        mask = cats == cat
                        ax.scatter(tmp.loc[mask, x_col], tmp.loc[mask, y_col],
                                   color=ACCENT[i % len(ACCENT)],
                                   alpha=0.65, s=20, edgecolors="none",
                                   label=str(cat))
                    ax.legend(fontsize=7, facecolor=GRID, edgecolor="none",
                              labelcolor=TEXT, markerscale=1.5)
                else:
                    ax.scatter(tmp[x_col], tmp[y_col],
                               color=ACCENT[0], alpha=0.65, s=20, edgecolors="none")

                ax.set_title(f"{x_col} vs {y_col}",
                             fontsize=11, fontweight="bold", pad=10)
                ax.set_xlabel(x_col, fontsize=9)
                ax.set_ylabel(y_col, fontsize=9)
                _apply_dark(ax, fig)
                charts.append({"type": "scatter",
                                "title": f"{x_col} vs {y_col}",
                                "png": _savefig(fig)})
        except Exception as e:
            print(f"[WARN] Scatter: {e}")

    return charts
