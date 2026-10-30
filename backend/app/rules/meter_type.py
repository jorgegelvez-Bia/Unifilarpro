"""Tipo de medida del diagrama (función `meterType` del HTML).

- Con TC y TT es Indirecta; solo con TC, Semidirecta; solo con medidor, Directa.
- Con ramales se escribe por ramal: "T1 Directa · T2 Semidirecta" o "Tot.1 … · Tot.2 …".
- Las medidas aguas abajo se suman: "Semidirecta + directa".
"""

from __future__ import annotations

from app.rules.common import Diag, El, fv, multi_t, rama, seg_split, tr_n


def _base(els: list[El]) -> str:
    has = lambda t: any(e["t"] == t for e in els)  # noqa: E731
    tc, tt, md = has("tc"), has("tt"), has("mdir")
    if tc and tt:
        b = "Indirecta"
    elif tc:
        b = "Semidirecta"
    elif has("medidor") or md:
        b = "Directa"
    else:
        b = ""
    return b + " + directa" if md and (tc or tt) else b


def meter_type(d: Diag) -> str:
    els = d["els"]
    t = multi_t(d)
    if not t:
        segs = seg_split(els)
        if len(segs) > 1:
            ts = []
            for sg in segs:
                st = fv(sg[0], "tipo") if sg[0]["t"] == "subm" else ""
                x = st if st and st != "Sin indicar" else _base(sg)
                if x:
                    ts.append(x)
            return " + ".join(x if i == 0 else x.lower() for i, x in enumerate(ts)) if ts else "Directa"
        return _base(els) or "Directa"

    n = tr_n(t)
    v: list[tuple[int, str]] = []
    for k in range(1, n + 1):
        m = fv(t, f"med{k}")
        x = m if m and m not in ("Sin indicar", "Solo carga") else _base([e for e in els if min(n, rama(e)) == k])
        if x:
            v.append((k, x))
    if not v:
        return _base(els) or "Directa"
    unique = list(dict.fromkeys(x for _, x in v))
    is_bk = t["t"] == "breaker"
    if len(unique) == 1:
        if len(v) < n:
            return f"{unique[0]} ({'totalizador' if is_bk else 'trafo'} {', '.join(str(k) for k, _ in v)})"
        return unique[0]
    return " · ".join(f"{'Tot.' if is_bk else 'T'}{k} {x}" for k, x in v)
