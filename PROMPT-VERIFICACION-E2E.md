# PROMPT — QA exhaustivo de conexión front↔backend↔DB end-to-end (app-upm)

Sos un agente de QA senior, autónomo y meticuloso. Tu misión: **verificar al detalle que TODO el proyecto app-upm está realmente conectado al backend y persistido en PostgreSQL**, recorriendo el flujo completo en un navegador real (Chrome) y confirmando el impacto en cada capa (Network → endpoint → tabla). No asumas nada: cada afirmación de "está conectado" tiene que estar respaldada por evidencia triple (request en Network + respuesta del endpoint + fila en la DB). Trabajás solo, sin preguntar; al final entregás un informe.

Raíz del proyecto: `/Users/alannaimtapia/dev/app-upm`. Frontend en `/Users/alannaimtapia/dev/app-upm/client`, backend en `/Users/alannaimtapia/dev/app-upm/server`.

---

## 1. Objetivo, criterios de "conectado y en la base", y alcance

### Objetivo
Confirmar que el sistema productivo (front GH Pages + API Railway + Postgres Railway) está integrado de punta a punta: el feed viene del backend, la autenticación emite JWT real, la sincronización de estado del usuario (prefs/saved/notes) escribe en Postgres, y el asistente está cableado al backend (aunque hoy devuelva 503 por falta de API key — eso es esperado, ver abajo). Y detectar cualquier desfasaje donde el front "parezca" conectado pero esté sirviendo datos locales/caché/mock.

### Qué significa "todo conectado y en la base" (criterios medibles)
Para cada flujo, "conectado" se cumple SOLO si se verifican las tres señales:
1. **Network**: el navegador emite el request al dominio del backend `https://upm-api-production.up.railway.app` (NO 40+ requests paralelos a APIs externas de legislaturas, NO respuesta servida 100% desde caché de localStorage).
2. **Endpoint responde correcto**: status 200 (o el esperado), payload con la forma del contrato documentado más abajo.
3. **DB refleja**: una query SQL concreta en Postgres devuelve la fila/valor esperado (para feed: `normas`; para login: `operators`; para prefs/saved/notes: `prefs`/`saved_state`/`notes_state`).

"En la base" = existe la fila correspondiente en Postgres con el `updatedAt`/`lastSeenAt`/`lastLoginAt` reciente y el `doc` JSONB con el contenido que el usuario generó desde el front.

### Alcance — qué SÍ debe estar conectado
- **Feed** (Inicio, Radar, Leyes, Stats, Briefing, NewsConversation, LegisladorProfile) → `GET /feed`, tabla `normas`.
- **Búsqueda** → `GET /search?q=...` (FTS español).
- **Leyes** → `GET /laws` (subset de doc types).
- **Auth** → `POST /auth/login` → JWT + tabla `operators`.
- **Sync de estado**: prefs → `PUT /me/prefs` (tabla `prefs`), saved+folders → `PUT /me/saved` (tabla `saved_state`), notes → `PUT /me/notes` (tabla `notes_state`).
- **Asistente** → `POST /assistant` (el request DEBE salir; la respuesta esperada es **503** porque `ANTHROPIC_API_KEY` no está seteada en Railway — ver más abajo).
- **Health/Sources** → `GET /health`, `GET /sources`.

### Alcance — qué NO está conectado (local/mock POR DISEÑO — NO reportar como bug; reportar como "no-conectado-esperado")
Esto evita falsos negativos. Estos estados viven solo en localStorage y NO tienen endpoint backend (verificado en `server/src/routes/me.ts`):
- **Notifications** (`store.ts`, seed `SEED_NOTIFICATIONS`) — sin `/me/notifications`. Local puro.
- **Conversations** del asistente (`store.ts`, `saveConversation`) — sin `/me/conversations`. El historial de chat se guarda solo en localStorage (límite 25).
- **Alerts** (`store.ts`, seed `SEED_ALERTS`) — sin `/me/alerts`. Matching client-side sobre el feed cacheado.
- **Watchlist** (`client/src/lib/watchlist.ts`, key `upm.watchlist.v1`) — local puro.
- **Telemetry** (`client/src/lib/telemetry.ts`, keys `upm.telemetry.errors`/`upm.telemetry.events`) — ring buffer local, sin POST.
- **Visit tracker** (`client/src/lib/visit-tracker.ts`, key `upm.visit.snapshot.v1`) — usado en Inicio para "novedades desde tu última visita". Local.
- **Seeds/mocks estáticos** en `client/src/lib/data.ts`: `DEMO_OPERATOR`, `DOCUMENTS` (**12 fichas, ids `d1`–`d12`**, las que ve Biblioteca), `DOSSIERS` (**2 ítems, `ds1`/`ds2`**), `FORUMS` (**6 ítems**), `AGENDA`, `FOLDERS` seed, `NEWS` (**10 ítems, ids `n1`–`n10`**, fallback si el feed viene vacío). Nada de esto se sincroniza con la DB; **Biblioteca es estática salvo el bloque "Últimas leyes" que sí viene del feed**.
- **RAG local** (`client/src/lib/rag.ts`, TF-IDF sobre el feed cacheado) — es el fallback del asistente cuando el backend da 503. Puede divergir del FTS del servidor; eso NO es bug.
- **Asistente real (LLM)**: `ANTHROPIC_API_KEY` NO está seteada → `POST /assistant` responde **503** → el front cae a RAG local + patrones. **Esto es el comportamiento esperado y NO es un bug.** Lo que SÍ hay que verificar es que el request salga al backend y que la respuesta sea 503 (no un error de red ni un endpoint inexistente).

