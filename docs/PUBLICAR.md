# Publicar la app — paso a paso

Al final vas a tener:

| Qué | Dónde | Para qué |
|---|---|---|
| **La app** | Netlify (`https://unifilarpro.netlify.app` o parecido) | La abres en el celular y la instalas. |
| **El servidor** (reglas en Python) | Render (`https://unifilarpro-api.onrender.com`) | Reglas oficiales y API. La app **no lo necesita** para trabajar: tiene su copia de las reglas y funciona sin internet. |
| **La nube** (tus diagramas) | Supabase | Ver tus diagramas en el celular y en el PC. |
| **Copia para Lovable** | Lovable | Hacer cambios visuales hablando con Lovable. |

Todo se puede hacer con planes gratuitos. Tiempo: una hora, una sola vez.
Después, **cada cambio que se suba a GitHub se publica solo** en Netlify y en Render.

> 🔒 Las claves se escriben **solo** en Supabase, Netlify, Render o Lovable. Nunca en el chat, en un correo ni en GitHub.

---

## Paso 0. La nube (Supabase)

Si no lo has hecho, sigue primero **[SUPABASE.md](SUPABASE.md)** (pasos 1 a 4).
Ten a mano la **Project URL** y la clave **anon / publishable** (Project Settings › API Keys).

## Paso 1. La app en Netlify

1. Entra a <https://app.netlify.com> y crea la cuenta **con GitHub** (botón *GitHub*).
2. **Add new project** › **Import an existing project** › **GitHub**.
   Si pregunta, deja que Netlify vea el repositorio **Unifilarpro**.
3. Escoge **Unifilarpro**. Netlify lee solo el archivo `netlify.toml` y llena todo
   (carpeta `frontend`, comando `npm run build`, publicar `dist`). No cambies nada.
4. Antes de publicar, en **Environment variables** › **Add variable** agrega dos:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | tu Project URL (`https://….supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | la clave **anon / publishable** (nunca la *service_role* / *secret*) |

5. **Deploy**. Espera 2–3 minutos hasta que diga **Published**.
6. Para un nombre bonito: **Project configuration** › **Change project name** › `unifilarpro`
   (si está ocupado, prueba `unifilarpro-bia`). Anota la dirección, por ejemplo
   `https://unifilarpro.netlify.app`.

> Si agregas o cambias las variables después, ve a **Deploys** › **Trigger deploy** ›
> **Deploy project** para que la app las tome.

## Paso 2. Decirle a Supabase la dirección de la app

En Supabase › **Authentication** › **URL Configuration**:

- **Site URL**: la dirección de Netlify (`https://unifilarpro.netlify.app`).
- **Redirect URLs**: agrega la misma dirección. Deja también `http://localhost:5173`.

Sin esto, el enlace del correo te mandaría a una dirección equivocada (el código de 6 dígitos sí funciona igual).

## Paso 3. El servidor en Render

1. Entra a <https://dashboard.render.com> y crea la cuenta **con GitHub**.
2. **New** › **Blueprint** › escoge el repositorio **Unifilarpro**
   (si no aparece: *Configure account* y dale permiso a ese repositorio).
3. Render lee el archivo `render.yaml` y muestra el servicio **unifilarpro-api** (plan *Free*).
   Te pide dos valores:

   | Variable | Qué poner |
   |---|---|
   | `CORS_ORIGINS` | la dirección de Netlify, **sin** `/` al final: `https://unifilarpro.netlify.app` |
   | `SUPABASE_URL` | tu Project URL de Supabase |

4. **Apply** / **Deploy Blueprint**. Espera unos 5 minutos.
5. Prueba: abre `https://unifilarpro-api.onrender.com/api/health` (tu dirección puede variar).
   Debe decir `"status":"ok"`. En `…/docs` está la documentación de la API.

Cosas del plan gratis de Render, para que no te asustes:

- Si nadie lo usa en 15 minutos, **se duerme**. La primera visita después tarda 30–60 segundos.
- El archivo de diagramas propio del servidor (SQLite) **se borra** cada vez que se publica.
  Tus diagramas de verdad están en el celular y en **Supabase**, no ahí.

## Paso 4. Instalar la app en el celular

1. En el celular abre la dirección de Netlify en **Chrome**.
2. Menú **⋮** › **Instalar app** (o *Agregar a la pantalla principal*).
3. Ábrela desde el ícono › **Mis diagramas** › **Tu cuenta** › tu correo › **Enviarme el acceso** ›
   escribe el código de 6 dígitos › **Entrar**. Arriba debe salir **✔ Sincronizado**.

Cuando se publique una versión nueva, la app se actualiza sola la próxima vez que la abras con internet.

## Paso 5. Llevar el frontend a Lovable

Lovable **no puede conectarse a un repositorio que ya existe** y necesita la app en la raíz.
Por eso GitHub mantiene sola una rama llamada **`lovable`** que tiene **solo** la carpeta
`frontend/`, siempre al día.

1. En GitHub, abre el repositorio › selector de ramas (dice `main`) › escoge **`lovable`**.
2. **Code** › **Download ZIP**. Se baja `Unifilarpro-lovable.zip`.
3. Entra a <https://lovable.dev> › nuevo proyecto › **importar / subir código (Upload)** ›
   escoge el ZIP. (Si ves la opción *Import from GitHub*, también sirve: escoge el repositorio
   **Unifilarpro** y la rama **`lovable`**.)
4. Si Lovable ofrece conectar **Supabase**, conecta el proyecto **unifilarpro** que ya creaste
   (no crees uno nuevo). Si no lo ofrece, en la configuración del proyecto agrega las mismas dos
   variables del paso 1.
5. Lovable crea **su propio** repositorio en GitHub con esa copia.

**Importante — dónde vive la app de verdad:**

- La fuente oficial es **este** repositorio (`Unifilarpro`, rama `main`): aquí están las reglas en
  Python, las pruebas (incluida la de 0 cruces) y lo que publica Netlify.
- Lo que cambies en Lovable queda en la copia de Lovable y **no vuelve solo** aquí.
  Úsalo para probar ideas de pantalla. Cuando algo te guste, pídeme pasarlo al repositorio
  principal: así se corren todas las pruebas antes de publicarlo.
- En Lovable **no cambies** `src/checks/`, `src/diagram/` ni `src/catalog/catalog.json`:
  son las reglas y el dibujo, y deben coincidir con Python.

## Cómo se actualiza todo después

```
cambio en GitHub (main) ──► pruebas en GitHub (CI)
                        ├─► Netlify publica la app nueva (2–3 min)
                        ├─► Render publica el servidor nuevo (~5 min)
                        └─► la rama lovable se pone al día
```

## Si algo falla

| Qué ves | Qué hacer |
|---|---|
| Netlify: *Build failed* | **Deploys** › el que falló › copia las últimas líneas del registro y mándamelas (no tienen claves). |
| La app dice «Guardado en el celular» y no ofrece entrar | Faltan las variables del paso 1, o no volviste a publicar después de ponerlas. |
| El enlace del correo abre `localhost` | Revisa el paso 2. Mientras tanto usa el código de 6 dígitos. |
| Render: *Deploy failed* | **Logs** del servicio › copia las últimas líneas y mándamelas. |
| `/api/health` tarda mucho | Normal en el plan gratis si estaba dormido; espera un minuto. |
