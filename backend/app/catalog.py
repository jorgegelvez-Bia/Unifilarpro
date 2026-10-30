"""Catálogo de elementos del unifilar.

FUENTE ÚNICA DE VERDAD. El frontend recibe una copia en JSON generada con
`python scripts/export_catalog.py` (ver frontend/src/catalog/catalog.json).

Cada campo es (clave, etiqueta, valor_por_defecto):
  - lista  -> campo de opciones; la primera es la de por defecto.
  - "ref"  -> referencia a otro elemento del diagrama (id).
  - texto  -> campo libre con ese valor por defecto.
Copiado de `TYPES`, `COMMON` y `GROUPS` de UnifilarPro_Medida_Bia.html.
"""

from __future__ import annotations

from typing import Any

SIN_INDICAR = "Sin indicar"
SIN_ESPECIFICAR = "Sin especificar"

CALIBRES_RED = ["Sin indicar", "6 AWG", "4 AWG", "2 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG"]
DESCRIPCION_USUARIOS = ["Sin especificar", "Residencial", "Comercial", "Industrial"]

IRREGULARIDADES = [
    "Línea directa antes de los TC",
    "Conexión directa antes de la medida",
    "Línea directa antes del medidor",
    "Puente que salta el medidor",
    "Puente que salta los TC",
    "Acometida derivada antes del medidor",
    "Fase sin pasar por la medida",
    "TC puenteado o en cortocircuito",
    "TT desconectado o fusible abierto",
    "Polaridad invertida en TC",
    "Sellos violados o faltantes",
    "Medidor manipulado",
    "Bornera del medidor abierta",
    "Bloque de pruebas puenteado",
    "Otra",
]

