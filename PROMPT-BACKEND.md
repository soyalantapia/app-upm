# PROMPT: Backend completo para App UPM (Fastify + Postgres en Railway)

Sos un agente con CONTROL TOTAL para construir el backend de App UPM, una PWA de monitoreo legislativo latinoamericano. El frontend ya existe, está deployado y funciona 100% client-side con mocks. Tu trabajo: construir el backend completo en `/Users/alannaimtapia/dev/app-upm/server`, deployarlo en Railway, y dejar la app **100% funcional y sincronizada** con datos reales server-side. El stack ya está decidido — no lo re-debatas.

---

## 1. Objetivo y definición de "100% funcional" (criterios de aceptación medibles)

La tarea está terminada cuando TODOS estos checks pasan:

1. **Feed real desde backend**: `curl https://<dominio-railway>/feed` devuelve JSON con `items` (>50 normas reales de ≥3 países), `fetchedAt` ISO y `sources[]`, en <2 segundos (servido desde Postgres, NO fetching on-demand).
2. **Frontend conectado**: el build de producción del cliente con `VITE_UPM_API_URL` apuntando a Railway muestra el feed servido por el backend (verificable en Network tab: 1 request a `/feed` en lugar de 40+ requests a APIs externas).
3. **Ingesta automática**: job interno corre cada 30 min, hace upsert idempotente en Postgres, y `GET /health` reporta timestamp del último run exitoso y conteo por fuente.
4. **Filtros funcionan**: `GET /feed?pais=BR` devuelve solo items `country: 'BR'`; `GET /feed?tema=ambiente` solo `topic: 'ambiente'`.
5. **Auth demo + sync**: login con cualquier email devuelve JWT; `PUT /me/prefs`, `PUT /me/saved`, `PUT /me/notes` persisten en Postgres y se recuperan con `GET`.
6. **Asistente con LLM real**: con `ANTHROPIC_API_KEY` seteada, `POST /assistant` responde con `claude-sonnet-4-6` citando normas reales de la DB. Sin la key, devuelve 503 y el frontend cae al mock actual sin romperse.
7. **Modo demo intacto**: el frontend SIN `VITE_UPM_API_URL` (o con el backend caído) sigue funcionando exactamente como hoy (fallback a fetchers client-side). Cero regresiones.
8. **Tests verdes**: tests del server (unit + integración) pasan; los 8 archivos / 42 tests existentes del cliente (`cd /Users/alannaimtapia/dev/app-upm/client && npm run test`) siguen verdes.
9. **Smoke E2E**: front local (`npm run dev` en client con `VITE_UPM_API_URL` apuntando a Railway) muestra el feed del backend en el browser.

---

## 2. Contexto del sistema actual (rutas exactas) y QUÉ NO TOCAR

**Repo**: `/Users/alannaimtapia/dev/app-upm` (GitHub: `soyalantapia/app-upm`, público). Leé primero `/Users/alannaimtapia/dev/app-upm/HANDOFF.md`.

> ⚠️ **Erratum conocido en HANDOFF.md**: la línea 41 dice `# → http://127.0.0.1:5181/app-upm/` pero el puerto real del dev server es **5188** (`vite.config.ts` línea 39: `port: 5188, strictPort: true`). NO sigas el HANDOFF literalmente en ese punto. Como parte de la Fase 0, corregí esa línea de HANDOFF.md a `# → http://127.0.0.1:5188/app-upm/`.

**Frontend** (`/Users/alannaimtapia/dev/app-upm/client`):
- Vite 7 + React 19 + TS strict + Tailwind 4 + HashRouter. Dev server: `http://127.0.0.1:5188` (puerto estricto). Base `/app-upm/`. PWA.
- Deployado en GH Pages: `https://soyalantapia.github.io/app-upm/` (rama `gh-pages` = contenido de `client/dist`).
- **Punto de integración clave**: `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/index.ts` línea 216:
  ```typescript
  const WORKER_URL = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')
  ```
  y línea 221: `fetch(\`${WORKER_URL}/feed\`, { signal })`. Si la respuesta no es `res.ok` o el JSON no parsea, devuelve `null` silenciosamente y el front cae a sus 40+ fetchers client-side. **Tu endpoint de feed DEBE ser exactamente `GET /feed`** y respetar el shape de la sección 4.
