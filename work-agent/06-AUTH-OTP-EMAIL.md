# 06 · Autenticación (OTP por email) y envío de correo

**Última actualización:** 2026-07-18
**Para qué sirve este documento:** es la fuente de verdad del subsistema de autenticación de App UPM. Describe el flujo OTP completo (front → API → SMTP → JWT), los parámetros de seguridad reales, la configuración SMTP en producción, el HTML del email y las claves de `localStorage` del cliente. Si vas a tocar login, sesión, sync autenticado o entregabilidad de correo, leé esto primero.

Todo lo que sigue fue verificado el 2026-07-18 leyendo el código en `main` (`ace8dc4`) y golpeando producción con `curl` / `dig` / `railway variables`. Lo que no pude verificar está marcado **(verificar)**.

---

## 1. Mapa de archivos

| Archivo | Rol |
|---|---|
| `server/src/routes/auth.ts` | Endpoints `POST /auth/request-code` y `POST /auth/verify`; `deriveName()`; `upsertOperator()` |
| `server/src/lib/otp.ts` | Generación/verificación del código. Store en memoria, hash, TTL, cooldown, intentos |
| `server/src/lib/mailer.ts` | Transport nodemailer + `otpEmailHtml()` + `sendOtpEmail()` |
| `server/src/plugins/auth.ts` | `signToken()` / `verifyToken()` (jose HS256) + preHandler `requireAuth()` |
| `server/src/config.ts` | Schema Zod de env; deriva `allowedEmails`, `smtpConfigured`, `allowedOrigins` |
| `server/src/app.ts` | Registro de rutas + CORS + compress |
| `server/src/routes/me.ts` | Rutas protegidas por `requireAuth` (`/me`, `/me/prefs`, `/me/saved`, `/me/notes`) |
| `server/src/db/schema.ts` | Tabla `operators` (PK `email`) + tablas jsonb `prefs`/`saved_state`/`notes_state` |
| `client/src/pages/Login.tsx` | UI de 2 pasos (email → código), llamadas fetch, mapeo de errores |
| `client/src/lib/auth.tsx` | `AuthProvider`, `useAuth()`, `RequireAuth`, persistencia en `localStorage` |
| `client/src/lib/sync.ts` | `createRestAdapter()`: lee el JWT de `localStorage` y espeja estado a `/me/*` |
| `server/test/integration/api.test.ts` | Round-trip OTP → JWT → `/me/prefs` (bloque `describe('auth OTP + /me round-trip')`, líneas ~93-133) |
| `server/test/unit/operator.test.ts` | Tests de `deriveName` (sin persona demo) |

---

## 2. Flujo OTP completo, paso a paso

### Paso 1 · El usuario pide el código

Front `client/src/pages/Login.tsx` → `sendCode()`:

```
POST {VITE_UPM_API_URL}/auth/request-code
Content-Type: application/json
{ "email": "<email en minúsculas, trim>" }
```

Backend `authRoutes` (`server/src/routes/auth.ts:39`), en este orden exacto:

1. `EmailBody.safeParse(req.body)` — Zod `z.object({ email: z.string().email() })`. Falla → **400** `{"error":"invalid body"}`.
2. `email = parsed.data.email.toLowerCase()`.
3. Si `!config.smtpConfigured` → **503** `{"error":"email no configurado"}`. (`smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)`, `config.ts:43`.)
4. **Allowlist / anti-enumeración**: si `!allowed(email)` → devuelve **200** `{ ok: true }` **sin generar ni enviar nada**.
5. `issueCode(email)` — si el cooldown está activo → **429** `{"error":"too many requests","retryAfterMs":<ms>}`.
6. `sendOtpEmail(config, email, issued.code)` — si tira → log `fallo envío OTP` + **502** `{"error":"no se pudo enviar el email"}`.
7. Éxito → **200** `{ ok: true }`.

> El código **nunca** viaja en la respuesta HTTP. Solo sale por email.

### Paso 2 · El usuario recibe el email

`sendOtpEmail()` (`mailer.ts:97`) manda:
- **From**: `config.SMTP_FROM` (en prod: `App UPM <ia@xnod.tech>`); si estuviera vacío, cae a `` `App UPM <${config.SMTP_USER}>` ``.
- **Subject**: `` `${code} es tu código de acceso a App UPM` `` — el código va en el asunto (útil para autocompletar en iOS/Android).
- **text**: versión plana completa (multipart alternative).
- **html**: `otpEmailHtml(code, year)` — ver §6.