TYPES: dict[str, dict[str, Any]] = {
    "transc": {"name": "Celda de transferencia", "short": "Celda de transferencia", "btn": "Celda de transferencia", "sub": "circuito 1 / 2", "fields": [
        ("nombre1", "Nombre del circuito 1", ""),
        ("nombre2", "Nombre del circuito 2", ""),
        ("tipo", "Tipo", ["Sin especificar", "Manual", "Automática"]),
        ("enUso", "Circuito conectado", ["Circuito 1", "Circuito 2"]),
    ]},
    "doble": {"name": "Doble circuito MT", "short": "Doble circuito", "btn": "Doble circuito", "sub": "MT respaldo", "fields": [
        ("nombre1", "Nombre del circuito 1", ""),
        ("nombre2", "Nombre del circuito 2", ""),
        ("uso", "Seccionadores", ["Ambos cerrados", "Cerrado circuito 1", "Cerrado circuito 2"]),
        ("cambio", "Cambio de circuito", ["Sin indicar", "Manual", "Automático"]),
    ]},
    "red": {"name": "Red", "short": "Red", "btn": "Red", "sub": "MT o BT", "fields": [
        ("circuito", "Nombre del circuito", ""),
        ("nivel", "Nivel", ["MT", "BT"]),
        ("tension", "Tensión", "13.2 kV"),
        ("fases", "Sistema", ["Sin indicar", "Trifásico", "Bifásico", "Monofásico"]),
        ("neutro", "Neutro", ["Sí", "No"]),
    ]},
    "lmt": {"name": "Líneas MT", "short": "Líneas MT", "btn": "Líneas MT", "sub": "red aérea", "fields": [
        ("lineas", "Número de líneas", ["1", "2", "3"]),
    ]},
    "cajam": {"name": "Caja de maniobras MT", "short": "Caja de maniobras MT", "btn": "Caja de maniobras MT", "sub": "derivación MT", "fields": [
        ("tension", "Nivel de tensión", ""),
        ("tipo", "Tipo", ["Sin indicar", "Barraje premoldeado", "Celda de maniobra (RMU)"]),
        ("clientes", "Otros clientes conectados", ""),
    ]},
    "rabi": {"name": "Red abierta", "short": "Red abierta", "btn": "Red abierta", "sub": "conductor desnudo BT", "fields": [
        ("sistema", "Sistema", ["Sin indicar", "Trifásica", "Bifásica", "Monofásica"]),
        ("calibre", "Calibre", CALIBRES_RED),
        ("material", "¿Cobre o aluminio?", ["Sin indicar", "Aluminio", "Cobre"]),
    ]},
    "rtren": {"name": "Red trenzada", "short": "Red trenzada", "btn": "Red trenzada", "sub": "cable trenzado BT", "fields": [
        ("sistema", "Sistema", ["Sin indicar", "Trifásica", "Bifásica", "Monofásica"]),
        ("calibre", "Calibre", CALIBRES_RED),
        ("material", "¿Cobre o aluminio?", ["Sin indicar", "Aluminio", "Cobre"]),
    ]},
    "cajab": {"name": "Caja de abonados", "short": "Caja de abonados", "btn": "Caja de abonados", "sub": "derivación BT", "fields": [
        ("material", "Material", ["Sin indicar", "Metálica", "Policarbonato"]),
        ("abonados", "Otros abonados que salen de la caja", ""),
    ]},
    "acom": {"name": "Acometida", "short": "Acometida", "btn": "Acometida", "sub": "conductores", "fields": [
        ("fasesA", "Sistema", ["Igual a la red", "Trifásica", "Bifásica", "Monofásica"]),
        ("tipo", "¿Subterránea o aérea?", ["Sin indicar", "Aérea", "Subterránea"]),
        ("neutro", "¿Lleva neutro?", ["Sí", "No"]),
        ("calibre", "Calibre de la acometida", ["Sin indicar", "8 AWG", "6 AWG", "4 AWG", "2 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG", "250 kcmil", "350 kcmil", "500 kcmil"]),
        ("porFase", "Número de cables por fase", ["Sin indicar", "1", "2", "3", "4"]),
        ("material", "¿Cobre o aluminio?", ["Sin indicar", "Cobre", "Aluminio"]),
    ]},
    "xlpe": {"name": "Cable XLPE", "short": "XLPE", "btn": "XLPE", "sub": "cable aislado", "fields": [
        ("subterraneo", "¿Subterráneo?", ["Sin indicar", "Sí", "No"]),
        ("calibre", "Calibre", ["Sin indicar", "2 AWG", "1/0 AWG", "2/0 AWG", "4/0 AWG", "250 kcmil", "350 kcmil", "500 kcmil"]),
    ]},
    "fus": {"name": "Cortacircuitos", "short": "Cortacircuitos", "btn": "Cortacirc.", "sub": "fusibles", "fields": [
        ("criterio", "Fusible", ["Automático según trafo", "Manual"]),
        ("corriente", "Capacidad del fusible", "10 A"),
        ("cantidad", "Cantidad", ["Sin indicar", "1", "2", "3"]),
    ]},
    "secc": {"name": "Seccionador", "short": "Seccionador", "btn": "Seccionador", "sub": "cuchillas", "fields": []},
    "seccp": {"name": "Seccionador principal", "short": "Seccionador principal", "btn": "Secc. principal", "sub": "cuchillas", "fields": []},
    "reco": {"name": "Reconectador", "short": "Reconectador", "btn": "Reconectador", "sub": "automático", "fields": []},
    "dps": {"name": "DPS", "short": "DPS", "btn": "DPS", "sub": "pararrayos", "fields": [
        ("buenos", "En buen estado", ["Sin indicar", "3", "2", "1", "0"]),
        ("malos", "Dañados", ["0", "1", "2", "3"]),
    ]},
    "spt": {"name": "Puesta a tierra", "short": "Puesta a tierra", "btn": "Tierra", "sub": "SPT", "fields": [
        ("para", "¿Para qué es?", ["DPS", "Transformador de potencia", "Gabinete de medidor", "Celda de medida"]),
    ]},
    "celda": {"name": "Celda de medida", "short": "Celda de medida", "btn": "Celda", "sub": "encierra equipos", "fields": [
        ("encierra", "Encierra (elementos siguientes)", "2"),
        ("nivel", "Nivel", ["Sin indicar", "MT", "BT"]),
        ("tipo", "Tipo", ["Sin indicar", "Metálica", "Policarbonato"]),
    ]},
    "tt": {"name": "TT", "short": "TT", "btn": "TT", "sub": "de tensión", "fields": [
        ("cantidad", "Cantidad de TT", ["Sin indicar", "1", "2", "3"]),
        ("relacion", "Relación", ""),
    ]},
    "tc": {"name": "TC", "short": "TC", "btn": "TC", "sub": "de corriente", "fields": [
        ("cantidad", "Cantidad de TC", ["Sin indicar", "1", "2", "3"]),
        ("relacion", "Relación", ""),
    ]},
    "bloque": {"name": "Bloque de pruebas principal", "short": "Bloque de pruebas principal", "btn": "Bloque principal", "sub": "bornera", "fields": []},
    "bloquer": {"name": "Bloque de pruebas respaldo", "short": "Bloque de pruebas respaldo", "btn": "Bloque respaldo", "sub": "bornera", "fields": []},
    "fasor": {"name": "Diagrama fasorial", "short": "Fasorial", "btn": "Diagrama fasorial", "sub": "V, I y ángulo", "noCommon": True, "fields": []},
    "conex": {"name": "Diagrama de conexiones", "short": "Conexiones", "btn": "Diagrama de conexiones", "sub": "cableado bornes", "noCommon": True, "fields": []},
    "irreg": {"name": "Irregularidad", "short": "Irregularidad", "btn": "Irregularidad", "sub": "puente, manipulación", "noCommon": True, "fields": [
        ("tipo", "Tipo de irregularidad", IRREGULARIDADES),
        ("desde", "Desde (dónde empieza)", "ref"),
        ("hasta", "Hasta (dónde termina)", "ref"),
        ("en", "¿En qué elemento?", "ref"),
        ("fase", "Fase(s) afectada(s)", ["Sin indicar", "R", "S", "T", "R y S", "R y T", "S y T", "Todas (R, S y T)", "Neutro", "No aplica"]),
        ("detalle", "Detalle", ""),
    ]},
    "gabinete": {"name": "Gabinete de medida", "short": "Gabinete", "btn": "Gabinete", "sub": "medidor y bloque", "fields": [
        ("material", "Material", ["Sin especificar", "Metálico", "Policarbonato"]),
        ("ubic", "Ubicación", ["Sin indicar", "Poste", "Subestación"]),
        ("uso", "Uso", ["Sin indicar", "Exclusivo", "Compartido"]),
        ("otrosCant", "Medidores de otros usuarios", "3"),
    ]},
    "subm": {"name": "Medida aguas abajo", "short": "Medida aguas abajo", "btn": "Medida", "mk": ["aguas abajo", "d"], "sub": "directa, semi o indirecta", "fields": [
        ("tipo", "Tipo de medida aguas abajo", ["Sin indicar", "Directa", "Semidirecta", "Indirecta"]),
    ]},
    "mdir": {"name": "Medidor de medida directa", "short": "Medidor medida directa", "btn": "Medidor", "mk": ["medida directa", "d"], "sub": "aguas abajo", "fields": []},
    "medidor": {"name": "Medidor principal", "short": "Medidor", "btn": "Medidor", "mk": ["principal", "p"], "sub": "kWh", "fields": []},
    "respaldo": {"name": "Medidor de respaldo", "short": "Medidor respaldo", "btn": "Medidor", "mk": ["respaldo", "r"], "sub": "kWh", "fields": []},
    "testigo": {"name": "Medidor testigo", "short": "Medidor testigo", "btn": "Medidor", "mk": ["testigo", "t"], "sub": "kWh", "fields": []},
    "trafo": {"name": "Transformador", "short": "Transformador", "btn": "Trafo", "sub": "potencia", "fields": [
        ("cantidad", "¿Cuántos transformadores?", "1"),
        ("configuracion", "¿Cómo están?", ["Independientes", "Banco de monofásicos"]),
        ("potencia", "kVA", ""),
        ("relacion", "Tensiones", ""),
    ]},
    "otros": {"name": "Otros usuarios", "short": "Otros usuarios", "btn": "Otros usuarios", "sub": "flecha a otros", "noCommon": True, "fields": [
        ("descripcion", "Tipo de usuarios", DESCRIPCION_USUARIOS),
    ]},
    "brkcli": {"name": "Breaker cliente", "short": "Breaker cliente", "btn": "Breaker cliente", "sub": "interruptor", "fields": [
        ("corriente", "Capacidad (A)", ""),
        ("polos", "Polos", ["Sin indicar", "3", "2", "1"]),
    ]},
    "barrmt": {"name": "Barraje de distribución MT", "short": "Barraje de distribución MT", "btn": "Barraje MT", "sub": "distribución", "fields": [
        ("sistema", "Sistema", ["Sin indicar", "Trifásico", "Bifásico", "Monofásico"]),
        ("salidas", "Otras salidas (circuitos)", ["Sin indicar", "1", "2", "3", "4", "5", "6"]),
    ]},
    "barraje": {"name": "Barraje principal", "short": "Barraje principal", "btn": "Barraje BT", "sub": "principal", "fields": [
        ("sistema", "Sistema", ["Trifásico", "Bifásico", "Monofásico"]),
    ]},
    "breaker": {"name": "Totalizador", "short": "Breaker Tot.", "btn": "Breaker totalizador", "sub": "interruptor", "fields": [
        ("cantidad", "¿Cuántos totalizadores?", "1"),
        ("corriente", "Capacidad (A)", ""),
        ("polos", "Polos", ["Sin indicar", "3", "2", "1"]),
    ]},
    "transfer": {"name": "Transferencia", "short": "Transferencia", "btn": "Transferencia", "sub": "red / planta", "fields": [
        ("tipo", "Tipo", ["Automática", "Manual"]),
        ("corriente", "Corriente", "200 A"),
    ]},
    "planta": {"name": "Planta de emergencia", "short": "Planta", "btn": "Planta", "sub": "generador", "fields": [
        ("potencia", "Potencia", "100 kVA"),
        ("marca", "Marca", ""),
    ]},
    "cond": {"name": "Banco de condensadores", "short": "Condensadores", "btn": "Condensador", "sub": "kVAr", "fields": [
        ("potencia", "Potencia", "50 kVAr"),
        ("pasos", "Pasos", "5"),
    ]},
    "carga": {"name": "Carga", "short": "Carga", "btn": "Carga", "sub": "tipo de usuario", "noCommon": True, "fields": [
        ("descripcion", "Tipo de usuario", DESCRIPCION_USUARIOS),
    ]},
}