- El front computa `byCountry` localmente sumando `sources[].count` — el backend NO lo envía.
- El front hace dedupe (por `id`, keep-first) y ranking (relevancia + prefs) DESPUÉS de recibir tu respuesta. El backend NO debe pre-rankear ni preocuparse por duplicados entre fuentes.
- Tipos canónicos en `/Users/alannaimtapia/dev/app-upm/client/src/lib/types.ts`: `NewsItem`, `ChatMessage`, `CountryCode`, `Topic`, `DocType`, `Relevance`, `SourceReport`, `Tramitacion`. **Son el contrato — copialos textual al server, no los modifiques.**
- Asistente: `/Users/alannaimtapia/dev/app-upm/client/src/pages/Assistant.tsx` (función `send()`, líneas ~101-123) usa `generateRAGAnswer()` (`lib/rag.ts`, TF-IDF client-side) con fallback a `generateAssistantResponse()` (`lib/respond.ts`, 23 patrones hardcoded).
- Estado local en localStorage: `upm.app.operator` (Operator), `upm.app.state` (prefs/saved/folders/notifications/conversations/alerts), `upm.notes.v1`, `upm.watchlist.v1`, `upm.visit.snapshot.v1`, `upm.live-feed.v2` (cache feed 24h), `upm.telemetry.*`. Adaptador pluggable en `/Users/alannaimtapia/dev/app-upm/client/src/lib/sync.ts` (`setSyncAdapter()`, stub REST comentado en líneas 66-91).
- Cache del feed: hard TTL 24h, soft TTL 5 min (stale-while-revalidate), auto-refresh cada 5 min vía `useLiveFeed` en `lib/use-live-feed.ts`.

**Worker existente** (`/Users/alannaimtapia/dev/app-upm/worker/` — Cloudflare Worker NO deployado, fuente de código a portar):
- `/Users/alannaimtapia/dev/app-upm/worker/src/index.ts`: fetchers `camaraBR()` (dadosabertos.camara.leg.br), `senadoBR()` (legis.senado.leg.br), `hcdnAR()` (datos.hcdn.gob.ar CKAN), función `detectTopic()`, función `aggregate()`. Código puro sin dependencias CF — portable 1:1 a Node.
- GOTCHA documentado: el worker usa el patrón `.then(ok, err)` por fuente dentro de `Promise.all` — mantené ese aislamiento de fallos por fuente en el server (una fuente caída NUNCA tira la ingesta completa).

**Fetchers client-side** (`/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/` — 40+ fuentes: Câmara BR, Senado BR, HCDN AR, Socrata CO, Presidencia CO, Corte Constitucional CO, Parlamento UY, Leyes UY, Senado PY, Diputados PY, Asamblea BO, Congreso CL, etc.): portá su lógica de fetch+mapeo al server. **Si algún fetcher del cliente usa proxy CORS (allorigins, corsproxy, etc.), eliminá el proxy y pegale directo a la URL de origen — server-side no necesita proxies.**

**QUÉ NO TOCAR del front:**
- `client/src/lib/types.ts` (contrato), `client/src/lib/sources/index.ts` (dedupe/rank/cleanTitle/fetchFromWorker/cache), `lib/use-live-feed.ts`, los 8 archivos de test en `client/src/test/`.
- Las keys de localStorage existentes (no renombrar, no migrar).
- HashRouter, base `/app-upm/`, PWA manifest.
- Los únicos cambios permitidos en el cliente están en la sección 7.

---

## 3. Stack decidido (CERRADO — no re-debatir)

- **Node 20+ / TypeScript / Fastify / Zod** en `/Users/alannaimtapia/dev/app-upm/server` (workspace nuevo). *Porqué: Fastify es el framework Node más rápido con validación de schemas nativa, y Zod da type-safety runtime alineada al TS strict del cliente.*
- **Node 22 requerido para el CLIENTE** — el cliente DEBE correr con Node 22 (no v25+). La máquina local tiene Node 25: antepone `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` a TODO comando npm que corras dentro de `client/` (dev, build, test) — ver HANDOFF.md líneas 39-40 para la instrucción de PATH. El server targetea Node 20+ (lo que corre en Railway); no subas el engine del cliente.
- **PostgreSQL en Railway** (servicio YA existe) + **Drizzle ORM** + **drizzle-kit** para migraciones. *Porqué: el Postgres ya está provisionado en el proyecto Railway del usuario y Drizzle genera SQL inspeccionable con tipos TS nativos, sin runtime mágico.*
- **Ingesta**: job interno con **node-cron** cada 30 min dentro del mismo proceso (sin servicio extra, free-tier friendly).
- **Asistente**: proxy a la API de Anthropic, modelo `claude-sonnet-4-6`, condicional a `ANTHROPIC_API_KEY`.
- **Deploy**: segundo servicio en el MISMO proyecto Railway, vía `railway` CLI.

**Estructura propuesta** (`/Users/alannaimtapia/dev/app-upm/server`):

