"""Pruebas puntuales de reglas que no cubren los casos compartidos."""

from app.rules import apply_auto_fuse, checks, fill_defaults, fuse_for, meter_type, summary
from app.rules.common import grp_of, js_number, num_txt
from app.rules.summary import celda_sel, fase_text, irr_label


def D(*els):
    return fill_defaults({"els": [{"id": str(i), **e} for i, e in enumerate(els)]})


def S(t, **f):
    d = D({"t": t, "f": f})
    return summary(d["els"][0], d)


def test_resumenes_por_tipo():
    assert S("transc", tipo="Manual", nombre2="Pamplona", enUso="Circuito 2") == "Manual · conectado: Pamplona"
    assert S("transc") == "conectado: Circuito 1"
    assert S("conex", tipo="Directa trifásica") == "Directa trifásica"
    assert S("lmt", lineas="1") == "1 línea"
    assert S("lmt", lineas="3") == "3 líneas"
    assert S("cajam", clientes="1", tension="13.2 kV") == "13.2 kV · 1 cliente"
    assert S("cajam", clientes="4") == "4 clientes"
    assert S("cajab", abonados="1") == "1 abonado"
    assert S("cajab", abonados="15", material="Metálica") == "Metálica · 15 abonados"
    assert S("acom", fasesA="Trifásica", tipo="Aérea", calibre="2 AWG", porFase="1", material="Cobre") == "Trifásica · Aérea · 2 AWG · 1 cable por fase · Cobre"
    assert S("acom", porFase="2") == "2 cables por fase"
    assert S("xlpe", subterraneo="Sí", calibre="2 AWG") == "Subterráneo · 2 AWG"
    assert S("xlpe", subterraneo="No") == "Aéreo"
    assert S("spt", para="DPS") == "Para DPS"
    assert S("dps", buenos="1", malos="0") == "1 bueno"
    assert S("dps", buenos="0", malos="2") == "0 buenos · 2 dañados"
    assert S("brkcli", corriente="100 A", polos="2") == "100 A · 2P"
    assert S("breaker", corriente="100 A", polos="Sin indicar") == "100 A"
    assert S("doble", uso="Ambos cerrados", nombre1="Toledo") == "Toledo"
    assert S("doble", uso="Cerrado circuito 2") == "Cerrado circuito 2"
    assert S("gabinete", uso="Exclusivo") == "Exclusivo"
    assert S("cond") == "50 kVAr · 5 pasos"
    assert S("trafo", cantidad="2", potencia="", potencia2="") == "2 trafos independientes"
    assert S("trafo", potencia="150", relacion="13.2 kV / 220-127 V") == "150 kVA · 13.2 kV / 220-127 V"
    assert S("irreg", tipo="Otra", detalle="") == "Irregularidad"
    assert S("irreg", tipo="TC puenteado o en cortocircuito", fase="R y S", detalle="con alambre") == "TC puenteado o en cortocircuito · fases R y S · con alambre"


def test_textos_de_fase():
    assert fase_text({"fase": "Neutro"}) == "En el neutro"
    assert fase_text({"fase": "No aplica"}) == ""
    assert fase_text({"fase": "T"}) == "Fase T"
    assert irr_label({"tipo": "Otra", "detalle": " Cable "}) == "Cable"


def test_celda_por_cantidad():
    d = D({"t": "red"}, {"t": "celda", "f": {"encierra": "2"}}, {"t": "fus"}, {"t": "dps"}, {"t": "trafo"})
    assert celda_sel(d, d["els"][1]) == ["2", "3"]
    assert summary(d["els"][1], d) == "encierra 2 equipos"
    d["els"][1]["f"]["incl"] = ["2"]
    assert summary(d["els"][1], d) == "encierra 1 equipo"


def test_ramal_de_elementos():
    d = D({"t": "trafo", "f": {"cantidad": "3"}}, {"t": "medidor", "rama": 5}, {"t": "carga"})
    t, m, c = d["els"]
    assert grp_of(d, t) == 0 and grp_of(d, m) == 3 and grp_of(d, c) == 0


def test_tipo_de_medida_por_ramal():
    d = D({"t": "trafo", "f": {"cantidad": "3", "med1": "Directa", "med2": "Directa"}})
    assert meter_type(d) == "Directa (trafo 1, 2)"
    d = D({"t": "trafo", "f": {"cantidad": "2"}}, {"t": "tc", "rama": 1}, {"t": "tc", "rama": 2})
    assert meter_type(d) == "Semidirecta"
    d = D({"t": "trafo", "f": {"cantidad": "2", "med1": "Solo carga"}})
    assert meter_type(d) == "Directa"
    d = D({"t": "medidor"}, {"t": "breaker"}, {"t": "medidor"})
    assert meter_type(d) == "Directa + directa"


def test_fusible_automatico():
    d = D({"t": "red", "f": {"fases": "Trifásico"}}, {"t": "fus"}, {"t": "trafo", "f": {"potencia": "150"}}, {"t": "fus"})
    apply_auto_fuse(d)
    assert d["els"][1]["f"]["corriente"] == "10 A tipo K"
    assert d["els"][3]["f"]["corriente"] == "10 A"  # después del trafo no se toca
    assert apply_auto_fuse(D({"t": "fus"}))["els"][0]["f"]["corriente"] == "10 A"


def test_fusible_casos_limite():
    assert fuse_for(D({"t": "trafo", "f": {"potencia": "99999", "relacion": "0.1 kV"}})) is None
    r = fuse_for(D({"t": "red", "f": {"tension": "x kV"}}, {"t": "trafo", "f": {"potencia": "45"}}))
    assert r["kv"] == 13.2 and r["amp"] == 3


def test_revisiones_ramal_y_estado():
    d = D({"t": "trafo", "f": {"cantidad": "2", "med1": "Indirecta"}}, {"t": "medidor", "rama": 1}, {"t": "tc", "rama": 1})
    assert {"level": "warn", "text": "Trafo 1: la medida indirecta lleva TC y TT."} in checks(d)
    d = D({"t": "medidor", "f": {"estado": "Dañado", "obs": "roto"}})
    assert checks(d)[0] == {"level": "bad", "text": "Medidor principal dañado: roto."}
    d = D({"t": "dps", "f": {"estado": "Dañado", "malos": "2", "buenos": "1", "obs": "quemados"}})
    assert checks(d)[0]["text"] == "DPS: 2 dañados y 1 en buen estado (quemados)."
    d = D({"t": "tt"})
    assert "Hay TT pero no TC: la medida indirecta usa ambos." in [c["text"] for c in checks(d)]
    d = D({"t": "medidor"}, {"t": "otros"})
    assert checks(d)[0]["text"].startswith("Hay otros usuarios conectados después del medidor")


def test_utilidades():
    assert js_number("abc") is None and js_number("") == 0.0
    assert num_txt(0.5) == "0.5" and num_txt(12.0) == "12"
