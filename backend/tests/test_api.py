import pytest
from fastapi.testclient import TestClient

from app import main
from app.storage import SQLiteStore


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "_store", SQLiteStore(tmp_path / "t.db"))
    return TestClient(main.app)


DIAG = {"els": [
    {"id": "a", "t": "red", "f": {"nivel": "MT", "fases": "Trifásico"}},
    {"id": "b", "t": "trafo", "f": {"potencia": "75"}},
    {"id": "c", "t": "tc", "f": {}},
]}


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_catalog(client):
    c = client.get("/api/catalog").json()
    assert "red" in c["types"] and len(c["groups"]) == 8


def test_reglas(client):
    assert client.post("/api/meter-type", json=DIAG).json() == {"meterType": "Semidirecta"}
    assert client.post("/api/fuse", json=DIAG).json()["text"] == "5 A tipo K"
    texts = [c["text"] for c in client.post("/api/checks", json=DIAG).json()]
    assert any("bloque de pruebas" in t for t in texts)
    assert client.post("/api/fuse", json={"els": []}).json() is None


def test_crud_diagramas(client):
    d = {"id": "d1", "p": {"nombre": "Prueba", "fecha": "2026-10-30"}, "els": DIAG["els"], "updated": 1}
    assert client.post("/api/diagrams", json=d).status_code == 201
    assert [x["id"] for x in client.get("/api/diagrams").json()] == ["d1"]
    # Otro usuario no lo ve
    assert client.get("/api/diagrams", headers={"X-User": "otra"}).json() == []
    d["p"]["nombre"] = "Cambiado"
    assert client.put("/api/diagrams/d1", json=d).json()["p"]["nombre"] == "Cambiado"
    assert client.put("/api/diagrams/xx", json=d).status_code == 400
    assert client.get("/api/diagrams/d1").json()["p"]["nombre"] == "Cambiado"
    assert client.delete("/api/diagrams/d1").status_code == 204
    assert client.get("/api/diagrams/d1").status_code == 404
    assert client.delete("/api/diagrams/d1").status_code == 404
