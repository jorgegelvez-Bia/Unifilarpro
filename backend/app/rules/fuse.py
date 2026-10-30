"""Fusible sugerido tipo K para el cortacircuitos (funciones `primaryKV` y `fuseFor`).

In = kVA / (√3 · kV) en trifásico, o kVA / kV en monofásico o banco de monofásicos.
A 13.2 kV se usa la tabla CENS (Norma Cap. 3-08). Si no está en la tabla:
primer valor estándar ≥ 1.3 × In.
"""

from __future__ import annotations

import math
import re
from typing import Any

from app.rules.common import NF, Diag, fv, js_float, num_txt, tr_k, tr_n

FUS_TRI = {15: 1, 30: 2, 45: 3, 75: 5, 112.5: 7, 150: 10, 225: 15}
FUS_MONO = {5: 0.5, 10: 1, 15: 2, 25: 3, 37.5: 4, 50: 6, 75: 8, 100: 12, 167.5: 20}
FUS_STD = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50, 65, 80, 100, 140, 200]

_KV_RE = re.compile(r"([\d.]+)\s*kV", re.IGNORECASE)


def primary_kv(d: Diag) -> float:
    tr = next((e for e in d["els"] if e["t"] == "trafo"), None)
    red = next((e for e in d["els"] if e["t"] == "red"), None)
    for src in [tr and fv(tr, "relacion"), red and fv(red, "tension")]:
        if not src:
            continue
        m = _KV_RE.search(src.replace(",", ".", 1))
        if m:
            kv = js_float(m.group(1))
            if kv is not None:
                return kv
    return 13.2


def fuse_for(d: Diag) -> dict[str, Any] | None:
    els = d["els"]
    ti = next((i for i, e in enumerate(els) if e["t"] == "trafo"), -1)
    if ti < 0:
        return None
    tr = els[ti]
    ks = [k for k in tr_k(tr) if k]
    if not ks:
        return None
    n = tr_n(tr)
    red = next((e for e in els if e["t"] == "red"), None)
    sys = fv(red, "fases") if red and fv(red, "fases") in NF else "Trifásico"
    banco = n > 1 and fv(tr, "configuracion") == "Banco de monofásicos"
    mono = banco or sys != "Trifásico"
    unit = max(ks) if banco else round(sum(ks), 1)
    kv = primary_kv(d)
    i_n = unit / kv if mono else unit / (math.sqrt(3) * kv)
    amp = None
    src = ""
    if abs(kv - 13.2) < 0.05:
        table = FUS_MONO if mono else FUS_TRI
        if unit in table:
            amp = table[unit]
            src = "tabla CENS 13.2 kV"
    if amp is None:
        amp = next((a for a in FUS_STD if a >= 1.3 * i_n), None)
        src = "cálculo 1.3 × In"
    if amp is None:
        return None
    return {"amp": amp, "In": i_n, "text": f"{num_txt(amp)} A tipo K", "src": src, "mono": mono, "unit": unit, "kv": kv, "ti": ti}


def apply_auto_fuse(d: Diag) -> Diag:
    """Llena el fusible de los cortacircuitos en modo automático (antes del trafo)."""
    r = fuse_for(d)
    if not r:
        return d
    for i, e in enumerate(d["els"]):
        if e["t"] != "fus" or i > r["ti"] or fv(e, "criterio") == "Manual":
            continue
        e.setdefault("f", {})["corriente"] = r["text"]
    return d
