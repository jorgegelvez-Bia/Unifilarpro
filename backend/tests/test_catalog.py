import json
from pathlib import Path

from app.catalog import COMMON, GROUPS, TEMPLATES, TYPES, catalog_json, fields_of, tr_fields, bk_fields

FRONT_JSON = Path(__file__).resolve().parents[2] / "frontend" / "src" / "catalog" / "catalog.json"


def test_grupos_en_orden():
    assert [g[0] for g in GROUPS] == [
        "Red MT", "Protección MT", "Transformación", "Red BT y acometida",
        "Medida", "Cargas y otros", "Irregularidad", "Diagramas",
    ]


def test_todos_los_botones_existen():
    for _, items, _, _ in GROUPS:
        for t in items:
            assert t in TYPES, t


def test_plantillas_usan_tipos_validos():
    for items in TEMPLATES.values():
        for t, _ in items:
            assert t in TYPES


def test_campos_comunes():
    assert fields_of("tc")[-2:] == COMMON
    assert fields_of("carga") == TYPES["carga"]["fields"]


def test_textos_de_botones():
    assert TYPES["barraje"]["btn"] == "Barraje BT"
    assert TYPES["breaker"]["short"] == "Breaker Tot."
    assert TYPES["breaker"]["btn"] == "Breaker totalizador"
    assert TYPES["gabinete"]["fields"][0][2] == ["Sin especificar", "Metálico", "Policarbonato"]


def test_campos_por_ramal():
    assert [f[0] for f in tr_fields(1)] == ["potencia", "med1", "secc1"]
    assert [f[0] for f in tr_fields(2)] == ["potencia2", "med2", "secc2"]
    assert [f[0] for f in bk_fields(3)] == ["corriente3", "polos3", "med3"]


def test_json_del_frontend_esta_al_dia():
    """Si falla: corre `python scripts/export_catalog.py` desde la raíz del repo."""
    assert json.loads(FRONT_JSON.read_text(encoding="utf-8")) == catalog_json()
