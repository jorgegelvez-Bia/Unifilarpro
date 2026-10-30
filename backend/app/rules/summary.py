"""Resumen de 1 línea de cada elemento (función `summary` del HTML).

Se usa en la lista de elementos, en el diagrama y en las revisiones de irregularidades.
Los valores "Sin indicar" / "Sin especificar" no se escriben.
"""

from __future__ import annotations

from app.catalog import TYPES
from app.rules.common import Diag, El, fv, grp_of, js_int, multi_t, tr_k, tr_n, tr_tot, num_txt

SKIP_CELDA = ("irreg", "celda", "gabinete", "bloque", "bloquer", "conex", "fasor")


def irr_label(f: dict) -> str:
    if f.get("tipo") == "Otra":
        return (f.get("detalle") or "").strip() or "Irregularidad"
    return f.get("tipo") or ""


def fase_text(f: dict) -> str:
    v = f.get("fase") or ""
    if not v or v in ("Sin indicar", "No aplica", "Todas"):
        return ""
    if v.startswith("Todas"):
        return "Fases R, S y T"
    if v == "Neutro":
        return "En el neutro"
    return ("Fases " if " y " in v else "Fase ") + v


def celda_cands(d: Diag, c: El) -> list[El]:
    els = d["els"]
    side = any(e["t"] in ("tc", "tt") for e in els)
    g = grp_of(d, c)
    t = multi_t(d)
    return [
        e for e in els
        if e["t"] not in SKIP_CELDA
        and not (side and e["t"] in ("medidor", "respaldo", "testigo"))
        and grp_of(d, e) == g
        and e is not t
    ]


def celda_sel(d: Diag, c: El) -> list[str]:
    incl = (c.get("f") or {}).get("incl")
    if isinstance(incl, list):
        return incl
    i = d["els"].index(c)
    n = js_int(fv(c, "encierra")) or 1
    return [e["id"] for e in celda_cands(d, c) if d["els"].index(e) > i][:n]


def _tr_k_txt(e: El) -> str:
    k = tr_k(e)
    if len(k) == 1:
        return f"{num_txt(k[0])} kVA" if k[0] else ""
    if not any(k):
        return ""
    return ", ".join(f"T{i + 1}: {num_txt(v)} kVA" for i, v in enumerate(k) if v)


def summary(el: El, d: Diag | None = None) -> str:
    f = el.get("f") or {}
    t = el["t"]
    out: list[str] = []

    if t == "transc":
        u2 = f.get("enUso") == "Circuito 2"
        n = (f.get("nombre2") if u2 else f.get("nombre1")) or ""
        parts = [f["tipo"]] if f.get("tipo") in ("Manual", "Automática") else []
        parts.append("conectado: " + (n.strip() or f.get("enUso") or "Circuito 1"))
        return " · ".join(parts)
    if t in ("fasor", "conex"):
        # Se completan en las fases 7 (conexiones) y 8 (fasorial).
        return fv(el, "tipo")
    if t == "breaker":
        n = tr_n(el)
        if n > 1:
            return f"{n} totalizadores"
        pol = fv(el, "polos")
        return " · ".join(x for x in [fv(el, "corriente").strip(), pol + "P" if pol and pol != "Sin indicar" else ""] if x)
    if t == "trafo":
        n = tr_n(el)
        if n > 1:
            out.append(f"{n} trafos {fv(el, 'configuracion').lower()}")
        kt = _tr_k_txt(el)
        if kt:
            tot = tr_tot(el)
            out.append(kt + (f" (total {num_txt(tot)} kVA)" if n > 1 and tot else ""))
        if fv(el, "relacion").strip():
            out.append(fv(el, "relacion").strip())
        return " · ".join(out)

    for k, _, _ in TYPES[t]["fields"]:
        v = fv(el, k).strip()
        if not v or v in ("Sin indicar", "Sin especificar", "Igual a la red"):
            continue
        if k in ("neutro", "criterio"):
            continue
        if t == "spt":
            if k == "para":
                out.append("Para " + ("DPS" if v == "DPS" else v[0].lower() + v[1:]))
            continue
        if t == "lmt":
            if k == "lineas":
                out.append(v + (" línea" if v == "1" else " líneas"))
            continue
        if t == "cajam" and k == "clientes":
            n = js_int(v) or 0
            if n:
                out.append(f"{n} {'cliente' if n == 1 else 'clientes'}")
            continue
        if t == "cajab" and k == "abonados":
            n = js_int(v) or 0
            if n:
                out.append(f"{n} {'abonado' if n == 1 else 'abonados'}")
            continue
        if t == "acom":
            if k == "porFase":
                out.append(v + (" cable por fase" if v == "1" else " cables por fase"))
            elif k in ("fasesA", "tipo", "calibre", "material"):
                out.append(v)
            continue
        if t in ("otros", "carga"):
            if k == "descripcion":
                out.append(v)
            continue
        if t == "irreg":
            if k == "tipo":
                out.append(irr_label(f))
            elif k == "fase" and fase_text(f):
                ft = fase_text(f)
                out.append(ft[0].lower() + ft[1:])
            elif k == "detalle" and f.get("tipo") != "Otra":
                out.append(v)
            continue
        if t == "xlpe":
            if k == "subterraneo":
                out.append("Subterráneo" if v == "Sí" else "Aéreo")
            if k == "calibre":
                out.append(v)
            continue
        if t == "dps":
            if k == "buenos":
                out.append(v + (" bueno" if v == "1" else " buenos"))
            if k == "malos" and v != "0":
                out.append(v + (" dañado" if v == "1" else " dañados"))
            continue
        if k == "corriente" and t == "fus":
            out.append("Fusible " + v + ("" if f.get("criterio") == "Manual" else " (auto)"))
            continue
        if k == "fases":
            out.append(v + (" + N" if f.get("neutro") == "Sí" and f.get("nivel") != "MT" else ""))
        elif k == "cantidad":
            out.append("×" + v)
        elif k == "polos":
            out.append(v + "P")
        elif k == "encierra":
            if t == "celda" and d is not None:
                n = len(celda_sel(d, el))
                out.append(f"encierra {n} equipo{'s' if n > 1 else ''}" if n else "sin equipos marcados")
        elif k == "uso" and v == "Exclusivo" and t != "gabinete":
            continue
        elif k == "uso" and t == "doble" and v == "Ambos cerrados":
            continue
        elif k == "otrosCant" and t == "gabinete":
            if f.get("uso") == "Compartido":
                out.append(v + " medidores de otros usuarios")
        elif k == "pasos":
            out.append(v + " pasos")
        else:
            out.append(v)
    return " · ".join(out)