### Paso 3 · El usuario ingresa el código

Front pasa a `step === 'code'` y hace foco en el input (`setTimeout(..., 60)`), luego:

```
POST {VITE_UPM_API_URL}/auth/verify
Content-Type: application/json
{ "email": "<mismo email lower/trim>", "code": "<6 dígitos>" }
```

Backend (`auth.ts:60`):

1. `VerifyBody.safeParse` — `{ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }`. Falla → **400** `{"error":"invalid body"}`.
2. `verifyCode(email, code)` → `'ok' | 'invalid' | 'expired' | 'too_many'`.
3. Mapeo de error (`auth.ts:66`): `invalid → 401`, `expired → 410`, `too_many → 429`, cualquier otro → 401. Body: `{"error":"<result>"}`.
4. Si `'ok'` → `upsertOperator(db, email, config)`.

### Paso 4 · Alta/actualización del operador y emisión del JWT

`upsertOperator()` (`auth.ts:19`):

- `deriveName(email)` deriva `{ name, cargo: 'Legislador', pais: 'AR' }`. El nombre sale del handle: se parte por `[.\-_]+` y se capitaliza cada parte (`ana.garcia@x` → `Ana Garcia`). Sin handle usable → `'Legislador'`.
- `INSERT INTO operators ... ON CONFLICT (email) DO UPDATE SET last_login_at = now`.
- `signToken(email, config.JWT_SECRET, config.JWT_TTL)`.

**Respuesta 200:**

```json
{
  "token": "<JWT>",
  "operator": {
    "email": "…",
    "name": "…",
    "cargo": "Legislador",
    "pais": "AR",
    "loggedAt": "<ISO>"
  }
}
```

### Paso 5 · El front guarda la sesión

`Login.tsx:88-93` → `signIn(json.operator, json.token)` → `client/src/lib/auth.tsx:86`:
- `localStorage['upm.app.operator'] = JSON.stringify(operator)`
- `localStorage['upm.sync.token.v1'] = token`
- toast `'Acceso verificado · Bienvenido a UPM'`, `navigate(postAuthTarget, { replace: true })`.

`postAuthTarget` (`Login.tsx:22`): si `!onboarded` → `/onboarding`; si hay `location.state.from` ≠ `/login` → esa ruta; si no → `/`.

### Paso 6 · Uso del JWT

`client/src/lib/sync.ts` `createRestAdapter()` lee el token de `upm.sync.token.v1` y hace `PUT /me/prefs|saved|notes` con `Authorization: Bearer <token>`, debounced 1500 ms por key, con `AbortSignal.timeout(10_000)`. Escritura write-through: **siempre** escribe a `localStorage` primero; el push al backend es best-effort silencioso.

---

## 3. Seguridad del OTP — parámetros reales

Todo en `server/src/lib/otp.ts`.

| Parámetro | Valor | Constante / línea |
|---|---|---|
| Longitud del código | 6 dígitos, `'000000'`–`'999999'` | `String(randomInt(0, 1_000_000)).padStart(6, '0')` (`otp.ts:25`) |
| RNG | `randomInt` de `node:crypto` (CSPRNG, no `Math.random`) | `otp.ts:1` |
| Almacenamiento | **hash**, nunca el código en claro | `hashCode()` |
| Algoritmo de hash | `sha256(`${email}:${code}`)` hex — el email actúa de sal por-usuario | `otp.ts:12-14` |
| Comparación | `timingSafeEqual` sobre los buffers hex, con chequeo previo de longitud | `otp.ts:44-46` |
| TTL | **10 min** (`TTL_MS = 10 * 60 * 1000`) | `otp.ts:8` |
| Cooldown de reenvío | **60 s por email** (`RESEND_COOLDOWN_MS`) | `otp.ts:9` |
| Máx. intentos de verificación | **5** (`MAX_ATTEMPTS`), luego se borra la entrada | `otp.ts:10, 39-42` |
| Un solo uso | `store.delete(email)` tras match correcto | `otp.ts:48` |
| Persistencia | `Map` **en memoria del proceso** | `otp.ts:6` |

### Lógica exacta de `verifyCode()`

```
sin entrada            → 'invalid'
now > expiresAt        → delete + 'expired'   (410)
attempts >= 5          → delete + 'too_many'  (429)
attempts++             (se incrementa ANTES de comparar)
hash != hash           → 'invalid'            (401, la entrada SIGUE viva)
match                  → delete + 'ok'
```

