"""Diagrama fasorial: sistema, ángulos de cada fase y avisos (igual al HTML).

El dibujo vive en el frontend (src/diagram/phasor.ts); aquí están las reglas que
alimentan las Revisiones ("Fasorial · …") y el resumen del elemento.
"""

from __future__ import annotations

import math

from app.rules.common import NF, Diag, El, fv, js_fixed, js_float

FS_SIS = [
    "Trifásico 4 hilos (estrella)",
    "Trifásico 3 hilos (Aron)",
    "Bifásico de red trifásica (0° y 120°)",
    "Monofásico",
    "Bifásico trifilar de trafo monofásico (0° y 180°)",
]
FS_UI = ["Trifásico", "Bifásico", "Monofásico"]
FS_SEQ = ["R-S-T (positiva)", "R-T-S (negativa)"]
FS_MODO = ["Ángulo en grados", "Factor de potencia"]

NAN = float("nan")
isnan = math.isnan


def jmod(a: float, b: float) -> float:
    """El % de JavaScript (el resultado lleva el signo de `a`)."""
    return math.fmod(a, b)


def js_str(x: float) -> str:
    """Un número como lo escribe JavaScript (`120` y no `120.0`)."""
    return str(int(x)) if x == int(x) and abs(x) < 1e21 else repr(x)


def fs_sis(f: dict) -> str:
    v = f.get("sis") or FS_SIS[0]
    return FS_SIS[0] if v == "Trifásico" else FS_SIS[4] if v == "Bifásico" else v


def fs_ui(f: dict) -> str:
    v = fs_sis(f)
    if v == FS_SIS[3]:
        return "Monofásico"
    return "Bifásico" if v in (FS_SIS[2], FS_SIS[4]) else "Trifásico"


def fs_num(v) -> float:
    """Número escrito por el técnico (acepta coma decimal). NaN si está vacío."""
    if v is None:
        return NAN
    s = str(v).strip().replace(",", ".", 1)
    if not s:
        return NAN
    n = js_float(s)
    return NAN if n is None else n


def fs_default(d: Diag) -> str:
    els = d["els"]
    red = next((e for e in els if e["t"] == "red"), None)
    nf = NF.get(fv(red, "fases"), 3) if red else 3
    cx = next((e for e in els if e["t"] == "conex"), None)
    if cx and "Aron" in fv(cx, "tipo"):
        return FS_SIS[1]
    return "Monofásico" if nf == 1 else "Bifásico" if nf == 2 else "Trifásico"


def fs_rows(f: dict) -> list[dict]:
    s = fs_sis(f)
    if s == FS_SIS[1]:
        return [{"k": "R", "lab": "Elemento 1 (U12 · I1)", "vl": "U12"}, {"k": "T", "lab": "Elemento 2 (U32 · I3)", "vl": "U32"}]
    ph = ["R"] if s == FS_SIS[3] else ["R", "S"] if s in (FS_SIS[2], FS_SIS[4]) else ["R", "S", "T"]
    return [{"k": k, "lab": "Fase " + k, "vl": "V" + k} for k in ph]


def fs_data(e: El) -> list[dict]:
    """Por fila: V, I, φ, ángulo de la tensión (va, en el dibujo) y de la corriente (ia)."""
    f = e.get("f") or {}
    rows = fs_rows(f)
    neg = f.get("seq") == FS_SEQ[1]
    aron = fs_sis(f) == FS_SIS[1]
    fp = f.get("modo") == FS_MODO[1]
    base = {"R": 90, "S": -90 if fs_sis(f) == FS_SIS[4] else (210 if neg else -30), "T": -30 if neg else 210}
    out = []
    for j, r in enumerate(rows):
        V, I = fs_num(f.get(f"V{j}")), fs_num(f.get(f"I{j}"))
        phi = NAN
        if fp:
            p = fs_num(f.get(f"A{j}"))
            if not isnan(p) and abs(p) <= 1:
                phi = math.acos(abs(p)) * 180 / math.pi * (-1 if f.get(f"C{j}") == "Cap" else 1) * (-1 if p < 0 else 1) + (180 if p < 0 else 0)
        else:
            phi = fs_num(f.get(f"A{j}"))
        va = base[r["k"]]
        if aron:
            va = (60 if neg else 120) if r["k"] == "R" else (0 if neg else 180)
        vdef = jmod(jmod(90 - va, 360) + 360, 360)
        vd = fs_num(f.get(f"VA{j}"))
        man = not isnan(vd)
        if man:
            va = 90 - vd
        out.append({**r, "V": V, "I": I, "phi": phi, "va": va, "vdeg": jmod(jmod(vd, 360) + 360, 360) if man else vdef,
                    "vdef": vdef, "man": man, "ia": NAN if isnan(phi) else va - phi})
    return out


def fs_warn(e: El) -> list[str]:
    """Avisos del fasorial: sin tensión, desbalance, sin corriente, ángulos raros."""
    D = fs_data(e)
    W: list[str] = []
    aron = fs_sis(e.get("f") or {}) == FS_SIS[1]
    Vs = [x["V"] for x in D if not isnan(x["V"])]
    Vm = sum(Vs) / len(Vs) if Vs else 0
    Is = [x["I"] for x in D if not isnan(x["I"])]
    Im = max(Is) if Is else 0
    for x in D:
        n = x["lab"].split(" (")[0] if aron else "Fase " + x["k"]
        V, I, phi = x["V"], x["I"], x["phi"]
        if not isnan(V) and Vm > 0 and V < 0.15 * Vm:
            W.append(f"{n}: sin tensión (revisar cuchilla, fusible o cable de tensión).")
        elif not isnan(V) and Vm > 0 and not any(z["man"] for z in D) and abs(V - Vm) > 0.1 * Vm:
            W.append(f"{n}: tensión desbalanceada ({js_str(V)} V contra promedio {js_fixed(Vm, 1)} V).")
        if not isnan(I) and Im > 0 and I < 0.05 * Im:
            W.append(f"{n}: sin corriente (revisar puente en bloque, TC o cable de corriente).")
        if not isnan(phi):
            a = jmod(jmod(phi, 360) + 540, 360) - 180
            if abs(abs(a) - 180) < 35:
                W.append(f"{n}: corriente invertida ({js_fixed(a, 0)}°): posible TC con S1/S2 invertidos.")
            elif abs(abs(a) - 120) < 30 and not aron:
                W.append(f"{n}: ángulo de {js_fixed(a, 0)}°: la corriente parece de otra fase (tensiones o corrientes cruzadas).")
            elif abs(a) > 90:
                W.append(f"{n}: ángulo de {js_fixed(a, 0)}° (mayor a 90°): energía en sentido contrario, revisar polaridad.")
    if aron:
        a = D[0]["phi"]
        b = D[1]["phi"] if len(D) > 1 else NAN
        if not isnan(a) and not isnan(b) and abs((a - b) - 60) > 35 and abs(a) <= 90 and abs(b) <= 90:
            W.append(f"Aron: la diferencia entre ángulos ({js_fixed(a - b, 0)}°) debería estar cerca de 60° con carga equilibrada; revisar secuencia o cruces.")
    return W


def fs_summary(e: El, d: Diag | None) -> str:
    n = sum(1 for x in fs_data(e) if not isnan(x["phi"])) if d is not None else 0
    return " · ".join(p for p in [fs_ui(e.get("f") or {}), f"{n} ángulos" if n else "sin datos"] if p)