COMMON = [
    ("estado", "Estado", ["Bueno", "Dañado", "Por revisar"]),
    ("obs", "Observación del estado", ""),
]

# (nombre, elementos, color claro, color oscuro)
GROUPS = [
    ("Red MT", ["red", "doble", "transc", "lmt", "barrmt", "cajam", "xlpe", "reco"], "#7B1FA2", "#C58AE0"),
    ("Protección MT", ["fus", "secc", "seccp", "dps", "spt"], "#C25E00", "#F5A04A"),
    ("Transformación", ["trafo", "otros"], "#1F6FD1", "#6FA8F5"),
    ("Red BT y acometida", ["rtren", "rabi", "cajab", "acom", "barraje"], "#A87400", "#E8C04A"),
    ("Medida", ["celda", "tt", "tc", "bloque", "bloquer", "medidor", "respaldo", "testigo", "mdir", "gabinete"], "#2E8B3A", "#6FCF7F"),
    ("Cargas y otros", ["breaker", "brkcli", "transfer", "planta", "cond", "carga"], "#C2185B", "#F06292"),
    ("Irregularidad", ["irreg"], "#C62828", "#F28B82"),
    ("Diagramas", ["conex", "fasor"], "#00796B", "#4DB6AC"),
]

MEDIDA_RAMAL = ["Sin indicar", "Directa", "Semidirecta", "Indirecta", "Solo carga"]