Consecuencias que importan:
- Un código vencido o agotado **se borra**: el siguiente intento con ese email devuelve `'invalid'` (401), no `'expired'`/`'too_many'`. El estado 410/429 se ve **una sola vez**.
- El 6º intento fallido devuelve 429 y quema el código; hay que pedir uno nuevo (y esperar el cooldown si pasó < 60 s del envío).
- `issueCode()` **pisa** la entrada previa: pedir un código nuevo invalida el anterior.

### Anti-enumeración (allowlist)

`auth.ts:35-36`:

```ts
const allowed = (email: string) =>
  config.allowedEmails.length === 0 || config.allowedEmails.includes(email.toLowerCase())
```

- `allowedEmails` sale de `ALLOWED_EMAILS` (coma-separado, trim, lowercase) en `config.ts:39-42`.
- **Si `ALLOWED_EMAILS` está vacío o ausente → TODOS los emails pasan.** La allowlist es opt-in; borrarla abre el login a cualquiera.
- Un email fuera de la allowlist recibe **200 `{ok:true}` idéntico** al de un email válido → no se puede enumerar quién tiene acceso.

Verificado en producción hoy:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST https://upm-api-production.up.railway.app/auth/request-code \
  -H 'Content-Type: application/json' -d '{"email":"desconocido-xyz@ejemplo.com"}'
# {"ok":true}   HTTP 200   ← no está en la allowlist, no se envió nada
```

### `/auth/login` legacy: **ya NO existe**

Era el backdoor demo (login con cualquier email, JWT 30d). Eliminado en el commit `129ea91` (`feat(auth): cerrar backdoor /auth/login (cutover a OTP)`).

Verificación:

```bash
grep -rn "auth/login" /Users/alannaimtapia/dev/app-upm/client/src /Users/alannaimtapia/dev/app-upm/server/src
# única aparición: client/src/lib/sync.ts:83 → un COMENTARIO que aclara que ya no existe

curl -s -o /dev/null -w "%{http_code}\n" -X POST https://upm-api-production.up.railway.app/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@y.com"}'
# 404
```

El listado de `GET /` también quedó corregido (ya no lista `/auth/login`, `health.ts:12`):

```
["/feed","/laws","/search","/sources","/health","/auth/request-code","/auth/verify","/me","/assistant"]
```

---

## 4. JWT

`server/src/plugins/auth.ts` — librería **jose** (`^5.9.6`).

| Aspecto | Valor |
|---|---|
| Algoritmo | `HS256` (constante `ALG`, `plugins/auth.ts:4`) |
| Clave | `config.JWT_SECRET`, `new TextEncoder().encode(secret)` |
| Validación de la clave | Zod: `z.string().min(16, 'JWT_SECRET muy corto (mín 16 chars)')` |
| Claims | `sub = email` (único claim propio) + `iat` (`setIssuedAt()`) + `exp` (`setExpirationTime(ttl)`) |
| TTL | `config.JWT_TTL`, **default `'7d'`** (`config.ts:17`). En Railway la var **no está seteada** → efectivo **7 días** |
| Verificación | `jwtVerify(token, secret, { algorithms: ['HS256'] })` — algoritmo pineado, no hay confusión de alg |
| Retorno | `payload.sub` si es string no vacío, si no `null`; cualquier excepción → `null` (catch silencioso) |

`requireAuth(secret)` (`plugins/auth.ts:30`) es un preHandler que:
- exige header `Authorization: Bearer <JWT>` (prefijo literal `'Bearer '`, `slice(7)`);
- si no valida → **401** `{"error":"unauthorized"}`;
- si valida → deja el email en `req.operatorEmail` (tipado por `declare module 'fastify'`).

### Qué está protegido y qué no

| Ruta | Auth |
|---|---|
| `GET /`, `GET /health` | pública |
| `GET /feed`, `/laws`, `/search`, `/sources` | **pública** |
| `POST /auth/request-code`, `POST /auth/verify` | pública (por definición) |
| `POST /assistant` | **pública** ← ver gotchas |
| `GET /me`, `GET|PUT /me/prefs`, `/me/saved`, `/me/notes` | `requireAuth` |

Verificado: `curl https://upm-api-production.up.railway.app/me` → `401 {"error":"unauthorized"}`.

