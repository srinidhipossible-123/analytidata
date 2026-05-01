# AnalytiData is a modern, user-friendly data analysis platform designed to simplify the process of extracting insights from raw datasets. Built for students and academic environments, it enables users to upload, visualize, and analyze data efficiently with customizable features and an intuitive interface. AI — Full-Stack Excel Analytics Platform

## Overview

Build **AnalytiData**, a next-generation full-stack web application for intelligent Excel/CSV analysis. Users drag-and-drop files, get automatic statistical summaries, interactive Plotly charts, a custom query builder, and AI-generated textual insights — all wrapped in a stunning glassmorphism SaaS dashboard.

---

## Project Structure

```
d:\semester_6\analysis page\
├── backend\                  # Python FastAPI backend
│   ├── main.py               # FastAPI app entry point
│   ├── routers\
│   │   ├── upload.py         # File upload & sheet parsing
│   │   ├── analysis.py       # Statistical analysis endpoints
│   │   ├── charts.py         # Plotly chart generation
│   │   ├── custom.py         # Custom query builder
│   │   ├── export.py         # PDF/Excel export
│   │   └── insights.py       # AI textual insights
│   ├── services\
│   │   ├── parser.py         # Pandas parsing logic
│   │   ├── stats.py          # NumPy statistics engine
│   │   ├── insights.py       # Pattern/anomaly detection
│   │   └── exporter.py       # Report generation
│   ├── models\
│   │   └── mongo.py          # MongoDB models (files, history)
│   ├── requirements.txt
│   └── .env
│
├── frontend\                 # React + Vite + Tailwind
│   ├── src\
│   │   ├── pages\
│   │   │   ├── Landing.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CustomAnalysis.jsx
│   │   │   └── Report.jsx
│   │   ├── components\
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── FileDropZone.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   ├── QueryBuilder.jsx
│   │   │   ├── InsightPanel.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context\
│   │   │   ├── ThemeContext.jsx
│   │   │   └── DataContext.jsx
│   │   ├── hooks\
│   │   │   └── useAnalysis.js
│   │   ├── api\
│   │   │   └── client.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── IA analysis - IA -1.xlsx  # Sample dataset (already present)
└── README.md
```

---

## Backend Design (FastAPI)

### Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload` | Upload Excel/CSV, parse sheets, store in MongoDB |
| GET | `/api/files` | List uploaded files |
| GET | `/api/files/{id}/sheets` | Get sheet names |
| POST | `/api/analysis/{id}` | Run statistical analysis on a sheet |
| POST | `/api/charts/{id}` | Generate Plotly chart JSON |
| POST | `/api/custom/{id}` | Run custom query (filter, group, aggregate) |
| POST | `/api/export/{id}` | Export PDF/Excel report |
| GET | `/api/insights/{id}` | Get AI-generated textual insights |

### Statistical Analysis Engine
- **Column type detection**: numeric, categorical, datetime
- **Numeric stats**: mean, median, mode, std, min, max, quartiles, skewness, kurtosis
- **Categorical stats**: unique count, top values, frequency distribution
- **Missing values**: count & percentage per column
- **Correlation matrix** (numeric columns)
- **Outlier detection** using IQR method
- **Trend detection** for time-series columns

### AI Insights Engine
- Rule-based pattern detection (no external LLM required)
- Detects: top performing categories, growth trends, anomalous spikes, highly correlated pairs
- Generates natural language sentences per detected pattern

### Chart Generation (Plotly)
- Bar chart (categorical vs numeric)
- Line chart (index/date vs numeric)
- Pie chart (categorical proportions)
- Histogram (numeric distribution)
- Heatmap (correlation matrix)
- Box plot (outlier visualization)
- Returns JSON-serializable Plotly figure data

### MongoDB Collections
- `files`: `{_id, filename, original_name, sheets, upload_time, size}`
- `analyses`: `{_id, file_id, sheet, stats, insights, created_at}`

---

## Frontend Design (React + Vite + Tailwind + Framer Motion)