# Plantillas de diagrama nuevo: (tipo, valores que cambian respecto al catálogo).
TEMPLATES: dict[str, list[tuple[str, dict[str, str]]]] = {
    "vacio": [],
    "directa": [("red", {"nivel": "BT", "tension": "220/127 V"}), ("medidor", {"clase": "1", "energia": "Activa"}), ("breaker", {}), ("carga", {})],
    "semidirecta": [("red", {"nivel": "BT", "tension": "220/127 V"}), ("tc", {}), ("bloque", {}), ("medidor", {}), ("breaker", {}), ("carga", {})],
    "indirecta": [("red", {}), ("fus", {}), ("dps", {}), ("celda", {}), ("tt", {}), ("tc", {}), ("bloque", {}), ("medidor", {"marca": "Ejemplo", "serial": "000000"}), ("trafo", {}), ("breaker", {}), ("carga", {})],
    "distribucion": [("red", {}), ("fus", {}), ("dps", {}), ("trafo", {}), ("otros", {}), ("breaker", {}), ("carga", {})],
}


def fields_of(t: str) -> list[tuple[str, str, Any]]:
    """Campos de un tipo, incluyendo los comunes salvo que sea `noCommon`."""
    spec = TYPES[t]
    return list(spec["fields"]) if spec.get("noCommon") else list(spec["fields"]) + COMMON


