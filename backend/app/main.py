"""FastAPI backend: testo italiano -> sequenze di pittogrammi ARASAAC."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .ai import llm, pipeline, simplifier
from .config import (
    CORS_ORIGINS,
    FRONTEND_DIST,
    LANGUAGE,
    LANGUAGES,
    OPENCODE_GO_ENABLED,
    SPACY_MODEL,
)
from .pictos.index import PictogramEntry, load_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_index()
        pipeline.analyze("riscaldamento del modello")
    except Exception as exc:  # pragma: no cover
        print(f"[startup] warm-up non completato: {exc}")
    yield


app = FastAPI(title="ARASAAC Dashboard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConvertRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Testo da convertire")
    use_llm: bool = Field(True, description="Usa OpenCode Go come motore primario")
    language: str = Field(LANGUAGE, description="Lingua (it, en, ...)")


class LookupRequest(BaseModel):
    words: list[str] = Field(..., max_length=500,
                            description="Parole da mappare ai pittogrammi")
    language: str = Field(LANGUAGE, description="Lingua (it, en, ...)")


def _llm_info() -> dict:
    return {
        "llm_available": OPENCODE_GO_ENABLED and llm.available(),
        "llm_provider": "opencode-go",
        "llm_model": llm.model_name(),
    }


def _entry_dict(entry: PictogramEntry) -> dict:
    return {
        "id": entry.id,
        "keyword": entry.keyword,
        "plural": entry.plural,
        "type": entry.type,
        "has_locution": entry.has_locution,
        "schematic": entry.schematic,
        "aac": entry.aac,
        "image_url": entry.image_url(),
        "categories": list(entry.categories),
    }


@app.get("/api/health")
def health() -> dict:
    index_ok = True
    try:
        load_index()
    except Exception:
        index_ok = False
    return {
        "status": "ok",
        "language": LANGUAGE,
        "languages": LANGUAGES,
        "spacy_model": SPACY_MODEL,
        "index_ready": index_ok,
        **_llm_info(),
    }


@app.post("/api/convert")
def convert(req: ConvertRequest) -> dict:
    try:
        sequences, engine = simplifier.convert_text(
            req.text, use_llm=req.use_llm and OPENCODE_GO_ENABLED,
            language=req.language,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"engine": engine, "language": req.language, "sequences": sequences}


@app.post("/api/lookup")
def lookup(req: LookupRequest) -> dict:
    try:
        results = simplifier.lookup_words(req.words, req.language)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"language": req.language, "results": results}


@app.get("/api/search")
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(30, ge=1, le=100),
    language: str = Query(LANGUAGE),
) -> dict:
    try:
        index = load_index(language)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    results = index.search(q, limit=limit)
    return {"query": q, "language": language,
            "results": [_entry_dict(e) for e in results]}


@app.get("/api/pictogram/{pictogram_id}")
def get_pictogram(pictogram_id: int, resolution: Optional[int] = None) -> dict:
    try:
        index = load_index()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    entry = index.get(pictogram_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Pittogramma non trovato")
    return _entry_dict(entry)


# Serve il frontend compilato (frontend/dist) dallo stesso servizio.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="app")
