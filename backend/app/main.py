"""API de UnifilarPro Medida (FastAPI).

Correr en local:  uvicorn app.main:app --reload   (desde la carpeta backend/)
Documentación automática: http://localhost:8000/docs
"""

from __future__ import annotations

import os
import time
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.auth import current_user
from app.catalog import catalog_json
from app.models import CheckItem, Diagram, DiagramIn, FuseResult
from app.rules import checks, fill_defaults, fuse_for, meter_type
from app.storage import SQLiteStore

app = FastAPI(title="UnifilarPro Medida API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # rstrip("/"): el navegador manda el origen sin "/" final, aunque lo hayan copiado con ella.
    allow_origins=[o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

_store: SQLiteStore | None = None


def store() -> SQLiteStore:
    global _store
    if _store is None:
        _store = SQLiteStore()
    return _store


def _diag(d: DiagramIn) -> dict[str, Any]:
    return fill_defaults(d.model_dump())


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mensaje": "Hola desde UnifilarPro Medida"}


@app.get("/api/catalog")
def get_catalog() -> dict[str, Any]:
    return catalog_json()


@app.post("/api/checks", response_model=list[CheckItem])
def post_checks(d: DiagramIn) -> list[dict[str, str]]:
    return checks(_diag(d))


@app.post("/api/fuse", response_model=FuseResult | None)
def post_fuse(d: DiagramIn) -> dict[str, Any] | None:
    return fuse_for(_diag(d))


@app.post("/api/meter-type")
def post_meter_type(d: DiagramIn) -> dict[str, str]:
    return {"meterType": meter_type(_diag(d))}


@app.get("/api/diagrams", response_model=list[Diagram])
def list_diagrams(user: str = Depends(current_user)) -> list[dict[str, Any]]:
    return store().list(user)


@app.get("/api/diagrams/{id}", response_model=Diagram)
def get_diagram(id: str, user: str = Depends(current_user)) -> dict[str, Any]:
    d = store().get(user, id)
    if d is None:
        raise HTTPException(404, "Diagrama no encontrado")
    return d


@app.post("/api/diagrams", response_model=Diagram, status_code=201)
def create_diagram(d: Diagram, user: str = Depends(current_user)) -> dict[str, Any]:
    body = d.model_dump()
    body["updated"] = body.get("updated") or int(time.time() * 1000)
    store().put(user, body)
    return body


@app.put("/api/diagrams/{id}", response_model=Diagram)
def update_diagram(id: str, d: Diagram, user: str = Depends(current_user)) -> dict[str, Any]:
    if d.id != id:
        raise HTTPException(400, "El id no coincide")
    body = d.model_dump()
    body["updated"] = int(time.time() * 1000)
    store().put(user, body)
    return body


@app.delete("/api/diagrams/{id}", status_code=204, response_class=Response)
def delete_diagram(id: str, user: str = Depends(current_user)) -> Response:
    if not store().delete(user, id):
        raise HTTPException(404, "Diagrama no encontrado")
    return Response(status_code=204)