CORS (`app.ts:20-24`): `origin: config.allowedOrigins`, `methods: ['GET','POST','PUT','OPTIONS']`, `allowedHeaders: ['Content-Type','Authorization']`. No hay `DELETE`. `ALLOWED_ORIGINS` en prod = `https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188`.

---

## 5. Configuración: variables de entorno

Schema en `server/src/config.ts` (Zod; **si algo obligatorio falta, el proceso no bootea**: `throw new Error('Config inválida: …')`).

| Variable | Obligatoria | Default | Valor en Railway (`upm-api`) |
|---|---|---|---|
| `DATABASE_URL` | sí | — | `postgres.railway.internal:5432/railway` (**secreto**) |
| `JWT_SECRET` | sí (min 16) | — | seteada (**secreto**) |
| `JWT_TTL` | no | `'7d'` | **no seteada** → 7d |
| `ALLOWED_ORIGINS` | no | GH Pages + localhost:5188 | seteada igual al default |
| `ALLOWED_EMAILS` | no | `''` (⇒ sin allowlist) | `alannaimtapia@gmail.com,ia@xnod.tech` |
| `SMTP_HOST` | no* | — | `smtp.hostinger.com` |
| `SMTP_PORT` | no | `587` | `465` |
| `SMTP_USER` | no* | — | `ia@xnod.tech` |
| `SMTP_PASS` | no* | — | seteada (**secreto**) |
| `SMTP_FROM` | no | — | `App UPM <ia@xnod.tech>` |
| `ANTHROPIC_API_KEY` | no | — | no seteada |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | `gemini-2.5-flash` | seteadas |
| `NODE_ENV` | no | `development` | `production` |
| `PORT` | no | `3000` | inyectado por Railway |
| `STATIC_DATA_BASE` | no | `https://soyalantapia.github.io/app-upm/data` | — |

\* Las tres juntas determinan `smtpConfigured`. Si falta cualquiera, `/auth/request-code` devuelve 503 y **no hay forma de loguearse**.

Front: `client/.env.production` → `VITE_UPM_API_URL=https://upm-api-production.up.railway.app`.

**Ningún secreto va en este documento ni en el repo.** Viven solo en Railway.

Cómo verificar (sin volcar secretos a un archivo):

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --service upm-api            # proyecto "UPM" (RAILWAY_PROJECT_NAME), id 61cac5bf-…
```

### SMTP en Hostinger — detalle operativo

- Host `smtp.hostinger.com`, puerto **465**. `mailer.ts:15` calcula `secure: config.SMTP_PORT === 465` → **TLS implícito**. Si algún día se migra a 587, `secure` pasa a `false` y nodemailer usa STARTTLS automáticamente. No hay que tocar código.
- Auth: `{ user: SMTP_USER, pass: SMTP_PASS }`.
- El transport es un **singleton a nivel de módulo** (`let transporter` en `mailer.ts:7`): se crea en el primer envío y se cachea. **Cambiar variables SMTP requiere redeploy/reinicio del servicio**, no basta con actualizar la var.

---

## 6. El email OTP rediseñado (commit `8483e02`)

Antes era un `<h2>` con un recuadro gris. El rediseño salió de un `/design-shotgun` (3 propuestas + jurado; ganó "C acento moderno" 9/9/9) y vive en `otpEmailHtml(code, year)` (`server/src/lib/mailer.ts:27-95`).

### Estructura visual (de arriba a abajo)

1. **Preheader oculto** (`mailer.ts:49`): `<span>` con `display:none;visibility:hidden;mso-hide:all;max-height:0;opacity:0` y color igual al fondo, texto "Usá este código de un solo uso para ingresar a App UPM. Vence en 10 minutos." seguido de una secuencia `&nbsp;&zwnj;` repetida. Eso controla el snippet de la bandeja de entrada y **empuja fuera del preview** el resto del HTML.
2. **Banda de acento** superior: `<td height="6" bgcolor="#2F80ED">` (azul acento UPM).
3. **Lockup de marca**: celda cuadrada de 44×44 con `bgcolor="#062B4D"` (navy institucional) y la letra **"U"** en blanco — **sin imágenes**, así no depende de que el cliente cargue remotos ni muestre "descargar imágenes". Al lado: "App UPM" + "Asistente IA del Legislador".
4. **H1** "Tu código de acceso" + párrafo "Usá este código para ingresar a App UPM:".
5. **Caja del código**: fondo `#DCEBFA`, borde `#BFDBFE`, `border-radius:12px`, dígitos en `Consolas,'SF Mono',<font stack>`, 32 px, `letter-spacing:12px`, color `#062B4D`.
6. Aviso de expiración: "Vence en 10 minutos."
7. Separador de 1 px (`<td height="1" bgcolor="#E2E8F0">`).
8. Aviso de seguridad: "Si no pediste este código, ignorá este mensaje. Tu cuenta sigue protegida."
9. **Footer** institucional sobre `#F6F8FB`: "App UPM · Acceso institucional · {year}".