```
server/
├── package.json            # type: module, engines node >=20
├── tsconfig.json
├── drizzle.config.ts
├── .env.example            # DATABASE_URL, ANTHROPIC_API_KEY, ALLOWED_ORIGINS, JWT_SECRET, PORT
├── src/
│   ├── index.ts            # bootstrap Fastify + cron
│   ├── app.ts              # build del server (exportable para tests)
│   ├── config.ts           # env parsing con Zod
│   ├── db/
│   │   ├── client.ts       # drizzle + pg pool
│   │   └── schema.ts       # tablas (sección 5)
│   ├── types.ts            # NewsItem, ChatMessage, enums — COPIA EXACTA de client/src/lib/types.ts
│   ├── routes/
│   │   ├── feed.ts         # GET /feed, /laws, /search, /sources
│   │   ├── health.ts       # GET /, GET /health
│   │   ├── auth.ts         # POST /auth/login
│   │   ├── me.ts           # GET/PUT /me/prefs|saved|notes, GET /me
│   │   └── assistant.ts    # POST /assistant
│   ├── ingest/
│   │   ├── run.ts          # orquestador de ingesta + upsert
│   │   ├── topic.ts        # detectTopic() portado del worker
│   │   └── fetchers/       # un archivo por país/fuente portado
│   └── plugins/
│       ├── cors.ts
│       └── auth.ts         # verificación JWT (decorator)
├── drizzle/                # migraciones generadas
└── test/
    ├── unit/               # topic, mappers, validación
    └── integration/        # endpoints contra Postgres
```

---

## 4. CONTRATO API COMPLETO (shapes exactos — cualquier desvío rompe el front)

Tipos base (copia textual de `client/src/lib/types.ts` — usalos en Zod):

```typescript
type CountryCode = 'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'
type Topic = 'ambiente' | 'integracion-regional' | 'corredores-bioceanicos' | 'genero' | 'educacion' | 'salud' | 'energia' | 'rio-uruguay' | 'mercosur' | 'rrii' | 'seguridad' | 'economia-regional'
type DocType = 'ley' | 'decreto' | 'reglamento' | 'informe' | 'acta' | 'convenio' | 'comunicado' | 'minuta' | 'dossier'
type Relevance = 'alta' | 'media' | 'baja'

type NewsItem = {
  id: string; title: string; country: CountryCode; topic: Topic; type: DocType
  date: string; relevance: Relevance; excerpt: string; source: string
  fullText?: string; authors?: string; status?: string; tipoDocumento?: string
  tipoConteudo?: string; keywords?: string[]; sourceUrl?: string; pdfUrl?: string
  dataPublicacao?: string; dataAtualizacao?: string; apiDetailUrl?: string
  comision?: string; tramitaciones?: { fecha: string; descripcion: string; organo?: string; despacho?: string }[]
}

type SourceReport = { id: string; label: string; country: CountryCode; ok: boolean; count: number; error?: string }

type ChatMessage = {
  id: string; role: 'user' | 'assistant'; content: string
  sources?: { id: string; title: string; type: DocType }[]
  isInstitutional?: boolean; createdAt: string
}
```

### Endpoints públicos (sin auth)

**`GET /`** → 200 `{ "ok": true, "service": "upm-api", "endpoints": ["/feed","/laws","/search","/sources","/health","/auth/login","/me","/assistant"] }`

**`GET /feed`** ← LA RUTA CRÍTICA, exactamente esta (es lo que llama `fetchFromWorker()`).
Query params opcionales: `pais` (CountryCode), `tema` (Topic).
Respuesta 200 — shape EXACTO que el front parsea en `sources/index.ts:223`:
```json
{
  "items": [ /* NewsItem[] desde Postgres, sorted por date DESC. SIN dedupe, SIN pre-rank (lo hace el front) */ ],
  "fetchedAt": "2026-06-12T14:30:00.000Z",
  "sources": [ { "id": "camara-br", "label": "Câmara BR", "country": "BR", "ok": true, "count": 30 } ]
}
```
- `fetchedAt` = `finished_at` del último ingest run exitoso (NO `now()`).
- `sources` = estado real de cada fuente en el último run (`ok`, `count`, `error?`).
- `items.date` = string ISO 8601 parseable (`YYYY-MM-DD` o completo) — el front ordena con `localeCompare`.
- `country`/`topic`/`type`/`relevance` SOLO valores de los enums de arriba — un valor desconocido rompe filtros y scoring del front.
- Errores: 400 `{ "error": "invalid query", "details": [...] }` si `pais`/`tema` no son valores del enum; 500 `{ "error": "internal" }`.

**`GET /laws`** → mismo shape que `/feed` pero `items` filtrados a `type IN ('ley','decreto','reglamento','informe')`. Acepta los mismos query params.

