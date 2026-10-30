# UnifilarPro Medida

App para armar el **diagrama unifilar de un sistema de medida de energía** en campo
(Bia Energy, Colombia). El técnico toca botones (red, trafo, TC, TT, bloque de pruebas,
medidor…) en el orden en que los ve, y la app arma el unifilar, revisa errores típicos
y exporta PNG y PDF.

Normas de referencia: **RETIE** (símbolos IEC 60617, código de colores) y
**Código de Medida CREG 038 de 2014**.

## Estado del proyecto

| Fase | Qué incluye | Estado |
|---|---|---|
| 1 | Repo, FastAPI, Vite + React, CI, README | ✅ |
| 2 | Catálogo + modelos (Python), exportación a JSON, botones por grupo y lista de elementos | ✅ |
| 5 | Reglas (tipo de medida, fusible, revisiones) en Python + copia TS + casos compartidos | ✅ (sin avisos de conexiones/fasorial) |
| 3 | Motor de dibujo SVG del unifilar (columna, medida al lado, gabinete, celda, irregularidades, leyenda RETIE, rótulo) | ✅ |
| 4 | Doble circuito, transferencia, ramales | ✅ dibujo · ⏳ prueba anti‑cruces de 1.000 diagramas (Playwright) |
| 6 | Exportar PNG / PDF | ⏳ |
| 7 | Diagrama de conexiones | ⏳ |
| 8 | Diagrama fasorial | ⏳ |
| 9 | Supabase (login, guardado, sincronización) + PWA sin internet | ⏳ |
| 10 | Despliegue + importar el frontend en Lovable | ⏳ |

La referencia funcional es la versión anterior en un solo archivo, `UnifilarPro_Medida_Bia.html`.

## Cómo está organizado

```
backend/    Python 3.12 + FastAPI (fuente oficial del catálogo y las reglas)
  app/catalog.py     catálogo de elementos = FUENTE ÚNICA DE VERDAD
  app/models.py      Diagram, Element, Project
  app/rules/         tipo de medida, fusible sugerido, revisiones, resúmenes
  app/storage/       guardado (SQLite local; Supabase en la fase 9)
  app/main.py        endpoints REST
frontend/   React + TypeScript + Vite + Tailwind (esto es lo que se importa en Lovable)
  src/catalog/       catalog.json (generado, no editar a mano)
  src/checks/        copia TS de las reglas, para trabajar sin internet
  src/diagram/       motor de dibujo SVG del unifilar (symbols.ts + engine.ts)
  src/store/         estado (Zustand)
  src/components/    botones por grupo, lista, formularios, revisiones
shared/test-cases/  casos JSON que deben dar igual en Python y en TypeScript
scripts/export_catalog.py   genera frontend/src/catalog/catalog.json
```

### Reglas importantes del código

- El **catálogo** se cambia solo en `backend/app/catalog.py`. Después se corre
  `python scripts/export_catalog.py`. Una prueba avisa si se olvidó.
- Si se cambia una **regla** en Python, hay que cambiar la copia en `frontend/src/checks/`.
  Las dos se prueban con los mismos casos de `shared/test-cases/`.
- El **dibujo** se hace en el navegador (SVG), para que funcione rápido y sin internet.

## Correrlo en tu computador

Necesitas **Python 3.12** y **Node.js 20 o más nuevo**.

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Queda en http://localhost:8000 (documentación automática en http://localhost:8000/docs).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. Las peticiones a `/api` van solas al backend.

### Pruebas

```bash
cd backend && pytest --cov=app/rules
```

```bash
cd frontend && npm test
```

GitHub Actions corre todas las pruebas y el build en cada push (`.github/workflows/ci.yml`).

## API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/catalog` | Catálogo de elementos, grupos y opciones |
| GET/POST/PUT/DELETE | `/api/diagrams` | Mis diagramas |
| POST | `/api/checks` | Revisiones de un diagrama |
| POST | `/api/fuse` | Fusible sugerido según el trafo |
| POST | `/api/meter-type` | Tipo de medida del diagrama |

## Claves y seguridad

Las claves van en un archivo `.env` (copia `.env.example`). El `.env` **nunca** se sube a GitHub.
El inicio de sesión (solo Jorge, con su correo) y la opción de dar acceso a otras personas
llegan en la fase 9 con Supabase; aquí se explicará paso a paso cómo invitar a alguien.