### Por qué es robusto en clientes de correo

| Técnica | Dónde | Qué problema evita |
|---|---|---|
| Layout con `<table role="presentation">` anidadas, `cellpadding=0 cellspacing=0 border=0` | todo el documento | Outlook (motor Word) no soporta `float`/`flex`/`grid` |
| **CSS 100 % inline** en atributos `style` | todo | Gmail/Yahoo strippean `<style>` en el `<head>`; Gmail móvil ignora media queries a veces |
| Atributos `bgcolor` **además** del `background-color` | `body`, container, banda, caja del código, footer | Clientes legacy que ignoran CSS de fondo |
| Solo colores sólidos (sin gradientes, sin `rgba`) | paleta `#062B4D` / `#2F80ED` / `#DCEBFA` / `#F6F8FB` | Gradientes CSS no renderizan en Outlook |
| Fuentes de **sistema** (`-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`, constante `FONT` en `mailer.ts:22`) | todo el texto | Webfonts remotas se bloquean o no cargan |
| **Ghost table MSO** `<!--[if mso]><table width="600">…<![endif]-->` | `mailer.ts:52` y `:90` | Outlook no respeta `max-width`; sin esto la tarjeta se estira a todo el ancho |
| Bloque condicional `<!--[if mso]><style>` con `border-collapse:0` y `padding:0` | `mailer.ts:37-39` | Espacios fantasma entre celdas en Outlook |
| `mso-line-height-rule:exactly` en H1 y caja del código | `:67`, `:74` | Outlook infla el interlineado |
| Cero imágenes (el "logo" es una celda con una letra) | lockup | Imágenes bloqueadas por defecto = email roto |
| `<meta name="color-scheme" content="light">` + `supported-color-schemes` | `:34-35` | Dark mode de Apple Mail/Outlook invirtiendo colores y arruinando el contraste |
| Media query `max-width:600px` con `!important` (`.container`, `.px`, `.code-box`) | `:41-45` | En móvil: ancho 100 %, padding lateral 24 px, código a 30 px / `letter-spacing:8px` (a 32/12 px se desborda en pantallas chicas) |
| **Alternativa de texto plano** completa en `sendMail({ text })` | `mailer.ts:106` | Filtros antispam penalizan el HTML sin `text/plain`; clientes en modo texto siguen siendo usables |
| Código también en el **subject** | `mailer.ts:105` | Autocompletado de OTP en iOS/Android y lectura sin abrir el mail |

Cómo verificar el render sin mandar mail a producción: importar `otpEmailHtml` (no está exportada — hay que exportarla temporalmente o copiar la función) y volcar el HTML a un archivo, o directamente disparar un `request-code` real contra un email de la allowlist.

---

## 7. Claves de `localStorage` / `sessionStorage` del front

Relevantes a auth y sync:

| Key | Storage | Escrita en | Contenido |
|---|---|---|---|
| `upm.app.operator` | localStorage | `client/src/lib/auth.tsx:13` | Objeto `Operator` serializado. **Es la única fuente de verdad de "estoy logueado"** |
| `upm.sync.token.v1` | localStorage | `auth.tsx:16` (escribe) / `sync.ts:74` (lee) | El JWT crudo |

`signOut()` (`auth.tsx:94`) borra **ambas**. `updateOperator()` reescribe solo `upm.app.operator`.

Resto de claves del front (contexto, no son de auth):