**`GET /search?q=<texto>`** → mismo shape que `/feed`; `items` filtrados por full-text search de Postgres (`to_tsvector('spanish', title || ' ' || excerpt || ' ' || coalesce(full_text,''))`) ordenados por `ts_rank` DESC, límite 50. 400 si falta `q` o tiene <2 chars.

**`GET /sources`** → 200 `[ { "id": "camara-br", "label": "Câmara BR", "country": "BR" }, ... ]`

**`GET /health`** → 200:
```json
{
  "ok": true,
  "db": "up",
  "lastIngest": { "finishedAt": "...", "okSources": 12, "failedSources": 2, "itemsUpserted": 145 },
  "itemCount": 1601,
  "uptime": 3600
}
```
503 con `"db": "down"` si Postgres no responde.

**`POST /auth/login`** — auth demo (replica `signIn()` de `client/src/lib/auth.tsx`: acepta cualquier email, ignora password, deriva name/cargo/pais).
Request: `{ "email": "martin.pereira@upm.org", "password": "opcional-ignorada" }`
Respuesta 200: `{ "token": "<JWT firmado con JWT_SECRET, exp 30d>", "operator": { "email": "...", "name": "Dr. Martín Pereira", "cargo": "Legislador", "pais": "UY", "loggedAt": "<ISO>" } }`
400 si falta email o no es email válido.

**`POST /assistant`**
Request: `{ "messages": ChatMessage[] }` (la última debe ser `role: 'user'`).
Lógica: (a) recuperar top-8 normas relevantes de la DB vía FTS sobre la última pregunta; (b) llamar a Anthropic `claude-sonnet-4-6` (max_tokens 1500) con system prompt: *"Sos el asistente legislativo de App UPM para legisladores latinoamericanos. Respondés en español, en markdown estructurado, citando EXCLUSIVAMENTE las normas provistas en el contexto (id, título, país, fecha). Si el contexto no alcanza, lo decís explícitamente. Nunca inventás normas."* + las 8 normas serializadas como contexto.
Respuesta 200:
```json
{
  "message": {
    "id": "a-<random>", "role": "assistant", "content": "<markdown>",
    "sources": [ { "id": "<NewsItem.id real de la DB>", "title": "...", "type": "ley" } ],
    "createdAt": "<ISO>"
  },
  "usage": { "input_tokens": 1200, "output_tokens": 450 }
}
```
- **503** `{ "error": "assistant unavailable" }` si `ANTHROPIC_API_KEY` no está seteada (el front cae al mock — NO devuelvas 200 con contenido vacío).
- 400 si `messages` inválido; 502 si Anthropic falla.

### Endpoints con auth (header `Authorization: Bearer <JWT>`; 401 `{ "error": "unauthorized" }` si falta/inválido)

Semántica de sync: **documento completo, last-write-wins** (espeja localStorage — sin merge fino).

- **`GET /me`** → 200 `{ "email", "name", "cargo", "pais", "loggedAt" }` (shape Operator).
- **`GET /me/prefs`** → 200 `{ "countries": CountryCode[], "topics": Topic[], "frequency": "diario"|"semanal"|"alertas", "language": "es"|"pt", "notifications": boolean }` o 404 si nunca guardó.
- **`PUT /me/prefs`** → body = ese mismo shape (validado con Zod) → 200 con el documento guardado.
- **`GET /me/saved`** → 200 `{ "saved": SavedItem[], "folders": Folder[] }` donde `SavedItem = { id, type: 'novedad'|'documento'|'respuesta'|'minuta'|'brief', title, ref?, body?, meta?, folderId?, savedAt }` y `Folder = { id, title, itemCount, description? }`.
- **`PUT /me/saved`** → body = mismo shape → 200.
- **`GET /me/notes`** → 200 `{ "notes": [ { "id", "itemId", "text", "tags": string[], "createdAt": number, "updatedAt": number } ] }`.
- **`PUT /me/notes`** → body = mismo shape → 200.

---

## 5. Schema de base de datos (Drizzle, `src/db/schema.ts`)

