"""Utilidades compartidas por las reglas.

Los diagramas se manejan como dict (el mismo JSON que guarda la app):
    {"p": {...}, "els": [{"id", "t", "f": {...}, "rama"}, ...]}
Las funciones replican las del HTML (trN, trK, multiT, segSplit…).
"""

from __future__ import annotations

import re
from typing import Any

from app.catalog import default_value, fields_of

NF = {"Trifásico": 3, "Bifásico": 2, "Monofásico": 1}
MTR = ["medidor", "respaldo", "testigo"]

_FLOAT_RE = re.compile(r"^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)")
_INT_RE = re.compile(r"^\s*([+-]?\d+)")

El = dict[str, Any]
Diag = dict[str, Any]


def js_float(v: Any) -> float | None:
    """Como `parseFloat` de JavaScript: lee el número al inicio del texto. None = NaN."""
    m = _FLOAT_RE.match(str(v if v is not None else ""))
    return float(m.group(1)) if m else None


def js_int(v: Any) -> int | None:
    """Como `parseInt(v)` de JavaScript."""
    m = _INT_RE.match(str(v if v is not None else ""))
    return int(m.group(1)) if m else None


def js_number(v: Any) -> float | None:
    """Como `+v` / `Number(v)` de JavaScript (todo el texto debe ser número)."""
    s = str(v if v is not None else "").strip()
    if s == "":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return None


def num_txt(x: float) -> str:
    """Escribe un número como lo haría JavaScript (`5` y no `5.0`)."""
    if x == int(x):
        return str(int(x))
    return repr(round(x, 10)).rstrip("0").rstrip(".")


def fv(e: El, k: str) -> str:
    """Valor de un campo como texto ('' si no existe)."""
    v = (e.get("f") or {}).get(k)
    return "" if v is None else str(v)


def rama(e: El) -> int:
    r = e.get("rama")
    return r if isinstance(r, int) and r > 0 else 0


def tr_n(e: El) -> int:
    return min(99, max(1, js_int(fv(e, "cantidad")) or 1))


def tr_k(e: El) -> list[float]:
    out = []
    for i in range(tr_n(e)):
        key = "potencia" if i == 0 else f"potencia{i + 1}"
        out.append(js_float(fv(e, key).replace(",", ".", 1)) or 0.0)
    return out


def tr_tot(e: El) -> float:
    return round(sum(tr_k(e)), 1)


def multi_tr(d: Diag) -> El | None:
    t = next((e for e in d["els"] if e["t"] == "trafo"), None)
    if t and tr_n(t) > 1 and fv(t, "configuracion") != "Banco de monofásicos":
        return t
    return None


def main_bk(d: Diag) -> El | None:
    return next((e for e in d["els"] if e["t"] == "breaker" and not rama(e) > 0), None)


def multi_t(d: Diag) -> El | None:
    """El elemento que abre ramales (varios trafos o varios totalizadores)."""
    t = multi_tr(d)
    if t:
        return t
    b = main_bk(d)
    return b if b and tr_n(b) > 1 else None


def br_name(t: El | None, k: int) -> str:
    return ("Totalizador " if t and t["t"] == "breaker" else "Trafo ") + str(k)


def grp_of(d: Diag, e: El) -> int:
    t = multi_t(d)
    if not t or e is t:
        return 0
    return min(tr_n(t), rama(e))


def seg_split(els: list[El]) -> list[list[El]]:
    """Parte la lista en tramos de medida (medidas aguas abajo)."""
    segs: list[list[El]] = [[]]
    mg = MTR + ["mdir"]
    for e in els:
        if e["t"] == "irreg":
            continue
        cs = segs[-1]
        lm = max((i for i, x in enumerate(cs) if x["t"] in MTR), default=-1)
        brk = (
            e["t"] == "subm"
            or (e["t"] in ("tc", "tt") and lm >= 0)
            or (e["t"] in ("bloque", "bloquer") and lm >= 0 and any(x["t"] == e["t"] for x in cs))
            or (
                e["t"] in MTR
                and lm >= 0
                and any(x["t"] not in ("gabinete", "celda", "irreg", "bloque", "bloquer", "tc", "tt") for x in cs[lm + 1 :])
            )
        )
        lg = max((i for i, x in enumerate(cs) if x["t"] in mg), default=-1)
        brk_g = e["t"] in mg and lg >= 0 and any(x["t"] == "gabinete" for x in cs[lg + 1 :])
        if (brk or brk_g) and cs:
            segs.append([e])
        else:
            cs.append(e)
    return segs


def fill_defaults(d: Diag) -> Diag:
    """Completa los campos que falten con su valor por defecto (como `openDiagram`)."""
    for e in d.get("els", []):
        f = e.setdefault("f", {})
        for k, _, dv in fields_of(e["t"]):
            if k not in f:
                f[k] = default_value(dv)
    return d