| Key | Storage | Definida en |
|---|---|---|
| `upm.app.state` | localStorage | `lib/store.ts:6` — prefs + saved + folders; el rest adapter la mapea a `PUT /me/prefs` y `PUT /me/saved` |
| `upm.notes.v1` | localStorage | `lib/notes.ts:6` — mapeada a `PUT /me/notes` |
| `upm.watchlist.v1` | localStorage | `lib/watchlist.ts:6` |
| `upm.visit.snapshot.v1` | localStorage | `lib/visit-tracker.ts:7` |
| `upm.live-feed.v2` | localStorage | `lib/sources/index.ts:60` (caché del feed) |
| `upm.telemetry.errors` / `upm.telemetry.events` | localStorage | `lib/telemetry.ts:27-28` |
| `upm.home-tour.dismissed` | localStorage | `components/HomeTour.tsx:9` |
| `upm.source-health.dismissed-until` | localStorage | `components/SourceHealthBanner.tsx:9` |
| `upm.sw.reloaded` | sessionStorage | `components/PWAUpdateBanner.tsx:14` |
| `upm.alerts.evaluated` | sessionStorage | `lib/use-live-feed.ts:104`; `store.ts:249,257` la borran para forzar re-evaluación |
| `upm.asistente.prefill` | sessionStorage | `ArticuladoPanel.tsx:46`, `Laws.tsx:467`, `NewsConversation.tsx:188`; consumida en `Assistant.tsx:121` |

### `localStorage` bloqueado

`auth.tsx:33` `isStorageAvailable()` hace un `setItem/removeItem` de prueba con la key `__upm_storage_test__`. Si falla (incógnito, cuota), `AuthProvider` **cortocircuita** y renderiza una pantalla "Almacenamiento bloqueado" con botón Reintentar, antes de cualquier hijo. Esto existe porque sin storage `RequireAuth` genera un loop infinito login → home → login.

---

## 8. Mapeo de errores en la UI (`Login.tsx`)

| Endpoint | HTTP | Mensaje al usuario |
|---|---|---|
| `/auth/request-code` | 503 | "El acceso por email todavía no está habilitado. Escribinos a soporte@upm.org." |
| | 429 | "Recién pediste un código. Esperá un minuto antes de reintentar." |
| | 502 | "Tuvimos un problema al enviar el email. Esperá unos minutos y reintentá; si sigue, escribinos a soporte@upm.org." |
| | otro | "No pudimos enviar el código. Revisá el email e intentá de nuevo." |
| | excepción de red | "Sin conexión con el servidor. Intentá de nuevo." |
| `/auth/verify` | 401 | "Código incorrecto. Revisalo e intentá de nuevo." |
| | 410 | "El código venció. Pedí uno nuevo." |
| | 429 | "Demasiados intentos. Pedí un código nuevo." |
| | otro | "No pudimos verificar el código. Intentá de nuevo." |

Detalles de accesibilidad/UX ya implementados: `role="alert" aria-live="assertive"` en el mensaje de error; `autoComplete="email"` en el paso 1 y `autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" maxLength={6}` en el paso 2; el input de código filtra no-dígitos (`replace(/\D/g,'')`); el botón "Ingresar" está deshabilitado hasta tener 6 dígitos; hay "Reenviar código" (reusa `sendCode()`) y "Usar otro email" (vuelve a `step:'email'` y limpia código+error).

`API_BASE` (`Login.tsx:14`):

```ts
const API_BASE = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')
```

Si está vacío, tanto `sendCode()` como `verify()` cortan con "El servicio de acceso no está disponible en este momento."

---

## 9. GOTCHAS (esto es lo que te hace perder horas)

1. **`import.meta.env.VITE_X` SIN optional chaining.** Vite solo estatiza el patrón literal exacto. Si escribís `import.meta.env?.VITE_UPM_API_URL`, el `define` no aplica, rollup lo considera dead code y **elimina el bloque entero**: el login deja de llamar al backend en el bundle de producción y en dev anda perfecto. Ver los comentarios en `Login.tsx:13` y `sync.ts:152-154`.

2. **`ALLOWED_EMAILS` vacía = login abierto a cualquiera.** No es fail-closed. Si alguien borra la var en Railway, `allowedEmails.length === 0` y cualquier email del mundo recibe un código válido. Para dar acceso a un legislador nuevo hay que **agregarlo a la lista**, no hay alta self-service.

3. **La pass SMTP de Hostinger empieza con `=`.** Al setearla por CLI, `railway variables --set "SMTP_PASS=<pass>"` parte en el **primer** `=` y guarda una pass truncada/vacía. Usar el doble igual: `railway variables --service upm-api --set "SMTP_PASS==<resto>"`. Síntoma si te equivocás: `/auth/request-code` devuelve **502** (auth SMTP rechazada) en vez de 200.

