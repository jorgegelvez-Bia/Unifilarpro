# Conectar la nube (Supabase) — paso a paso

Sin esto la app **funciona igual**, pero guarda los diagramas solo en el celular o PC donde los haces.
Con Supabase, tus diagramas quedan en tu cuenta y los ves en el celular y en el PC.

Tiempo: unos 20 minutos. Solo se hace una vez.

> 🔒 **Contraseñas y claves:** escríbelas solo en Supabase y en los archivos `.env`.
> **Nunca** las pegues en un chat, en un correo ni en GitHub.

---

## 1. Crear el proyecto

1. Entra a <https://supabase.com> y crea tu cuenta (puede ser con GitHub).
2. **New project**:
   - Nombre: `unifilarpro`
   - Contraseña de la base de datos: usa la que te propone y guárdala en tu gestor de contraseñas.
   - Región: **South America (São Paulo)**, la más cercana a Colombia.
3. Espera 1–2 minutos a que el proyecto quede listo.

## 2. Crear la tabla y los permisos

1. En el menú izquierdo: **SQL Editor** › **New query**.
2. Abre el archivo [`supabase/migrations/0001_diagrams.sql`](../supabase/migrations/0001_diagrams.sql) de este repositorio y copia todo.
3. Pégalo en Supabase. **En la última línea**, cambia `TU_CORREO@ejemplo.com` por tu correo, **en minúsculas**.
4. Toca **Run**. Debe decir *Success*.

Esto crea:

- la tabla `diagrams`;
- los permisos: cada persona ve **solo sus** diagramas, y solo si su correo está autorizado;
- la regla de que, si dos equipos cambian el mismo diagrama, **gana el cambio más reciente**.

## 3. Solo tú puedes entrar

1. **Authentication** › **Sign In / Providers**: deja **Email** activado y **apaga “Allow new users to sign up”**.
   Así nadie puede crearse una cuenta solo.
2. **Authentication** › **Users** › **Add user** › **Send invitation**: escribe tu correo.
   Te llega un correo de invitación: ábrelo una vez para confirmar.

## 4. Que el correo traiga un código (para la app instalada en el celular)

La app entra con un **código de 6 dígitos** o con un **enlace**. El código sirve mejor en la app
instalada, porque el enlace a veces abre el navegador en lugar de la app.

1. **Authentication** › **Emails** › plantilla **Magic Link**.
2. Agrega esta línea al mensaje (donde quieras):

   ```html
   <p>Tu código para entrar a UnifilarPro: <b>{{ .Token }}</b></p>
   ```

3. Guarda.

## 5. Direcciones permitidas

**Authentication** › **URL Configuration**:

- **Site URL**: la dirección donde publiques la app (fase 10). Mientras tanto: `http://localhost:5173`.
- **Redirect URLs**: agrega `http://localhost:5173` y, después, la dirección publicada.

## 6. Poner las claves en la app

1. **Project Settings** › **API Keys** (o **API**). Copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`);
   - la clave **anon** / **publishable**. **No** la *service_role* / *secret*.
2. En tu PC, dentro de la carpeta `frontend/`, crea un archivo llamado `.env` con:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=la-clave-anon-que-copiaste
   ```

   Este archivo **no se sube a GitHub** (ya está en `.gitignore`).
3. Para el servidor (backend), cuando lo publiques en la fase 10, se pone la variable
   `SUPABASE_URL` con la misma dirección.

## 7. Probar

```bash
cd frontend
npm run dev
```

Abre <http://localhost:5173> › **Mis diagramas** › **Tu cuenta** › escribe tu correo ›
**Enviarme el acceso** › escribe el código del correo › **Entrar**.

Arriba debe aparecer **✔ Sincronizado**. Los diagramas que ya tenías en el equipo se suben solos.

## Dar acceso a otra persona (más adelante)

1. En **SQL Editor**:

   ```sql
   insert into public.allowed_users (email) values ('correo.de.la.persona@bia.app');
   ```

2. **Authentication** › **Users** › **Add user** › **Send invitation** con ese correo.

Cada persona ve solo sus propios diagramas. Para quitar el acceso:

```sql
delete from public.allowed_users where email = 'correo.de.la.persona@bia.app';
```

## Instalar la app en el celular (Android)

1. Abre la dirección de la app en **Chrome**.
2. Menú **⋮** › **Instalar app** (o **Agregar a la pantalla principal**).
3. Queda con su ícono, como cualquier app. Abre **sin internet**: los diagramas se guardan en el
   celular y se suben solos cuando vuelve la señal.

## Qué significa el aviso de arriba

| Aviso | Qué pasa |
|---|---|
| Guardado en el celular | La nube no está configurada: todo queda en este equipo. |
| Sin sesión · guardado en el celular | Hay nube, pero no has entrado. |
| Sincronizando… | Subiendo o bajando cambios. |
| ✔ Sincronizado | Todo está en la nube. |
| Sin internet · 2 por subir | Hay cambios guardados en el celular que se subirán solos. |
| No se pudo sincronizar | En **Mis diagramas › Tu cuenta** aparece el motivo; se reintenta solo. |
