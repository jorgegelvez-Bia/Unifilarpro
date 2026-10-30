"""Modelos de datos (Pydantic). Igual al formato que guarda el HTML actual."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


class Element(BaseModel):
    id: str
    t: str  # tipo de elemento (clave del catálogo)
    f: dict[str, Any] = Field(default_factory=dict)  # valores de sus campos
    rama: int | None = None  # 0 = parte principal; k = ramal k
    fotos: list[Any] = Field(default_factory=list)


class Project(BaseModel):
    nombre: str = ""  # Proyecto / cliente
    frontera: str = ""  # Código de la frontera (ej. FRT12345)
    fecha: str = Field(default_factory=lambda: date.today().isoformat())
    elaboro: str = ""
    idp: str = ""
    nic: str = ""
    tipoPunto: str = ""


class Diagram(BaseModel):
    id: str
    p: Project = Field(default_factory=Project)
    els: list[Element] = Field(default_factory=list)  # el orden = de arriba hacia abajo
    updated: int = 0


class DiagramIn(BaseModel):
    """Solo lo que necesitan las reglas (sin id)."""

    p: Project = Field(default_factory=Project)
    els: list[Element] = Field(default_factory=list)


class CheckItem(BaseModel):
    level: Literal["bad", "warn", "ok"]
    text: str


class FuseResult(BaseModel):
    amp: float
    In: float
    text: str
    src: str
    mono: bool
    unit: float
    kv: float
    ti: int
