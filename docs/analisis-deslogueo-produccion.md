# Análisis: Deslogueo intermitente en producción

**Fecha:** 2026-07-02
**Síntoma reportado:** Usuarios marcan entrada, y un rato después el CRM los desloguea y les pide marcar entrada de nuevo. *"el crm me sigue deslogueando"*.

---

## Causa raíz: carrera en la rotación del refresh token (sin single-flight)

El deslogueo **no** viene del módulo de asistencia. Viene del flujo de refresh de JWT. Hay tres piezas que combinadas producen el logout:

### 1. El access token dura solo 15 minutos
`backend/.env.production` → `JWT_ACCESS_EXPIRATION="15m"`. Cada ~15 min el token expira y el siguiente request devuelve 401.

### 2. El refresh token se **rota** en cada refresh (uno solo válido por usuario)
`backend/src/modules/auth/auth.service.ts` → `refreshTokens()`:
- Genera un refresh token nuevo, lo hashea con bcrypt y **sobrescribe** `user.refreshToken` en la DB.
- Solo existe **un** refresh token válido por usuario a la vez. El anterior queda inválido inmediatamente.

### 3. El interceptor de axios **no** tiene mutex / single-flight
`frontend/src/api/axios.ts`:
- El flag `originalRequest._retry` evita reintentar el **mismo** request dos veces, pero **no** coordina requests distintos concurrentes.
- Cuando varios requests reciben 401 al mismo tiempo, **cada uno** llama a `authStore.refreshAccessToken()` de forma independiente.

### La secuencia que produce el logout
1. Pasan ~15 min → el access token expira.
2. Un **burst de requests concurrentes** golpea la API a la vez (ver disparadores abajo), todos con 401.
3. El primer refresh gana: rota el refresh token en la DB.
4. El segundo/tercer refresh todavía llevan el refresh token **viejo** (lo leyeron del store antes de que el primero lo actualizara) → `bcrypt.compare` falla → `UnauthorizedException('Invalid refresh token')`.
5. El `catch` del interceptor (y del store) llama a `logout()` → se limpia `localStorage` → usuario deslogueado → vuelve a la pantalla de login / "marca entrada".

### Disparadores del burst concurrente (por qué pasa "un rato después")
- **`refetchOnWindowFocus`** de React Query está activo por defecto (no se desactiva en `frontend/src/App.tsx`). Al volver a la pestaña, **todas** las queries refetchean a la vez.
- **Polling cada minuto**: `useMyAttendance` y `useAttendance` usan `refetchInterval: 60000`, generando requests concurrentes de forma constante.
- La carga del dashboard dispara múltiples queries en paralelo.

Justo después de que expira el access token de 15 min, el siguiente burst (focus de ventana, poll del minuto, carga de página) genera varios 401 simultáneos → el primero refresca, los demás invalidan el token ya rotado → logout.

---

## Factor agravante: un solo refresh token por usuario en toda la DB
Como solo hay **un** `refreshToken` por fila de usuario:
- Dos pestañas del mismo usuario se pelean el token: la pestaña B refresca y rota, la pestaña A falla en su siguiente refresh → logout.
- **Dev y staging comparten la misma DB de Railway** (ver memoria del proyecto). Si el mismo usuario entra en dev y staging, se invalidan mutuamente. (Producción tiene DB separada, pero el problema de multi-pestaña/multi-dispositivo persiste.)

---

## Recomendaciones (orden de impacto)

1. **Single-flight refresh en el interceptor (fix principal).** Compartir una única promesa de refresh en vuelo: si ya hay un refresh en curso, los demás requests esperan a esa misma promesa en lugar de disparar su propio refresh. Encolar los requests con 401 y reintentarlos con el token nuevo. Elimina la carrera de raíz.

2. **Guardar `refreshAccessToken()` en el store** con la misma promesa compartida (evita rotaciones simultáneas desde el store).

3. **Tolerancia a la rotación en el backend** (opcional pero robusto): permitir una ventana de gracia corta o soportar múltiples refresh tokens por sesión/dispositivo (tabla de sesiones) en vez de un único campo `refreshToken`. Esto arregla también el caso multi-pestaña/multi-dispositivo.

4. **Desactivar `refetchOnWindowFocus`** globalmente o subir `staleTime`, para reducir los bursts concurrentes.

5. **Considerar subir `JWT_ACCESS_EXPIRATION`** (p. ej. 30–60m) como mitigación temporal — reduce la frecuencia de la ventana de carrera, pero **no** la elimina; el fix real es el punto 1.

---

## Estado de implementación (2026-07-02)

Todo en `frontend/src/store/authStore.ts` (+ comentario en `frontend/src/api/axios.ts`):

- ✅ **Single-flight intra-pestaña** (puntos 1 y 2): `refreshInFlight` comparte una única promesa; el interceptor delega en `refreshAccessToken()`.
- ✅ **Caso A — multipestaña mismo navegador**: refresh serializado con `navigator.locks.request('auth-refresh', ...)` (con fallback); al obtener el lock se re-hidrata el token de `localStorage` y, si otra pestaña ya lo rotó, se adopta sin refrescar. Listener `storage` sincroniza el token nuevo y propaga el logout entre pestañas.
- ✅ **Guard anti-resurrección de sesión** (security-high): tras `authApi.refresh()` y tras `authApi.me()` se verifica `if (!get().isAuthenticated) return;` antes de cada `set`. Evita que un refresh en vuelo que resuelve **después** de un logout reescriba tokens y reviva la sesión (funciona porque `logout()` pone `isAuthenticated: false` de forma síncrona antes de su `await`).
- ⏳ **Pendiente — multi-dispositivo** (punto 3): requiere backend con tabla `refresh_tokens` (N por usuario) en vez de la columna única `user.refreshToken`. No resoluble solo en cliente (no comparten `localStorage` ni Web Locks).
- ⏳ **Pendiente — mitigaciones** (puntos 4 y 5): `refetchOnWindowFocus` / `staleTime` y `JWT_ACCESS_EXPIRATION`.

---

## Archivos clave
- `frontend/src/api/axios.ts` — interceptor 401 sin single-flight (fix principal aquí).
- `frontend/src/store/authStore.ts` — `refreshAccessToken()` / `logout()`.
- `backend/src/modules/auth/auth.service.ts` — `refreshTokens()` rota y sobrescribe el refresh token.
- `frontend/src/App.tsx` — config de React Query (`refetchOnWindowFocus`, `staleTime`).
- `backend/.env.production` — `JWT_ACCESS_EXPIRATION="15m"`.