```typescript
// pgEnum para country_code, topic, doc_type, relevance con los valores EXACTOS de la sección 4

normas: {
  id: text PRIMARY KEY,                    // NewsItem.id, ej. 'br-camara-12345'
  title: text NOT NULL,
  country: country_code NOT NULL,
  topic: topic NOT NULL,
  type: doc_type NOT NULL,
  date: text NOT NULL,                     // ISO string tal cual (el front compara strings)
  relevance: relevance NOT NULL,
  excerpt: text NOT NULL DEFAULT '',
  source: text NOT NULL,
  fullText: text,                          // columna full_text
  authors: text, status: text, tipoDocumento: text, tipoConteudo: text,
  keywords: jsonb,                         // string[]
  sourceUrl: text, pdfUrl: text, dataPublicacao: text, dataAtualizacao: text,
  apiDetailUrl: text, comision: text,
  tramitaciones: jsonb,                    // Tramitacion[]
  sourceId: text NOT NULL,                 // FK lógica a sources.id (qué fetcher lo trajo)
  firstSeenAt: timestamptz NOT NULL DEFAULT now(),
  lastSeenAt: timestamptz NOT NULL DEFAULT now(),
  // índices: (country), (topic), (date DESC), GIN sobre to_tsvector('spanish', title || ' ' || excerpt)
}

sources: {
  id: text PRIMARY KEY,                    // 'camara-br', 'hcdn-ar', ...
  label: text NOT NULL,
  country: country_code NOT NULL,
  enabled: boolean NOT NULL DEFAULT true,
  lastRunAt: timestamptz,
  lastOk: boolean,
  lastCount: integer NOT NULL DEFAULT 0,
  lastError: text,
}

ingest_runs: {
  id: serial PRIMARY KEY,
  startedAt: timestamptz NOT NULL,
  finishedAt: timestamptz,
  okSources: integer NOT NULL DEFAULT 0,
  failedSources: integer NOT NULL DEFAULT 0,
  itemsUpserted: integer NOT NULL DEFAULT 0,
  detail: jsonb,                           // SourceReport[] del run
}

operators: {
  email: text PRIMARY KEY,
  name: text NOT NULL, cargo: text NOT NULL, pais: country_code NOT NULL,
  createdAt: timestamptz DEFAULT now(), lastLoginAt: timestamptz,
}

prefs: {
  operatorEmail: text PRIMARY KEY REFERENCES operators(email),
  doc: jsonb NOT NULL,                     // Preferences completo
  updatedAt: timestamptz NOT NULL DEFAULT now(),
}

saved_state: {
  operatorEmail: text PRIMARY KEY REFERENCES operators(email),
  doc: jsonb NOT NULL,                     // { saved: SavedItem[], folders: Folder[] }
  updatedAt: timestamptz NOT NULL DEFAULT now(),
}

notes_state: {
  operatorEmail: text PRIMARY KEY REFERENCES operators(email),
  doc: jsonb NOT NULL,                     // { notes: Note[] }
  updatedAt: timestamptz NOT NULL DEFAULT now(),
}
```

Justificación del patrón jsonb-documento para estado de usuario: espeja 1:1 el localStorage del front (last-write-wins), evita migraciones por cada cambio de UI, y la consigna de sync es documento completo. Las normas SÍ van columnar porque se filtran/buscan server-side.

Migraciones: `npx drizzle-kit generate` + `npx drizzle-kit migrate` (o `push` para el primer despliegue). Las migraciones se commitean en `server/drizzle/`.

---

## 6. Plan de ingesta server-side

1. **Portar fetchers**: arrancá por los 3 del worker (`/Users/alannaimtapia/dev/app-upm/worker/src/index.ts`: `camaraBR`, `senadoBR`, `hcdnAR` — son fetch puro, copian directo). Después portá los del cliente desde `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/` (CO Socrata, Presidencia CO, Corte Constitucional CO, Parlamento UY, Leyes UY, Senado PY, Diputados PY, Asamblea BO, Congreso CL, y el resto). **Quitá cualquier proxy CORS de las URLs** (server-side no lo necesita): si un fetcher arma `https://api.allorigins.win/...?url=X` o similar, llamá a `X` directo. Mantené los mismos `id`/`label`/`country` de fuente que usa el front para consistencia visual.
2. **`detectTopic()`**: portá la función del worker (líneas 238-251) a `src/ingest/topic.ts` tal cual.
3. **Aislamiento de fallos**: cada fetcher corre con timeout propio (15s, `AbortSignal.timeout`) y captura su error individualmente (patrón `.then(ok, err)` del worker o `Promise.allSettled`). Una fuente caída se registra en `sources.lastError` y NO afecta a las demás ni aborta el run. **NO uses `Promise.all` desnudo** (el GOTCHA documentado del worker).
4. **Upsert idempotente**: `INSERT ... ON CONFLICT (id) DO UPDATE` actualizando todos los campos de contenido + `lastSeenAt = now()`. `firstSeenAt` no se pisa. Correr el job dos veces seguidas no duplica nada.
5. **High-water / limpieza**: no borres normas que dejaron de aparecer (las APIs paginan los más recientes); opcional: job semanal que archiva normas con `lastSeenAt` > 90 días. `/feed` sirve las últimas 500 por `date DESC` (cap razonable para el front).
6. **NO dedupe/rank server-side**: el front lo hace (constraint del contrato). El server solo evita duplicados exactos por PK `id`.
7. **Registro**: cada run inserta en `ingest_runs` (inicio, fin, ok/fail por fuente, upserted) y actualiza `sources.*`. `/health` y el campo `sources` de `/feed` leen de ahí.
8. **Scheduling**: `node-cron` con `*/30 * * * *` + un run inmediato al boot si la DB está vacía o el último run tiene >30 min. Lock simple en memoria para no solapar runs.
9. **Script manual**: `npm run ingest` (entry `src/ingest/run.ts` ejecutable standalone) para probar la ingesta sin levantar el server.