4. **Los códigos OTP viven en memoria del proceso** (`Map` en `otp.ts:6`). Cualquier redeploy, reinicio o crash de `upm-api` **invalida todos los códigos pendientes** → el usuario que estaba tipeando ve "Código incorrecto" (401). Además, **esto no escala a más de 1 instancia**: si Railway alguna vez corre 2 réplicas, el `request-code` puede caer en el pod A y el `verify` en el pod B → 401 permanente y aleatorio. Si hay que escalar horizontal, primero mover el store a Postgres o Redis.

5. **El transport nodemailer se cachea a nivel de módulo.** Cambiar `SMTP_*` en Railway no tiene efecto hasta que el servicio se reinicia.

6. **El `smtpConfigured` se chequea ANTES de la allowlist.** Un atacante puede distinguir "SMTP caído" (503) de "todo normal" (200), pero **no** puede distinguir email autorizado de no autorizado. La propiedad anti-enumeración se mantiene.

7. **El estado 410/429 se ve una sola vez.** `expired` y `too_many` borran la entrada; el reintento inmediato con el mismo código da 401 `invalid`. Si estás debuggeando y ves 401 donde esperabas 410, es esto.

8. **No hay rate limit global.** No está registrado `@fastify/rate-limit` ni equivalente (verificado por grep sobre `server/src` y `server/package.json`). La única defensa es el cooldown de 60 s por email en `issueCode()` y `MAX_ATTEMPTS=5`. Un atacante puede rotar emails y machacar `/auth/verify` de distintas cuentas sin freno de infraestructura.

9. **`POST /assistant` es público.** No tiene `preHandler: auth`. Cualquiera con la URL puede consumir el cupo gratuito de Gemini. Si el asistente empieza a dar 429/503 sin explicación, revisá esto antes que el cupo de Google.

10. **El JWT expira a los 7 días pero el front no se entera.** `RequireAuth` (`auth.tsx:123`) solo mira si existe `upm.app.operator` en localStorage — **nunca valida el `exp` del JWT ni llama a `/me`**. Cuando el token vence, el usuario sigue viendo la app "logueado" pero el sync a `/me/*` falla en silencio: `sync.ts:104-109` recibe 401, borra el token, y el retry inmediato hace `ensureToken()` → `null` → no reintenta nada. **Resultado: pérdida silenciosa de sync multi-dispositivo sin ningún aviso.** El fix natural es un `GET /me` al boot que, ante 401, dispare `signOut()`.

11. **Incoherencia de `pais` por defecto.** `deriveName()` devuelve `pais: 'AR'` (`auth.ts:16`), pero el upsert defensivo de `me.ts:93` (cuando llega un `PUT /me/*` de un operador que no existe) crea el registro con `pais: 'UY'` y `name: 'Legislador'`. Un mismo usuario puede terminar con país distinto según qué endpoint lo creó primero.

12. **`soporte@upm.org`** aparece en dos mensajes de error y en el link "¿Sos autoridad y no tenés acceso? Solicitalo" (`Login.tsx:54,58,248`). No verifiqué que ese buzón exista **(verificar)**. Ojo también al rebranding: UPM es el organismo cliente, no el producto — ese dominio probablemente cambie.

13. **`JWT_TTL` no está seteada en Railway.** Si alguien la agrega mal formada, jose tira al firmar y `/auth/verify` pasa de 200 a 500. El formato es el de jose (`'7d'`, `'12h'`, `'30m'`).

14. Los tests de integración **no tocan SMTP**: generan el código llamando a `issueCode()` en proceso (mismo `Map`) y de ahí van a `/auth/verify`. Así que **verde en tests no prueba que el email salga**.

---

## 10. Entregabilidad de `xnod.tech` — estado real (verificado hoy)

La memoria del proyecto listaba "configurar SPF/DKIM/DMARC" como pendiente completo. **Al 2026-07-18 SPF y DMARC ya están; DKIM no aparece.**

```bash
dig +short TXT xnod.tech
# "v=spf1 include:_spf.mail.hostinger.com ~all"          ✅ SPF presente (softfail ~all)

dig +short TXT _dmarc.xnod.tech
# "v=DMARC1; p=none; rua=mailto:ia@xnod.tech; fo=1; adkim=r; aspf=r"   ✅ DMARC presente, política p=none

dig +short MX xnod.tech
# 5 mx1.hostinger.com.  /  10 mx2.hostinger.com.

for s in hostingermail1 hostingermail2 hostingermail3 default dkim mail selector1 selector2 hostinger; do
  dig +short TXT $s._domainkey.xnod.tech; dig +short CNAME $s._domainkey.xnod.tech;
done
# vacío en los 9 selectores probados   ❌ no encontré DKIM
```

