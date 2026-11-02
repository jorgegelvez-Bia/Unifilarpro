"""Diagrama de conexiones: tipos, opciones y novedades de cableado (igual al HTML).

El dibujo vive en el frontend (src/diagram/wiring.ts); aquí están las reglas que
alimentan las Revisiones y el resumen del elemento.
"""

from __future__ import annotations

import re

from app.rules.common import NF, Diag, El, fv

WR_T = [
    "Semidirecta trifásica (3 TC)",
    "Semidirecta bifásica (2 TC)",
    "Semidirecta monofásica (1 TC)",
    "Indirecta trifásica (3 TC + 3 TT)",
    "Indirecta Aron (2 TC + 2 TT)",
    "Directa trifásica",
    "Directa bifásica",
    "Directa monofásica",
]
WR_N = [
    "TC con S1 y S2 invertidos",
    "Puente en el bloque de pruebas",
    "Tensiones cruzadas entre fases",
    "Cable de tensión suelto",
    "Cable de corriente suelto",
    "Neutro suelto",
    "Otra",
]
WR_BLQ = ["Cuchillas 10 polos", "Tres elementos 13 polos", "Modular de riel", "Modular de riel doble (principal + respaldo)"]
WR_RESP = ["Sin medidor de respaldo", "Con respaldo · un solo bloque", "Con respaldo · dos bloques"]
WR_BORNES = ["Asimétrico", "Simétrico"]
WR_RETS2 = ["En el medidor", "Después del bloque de pruebas"]

_I_NOV = re.compile(r"TC con|Puente|corriente")


def wr_default(d: Diag) -> str:
    """Tipo de conexión que se propone según el unifilar."""
    els = d["els"]
    red = next((e for e in els if e["t"] == "red"), None)
    nf = NF.get(fv(red, "fases"), 3) if red else 3
    if any(e["t"] == "tt" for e in els):
        return WR_T[3]
    if any(e["t"] == "tc" for e in els):
        return WR_T[2 if nf == 1 else 1 if nf == 2 else 0]
    return WR_T[7 if nf == 1 else 6 if nf == 2 else 5]


def wr_cfg(tipo: str) -> dict:
    dir_ = tipo.startswith("Directa")
    ind = tipo.startswith("Indirecta")
    aron = "Aron" in tipo
    low = tipo.lower()
    nf = 1 if "monof" in low else 2 if "bif" in low else 3
    ph = [
        {"k": k, "tc": not dir_ and not (aron and k == "S"), "tt": ind and not (aron and k == "S"), "vOnly": aron and k == "S"}
        for k in ["R", "S", "T"][:nf]
    ]
    return {"dir": dir_, "ind": ind, "aron": aron, "nf": nf, "ph": ph, "neutro": not aron}


def wr_phase_opts(tipo: str, t: str) -> list[str]:
    """Fases que se pueden escoger para una novedad."""
    c = wr_cfg(tipo or "")
    if not t or t in ("Neutro suelto", "Otra"):
        return []
    if t == "Tensiones cruzadas entre fases":
        k = [p["k"] for p in c["ph"]]
        return [f"{k[i]} y {k[j]}" for i in range(len(k)) for j in range(i + 1, len(k))]
    if _I_NOV.search(t):
        return [p["k"] for p in c["ph"] if p["tc"]]
    return [p["k"] for p in c["ph"]]


def wr_tipo(e: El, d: Diag) -> str:
    return fv(e, "tipo") or wr_default(d)


def wr_novs(e: El, d: Diag) -> list[dict]:
    """Novedades válidas para el tipo de conexión (las incompletas no cuentan)."""
    tipo = wr_tipo(e, d)
    c = wr_cfg(tipo)
    out = []
    for n in e.get("f", {}).get("nov") or []:
        t = n.get("t") or ""
        if not t:
            continue
        if t == "Otra":
            ok = bool((n.get("txt") or "").strip())
        elif t == "Neutro suelto":
            ok = c["neutro"]
        elif c["dir"] and _I_NOV.search(t):
            ok = False
        else:
            ok = n.get("fase") in wr_phase_opts(tipo, t)
        if ok:
            out.append(n)
    return out


def wr_nov_text(n: dict) -> str:
    if n.get("t") == "Otra":
        return (n.get("txt") or "").strip()
    fase = n.get("fase")
    if not fase:
        return n["t"]
    return n["t"] + (f" ({fase})" if n["t"] == "Tensiones cruzadas entre fases" else f" — fase {fase}")


def wr_summary(e: El, d: Diag | None) -> str:
    """Resumen del elemento en la lista (tipo · modelo · respaldo · bornera · novedades)."""
    f = e.get("f", {})
    tipo = fv(e, "tipo")
    modelo = fv(e, "modelo")
    resp = fv(e, "resp")
    n = len(wr_novs(e, d)) if d is not None else 0
    parts = [
        tipo,
        modelo if modelo and modelo != "Genérico" else "",
        "con respaldo" if resp and resp != WR_RESP[0] and not tipo.startswith("Directa") else "",
        "medidor simétrico" if f.get("bornes") == "Simétrico" else "",
        (f"{n} novedad" if n == 1 else f"{n} novedades") if n else "",
    ]
    return " · ".join(p for p in parts if p)