**Regla de oro:** si el handler existe en `server/src/routes/*.ts` → debe estar conectado y se reporta bug si no lo está. Si NO existe handler → es local-esperado y se reporta como tal, nunca como bug.

---

## 2. Mapa del sistema

### Frontend (pantallas)
- **Visibles en nav:** `/` (Inicio), `/asistente` (Asistente), `/radar` (Radar), `/leyes` (Leyes), `/perfil` (Perfil).
- **Ocultas del nav pero accesibles por deep-link:** `/briefing`, `/biblioteca`, `/carpetas`, `/estadisticas`.
- **Detalle/auth:** `/radar/:id` (NewsConversation), `/legislador/:id`, `/login`, `/onboarding`.
- Archivos clave: `client/src/App.tsx` (router), `client/src/layouts/AppShell.tsx` (nav), `client/src/pages/*.tsx`.

### Backend (endpoints, Fastify @ `https://upm-api-production.up.railway.app`)
- `GET /` (root health), `GET /health` (estado + último ingest), `GET /sources` (lista de fuentes).
- `GET /feed?pais=AR&tema=ambiente` (params opcionales, enum-validados), `GET /laws?pais=&tema=`, `GET /search?q=` (q≥2 chars).
- `POST /auth/login` `{ email?, password? }` → `{ token, operator }` (demo: cualquier email; password ignorado).
- `GET/PUT /me/prefs`, `GET/PUT /me/saved`, `GET/PUT /me/notes` (requieren `Authorization: Bearer <JWT>`), `GET /me`.
- `POST /assistant` `{ messages: [...] }` (no requiere auth; 503 si no hay `ANTHROPIC_API_KEY`).

### Ingesta — dónde viven las fuentes (importante para no buscar en el lugar equivocado)
Hay **dos** listas de fetchers, no una sola:
- **Servidor (el que alimenta la DB):** `server/src/ingest/registry.ts` define `FETCHERS: IngestFetcher[]` (**48 entradas**, ids/labels/country alineados con el cliente). Este es el que corre el ingest real y puebla la tabla `sources` + `normas`. Los implementadores por fuente están en `server/src/ingest/fetchers/`. El endpoint `GET /sources` refleja estas 48.
- **Cliente (fallback local, NO alimenta la DB):** `client/src/lib/sources/index.ts` define su propio `FETCHERS: Fetcher[]` (**47 entradas**). Son los fetchers client-side que el front usa SOLO como fallback si el `/feed` del backend no responde — si los ves dispararse en Network (40+ requests a legislaturas externas), es señal de que el front NO está pegándole al backend (bug de conexión, ver sección 7.5).

Conclusión operativa: para "cuántas fuentes hay" usá el server (`registry.ts` → 48) y `GET /sources` (48). El cliente (47) es solo el plan B local.

### DB (Postgres, tablas relevantes)
- **Ingesta:** `normas` (PK `id`, campos country/topic/type/date/relevance/excerpt/source/`full_text`/authors/..., `first_seen_at`, `last_seen_at`, `source_id`), `sources` (id/label/country/enabled/last_run_at/last_ok/last_count/last_error), `ingest_runs` (started_at/finished_at/ok_sources/failed_sources/items_upserted/detail JSONB).
- **Estado usuario:** `operators` (PK `email`, name/cargo/pais/created_at/last_login_at), `prefs` (PK `operator_email`, `doc` JSONB, `updated_at`), `saved_state` (PK `operator_email`, `doc` JSONB), `notes_state` (PK `operator_email`, `doc` JSONB).
- **FTS — ojo con el alcance del índice (gap real, anotalo si tocás búsqueda):** el índice GIN definido en `server/src/db/schema.ts` es SOLO `to_tsvector('spanish', title || ' ' || excerpt)` — **no incluye `full_text`**, aunque la columna existe. El endpoint `/search` indexa solo `title+excerpt`. En cambio, el RAG del asistente (`server/src/routes/assistant.ts`) construye su `to_tsvector` incluyendo `coalesce(full_text,'')`, así que esa query NO usa el índice (cae a seq scan) y puede traer matches que `/search` no trae. Esto NO es un bug funcional pero SÍ una divergencia índice↔uso que vale registrar (impacto: performance + resultados distintos entre `/search` y el RAG). Cuando armes la query SQL de paridad de búsqueda (sección 4.2), replicá el `to_tsvector` SOLO con `title || excerpt` para comparar contra `/search`.

### Los 3 caminos de conexión (señal observable + falso-negativo típico)

| Camino | Request observable | Endpoint | Caché localStorage | Señal de "conectado" | Falso-negativo típico |
|---|---|---|---|---|---|
| **Feed** | 1 GET a `/feed` | `/feed` | `upm.live-feed.v2` (TTL 24h, fresh 5min) | 1 sola llamada al dominio Railway con `{items,fetchedAt,sources}`; NO 40+ requests a legislaturas externas | **EL GRANDE:** caché de 24h sirve datos viejos sin pegarle al backend. Si no limpiás `upm.live-feed.v2` antes, ves "datos" pero no hubo request. SIEMPRE limpiar la key antes de verificar. |
| **Sync** | `POST /auth/login` luego `PUT /me/{prefs,saved,notes}` | `/auth/login`, `/me/*` | `upm.app.state`, `upm.notes.v1`, token `upm.sync.token.v1` | PUT con `Authorization: Bearer` 1.5s después de editar; respuesta 200 con `{doc}` | **Debounce 1.5s:** el PUT sale recién 1.5s después del cambio; si mirás antes pensás que "no sincronizó". Y si editás dos cosas en <1.5s, solo una se pushea. Además, write a localStorage es inmediato y silencioso aunque el PUT falle (catch silencioso). |
| **Asistente** | `POST /assistant` | `/assistant` | — | El POST sale al dominio Railway; respuesta **503 esperada** (sin API key) → fallback a RAG local | 503 NO es desconexión: el backend está vivo, solo falta la key. Si NO sale ningún request → ahí sí hay problema (VITE_UPM_API_URL ausente). |

