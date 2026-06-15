# PROMPT — QA de producción · App UPM (UX · Funcionalidad · 100% backend)

> Pegá este prompt a un agente (o seguilo a mano) para testear App UPM al detalle antes/después de cada release. Foco en **experiencia de usuario, que todo funcione, y que NINGÚN dato sea mockup — todo viene del backend**. Reportá CADA hallazgo con evidencia (qué pasó, cómo reproducir, screenshot/respuesta, file:line).

## Rol
Sos un **QA senior de producto**, obsesivo con la **experiencia del usuario** y con que **todo funcione de punta a punta**. Te ponés en la piel de un legislador que usa la app por primera vez. No declares nada "OK" sin probarlo de verdad y dejar evidencia. Tu tercera obsesión: **que no haya un solo dato inventado** — cada cosa que ve el usuario tiene que venir del backend (la base de datos), nunca de mock/placeholder.

## Sistema bajo prueba
- **Front (PWA)**: https://soyalantapia.github.io/app-upm/ — Vite + React 19 + TS + Tailwind 4 + HashRouter. Deploy gh-pages (base `/app-upm/`).
- **API**: https://upm-api-production.up.railway.app — Fastify + Postgres (pgvector) en Railway. Endpoints: `/health` `/feed` `/laws` `/search` `/sources` `/auth/request-code` `/auth/verify` `/me` `/me/{prefs,saved,notes}` `/assistant`.
- **Estado esperado**: corpus 100% real (≈1.745 normas AR/CO/UY/BR, 39 fuentes, 0 sintéticas). Login **OTP** (email + código). Asistente con Gemini (fallback multi-modelo). Búsqueda semántica (pgvector + FTS). **Cero mockup**: todo dato del front viene del backend.
- **Repo/local**: `~/dev/app-upm` (`client/`, `server/`).

## Herramientas
- API: `curl` o un script Node con `fetch` (Node 20+).
- DB (solo lectura, para confirmar que lo que se ve coincide con la base):
  ```js
  // /tmp/q.mjs
  import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect(); console.log(JSON.stringify((await c.query(process.argv[2])).rows, null, 1)); await c.end()
  ```
  `set -a; source ~/dev/app-upm/server/.env; set +a` y `node /tmp/q.mjs "SELECT ..."`.
- UI: usá el skill **`/browse`** de gstack (no el chrome MCP). Como el login es OTP y todavía puede faltar el SMTP, para recorrer la UI sin esperar el mail **inyectá una sesión de QA**: en el navegador seteá `localStorage`:
  - `upm.app.operator` = `{"email":"qa.test@upm.org","name":"QA","cargo":"Legislador","pais":"AR","loggedAt":"<ISO actual>"}`
  - `upm.sync.token.v1` = un JWT HS256 `{sub:"qa.test@upm.org"}` firmado con el `JWT_SECRET` de Railway (`cd server && railway variables --service upm-api --kv | grep JWT_SECRET`).
  - Recargá → la app te toma como logueado y podés recorrer todas las pantallas.

---

## §1 · EXPERIENCIA DE USUARIO — recorrido por pantalla
Ponete como usuario nuevo. Para CADA pantalla: ¿se entiende?, ¿carga rápido?, ¿hay estado de carga / vacío / error claros?, ¿la consola tiene 0 errores?, ¿algún request de red falla?
1. **Login**: el flujo OTP se entiende (email → "Enviarme el código" → ingresar código). Si falta SMTP, el mensaje es honesto ("acceso por email todavía no habilitado"), nunca te deja a mitad de camino sin explicación. El reenviar código / volver atrás funciona. La pantalla se ve profesional (sin "demo", sin persona "Pereira", la preview del teléfono sin datos fabricados, stats reales 4 países / 39 fuentes).
2. **Inicio**: muestra novedades reales del corpus; tiene jerarquía visual clara; los accesos rápidos llevan a donde dicen. Si no hay feed → estado vacío prolijo (nunca contenido de ejemplo).
3. **Radar**: filtros por país/tema/tipo/relevancia responden al toque; el buscador filtra; scroll infinito fluido; cada card es legible y abre el detalle. Empty state si no hay match.
4. **Leyes**: muestra solo normas; filtros y sugerencias funcionan; el detalle abre bien.
5. **Búsqueda ⌘K**: se abre con el atajo y con el botón; escribir en lenguaje natural ("agua de las montañas") trae resultados por significado con el sello "IA · por significado"; navegar a un resultado funciona.
6. **Asistente**: las sugerencias iniciales son clicables; al preguntar muestra "pensando" y luego una respuesta clara y bien formateada que **cita normas**; el multi-turno mantiene el hilo; regenerar funciona; nueva conversación / historial funcionan.
7. **Perfil**: muestra datos reales (nombre, temas elegidos, institución); editar y guardar funciona y persiste al recargar; preferencias (países/temas/frecuencia) se guardan.
8. **Carpetas**: usuario nuevo arranca vacío con un empty state que invita a guardar; crear carpeta, guardar un ítem, moverlo entre carpetas, abrirlo.
9. **Transversal**: navegación entre tabs sin parpadeos ni recargas; botón atrás del navegador; **mobile (375px)** y desktop; PWA instalable; al recargar no hay pantalla en blanco (cache + revalidación).

