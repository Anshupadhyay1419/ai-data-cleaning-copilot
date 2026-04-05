---
title: AI Data Cleaning Copilot Backend
emoji: 🧹
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# AI Data Cleaning Copilot — Backend

Unified FastAPI backend for numerical data cleaning and NLP codemix analysis.

## Endpoints

- `GET /` — health check
- `GET /health` — model readiness
- `GET /docs` — Swagger UI
- `POST /numerical/process` — numerical data cleaning
- `POST /categorical/process` — NLP codemix analysis