---

## 7. Integración frontend (cambios MÍNIMOS y exactos)

1. **Conectar el feed (obligatorio, CERO código en el cliente)**: conectar el feed NO requiere ningún cambio de código en el cliente — solo configuración. Crear `/Users/alannaimtapia/dev/app-upm/client/.env.production` (hoy NO existe) con:
   ```
   VITE_UPM_API_URL=https://<dominio-del-servicio-railway>
   ```
   Sin barra final. Rebuild (`PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run build` en client — Node 22 obligatorio) y redeploy a `gh-pages` (mirá los scripts de `/Users/alannaimtapia/dev/app-upm/client/package.json` y `HANDOFF.md` para el mecanismo exacto de deploy a la rama `gh-pages`; recordá `.nojekyll` en la raíz de `dist`). **Eso solo ya conecta el feed**: `fetchFromWorker()` lo usa automáticamente.
2. **Asistente (cambio puntual en `client/src/pages/Assistant.tsx`, función `send()`) — SOLO en Fase 8, NO antes**: este cambio es para la integración del asistente y depende de que el endpoint `POST /assistant` ya exista server-side (se construye en la Fase 6 de la sección 10) y esté deployado (Fase 7). No lo hagas como parte de conectar el feed (el punto 1 se completa sin tocar código del cliente). El cambio: antes de `generateRAGAnswer`, si `import.meta.env.VITE_UPM_API_URL` está seteada, intentar `POST ${VITE_UPM_API_URL}/assistant` con `{ messages }`; si responde 200, usar `json.message` (ya cumple shape `ChatMessage`). Si responde 503, falla o no hay URL → caer EXACTAMENTE al flujo actual (`generateRAGAnswer` → `generateAssistantResponse`). No tocar `lib/rag.ts` ni `lib/respond.ts`.
3. **Sync de estado (opcional, solo si el tiempo alcanza tras los checks 1-9)**: implementar el REST adapter siguiendo el stub comentado en `/Users/alannaimtapia/dev/app-upm/client/src/lib/sync.ts` (líneas 66-91) contra `/me/*` con el JWT, manteniendo localStorage como fallback offline. Si no llega, NO pasa nada: los endpoints `/me/*` quedan listos server-side y se documenta en el README del server.
4. **Nada más del cliente se toca.** En particular: no tocar `sources/index.ts`, `types.ts`, `use-live-feed.ts`, tests, keys de localStorage.

---

## 8. Railway: pasos exactos

**Proyecto existente**: el usuario ya tiene un proyecto Railway con un servicio Postgres provisionado. IDs REALES (provistos por el usuario — usalos tal cual):
- **Project ID**: `61cac5bf-f54d-4667-bb91-518d65a482d6`
- **Environment ID**: `89c372da-6a72-45fd-bed6-314bfc4701af`
- **Servicio Postgres (database) ID**: `9abca508-d3cc-43f5-ad91-ce72ac2b0266`
- **Dashboard directo de la DB**: `https://railway.com/project/61cac5bf-f54d-4667-bb91-518d65a482d6/service/9abca508-d3cc-43f5-ad91-ce72ac2b0266/database?environmentId=89c372da-6a72-45fd-bed6-314bfc4701af`

Verificá con `railway status` el NOMBRE del servicio Postgres (para la referencia `${{<NombreServicio>.DATABASE_URL}}`); si el CLI no está logueado y el login interactivo no es viable, abrí el dashboard con el browser (el usuario tiene Chrome con sesión de Railway iniciada — usá las tools de browser/Chrome MCP) y leé `DATABASE_PUBLIC_URL` desde la tab Variables del servicio Postgres.

CLI en `/opt/homebrew/bin/railway`. Secuencia:

