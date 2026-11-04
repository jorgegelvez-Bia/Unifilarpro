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
| 5 | Reglas (tipo de medida, fusible, revisiones) en Python + copia TS + casos compartidos | ✅ |
| 3 | Motor de dibujo SVG del unifilar (columna, medida al lado, gabinete, celda, irregularidades, leyenda RETIE, rótulo) | ✅ |
| 4 | Doble circuito, transferencia, ramales + prueba anti‑cruces (1.000 diagramas al azar, 0 choques, en CI) | ✅ |
| 6 | Exportar imagen PNG (4×, máx. ~14 MP, fuentes incluidas) e informe PDF (proyecto, diagrama, equipos, revisiones, firmas) | ✅ |
| 7 | Diagrama de conexiones (8 tipos, bornera asimétrica/simétrica, 4 bloques, respaldo, 27 medidores con lupa, Aron, novedades de cableado en el dibujo y en Revisiones) | ✅ |
| 8 | Diagrama fasorial (trifásico, bifásico, monofásico y Aron; ángulos en grados o FP; tabla V, I, φ, FP, P, Q; avisos en Revisiones) | ✅ |
| 9 | Supabase (entrar con el correo, solo correos autorizados, sincronización) + guardado en el celular (IndexedDB) + PWA instalable que abre sin internet | ✅ (falta que crees tu proyecto: [docs/SUPABASE.md](docs/SUPABASE.md)) |
| 10 | Publicar: app en Netlify, servidor en Render, copia del frontend para Lovable (rama `lovable`) | ✅ (falta que crees las cuentas: [docs/PUBLICAR.md](docs/PUBLICAR.md)) |

La referencia funcional es la versión anterior en un solo archivo, `UnifilarPro_Medida_Bia.html`.

## Cómo está organizado

```
backend/    Python 3.12 + FastAPI (fuente oficial del catálogo y las reglas)
  app/catalog.py     catálogo de elementos = FUENTE ÚNICA DE VERDAD
  app/models.py      Diagram, Element, Project
  app/rules/         tipo de medida, fusible sugerido, revisiones, resúmenes
  app/storage/       guardado del backend (SQLite)
  app/auth.py        verifica la sesión de Supabase
  app/main.py        endpoints REST
frontend/   React + TypeScript + Vite + Tailwind (esto es lo que se importa en Lovable)
  src/catalog/       catalog.json (generado, no editar a mano)
  src/checks/        copia TS de las reglas, para trabajar sin internet
  src/diagram/       motor de dibujo SVG del unifilar (symbols.ts + engine.ts)
  src/store/         estado (Zustand) guardado en el celular (IndexedDB)
  src/sync/          sincronización con Supabase (funciona sin internet)
  src/export/        imagen PNG e informe PDF
  src/components/    botones por grupo, lista, formularios, revisiones
shared/test-cases/  casos JSON que deben dar igual en Python y en TypeScript
supabase/migrations/  tabla y permisos (RLS) de la nube
docs/SUPABASE.md    guía paso a paso para conectar la nube
docs/PUBLICAR.md    guía paso a paso para publicar (Netlify, Render, Lovable)
netlify.toml        cómo Netlify construye y publica la app
render.yaml         cómo Render publica el servidor
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

Prueba anti-cruces en navegador (la primera vez: `npx playwright install chromium`):

```bash
cd frontend && npm run test:e2e
```

Dibuja 1.000 diagramas al azar y revisa que ningún texto, símbolo, línea o caja se monte
sobre otro. Si algo falla, el mensaje dice el número del diagrama; para verlo, abre
`http://localhost:5173/e2e/harness.html` con `npm run dev` y escribe en la consola
`showDiagram(número)`.

Las mismas pruebas tocan «Imagen PNG» e «Informe PDF» en la app y revisan los archivos.
Para mirarlos tú mismo: `EXPORT_DIR=<carpeta> npm run test:e2e` los guarda en esa carpeta.

GitHub Actions corre todas las pruebas y el build en cada push (`.github/workflows/ci.yml`).

## Publicar

App en **Netlify**, servidor en **Render** y copia del frontend para **Lovable**: paso a paso en
**[docs/PUBLICAR.md](docs/PUBLICAR.md)**. Después de configurarlos, cada cambio en `main` se publica solo.
La rama `lovable` (solo la carpeta `frontend/`) la mantiene `.github/workflows/lovable.yml`;
no se edita a mano.

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
Se entra con el correo (código o enlace, sin contraseña). Solo pueden entrar los correos de la
tabla `allowed_users`, y cada persona ve solo sus diagramas (Row Level Security). Cómo crear el
proyecto, poner las claves y dar acceso a otra persona: **[docs/SUPABASE.md](docs/SUPABASE.md)**.

El backend solo acepta el token de sesión de Supabase. Para trabajar en el PC sin Supabase
existe `UNIFILAR_DEV=1` (acepta la cabecera `X-User`); nunca se usa en el servidor publicado.