---

## 3. Setup de verificación

### 3.1 Conexión a Postgres
Las credenciales productivas están en `/Users/alannaimtapia/dev/app-upm/server/.env` (`DATABASE_URL` / `DATABASE_PUBLIC_URL`, proxy `rlwy.net`, SSL requerido). Cargalas y conectá:

```bash
set -a; source /Users/alannaimtapia/dev/app-upm/server/.env; set +a
# usar la URL pública si DATABASE_URL es interna de Railway:
psql "${DATABASE_PUBLIC_URL:-$DATABASE_URL}" -c '\dt'
```

Verificá que ves las tablas: `normas`, `sources`, `ingest_runs`, `operators`, `prefs`, `saved_state`, `notes_state`. Si `psql` no resuelve el host, usá la Railway CLI (logueada como AlanTapia, linkeada desde `/Users/alannaimtapia/dev/app-upm/server`): `railway run psql "$DATABASE_PUBLIC_URL"` o `railway connect Postgres`.

Definí un alias mental para las queries: `PSQL='psql "${DATABASE_PUBLIC_URL:-$DATABASE_URL}"'`.

### 3.2 Sanity del backend (antes de tocar el front)
```bash
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool
curl -s https://upm-api-production.up.railway.app/ | python3 -m json.tool
curl -s "https://upm-api-production.up.railway.app/feed" -o /tmp/feed.json -w 'HTTP %{http_code} | %{size_download} bytes | %{time_total}s\n'
python3 -c "import json;d=json.load(open('/tmp/feed.json'));print('items:',len(d['items']),'| fetchedAt:',d['fetchedAt'],'| sources:',len(d['sources']))"
```
Esperado: `/health` → 200 `{ok:true, db:"up", lastIngest:{...}, itemCount:~1850}`. `/feed` → 200, hasta 500 items (el handler aplica `LIMIT 500`; ver 5/7). `sources` con **48** entradas.

### 3.3 Abrir el front
- **Prod:** `https://soyalantapia.github.io/app-upm/` (rama gh-pages). Ya buildeado contra `VITE_UPM_API_URL=https://upm-api-production.up.railway.app`.
- **Local (opcional, si querés probar build dev contra el backend prod):** Node 22 obligatorio.
  ```bash
  export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
  cd /Users/alannaimtapia/dev/app-upm/client && npm run dev
  # → http://127.0.0.1:5188/app-upm/
  ```
  Si querés también el backend local: `cd /Users/alannaimtapia/dev/app-upm/server && npm run dev` (puerto 3210, lee `server/.env`). Para esta auditoría priorizá **prod** (front GH Pages → API Railway → DB Railway), que es lo que hay que certificar.

### 3.4 Limpiar la caché (CRÍTICO — hacelo SIEMPRE antes de medir conexión de feed)
La trampa #1 de esta app es el caché de 24h. Antes de cada verificación de feed, en la consola de Chrome del tab del front:
```js
localStorage.removeItem('upm.live-feed.v2');   // fuerza refetch del feed
localStorage.removeItem('upm.sync.token.v1');  // fuerza nuevo /auth/login
// para un reset total de la sesión demo:
Object.keys(localStorage).filter(k=>k.startsWith('upm.')).forEach(k=>localStorage.removeItem(k));
```
Después recargá (hard reload). Si tras limpiar `upm.live-feed.v2` NO ves un `GET /feed` en Network al cargar Inicio/Radar → eso ya es un hallazgo (o el front no apunta al backend, o usa los 47 fetchers locales).

### 3.5 Chrome + Network/console
Usá la extensión **claude-in-chrome** (MCP) para manejar un Chrome real: navegar, leer Network requests, leer console, ejecutar JS en el tab, screenshots. Para cada pantalla:
1. Abrí DevTools → Network (filtrá por `upm-api-production` para aislar llamadas al backend).
2. Limpiá Network, recargá, y registrá: método, URL, status, tamaño, tiempo.
3. Para inspeccionar payloads: leé el response body del request en Network, o ejecutá `fetch` desde la consola.
4. Console: registrá errores/warnings (especialmente CORS, 401, 503).

Si la extensión claude-in-chrome no está disponible, fallback a headless con el skill `/browse` de gstack (`~/.claude/skills/gstack/browse/dist/browse`, requiere `~/.bun/bin/bun`) para capturar Network/console programáticamente. NO uses las MCP tools de chrome para browsing general fuera de esta verificación.

### 3.6 Token independiente para verificar /me/* sin depender del front
Para cerrar el loop de sync con evidencia limpia (sin caché del navegador), generá un JWT propio por curl y consultá los endpoints protegidos directamente:
```bash
EMAIL="qa.verificador@upm.test"
TOKEN=$(curl -s -X POST https://upm-api-production.up.railway.app/auth/login \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "TOKEN=$TOKEN"
# decodificar el payload del JWT (sub debe ser el email, exp ~30 días):
echo "$TOKEN" | cut -d. -f2 | python3 -c 'import sys,base64,json;s=sys.stdin.read().strip();s+="="*(-len(s)%4);print(json.dumps(json.loads(base64.urlsafe_b64decode(s)),indent=2))'
curl -s https://upm-api-production.up.railway.app/me/prefs -H "Authorization: Bearer $TOKEN" -w '\nHTTP %{http_code}\n'
```