```bash
railway whoami || railway login        # login es interactivo (abre browser); pedile al usuario si hace falta
cd /Users/alannaimtapia/dev/app-upm/server
railway link --project 61cac5bf-f54d-4667-bb91-518d65a482d6 --environment 89c372da-6a72-45fd-bed6-314bfc4701af
railway add --service upm-api          # crea el SEGUNDO servicio en el mismo proyecto
railway service upm-api                # apuntar el contexto al servicio nuevo
# Variables (DATABASE_URL como REFERENCIA al servicio Postgres — usar el nombre real del servicio DB, verificalo con `railway status` o el dashboard):
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'ALLOWED_ORIGINS=https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188' \
  --set 'JWT_SECRET=<generar con openssl rand -hex 32>' \
  --set 'NODE_ENV=production'
# ANTHROPIC_API_KEY: pedírsela al usuario; si no la tiene a mano, deployar sin ella (el 503 + fallback ya está contemplado)
railway up                             # build + deploy desde server/ (asegurate de start script: node dist/index.js, build: tsc)
railway domain                         # genera el dominio público https://upm-api-production-XXXX.up.railway.app
```

- **Obtener DATABASE_URL para desarrollo local / migraciones**: `railway variables` parado sobre el servicio Postgres (`railway service <nombre-del-postgres>` y leer `DATABASE_PUBLIC_URL`), o desde el dashboard (proyecto → servicio Postgres → tab Variables/Connect). Para migrar: `DATABASE_URL=<public-url> npx drizzle-kit migrate` desde tu máquina, o correr migraciones al boot del server (recomendado: migrate-on-boot con lock).
- **Alternativa sin CLI**: todo lo anterior se puede hacer desde el dashboard (`https://railway.app/dashboard` → proyecto del usuario → Create Service → GitHub repo `soyalantapia/app-upm` con root directory `/server`, + Variables + Settings → Generate Domain). Usá esta vía si `railway login` interactivo no es viable en la sesión.
- El server debe escuchar en `0.0.0.0` y puerto `process.env.PORT` (Railway lo inyecta).
- Si `railway up` desde el monorepo sube de más, agregá `server/.railwayignore` o configurá Root Directory `/server` en settings del servicio.

---

## 9. PRUEBAS (obligatorias)

**Unit (vitest en `/Users/alannaimtapia/dev/app-upm/server`)**:
- `detectTopic()`: casos por cada uno de los 11 patrones + default `integracion-regional`.
- Mappers de cada fetcher con fixtures JSON reales (respuesta cruda de Câmara BR, HCDN AR, etc. guardadas en `test/fixtures/`): validar que el output cumple el schema Zod de `NewsItem` (enums exactos, date parseable).
- Validación Zod de los bodies de `/auth/login`, `/me/prefs`, `/assistant`.
- Derivación de operator (`deriveName`-equivalente): email "martin.pereira" → DEMO operator; email genérico → `Dr. {Nombre}`, cargo `Legislador`, país `UY`.

**Integración (vitest + Fastify `app.inject()` contra Postgres)**:
- Contra Postgres real: local si hay Docker (`docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16`), si no contra la DB de Railway usando un schema/prefijo de test que se limpia al final.
- `GET /feed` devuelve EXACTAMENTE `{ items, fetchedAt, sources }` (snapshot del shape, validado con el Zod de NewsItem); filtros `?pais=` y `?tema=`; 400 con valores fuera de enum.
- Upsert idempotente: correr ingesta 2x con el mismo fixture → mismo count de filas.
- Fallo de una fuente no aborta el run (mock de un fetcher que tira) y queda registrado en `sources.lastError`.
- Flujo auth: login → token → `PUT /me/prefs` → `GET /me/prefs` round-trip; 401 sin token.
- `/assistant` sin `ANTHROPIC_API_KEY` → 503.
- CORS: preflight OPTIONS desde `https://soyalantapia.github.io` → headers correctos; desde un origin no listado → sin `Access-Control-Allow-Origin`.

**Smoke E2E (post-deploy)**:
```bash
curl -sf https://<dominio>/health | jq .ok                    # true
curl -sf https://<dominio>/feed | jq '.items | length'        # > 50
curl -sf 'https://<dominio>/feed?pais=BR' | jq '[.items[].country] | unique'   # ["BR"]
curl -sf -X POST https://<dominio>/auth/login -H 'content-type: application/json' -d '{"email":"test@upm.org"}' | jq .token
```
Luego front local (Node 22 obligatorio): `cd /Users/alannaimtapia/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" VITE_UPM_API_URL=https://<dominio> npm run dev` → abrir `http://127.0.0.1:5188/app-upm/`, borrar la key `upm.live-feed.v2` de localStorage (cache 24h), verificar en el browser (Network tab) que hay UNA request a `<dominio>/feed` y que el feed renderiza items reales.

**Regresión cliente**: `cd /Users/alannaimtapia/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run test` → los 8 archivos / 42 tests existentes DEBEN seguir verdes (formato, sync, OverflowActions, ErrorBoundary, PageTOC, permissions, pt-es, synonyms).

