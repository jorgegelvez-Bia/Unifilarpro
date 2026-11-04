"""Quién hace la petición: se lee del token de inicio de sesión de Supabase.

La app manda `Authorization: Bearer <token>` (el mismo que le da Supabase al entrar).
El token se verifica con una de estas variables de entorno:
  SUPABASE_JWT_SECRET  secreto JWT del proyecto (Project Settings › API › JWT Secret), o
  SUPABASE_URL         dirección del proyecto: se usan sus llaves públicas (JWKS).
Solo para trabajar en el PC sin Supabase: UNIFILAR_DEV=1 acepta la cabecera X-User.
"""

from __future__ import annotations

import os
from functools import lru_cache

import jwt
from fastapi import Header, HTTPException

AUDIENCE = "authenticated"


@lru_cache(maxsize=4)
def _jwks(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{url.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_keys=True)


def verify_token(token: str) -> dict:
    """Devuelve los datos del token si es válido; si no, lanza 401."""
    secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    url = os.environ.get("SUPABASE_URL", "")
    try:
        if secret:
            return jwt.decode(token, secret, algorithms=["HS256"], audience=AUDIENCE)
        if url:
            key = _jwks(url).get_signing_key_from_jwt(token)
            return jwt.decode(token, key.key, algorithms=["ES256", "RS256"], audience=AUDIENCE)
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(401, "La sesión venció. Vuelve a entrar.") from e
    except (jwt.PyJWTError, ValueError) as e:
        raise HTTPException(401, "Sesión no válida. Vuelve a entrar.") from e
    raise HTTPException(503, "El servidor no tiene configurado Supabase (SUPABASE_JWT_SECRET o SUPABASE_URL).")


def current_user(authorization: str | None = Header(default=None), x_user: str | None = Header(default=None)) -> str:
    """Id del usuario (el `sub` del token de Supabase)."""
    if authorization and authorization.lower().startswith("bearer "):
        sub = verify_token(authorization[7:].strip()).get("sub")
        if not sub:
            raise HTTPException(401, "Sesión no válida. Vuelve a entrar.")
        return str(sub)
    if os.environ.get("UNIFILAR_DEV") == "1":
        return x_user or "local"
    raise HTTPException(401, "Inicia sesión para ver tus diagramas.")