---

## 4. Plan de testeo pantalla-por-pantalla y flujo-por-flujo

Para CADA ítem: (a) limpiá caché si toca feed, (b) cargá la pantalla en Chrome, (c) registrá lo que se ve, (d) confirmá el request en Network al backend, (e) corré la query SQL, (f) comparás esperado vs observado.

### 4.0 Login + Onboarding (`/login`, `/onboarding`)
- **Qué debe mostrar:** form de login; botón "entrar directo a la demo". Onboarding: 3 pasos (países / temas / frecuencia).
- **De dónde viene:** el login del front es **demo (mock)**: `signIn(email)` escribe `operator` en localStorage `upm.app.operator` SIN llamar al backend para autenticar la UI. PERO el adaptador de sync (`sync.ts`) sí dispara `POST /auth/login` al backend la primera vez que necesita un token (al sincronizar prefs/saved/notes). O sea: el login de pantalla es local; el `/auth/login` ocurre en cuanto editás algo que sincroniza.
- **Cómo confirmar en Network:** al hacer login no necesariamente hay request; al editar prefs (paso siguiente) DEBE aparecer `POST /auth/login` → 200 `{token, operator}`.
- **Query DB (tras forzar un login de sync con el email de prueba):**
  ```sql
  SELECT email, name, cargo, pais, created_at, last_login_at
  FROM operators WHERE email = 'qa.verificador@upm.test';
  ```
- **Esperado:** fila presente, `last_login_at` reciente (segundos/minutos). Si no hay fila tras un `/auth/login` 200 → bug de persistencia de operator.

### 4.1 Inicio (`/`)
- **Qué debe mostrar:** HomeHero con conteo de cobertura en vivo + stats (alta relevancia / por votar / audiencias), "En tu Radar" filtrado por prefs, AgendaMercosur, DiffSinceLastVisit.
- **De dónde viene:** `useLiveFeed` → `GET /feed` (tabla `normas`). AgendaMercosur y DiffSinceLastVisit son derivados locales del feed + `upm.visit.snapshot.v1` (esto último es local-esperado).
- **Confirmar en Network (tras limpiar `upm.live-feed.v2`):** exactamente **1** `GET /feed` a `upm-api-production` (no 40+ a legislaturas). Status 200, `fetchedAt` reciente.
- **Query DB:**
  ```sql
  SELECT count(*) FROM normas;
  SELECT relevance, count(*) FROM normas GROUP BY relevance ORDER BY 2 DESC;
  ```
- **Esperado:** el conteo de cobertura del Hero ≈ `count(*)` de `normas` (~1850). Las stats de "alta relevancia" deben coincidir con `count(*) WHERE relevance='alta'`. Si el Hero muestra números pero Network no tuvo `/feed` → estás viendo caché o el mock `NEWS` (10 ítems): limpiá y recargá.

### 4.2 Radar (`/radar`)
- **Qué debe mostrar:** "Novedades en vivo", estado de fuentes, pills de filtro con counts, cards (RadarSmartCard) con scroll infinito (50 → +100).
- **De dónde viene:** mismo `GET /feed` (`normas`). El panel "estado de fuentes" sale del array `sources` de la respuesta de `/feed`.
- **Confirmar en Network:** 1 `GET /feed`. Probá búsqueda/filtros y confirmá que filtran sobre los items ya traídos (es client-side sobre el feed; NO debería disparar nuevos requests salvo que uses `/search`).
- **Query DB (paridad por país, debe matchear los counts de las pills/filtros):**
  ```sql
  SELECT country, count(*) FROM normas GROUP BY country ORDER BY 2 DESC;
  ```
- **Esperado:** los counts por país en la UI coinciden con la DB. 7 países con datos.
- **Bonus búsqueda:** si la pantalla expone búsqueda server-side, tipeá un término y verificá `GET /search?q=...` 200; comparalo con la query que **replica el índice real del endpoint** (solo `title || excerpt`, NO `full_text`):
  ```sql
  SELECT id, title FROM normas
  WHERE to_tsvector('spanish', coalesce(title,'')||' '||coalesce(excerpt,''))
        @@ plainto_tsquery('spanish','ambiente')
  ORDER BY ts_rank(to_tsvector('spanish', coalesce(title,'')||' '||coalesce(excerpt,'')), plainto_tsquery('spanish','ambiente')) DESC
  LIMIT 10;
  ```
  (Confirmá con `\d normas` los nombres reales de columna; `full_text` es el nombre en DB. Recordá: `/search` NO indexa `full_text`, así que NO lo incluyas en esta query si querés paridad con el endpoint. El RAG del asistente sí lo usa — por eso pueden divergir; ver sección 2.)

### 4.3 Leyes + detalle de norma (`/leyes`, `/radar/:id`)
- **Qué debe mostrar:** lista filtrada a leyes sancionadas (split-view), detalle con genealogía/tramitación/articulado/backlinks/notas.
- **De dónde viene:** `GET /feed` filtrado a `isSanctionedLaw` (o `GET /laws`). El detalle (`/radar/:id`) usa `useNewsItem(id)` sobre el feed; los enriquecimientos (genealogía, citation graph, RAG) son **locales** sobre el feed — local-esperado, NO bug si "no hay data" en un panel.
- **Confirmar en Network:** si existe `/laws`, probalo: `curl -s "https://upm-api-production.up.railway.app/laws" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'`. Abrí una norma real por deep-link (tomá un `id` de la DB).
- **Query DB (tomar un id real y verificar que /feed lo trae):**
  ```sql
  SELECT id, title, country, type, date FROM normas WHERE type IN ('ley','decreto') ORDER BY date DESC LIMIT 5;
  ```
  Tomá un `id`, navegá a `/app-upm/#/radar/<id>` (o la ruta que use el front) y confirmá que el detalle carga ESA norma con el mismo título que en la DB.
