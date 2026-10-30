"""Revisiones del diagrama (función `checks` del HTML), con el texto exacto.

Cada revisión es {"level": "bad" | "warn" | "ok", "text": "..."}:
  bad  = irregularidad o equipo dañado (rojo)
  warn = algo para revisar
  ok   = sin observaciones
No se incluye "Falta el medidor".
"""

from __future__ import annotations

from app.catalog import TYPES
from app.rules.common import NF, Diag, br_name, fv, js_float, js_int, js_number, multi_t, num_txt, rama, tr_n
from app.rules.fuse import fuse_for
from app.rules.summary import summary

OK_TEXT = "Sin observaciones. El diagrama tiene los elementos básicos para el tipo de medida."


def checks(d: Diag) -> list[dict[str, str]]:
    els = d["els"]
    if not els:
        return []
    out: list[dict[str, str]] = []
    bad = lambda t: out.append({"level": "bad", "text": t})  # noqa: E731
    warn = lambda t: out.append({"level": "warn", "text": t})  # noqa: E731
    has = lambda t: any(e["t"] == t for e in els)  # noqa: E731
    idx = lambda t: next((i for i, e in enumerate(els) if e["t"] == t), -1)  # noqa: E731

    for k, e in enumerate([e for e in els if e["t"] == "irreg"], start=1):
        bad(f"Irregularidad {k}: {summary(e, d)}.")
    # TODO fase 8: avisos del fasorial ("Fasorial · …").
    # TODO fase 7: novedades del diagrama de conexiones ("Irregularidad n (cableado): …").

    for e in els:
        if fv(e, "estado") != "Dañado":
            continue
        obs = fv(e, "obs")
        malos = js_number(fv(e, "malos"))
        if e["t"] == "dps" and malos and malos > 0:
            m = fv(e, "malos")
            bad(f"DPS: {m} {'dañado' if malos == 1 else 'dañados'} y {fv(e, 'buenos')} en buen estado{' (' + obs + ')' if obs else ''}.")
        else:
            bad(f"{TYPES[e['t']]['name']} dañado{': ' + obs if obs else ''}.")
    for e in els:
        if fv(e, "estado") == "Por revisar":
            obs = fv(e, "obs")
            warn(f"{TYPES[e['t']]['name']} por revisar{': ' + obs if obs else ''}.")

    red = next((e for e in els if e["t"] == "red"), None)
    fases = NF.get(fv(red, "fases"), 3) if red else 3

    t = multi_t(d)
    if t:
        n = tr_n(t)
        for k in range(1, n + 1):
            m = fv(t, f"med{k}")
            be = [e for e in els if min(n, rama(e)) == k]
            bh = lambda tt: any(e["t"] == tt for e in be)  # noqa: E731
            if m and m not in ("Sin indicar", "Solo carga") and not bh("medidor"):
                warn(f"{br_name(t, k)}: indicaste medida {m.lower()} pero todavía no tiene medidor.")
            if m == "Semidirecta" and not bh("tc"):
                warn(f"{br_name(t, k)}: la medida semidirecta lleva TC.")
            if m == "Indirecta" and (not bh("tc") or not bh("tt")):
                warn(f"{br_name(t, k)}: la medida indirecta lleva TC y TT.")

    if (
        has("tc") and red and fv(red, "nivel") == "MT" and not has("tt")
        and any(e["t"] == "tc" and not rama(e) > 0 and not (has("trafo") and i > idx("trafo")) for i, e in enumerate(els))
    ):
        warn("La red es MT y hay TC sin TT: en MT la medida es indirecta y necesita TT.")
    if has("tt") and not has("tc"):
        warn("Hay TT pero no TC: la medida indirecta usa ambos.")
    if (has("tc") or has("tt")) and not has("bloque") and not has("bloquer"):
        warn("No hay bloque de pruebas entre los transformadores de medida y el medidor. Revísalo con el Código de Medida (CREG 038 de 2014).")
    if red and fv(red, "fases") in NF:
        for e in els:
            if e["t"] not in ("tc", "tt"):
                continue
            n = js_number(fv(e, "cantidad"))
            if n and n != fases:
                warn(f"{TYPES[e['t']]['short']}: hay {num_txt(n)} y el sistema es {fv(red, 'fases').lower()} ({fases} fase{'s' if fases > 1 else ''}).")

    if has("otros") and has("tc") and idx("otros") > idx("tc"):
        warn("Hay otros usuarios conectados después de los TC: su consumo quedaría registrado en este medidor.")
    if has("otros") and not has("tc") and has("medidor") and idx("otros") > idx("medidor"):
        warn("Hay otros usuarios conectados después del medidor: su consumo quedaría registrado en este medidor.")

    for e in els:
        if e["t"] != "trafo":
            continue
        n = js_int(fv(e, "cantidad")) or 1
        if n > 1 and fv(e, "configuracion") == "Banco de monofásicos" and red and NF.get(fv(red, "fases")) == 3 and n not in (2, 3):
            warn(f"Transformador: un banco para sistema trifásico suele ser de 3 monofásicos (o 2 en delta abierta) y tienes {n}.")

    r = fuse_for(d)
    if r:
        for i, e in enumerate(els):
            if e["t"] != "fus" or i > r["ti"] or fv(e, "criterio") != "Manual":
                continue
            a = js_float(fv(e, "corriente").replace(",", ".", 1))
            if a and (a < 1.3 * r["In"] - 0.01 or a > 2 * r["In"] + 0.5) and a != r["amp"]:
                warn(
                    f"Cortacircuitos: fusible de {num_txt(a)} A y para {num_txt(r['unit'])} kVA"
                    f"{' monofásico' if r['mono'] else ''} se sugiere {num_txt(r['amp'])} A tipo K ({r['src']})."
                )

    if has("bloquer") and not has("bloque"):
        warn("Hay bloque de pruebas de respaldo sin el bloque de pruebas principal.")
    if has("bloquer") and not has("respaldo"):
        warn("Hay bloque de pruebas de respaldo pero no hay medidor de respaldo.")
    if has("gabinete") and not any(has(x) for x in ("medidor", "mdir", "respaldo", "testigo", "bloque", "bloquer")):
        warn("Hay gabinete de medida pero no hay medidor ni bloque de pruebas.")
    if has("planta") and not has("transfer"):
        warn("Hay planta de emergencia sin transferencia.")

    tc = next((e for e in els if e["t"] == "tc"), None)
    br = next((e for e in els if e["t"] == "breaker"), None)
    if tc and br and has("trafo") and idx("tc") > idx("trafo"):
        ip = js_float(fv(tc, "relacion").split("/")[0])
        ib = js_float(fv(br, "corriente"))
        if ip and ib and ib > ip * 1.2:
            warn(f"El totalizador ({num_txt(ib)} A) supera en más de 20% la corriente primaria del TC ({num_txt(ip)} A).")

    if not out:
        out.append({"level": "ok", "text": OK_TEXT})
    return out
