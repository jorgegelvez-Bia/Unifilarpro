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


# ---- Sesión de Supabase (fase 9)
import time  # noqa: E402

import jwt  # noqa: E402

SECRET = "secreto-de-prueba-que-no-es-real-0123456789"


def _tok(sub="u-jorge", aud="authenticated", exp=None, secret=SECRET):
    return jwt.encode({"sub": sub, "aud": aud, "exp": exp or int(time.time()) + 600, "email": "j@ejemplo.com"}, secret, algorithm="HS256")


def test_token_de_supabase(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    h = {"Authorization": "Bearer " + _tok()}
    r = client.post("/api/diagrams", json={**DIAG, "id": "d9", "p": {"nombre": "Planta"}}, headers=h)
    assert r.status_code == 201
    assert len(client.get("/api/diagrams", headers=h).json()) == 1
    # Otro usuario no ve los diagramas de Jorge.
    assert client.get("/api/diagrams", headers={"Authorization": "Bearer " + _tok("u-ana")}).json() == []


def test_token_malo(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    for tok, msg in [
        (_tok(exp=int(time.time()) - 10), "venció"),
        (_tok(secret="otro-secreto-cualquiera-0123456789abc"), "no válida"),
        (_tok(aud="anon"), "no válida"),
        ("basura", "no válida"),
        (jwt.encode({"aud": "authenticated", "exp": int(time.time()) + 60}, SECRET, algorithm="HS256"), "no válida"),
    ]:
        r = client.get("/api/diagrams", headers={"Authorization": "Bearer " + tok})
        assert r.status_code == 401 and msg in r.json()["detail"]


def test_sin_sesion_fuera_del_modo_pc(client, monkeypatch):
    monkeypatch.delenv("UNIFILAR_DEV")
    r = client.get("/api/diagrams", headers={"X-User": "alguien"})
    assert r.status_code == 401 and "Inicia sesión" in r.json()["detail"]
    # Las reglas no necesitan sesión.
    assert client.post("/api/meter-type", json=DIAG).status_code == 200


def test_servidor_sin_supabase(client, monkeypatch):
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    r = client.get("/api/diagrams", headers={"Authorization": "Bearer " + _tok()})
    assert r.status_code == 503


def test_llaves_publicas_jwks(client, monkeypatch):
    """Proyectos nuevos de Supabase firman con llave asimétrica (ES256) publicada en JWKS."""
    from cryptography.hazmat.primitives.asymmetric import ec

    from app import auth

    priv = ec.generate_private_key(ec.SECP256R1())

    class FakeJWKS:
        def get_signing_key_from_jwt(self, token):
            return jwt.PyJWK.from_dict({**jwt.algorithms.ECAlgorithm.to_jwk(priv.public_key(), as_dict=True), "alg": "ES256"})

    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://proyecto.supabase.co")
    monkeypatch.setattr(auth, "_jwks", lambda url: FakeJWKS())
    tok = jwt.encode({"sub": "u-es", "aud": "authenticated", "exp": int(time.time()) + 60}, priv, algorithm="ES256")
    assert client.get("/api/diagrams", headers={"Authorization": "Bearer " + tok}).status_code == 200


def test_cliente_jwks_usa_la_url_del_proyecto():
    from app import auth

    c = auth._jwks("https://proyecto.supabase.co/")
    assert c.uri == "https://proyecto.supabase.co/auth/v1/.well-known/jwks.json"