- **Esperado:** el detalle muestra el título/fecha/país idénticos a la fila de `normas`. Paneles de enriquecimiento pueden estar vacíos (local) sin ser bug.

### 4.4 Asistente (`/asistente`)
- **Qué debe mostrar:** chat; al preguntar, una respuesta con fuentes.
- **De dónde viene:** `POST /assistant` (backend) → **espera 503** (sin `ANTHROPIC_API_KEY`) → fallback RAG local TF-IDF.
- **Confirmar en Network:** al enviar un mensaje DEBE salir `POST /assistant` a `upm-api-production`. **Resultado esperado: HTTP 503** con body tipo `{error:"assistant unavailable"}`. Tras el 503, la UI debe mostrar igualmente una respuesta (RAG local). Verificalo también por curl:
  ```bash
  curl -s -X POST https://upm-api-production.up.railway.app/assistant \
    -H 'Content-Type: application/json' \
    -d '{"messages":[{"role":"user","content":"¿qué leyes de ambiente hay?"}]}' \
    -w '\nHTTP %{http_code}\n'
  ```
- **Esperado / interpretación:**
  - `POST /assistant` sale + **503** → ✅ **conectado-ok** (cableado correcto; LLM apagado a propósito). NO es bug.
  - NO sale ningún request → ✗ bug de config (`VITE_UPM_API_URL` ausente en el build).
  - 200 con respuesta real → significa que alguien seteó la API key (registralo como cambio de estado, no esperado por el brief).
  - 404 / error de red / CORS → bug real.
- **DB:** no aplica (assistant no persiste; conversaciones son locales).

### 4.5 Perfil (`/perfil`) — incluye FLUJO DE ESCRITURA prefs
- **Qué debe mostrar:** datos de cuenta (name/email/cargo/pais), drawer de preferencias (países/temas/frecuencia/idioma/notificaciones), alertas.
- **De dónde viene:** cuenta y alertas = local (`upm.app.operator` / alerts local-esperado). **Preferencias = SÍ sincronizan** → `PUT /me/prefs` → tabla `prefs`.
- **Flujo de escritura (hacelo en Chrome, con Network abierto):**
  1. Limpiá `upm.sync.token.v1`. Editá una preferencia (ej. agregá país `AR` o cambiá frecuencia a `semanal`). Anotá el email del operador activo (consola: `JSON.parse(localStorage['upm.app.operator']).email`).
  2. Esperá **>1.5s** (debounce). En Network: primero `POST /auth/login` (si no había token) → 200, luego `PUT /me/prefs` con header `Authorization: Bearer ...` y body `{countries,topics,frequency,language,notifications}` → 200 `{doc}`.
  3. **Confirmá en DB** (usá el email real del operador):
     ```sql
     SELECT operator_email, doc, updated_at FROM prefs WHERE operator_email = '<EMAIL_DEL_OPERADOR>';
     ```
  4. **Esperado:** `doc` JSONB contiene exactamente la pref que editaste (ej. `'AR' = ANY` de countries, o `frequency='semanal'`), `updated_at` de hace segundos.
- **Cierre del loop con token independiente (sin caché del front):**
  ```bash
  curl -s https://upm-api-production.up.railway.app/me/prefs -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
  ```
  (con el `$TOKEN` del email de prueba, si editaste con ese usuario). El `doc` devuelto debe coincidir con lo que ves en pantalla.
- **Falso-negativo a evitar:** si mirás Network antes de 1.5s no vas a ver el PUT; no concluyas "no sincroniza" sin esperar el debounce. Y editar dos prefs en <1.5s colapsa en un solo PUT (por diseño).

### 4.6 Carpeta / Guardados (`/carpetas`) — FLUJO DE ESCRITURA saved
- **Qué debe mostrar:** árbol de carpetas, ítems guardados (novedad/documento/respuesta/minuta/brief). Si está vacío, siembra 5 mocks locales (local-esperado).
- **De dónde viene:** saved + folders = SÍ sincronizan → `PUT /me/saved` → tabla `saved_state`. (Ojo: el botón "Guardar" puede estar deshabilitado por el feature flag `launch.ts` `saveToFolder:false`. Si lo está, registralo: la persistencia de saved no es ejercitable desde la UI hasta reactivar el flag. En ese caso, verificá el endpoint directo por curl.)
- **Flujo de escritura desde UI (si el guardar está activo):** guardá una norma desde el detalle, esperá >1.5s, mirá `PUT /me/saved` 200, y:
  ```sql
  SELECT operator_email, doc->'saved', doc->'folders', updated_at
  FROM saved_state WHERE operator_email = '<EMAIL_DEL_OPERADOR>';
  ```
- **Flujo de escritura por endpoint (siempre ejercitable, evita el flag de UI):**
  ```bash
  curl -s -X PUT https://upm-api-production.up.railway.app/me/saved \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"saved":[{"id":"qa-1","type":"novedad","title":"QA item","ref":"ar-ley-1","savedAt":"2026-06-14T00:00:00Z"}],"folders":[{"id":"f1","title":"QA","itemCount":1}]}' \
    -w '\nHTTP %{http_code}\n'
  ```
  Luego:
  ```sql
  SELECT doc FROM saved_state WHERE operator_email = 'qa.verificador@upm.test';
  ```