## §2 · FUNCIONALIDAD — qué tiene que andar de punta a punta
Probá cada feature completa, no solo que "abra":
1. **Feed/Radar**: `GET /feed` y `/laws` devuelven datos; filtros `?pais=` / `?tema=` realmente filtran; el orden/relevancia tiene sentido.
2. **Búsqueda semántica**: `GET /search?q=glaciares` → `mode:'hybrid'`, >0 hits. `?q=agua de las montañas` (sin la palabra "glaciar") trae Glaciares/Riachuelo/cuencas → la semántica funciona, no solo keyword.
3. **Asistente**: `POST /assistant` responde con `provider: gemini:*`, cita ids de normas que existen, y:
   - **Factual**: "¿qué dice la ley de teletrabajo?" → cita la norma correcta.
   - **Recencia**: "¿qué ley salió hoy?" → usa la fecha real y trae normas con `date` de hoy (no lo semánticamente parecido).
   - **Honestidad**: pregunta por algo inexistente → dice que no figura, sin inventar.
   - **Si el backend no responde**: el front muestra "El asistente no está disponible…", nunca una respuesta inventada.
4. **Login OTP**: pedir código (`/auth/request-code`) y verificar (`/auth/verify`) completa el login y deja la sesión; reenviar genera uno nuevo; el código vencido/incorrecto avisa con un mensaje claro.
5. **Sync /me** (con JWT válido): cambiar preferencias / guardar un ítem / agregar una nota se persiste en el backend y vuelve al recargar en otro dispositivo. `PUT/GET /me/{prefs,saved,notes}` round-trip.
6. **Ingesta/datos frescos**: `GET /health` → `itemCount` y `lastIngest` recientes; el corpus se actualiza solo.

## §3 · TODO VIENE DEL BACKEND — cero mockup (la obsesión)
El objetivo: **ningún dato que ve el usuario es inventado; todo sale de la base / del backend.**
- **Bundle desplegado**: bajá `assets/index-*.js` y grepeá strings prohibidos (TODOS deben dar 0): `UPM Premium`, `renovación 2026-12-31`, `Martín Pereira`, `entrar directo a la demo`, `Objeto y alcance`, `Acta del Foro UPM`, `Nueva reglamentación ambiental en Brasil`, `Cumbre MERCOSUR-UE`, `Nueva alerta de Ambiente`, `seed-1`.
- **Source**: `grep -rnE "MOCK|mock|sample|demo|fake|dummy|seed-[0-9]|2026-12-31" client/src` → solo falsos positivos legítimos (enums/UX copy), nunca datos.
- **Coincidencia front ↔ DB**: agarrá 5 normas que ves en la UI y confirmá que existen igual en la base: `node /tmp/q.mjs "select id,title from normas where id = '<id>'"`. Tienen que coincidir.
- **Nada sintético en la DB**: `node /tmp/q.mjs "select count(*) from normas where id ~ '^(ar-senado-|ar-cct-|parlasur-|senado-py-|asamblea-bo-|congreso-cl-|ar-cnv-)'"` → **0**; `... where country in ('PY','BO','CL')` → **0**.
- **`/feed` y `/search`** no devuelven ids sintéticos ni `br-votacao*`/`br-evento*`.
- **100% backend en prod**: con `VITE_UPM_API_URL` seteada, el front usa SOLO el backend. Simulá backend caído (bloqueá la API en el navegador) → el feed queda **vacío con empty state**, NO aparece data scrapeada del cliente. Cada pantalla con datos (Inicio, Radar, Leyes, ⌘K, Asistente) debe quedar vacía/honesta, nunca con contenido de relleno.
- **Pantallas sin backend aún** (Biblioteca/Carpetas vacías): deben mostrar empty state real, nunca ejemplos inventados.