def default_value(d: Any) -> str:
    if isinstance(d, list):
        return d[0]
    return "" if d == "ref" else d


def tr_fields(k: int) -> list[tuple[str, str, Any]]:
    """Campos extra por trafo cuando hay varios trafos independientes."""
    return [
        ("potencia" if k == 1 else f"potencia{k}", f"kVA trafo {k}", ""),
        (f"med{k}", f"Medida trafo {k}", MEDIDA_RAMAL),
        (f"secc{k}", f"Seccionador trafo {k}", ["No", "Sí"]),
    ]


def bk_fields(k: int) -> list[tuple[str, str, Any]]:
    """Campos extra por totalizador cuando hay varios totalizadores."""
    return [
        ("corriente" if k == 1 else f"corriente{k}", f"Capacidad (A) totalizador {k}", ""),
        ("polos" if k == 1 else f"polos{k}", f"Polos totalizador {k}", ["Sin indicar", "3", "2", "1"]),
        (f"med{k}", f"Medida totalizador {k}", MEDIDA_RAMAL),
    ]


def _field_json(f: tuple[str, str, Any]) -> dict[str, Any]:
    key, label, d = f
    if isinstance(d, list):
        return {"key": key, "label": label, "kind": "select", "options": d, "default": d[0]}
    if d == "ref":
        return {"key": key, "label": label, "kind": "ref", "default": ""}
    return {"key": key, "label": label, "kind": "text", "default": d}


def catalog_json() -> dict[str, Any]:
    """Catálogo en el formato que consume el frontend (y GET /api/catalog)."""
    types = {}
    for key, spec in TYPES.items():
        item = {
            "name": spec["name"],
            "short": spec["short"],
            "btn": spec["btn"],
            "sub": spec["sub"],
            "noCommon": bool(spec.get("noCommon")),
            "fields": [_field_json(f) for f in spec["fields"]],
        }
        if spec.get("mk"):
            item["mk"] = spec["mk"]
        types[key] = item
    return {
        "types": types,
        "common": [_field_json(f) for f in COMMON],
        "groups": [{"key": f"g{i}", "name": n, "items": items, "color": c, "colorDark": cd} for i, (n, items, c, cd) in enumerate(GROUPS)],
        "medidaRamal": MEDIDA_RAMAL,
        "templates": {k: [{"t": t, "over": over} for t, over in v] for k, v in TEMPLATES.items()},
    }