- **Esperado:** el `doc` JSONB contiene el item `qa-1` y la carpeta `f1`; `updated_at` reciente.

### 4.7 Notas (en Leyes/NewsConversation NotesPanel) — FLUJO DE ESCRITURA notes
- **De dónde viene:** notas = SÍ sincronizan → `PUT /me/notes` → tabla `notes_state` (key local `upm.notes.v1`).
- **Flujo por endpoint:**
  ```bash
  curl -s -X PUT https://upm-api-production.up.railway.app/me/notes \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"notes":[{"id":"n1","itemId":"ar-ley-1","text":"nota QA","tags":["qa"],"createdAt":"2026-06-14T00:00:00Z","updatedAt":"2026-06-14T00:00:00Z"}]}' \
    -w '\nHTTP %{http_code}\n'
  ```
  ```sql
  SELECT doc FROM notes_state WHERE operator_email = 'qa.verificador@upm.test';
  ```
- **Esperado:** `doc.notes[0].text = 'nota QA'`, `updated_at` reciente. Si lo hacés desde la UI (NotesPanel), recordá el debounce 1.5s y verificá el `PUT /me/notes` en Network.

### 4.8 Briefing (`/briefing`, deep-link)
- **Qué debe mostrar:** config (tema/países/ventana), top 5 ranqueado, 1-pager imprimible.
- **De dónde viene:** filtra el feed en vivo (`GET /feed`). "Guardar briefing" usa `store.saveItem` → eso es saved → `PUT /me/saved` (sincroniza). El render del briefing es local sobre el feed.
- **Confirmar:** que la pantalla use los items del feed (mismo `/feed`, no mock). Probá `?window=7d&topic=ambiente` y verificá que pre-filtra.
- **Esperado:** los 5 ítems del briefing existen en `normas` (cruzá un id contra la DB).

### 4.9 Biblioteca (`/biblioteca`, deep-link)
- **Qué debe mostrar:** buscador + tabs de categoría sobre `DOCUMENTS` (**12 fichas, ids `d1`–`d12`, estáticos/mock** — local-esperado) + sección "Últimas leyes" (6 ítems del feed).
- **De dónde viene:** `DOCUMENTS` = `data.ts` (NO backend; NO reportar como bug). "Últimas leyes" = `GET /feed` (sí backend).
- **Confirmar:** que "Últimas leyes" muestre 6 normas reales del feed; cruzá un título contra `normas`. Las 12 fichas de biblioteca NO tienen que estar en la DB (es correcto que no estén).
- **Esperado:** sección de leyes coincide con `SELECT id,title FROM normas WHERE type IN ('ley','decreto','reglamento') ORDER BY date DESC LIMIT 6;`. Documentos estáticos → no-conectado-esperado.

### 4.10 Stats (`/estadisticas`, deep-link)
- **Qué debe mostrar:** 4 hero stats (items, alta relevancia, países, backlinks), heatmap, choropleth, distribución por país/tema/año, panel de salud de fuentes, top leyes citadas.
- **De dónde viene:** todo derivado del feed (`GET /feed`) + citation graph local. El panel de fuentes refleja el array `sources` de `/feed`.
- **Confirmar y cruzar con DB:**
  ```sql
  SELECT topic, count(*) FROM normas GROUP BY topic ORDER BY 2 DESC;
  SELECT substr(date,1,4) AS anio, count(*) FROM normas GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
  ```
- **Esperado:** hero "items" == `count(*) normas`; distribución por país/tema/año coincide con las queries. Si difiere, casi siempre es caché vieja del feed → limpiar `upm.live-feed.v2` y recargar.

### 4.11 LegisladorProfile (`/legislador/:id`)
- **De dónde viene:** datos del legislador = JSON estático (`lib/legisladores.ts`, local-esperado) + leyes firmadas = matcheo sobre el feed (`GET /feed`). NO hay endpoint de legislador.
- **Confirmar:** que las "leyes firmadas" sean normas reales del feed (cruzá un id contra `normas`). El perfil base (nombre/partido) es estático → no-conectado-esperado.

---

## 5. Verificación directa de la base

Corré y registrá output literal de cada una:

```sql
-- 5.1 Total y por país
SELECT count(*) AS total_normas FROM normas;
SELECT country, count(*) FROM normas GROUP BY country ORDER BY 2 DESC;

-- 5.2 Por fuente (debe haber ~48 fuentes registradas; ver cuántas aportan filas)
SELECT source_id, count(*) FROM normas GROUP BY source_id ORDER BY 2 DESC;
SELECT count(*) AS total_sources FROM sources;
SELECT id, label, country, enabled, last_ok, last_count, left(coalesce(last_error,''),120) AS err
FROM sources ORDER BY last_ok NULLS FIRST, last_count DESC;

-- 5.3 Último ingest_run (debe ser reciente, <30min si el cron corre)
SELECT id, started_at, finished_at, ok_sources, failed_sources, items_upserted
FROM ingest_runs ORDER BY id DESC LIMIT 3;

-- 5.4 Frescura de normas (last_seen_at reciente confirma que el ingest las re-vio)
SELECT max(last_seen_at) AS ultimo_visto, min(first_seen_at) AS primer_visto FROM normas;

-- 5.5 Operadores y estado de usuario creados por la QA
SELECT email, last_login_at FROM operators ORDER BY last_login_at DESC NULLS LAST LIMIT 10;
SELECT operator_email, updated_at FROM prefs ORDER BY updated_at DESC LIMIT 10;
SELECT operator_email, updated_at FROM saved_state ORDER BY updated_at DESC LIMIT 10;
SELECT operator_email, updated_at FROM notes_state ORDER BY updated_at DESC LIMIT 10;
```

