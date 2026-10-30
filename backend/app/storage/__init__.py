"""Guardado de diagramas.

Por ahora SQLite local (archivo `unifilar.db`). En la fase 9 se cambia por
Supabase (PostgreSQL + Row Level Security) usando la misma interfaz.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(os.environ.get("UNIFILAR_DB", Path(__file__).resolve().parents[2] / "unifilar.db"))


class SQLiteStore:
    def __init__(self, path: str | Path = DB_PATH):
        self.path = str(path)
        with self._conn() as c:
            c.execute(
                "CREATE TABLE IF NOT EXISTS diagrams ("
                " id TEXT NOT NULL, owner TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL,"
                " PRIMARY KEY (owner, id))"
            )

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def list(self, owner: str) -> list[dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute("SELECT body FROM diagrams WHERE owner=? ORDER BY updated DESC", (owner,)).fetchall()
        return [json.loads(r[0]) for r in rows]

    def get(self, owner: str, id: str) -> dict[str, Any] | None:
        with self._conn() as c:
            row = c.execute("SELECT body FROM diagrams WHERE owner=? AND id=?", (owner, id)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, owner: str, body: dict[str, Any]) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT OR REPLACE INTO diagrams (id, owner, body, updated) VALUES (?, ?, ?, ?)",
                (body["id"], owner, json.dumps(body, ensure_ascii=False), int(body.get("updated") or 0)),
            )

    def delete(self, owner: str, id: str) -> bool:
        with self._conn() as c:
            cur = c.execute("DELETE FROM diagrams WHERE owner=? AND id=?", (owner, id))
        return cur.rowcount > 0