### Design System
- **Dark mode default**, smooth light mode toggle
- **Color palette**: Deep navy `#0a0f1e` background, electric blue `#3b82f6` accent, violet `#8b5cf6` secondary
- **Glassmorphism**: `backdrop-blur`, semi-transparent cards with border glow
- **Typography**: Inter (Google Fonts)
- **Animations**: Framer Motion page transitions, staggered card reveals, animated number counters
- **Charts**: `react-plotly.js` for interactive Plotly charts

### Pages

#### 1. Landing Page
- Hero section with animated gradient orbs
- Feature cards with hover float effect
- Animated "Get Started" CTA
- Stats counter section

#### 2. Upload Page
- Full-screen drag & drop zone with particle animation
- File preview with sheet tabs
- Paginated data table preview
- "Analyze Now" button triggers analysis

#### 3. Dashboard Page (Main)
- Left sidebar with navigation icons
- Top: Dataset summary cards (rows, columns, missing %, etc.)
- Center: Auto-generated charts grid (2×3 layout)
- Right: AI Insights panel with animated text reveal
- Column stats accordion (expandable per column)
- Correlation heatmap

#### 4. Custom Analysis Builder
- Drag-and-drop column selector
- Operation picker (sum, avg, count, min, max, group by)
- SQL-style filter builder (column, operator, value)
- Live result preview table
- "Add to Dashboard" feature

#### 5. Report Page
- Full analysis summary
- All charts in printable layout
- Export as PDF button
- Export as Excel button

### Key Components
- **FileDropZone**: Animated drop zone with file type validation
- **DataTable**: Virtualized table with sorting/pagination, colored cells for outliers
- **StatCard**: Glassmorphism card with animated number reveal
- **ChartCard**: Plotly chart with loading skeleton + zoom/pan controls
- **QueryBuilder**: Dynamic row-based filter/operation builder
- **InsightPanel**: Floating panel with typewriter-effect insight text
- **ThemeToggle**: Smooth sun/moon toggle with CSS transition

---

## Key Libraries

### Backend
```
fastapi==0.111.0
uvicorn==0.29.0
python-multipart==0.0.9
pandas==2.2.2
numpy==1.26.4
openpyxl==3.1.2
plotly==5.22.0
pymongo==4.7.2
motor==3.4.0           # Async MongoDB
python-dotenv==1.0.1
reportlab==4.2.0       # PDF generation
xlsxwriter==3.2.0      # Excel export
scipy==1.13.0          # Advanced stats
```

### Frontend
```json
{
  "react": "^18",
  "react-router-dom": "^6",
  "framer-motion": "^11",
  "react-plotly.js": "^2",
  "plotly.js": "^2",
  "axios": "^1",
  "@heroicons/react": "^2",
  "react-dropzone": "^14",
  "react-hot-toast": "^2",
  "react-virtualized": "^9"
}
```

---

## Open Questions

> [!IMPORTANT]
> **MongoDB**: Do you have MongoDB running locally, or should I use MongoDB Atlas? Alternatively, I can use SQLite/JSON file storage if MongoDB isn't available.

> [!IMPORTANT]
> **AI Insights**: The plan uses rule-based insights (no API key needed). Should I integrate an actual LLM (OpenAI/Gemini API) for richer insights, or is rule-based sufficient?

> [!NOTE]
> **Auth System**: The user system (login/signup) is marked optional. I'll skip it unless you'd like it included to keep scope manageable.

> [!NOTE]
> **Sample Data**: The workspace already contains `IA analysis - IA -1.xlsx` which I'll use as the built-in sample dataset.

---

## Verification Plan

### Automated
- Start backend: `uvicorn main:app --reload` → verify all routes return 200
- Upload sample XLSX → verify sheet parsing, stats, charts
- Run frontend: `npm run dev` → verify all pages render

### Browser Testing
- Upload flow: drag file → preview → analyze
- Dashboard: verify charts render, insights appear
- Custom builder: create filter, run query, view result
- Export: download PDF and Excel

### Manual
- Test dark/light mode toggle
- Verify mobile responsiveness
- Test with CSV + multi-sheet XLSX