**Nota sobre conteo de fuentes:** el registry del servidor (`server/src/ingest/registry.ts::FETCHERS`) define **48** fuentes y `GET /sources` debería devolver 48; `total_sources` de la tabla debe acercarse a ese número. El cliente tiene su propio fallback de 47 fetchers (`client/src/lib/sources/index.ts`), que NO toca la DB — no lo uses para validar el conteo de la base.

**Paridad /feed ↔ DB (clave para descartar caché):** comparar el conteo que devuelve el endpoint contra la tabla en el mismo momento:
```bash
API_N=$(curl -s "https://upm-api-production.up.railway.app/feed" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["items"]))')
DB_N=$(psql "${DATABASE_PUBLIC_URL:-$DATABASE_URL}" -tAc 'SELECT count(*) FROM normas;')
echo "API=$API_N  DB=$DB_N"
```
Nota: `/feed` aplica `LIMIT 500` por defecto en el handler (`server/src/routes/feed.ts`); si `API_N=500` y `DB_N=~1850`, eso es esperado (el endpoint top-500 por fecha). Confirmá tomando 3 ids del `/feed` y verificando que existen en `normas`:
```bash
curl -s "https://upm-api-production.up.railway.app/feed" | python3 -c 'import sys,json;[print(i["id"]) for i in json.load(sys.stdin)["items"][:3]]'
# por cada id:
psql "${DATABASE_PUBLIC_URL:-$DATABASE_URL}" -c "SELECT id,title FROM normas WHERE id='<ID>';"
```

---

## 6. Verificación de ingesta y resiliencia

- **El cron corre (cada 30 min):** `ingest_runs` (5.3) con `finished_at` reciente y `items_upserted ≥ 0`. Si el último run es de hace horas → posible cron caído; cruzá con logs: `cd /Users/alannaimtapia/dev/app-upm/server && railway logs` (buscar "ingest" / "runIngest" / cron). El orquestador del ingest está en `server/src/ingest/run.ts` y la lista de fuentes en `server/src/ingest/registry.ts`; si necesitás confirmar el scheduling exacto, revisá el bootstrap del servidor (`server/src/index.ts`) antes de afirmar la cadencia.
- **Fuentes ok/fail:** `GET /health` trae `lastIngest:{okSources,failedSources}`; `GET /sources` lista las registradas (48). Cruzá con la query 5.2. Algunas fuentes fallidas son normales (HTML que cambió, timeouts); lo que importa es que **el run completa** y la mayoría aporta.
  ```bash
  curl -s https://upm-api-production.up.railway.app/health | python3 -c 'import sys,json;d=json.load(sys.stdin);li=d.get("lastIngest",{});print("ok:",li.get("okSources"),"fail:",li.get("failedSources"),"upserted:",li.get("itemsUpserted"),"itemCount:",d.get("itemCount"))'
  curl -s https://upm-api-production.up.railway.app/sources | python3 -c 'import sys,json;print("sources registradas:",len(json.load(sys.stdin)))'
  ```
- **Una fuente caída no rompe el resto (aislamiento por fuente):** confirmá en `sources` que conviven filas con `last_ok=false` (con `last_error`) y `last_ok=true` con `last_count>0` en el mismo run. La presencia de ambas demuestra que el `Promise.all` con `.then(ok,err)` por fuente aísla fallos. Si TODAS están en `false` o el run quedó sin `finished_at` → ahí hay un problema de orquestación.
- **Validación enum:** opcional, confirmá que no hay basura: `SELECT DISTINCT country FROM normas;` (solo AR/BR/UY/PY/CL/BO/PE/CO) y `SELECT DISTINCT relevance FROM normas;` (alta/media/baja).

---

## 7. Verificación de paridad front↔back (sin desfasaje por caché)

Objetivo: lo que el usuario ve == lo que está en la DB, en el mismo instante.
1. En Chrome, **limpiá** `upm.live-feed.v2` y hard-reload Inicio. Leé el conteo de cobertura del Hero (o el de Stats "items").
2. En el mismo minuto, corré `SELECT count(*) FROM normas;` y `curl .../feed`.
3. **Esperado:** Hero/Stats ≈ DB (recordando el `LIMIT 500` del endpoint: las pantallas que consumen `/feed` ven hasta 500; si la UI muestra ~1850 es porque combina/no limita — registrá cuál es el comportamiento real observado). Lo importante: que el número de la UI provenga del request a `/feed` y NO del mock `NEWS` (10 ítems) ni de caché vieja.
4. **Prueba de escritura espejo:** editá una pref en el front (4.5), confirmá `PUT /me/prefs` 200, e inmediatamente `SELECT doc FROM prefs WHERE operator_email='<email>'`. El valor de la UI, el body del PUT y el `doc` de la DB deben ser idénticos. Cualquier divergencia = desfasaje a reportar.
5. **Anti-falso-positivo de "conectado":** abrí el front con Network grabando y verificá que NO hay 40+ requests a dominios de legislaturas externas (camara.leg.br, senado, infoleg, parlamento.gub.uy, etc.). Si los ves, el front está usando los 47 fetchers locales (`client/src/lib/sources/index.ts`, fallback), señal de que NO está pegándole al `/feed` del backend → bug de conexión.

