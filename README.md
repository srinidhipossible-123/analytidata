# DataLens AI

A full-stack, AI-powered Excel & CSV analytics platform.

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Architecture

```
backend/   FastAPI + Motor + Pandas + Plotly + Groq
frontend/  React + Vite + Tailwind + Framer Motion + Plotly.js
MongoDB    Atlas cloud database
```

## Features

- 📂 Drag & Drop Excel/CSV upload (multi-sheet)
- 📊 Auto statistical analysis (mean, std, outliers, correlations)
- 📈 7 interactive Plotly charts (bar, line, pie, histogram, heatmap, box, scatter)
- 🤖 Groq LLM AI insights
- ⚙️ SQL-style custom query builder
- 📑 PDF + Excel export
- 🔐 JWT authentication
- 🌙 Dark/Light mode

## Environment Variables

`backend/.env` is pre-configured with your credentials.
