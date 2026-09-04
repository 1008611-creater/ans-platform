from dotenv import load_dotenv

load_dotenv()

import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routes import animate, combine, files, folders, image_to_video, merge, metadata
from app.routes import loop, transitions, upload
from app.utils.cleanup import OUTPUTS_DIR
from app.utils.folders import FOLDERS_DIR

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(title="ChromaFFmpeg API", version="1.0.0")

app.include_router(merge.router)
app.include_router(animate.router)
app.include_router(combine.router)
app.include_router(metadata.router)
app.include_router(image_to_video.router)
app.include_router(loop.router)
app.include_router(transitions.router)
app.include_router(upload.router)
app.include_router(folders.router)
app.include_router(files.router)


# ── Global exception handlers ─────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 422 validation errors in the same {"error": "..."} shape as all other errors."""
    messages = []
    for e in exc.errors():
        loc = " → ".join(str(x) for x in e["loc"] if x != "body")
        messages.append(f"{loc}: {e['msg']}" if loc else e["msg"])
    return JSONResponse(
        status_code=422,
        content={"detail": {"error": "; ".join(messages)}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for any exception that wasn't already turned into an HTTPException."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": {"error": "Internal server error"}},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("static/index.html")


# Serve processed output files
os.makedirs(OUTPUTS_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=OUTPUTS_DIR), name="files")

# Serve named folder files
os.makedirs(FOLDERS_DIR, exist_ok=True)
app.mount("/store", StaticFiles(directory=FOLDERS_DIR), name="store")

# Serve UI assets
app.mount("/static", StaticFiles(directory="static"), name="static")