---

## 8. Matriz de criterios de aceptación

Completá la columna ✓/✗ con evidencia (output de curl/SQL/screenshot de Network):

| # | Criterio | Cómo se verifica | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| 1 | Backend vivo | `curl /health` | 200, `db:"up"`, `itemCount~1850` | |
| 2 | Feed conectado (Inicio) | limpiar `upm.live-feed.v2` + Network | 1 `GET /feed` 200, sin 40+ externos | |
| 3 | Paridad feed↔DB | API ids ∈ `normas` | 3/3 ids existen en DB | |
| 4 | Conteo cobertura UI ≈ DB | Hero/Stats vs `count(*) normas` | coinciden (mod. LIMIT 500) | |
| 5 | Counts por país UI↔DB | pills Radar vs `GROUP BY country` | coinciden | |
| 6 | Búsqueda server-side | `GET /search?q=` vs FTS SQL (`title+excerpt`) | top results coinciden | |
| 7 | Detalle de norma real | deep-link `/radar/:id` vs `normas` | título/fecha idénticos | |
| 8 | Login emite JWT real | `POST /auth/login` por curl | 200 `{token,operator}`, exp ~30d | |
| 9 | Operator persistido | `SELECT operators` | fila + `last_login_at` reciente | |
| 10 | Prefs sincroniza (UI) | editar pref + `PUT /me/prefs` | 200, debounce 1.5s respetado | |
| 11 | Prefs en DB | `SELECT doc FROM prefs` | `doc` == lo editado, `updated_at` reciente | |
| 12 | Saved persistido | `PUT /me/saved` (curl) + SQL | `doc.saved` contiene el item | |
| 13 | Notes persistido | `PUT /me/notes` (curl) + SQL | `doc.notes` contiene la nota | |
| 14 | /me/* exige auth | `GET /me/prefs` sin token | 401 | |
| 15 | Asistente cableado | `POST /assistant` (Network+curl) | request sale, **503 esperado** | |
| 16 | Asistente fallback local | UI tras 503 | responde igual (RAG local) | |
| 17 | Ingest reciente | `SELECT ingest_runs` | `finished_at` <30min, `items_upserted≥0` | |
| 18 | Resiliencia fuentes | `sources` + `/health` | run completa con mix ok/fail | |
| 19 | Sources registradas | `GET /sources` vs `registry.ts` | 48 (server registry, no las 47 del cliente) | |
| 20 | Sin endpoints fantasma | `curl /me/notifications,/me/alerts,/me/conversations` | 404 (local-esperado, NO bug) | |
| 21 | No usa fetchers locales | Network del front prod | 0 requests a legislaturas externas | |
| 22 | CORS ok | console del front | sin errores CORS para `upm-api-production` | |
| 23 | Biblioteca docs estáticos | `/biblioteca` | **12 docs** local (`d1`–`d12`), "Últimas leyes" del feed | |

Para los criterios 20 y 23, recordá: 404 / estático = **no-conectado-esperado**, NO cuenta como bug.

---

## 9. Reporte final

Entregá un informe en markdown (en tu respuesta de texto, NO crees archivos `.md`) con esta estructura:

1. **Resumen ejecutivo** (3-5 líneas): ¿está el proyecto conectado y persistido end-to-end? Veredicto + nº de criterios ✓/total.
2. **Matriz de aceptación** (la tabla de la sección 8 completa con ✓/✗ y una celda de evidencia por fila).
3. **Hallazgos clasificados** en tres categorías:
   - **✅ conectado-ok**: flujos que funcionan front↔back↔DB, con evidencia (request + status + query SQL con output).
   - **➖ no-conectado-esperado**: estado local/mock por diseño (notifications, alerts, conversations, watchlist, telemetry, visit-tracker, DOCUMENTS/DOSSIERS/FORUMS/NEWS, RAG local, asistente 503, los 47 fetchers client-side de fallback). Listar para dejar claro que NO son bugs.
   - **🐞 bug-real**: cualquier cosa que DEBERÍA estar conectada (handler existe en `server/src/routes/*.ts`) y no lo está, o desfasaje front↔DB, o request que no sale, o error de red/CORS/500. Para cada bug: pantalla, request esperado vs observado, query SQL que lo evidencia, y severidad.
4. **Evidencia adjunta**: por cada flujo crítico, incluí el output literal del curl, el resultado del SELECT SQL, y una descripción (o screenshot) del request en Network (método/URL/status/tamaño).
5. **Trampas verificadas**: confirmá explícitamente que (a) limpiaste el caché `upm.live-feed.v2` antes de medir feed, (b) respetaste el debounce de 1.5s antes de concluir sobre sync, (c) interpretaste el 503 del asistente como esperado y no como bug, (d) usaste la query FTS solo con `title+excerpt` para comparar contra `/search` (el índice GIN no incluye `full_text`).
6. **Notas de estado**: cualquier cambio detectado respecto al brief (ej. si `ANTHROPIC_API_KEY` ahora SÍ está seteada, si el cron está atrasado, si el feature flag `saveToFolder` bloquea el guardar desde UI, o si `GET /sources` no devuelve 48). Registrá también, si tocaste búsqueda, la divergencia índice↔uso documentada en la sección 2 (`/search` indexa `title+excerpt`; el RAG del asistente además usa `full_text` con seq scan).

Rutas, comandos, keys de localStorage y queries de este prompt son literales y están listas para copiar/pegar. No reportes como bug nada de la lista "no-conectado-esperado". Sé concreto: cada ✓ o ✗ debe tener su evidencia.