## §4 · ROBUSTEZ FUNCIONAL — los bordes que el usuario puede tocar
Que la app no se rompa ni confunda al usuario cuando toca un borde.
- Filtros con valores inválidos en la URL (`?pais=XX`) → la app no explota (400 manejado / ignora).
- Búsqueda con 1 letra o vacía → no rompe (pide más, no error feo).
- Búsqueda con texto larguísimo o con símbolos raros → responde sin colgarse.
- Asistente con mensaje vacío → no envía / avisa.
- Sin sesión, entrar a una ruta protegida (`#/radar`) → redirige al login (no pantalla rota).
- Reabrir la app offline / con red lenta → muestra cache o estado de carga, nunca blanco infinito.
- Mensajes de error siempre en lenguaje claro para el usuario (no stack traces, no "undefined").

## §5 · PERFORMANCE / FLUIDEZ
- `/feed` viene comprimido (gzip) y carga en ~1–2s.
- Asistente responde en ~2–5s; muestra "pensando" mientras tanto.
- Cambiar de tab y filtrar es instantáneo (sin recargar la página).
- Segunda carga usa cache + revalida en background (stale-while-revalidate), sin parpadeo.

## §6 · Code review (funcional)
Revisá el código (rama `feat/backend`/`main`) con foco en que funcione y no haya datos inventados:
- **Correctness de features**: búsqueda híbrida (`server/src/search.ts`), fallback multi-modelo del asistente (`llm.ts`), recencia + RAG conversacional (`routes/assistant.ts`), filtro de ruido (`noiseFilter`), OTP (`lib/otp.ts`: expiración, un solo uso, cooldown).
- **Datos**: ningún array hardcodeado de datos en `client/src` (data.ts y seeds deben estar vacíos); el front toma todo de `useLiveFeed`/`/feed`/`/search`/`/me`.
- **Estados**: empty/loading/error en cada pantalla; catch que no escondan algo que el usuario debería ver.
- **Gotcha Vite**: `import.meta.env.VITE_UPM_API_URL` SIN optional chaining (si no, rollup borra el wiring del backend por DCE → la app quedaría en modo sin-backend).
- **Tests**: `cd server && npx vitest run` (29/29) y `cd client && npx tsc --noEmit` limpio.

## Formato de reporte
Por cada hallazgo: `[SEVERIDAD] área · qué pasa · cómo reproducir · evidencia (respuesta/screenshot/file:line) · fix sugerido`. Severidades por impacto en el usuario: **BLOCKER** (no se puede usar / lanzar), **ALTA** (rompe un flujo o muestra dato inventado), **MEDIA** (molesta pero hay workaround), **BAJA** (cosmético). Cerrá con tabla PASS/FAIL por sección + veredicto: ¿listo para producción? + top 3 cosas a arreglar.

## Criterio de aceptación para LANZAR
- [ ] §1 UX: cada pantalla se entiende, carga, y maneja vacío/carga/error; 0 errores de consola.
- [ ] §2 Funcionalidad: feed, filtros, búsqueda semántica, asistente, login OTP y sync /me andan de punta a punta.
- [ ] §3 Backend: 0 strings mockup en el bundle; 0 normas sintéticas en DB; lo que se ve coincide con la base; backend caído → empty state (nunca mock).
- [ ] §6: vitest 29/29, tsc limpio.
- [ ] Pendiente conocido: **SMTP** en Railway (sin esto el login OTP no manda códigos).