---

## 10. Orden de ejecución (fases con checkpoints)

1. **Fase 0 — Reconocimiento** (leer `HANDOFF.md`, `worker/src/index.ts`, `client/src/lib/sources/index.ts`, `client/src/lib/types.ts`; crear rama `feat/backend`; **corregir el erratum de HANDOFF.md línea 41: puerto `5181` → `5188`**, ver sección 2). ✓ Checkpoint: podés enumerar los fetchers a portar y sus URLs de origen, y HANDOFF.md ya dice 5188.
2. **Fase 1 — Esqueleto server** (workspace, Fastify, config Zod, CORS, `GET /` y `GET /health` sin DB). ✓ Checkpoint: `npm run dev` local responde `curl localhost:3000/`.
3. **Fase 2 — DB** (schema Drizzle, conexión a Railway Postgres con la URL pública, migración aplicada). ✓ Checkpoint: tablas visibles (`\dt` vía psql o dashboard Railway).
4. **Fase 3 — Ingesta** (portar fetchers del worker primero, después los del cliente; upsert; `npm run ingest` manual). ✓ Checkpoint: `SELECT count(*) FROM normas` > 50 con ≥3 países.
5. **Fase 4 — API feed** (`/feed`, `/laws`, `/search`, `/sources`, `/health` completo + node-cron). ✓ Checkpoint: `curl localhost:3000/feed | jq` cumple el shape exacto; tests de integración del feed verdes.
6. **Fase 5 — Auth + sync** (`/auth/login`, JWT plugin, `/me/*`). Server-side puro — NO requiere ningún cambio en el cliente. ✓ Checkpoint: round-trip prefs por curl.
7. **Fase 6 — Asistente** (`/assistant` con FTS + Anthropic + 503 sin key). Server-side puro — el cambio de cliente en `Assistant.tsx` recién va en Fase 8. ✓ Checkpoint: con key responde citando normas reales; sin key, 503.
8. **Fase 7 — Deploy Railway** (sección 8 completa). ✓ Checkpoint: smoke E2E con curl contra el dominio público pasa.
9. **Fase 8 — Integración front** (`.env.production` — único requisito para conectar el feed —, cambio en `Assistant.tsx` de la sección 7 punto 2, build con Node 22, deploy `gh-pages`). ✓ Checkpoint: la app en `https://soyalantapia.github.io/app-upm/` (hard refresh + limpiar `upm.live-feed.v2`) consume `/feed` del backend.
10. **Fase 9 — Cierre** (suite completa de tests server + client, commits prolijos en `feat/backend`, push, README del server con endpoints y runbook).

**Checklist final de aceptación**: los 9 criterios de la sección 1, tildados uno por uno con evidencia (output de curl / screenshot de Network / output de vitest).

---

## 11. Restricciones DURAS

- **NO romper el modo demo**: la app sin `VITE_UPM_API_URL`, o con el backend caído, debe funcionar idéntico a hoy (fallback silencioso a fetchers client-side y mock del asistente). Cualquier cambio en el cliente debe ser aditivo y degradar con gracia.
- **NO tocar** `client/src/lib/sources/index.ts` (dedupe/rank/cleanTitle/fetchFromWorker/cache), `client/src/lib/types.ts`, `client/src/lib/use-live-feed.ts`, ni los tests del cliente. Los enums `CountryCode`/`Topic`/`DocType`/`Relevance` son inmutables.
- **NO commitear secretos**: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JWT_SECRET` van solo en variables de Railway y en `server/.env` local (gitignoreado). Commitear `server/.env.example` con placeholders.
- **NO usar GitHub Actions**: el token de `gh` NO tiene workflow scope — crear archivos en `.github/workflows/` hace fallar el push. Deploy del backend SOLO vía Railway CLI o dashboard; deploy del front vía el mecanismo gh-pages existente.
- **Commits en rama `feat/backend`** del repo `/Users/alannaimtapia/dev/app-upm` (pushear a `feat/backend`; abrir PR a main al final, no mergear sin pedirlo). Commits chicos por fase.
- **Node**: el server targetea Node 20+ (Railway); el cliente DEBE correr con Node 22 (no v25+, es requisito documentado del front) — usá `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` para todo comando npm en `client/`. No subas el engine del cliente.
- Si una API de origen está caída durante el desarrollo, no bloquees: registrá el fallo por fuente y seguí — el diseño tolera fuentes caídas.
- Si `railway login` interactivo no es posible, usá la vía dashboard/browser (sección 8) y pedile al usuario solo lo estrictamente bloqueante (login de Railway, `ANTHROPIC_API_KEY`).
