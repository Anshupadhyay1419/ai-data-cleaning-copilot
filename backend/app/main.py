import asyncio
import logging
import sys

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse

from app.routes.numerical import router as numerical_router
from app.routes.categorical import router as categorical_router
from app.utils.config import settings

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Data Cleaning Copilot",
    description="Unified backend for numerical data cleaning and NLP codemix analysis.",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url="/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(numerical_router, prefix="/numerical", tags=["numerical"])
app.include_router(categorical_router, prefix="/categorical", tags=["categorical"])

# ── Self-ping keep-alive (prevents HF Spaces from sleeping) ──────────────────
async def keep_alive():
    """Ping self every 4 minutes to prevent HF Spaces free tier sleep."""
    await asyncio.sleep(30)  # wait for full startup first
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get("http://localhost:7860/health")
                logger.debug("keep_alive ping sent")
        except Exception:
            pass  # silently ignore — app may be restarting
        await asyncio.sleep(240)  # ping every 4 minutes

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info(
        "🚀 AI Data Cleaning Copilot started [env=%s | log_level=%s]",
        settings.app_env,
        settings.log_level,
    )
    # Start keep-alive background task
    asyncio.create_task(keep_alive())

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return HTMLResponse(content="""
    <html><body style="font-family:sans-serif;padding:2rem;background:#f9f9f9">
    <h1>🧹 AI Data Cleaning Copilot</h1>
    <p>Backend is <strong style="color:green">running</strong>.</p>
    <ul>
      <li><a href="/docs">📖 Swagger UI (API Docs)</a></li>
      <li><a href="/health">❤️ Health Check</a></li>
      <li><a href="/redoc">📄 ReDoc</a></li>
    </ul>
    </body></html>
    """, status_code=200)

@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "app_env": settings.app_env,
        "models": {
            "codemix": bool(settings.hf_codemix_url and settings.hf_codemix_token),
            "english": bool(settings.hf_english_url and settings.hf_english_token),
            "fakenews": bool(settings.hf_fake_news_url and settings.hf_fake_news_token),
        },
    }

# ── Docs (CDN-based — fixes HF Spaces proxy issue) ────────────────────────────
@app.get("/docs", include_in_schema=False)
async def swagger_ui() -> HTMLResponse:
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="AI Data Cleaning Copilot — Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_ui() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="AI Data Cleaning Copilot — ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js",
    )

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=7860, reload=False)
