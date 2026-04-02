# AI Data Cleaning Copilot + Code-Mix NLP Suite

A production-grade, two-mode web application for advanced data cleaning and NLP analysis.

## Setup Instructions

### 1. Start the Backend
`cd /app/backend`
`pip install -r requirements.txt`
`uvicorn main:app --reload --port 8000`
*The backend will automatically load the NLP models directly via models1.py.*

### 2. Start the Frontend
Open another terminal:
`cd /app/frontend`
`npm install`
`npm run dev`

### Switching Modes
Use the toggle at the top of the app to switch between:
- Normal Data Cleaning
- Code-Mix NLP Analysis

## Vercel Deployment

The repository is now configured so the whole project can be deployed as one Vercel app:

- The frontend builds from `frontend/` and is served as the SPA.
- The FastAPI backend is exposed through `api/index.py`.
- Client code uses `/api` in production, so the deployed frontend talks to the deployed backend on the same origin.

Deploy from the repository root in Vercel. If you deploy only the frontend folder, use the config in `frontend/vercel.json` instead.
