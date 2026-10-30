"""Genera frontend/src/catalog/catalog.json desde backend/app/catalog.py.

Uso (desde la raíz del repo):  python scripts/export_catalog.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.catalog import catalog_json  # noqa: E402

OUT = ROOT / "frontend" / "src" / "catalog" / "catalog.json"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog_json(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Catálogo exportado a {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