**PENDIENTE concreto:**

- **DKIM**: no responde ningún selector común. Puede ser que Hostinger use un selector distinto al que probé **(verificar en hPanel → Emails → DNS/Records)**. Sin DKIM, la autenticación depende solo de SPF; Gmail y Outlook penalizan y el OTP puede caer en spam.
- **DMARC `p=none`**: es modo observación, no aplica política. Con `rua=mailto:ia@xnod.tech` ya se están recibiendo reportes agregados; una vez confirmado que SPF+DKIM alinean, escalar a `p=quarantine` y después `p=reject`.
- **SPF `~all`** (softfail). Endurecer a `-all` solo después de confirmar que todos los emisores legítimos del dominio están incluidos.

Sin DKIM, el email OTP es el único camino de acceso a la app: si cae en spam, **el usuario no puede entrar**. Es el riesgo operativo #1 de este subsistema.

Cómo verificar la entregabilidad end-to-end: mandarse un código a un email de la allowlist y revisar en el mensaje recibido los headers `Authentication-Results` (`spf=pass`, `dkim=pass`, `dmarc=pass`) — en Gmail, "Mostrar original".

---

## 11. Comandos útiles

```bash
# --- Verificar el estado de auth en producción ---
curl -s https://upm-api-production.up.railway.app/                       # lista de endpoints
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://upm-api-production.up.railway.app/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@y.com"}'           # esperado: 404 (legacy eliminado)
curl -s -w "\nHTTP %{http_code}\n" https://upm-api-production.up.railway.app/me   # esperado: 401
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  https://upm-api-production.up.railway.app/auth/request-code \
  -H 'Content-Type: application/json' -d '{"email":"no-es-email"}'       # esperado: 400

# --- Pedir un código REAL (solo con un email de ALLOWED_EMAILS; manda un mail de verdad) ---
curl -s -X POST https://upm-api-production.up.railway.app/auth/request-code \
  -H 'Content-Type: application/json' -d '{"email":"alannaimtapia@gmail.com"}'
# leer el código del inbox y:
curl -s -X POST https://upm-api-production.up.railway.app/auth/verify \
  -H 'Content-Type: application/json' -d '{"email":"alannaimtapia@gmail.com","code":"123456"}'
# → { token, operator }; después:
curl -s https://upm-api-production.up.railway.app/me -H "Authorization: Bearer <token>"

# --- Local ---
cd /Users/alannaimtapia/dev/app-upm/server
npm run dev            # server en :3210 según server/.env (el 3000 lo ocupa otro proyecto)
npx tsc --noEmit
npx vitest run test/unit/operator.test.ts
npx vitest run          # integración requiere DATABASE_URL contra Postgres real

# --- Variables / deploy ---
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --service upm-api
railway variables --service upm-api --set "ALLOWED_EMAILS=a@x.com,b@y.com"
railway up                                  # deploy del backend
```

**Recordatorio de flujo git:** Railway deploya desde la rama `feat/backend`. `main` está sincronizada (merge `ace8dc4`). Para subir a `main` sin romper el main local: worktree detached sobre `origin/main`, merge de `origin/feat/backend`, `push HEAD:main`.

---

## 12. Backlog de este subsistema

| Prioridad | Ítem |
|---|---|
| Alta | Configurar/verificar **DKIM** en Hostinger para `xnod.tech`; después subir DMARC a `p=quarantine` |
| Alta | Validar la sesión al boot (`GET /me`) y hacer `signOut()` ante 401 → hoy el vencimiento del JWT a 7d es invisible (gotcha #10) |
| Media | Rate limit a nivel de ruta (`@fastify/rate-limit`) sobre `/auth/*` y `/assistant` |
| Media | Proteger `POST /assistant` con `requireAuth` (hoy es público y quema cupo de Gemini) |
| Media | Mover el store de OTP fuera de memoria si se escala a >1 instancia |
| Media | Rotar `SMTP_PASS` (según la memoria del proyecto se compartió en plaintext en una sesión previa) |
| Baja | Unificar el `pais` por defecto entre `deriveName` (`AR`) y el upsert defensivo de `me.ts` (`UY`) |
| Baja | Confirmar/reemplazar `soporte@upm.org` — el naming del producto está en revisión (UPM = el organismo cliente, no el producto) |
