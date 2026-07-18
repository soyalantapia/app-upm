# 02 · Arquitectura de App UPM

**Última actualización:** 2026-07-18 (verificado contra el repo en `main` y contra la API de producción con `curl`).

**Para qué sirve este documento:** es el mapa técnico completo del sistema para una IA que continúa el proyecto sin haber estado presente. Describe el monorepo, el stack real con versiones leídas de los `package.json`, el flujo de datos end-to-end (fuentes oficiales → ingesta → Postgres+pgvector → API → PWA), las decisiones arquitectónicas y por qué se tomaron, y los gotchas que hacen perder horas. Todo lo que se afirma acá fue leído en el código o verificado en vivo; lo no verificado está marcado **(verificar)**.

---

## 1. Vista de 30 segundos

| Pieza | Qué es | Dónde vive | Estado |
|---|---|---|---|
| `client/` | PWA React 19 + Vite, la app que usa el legislador | `client/src` (~21.266 LOC TS/TSX) | **EN PRODUCCIÓN** en GitHub Pages |
| `server/` | API Fastify 5 + ingesta + RAG (`upm-api`) | `server/src` (~4.099 LOC TS) | **EN PRODUCCIÓN** en Railway |
| `worker/` | Cloudflare Worker original (agregador de feed) | `worker/src/index.ts` (257 LOC) | **LEGACY — NUNCA DEPLOYADO.** Superado por `server/` |
| `docs/` | Build viejo del cliente (cuando GH Pages servía `/docs`) | `docs/` | **MUERTO.** Último commit 2026-06-06. NO tocar, NO regenerar |

Producción hoy (verificado 2026-07-18):

```
Front : https://soyalantapia.github.io/app-upm/       (rama gh-pages, deploy MANUAL)
API   : https://upm-api-production.up.railway.app     (Railway proyecto "zippy-harmony", servicio upm-api)
DB    : servicio "Postgres" del mismo proyecto Railway (pgvector habilitado)
```

`GET /health` en vivo el 2026-07-18:

```json
{"ok":true,"db":"up","lastIngest":{"finishedAt":"2026-07-18T14:00:16.001Z","okSources":38,"failedSources":1,"itemsUpserted":1988},"itemCount":4589,"uptime":2380309}
```

→ 4.589 normas en el corpus, 39 fuentes registradas, 38 OK, 1 caída (`camara-br`, ver §9).

---

## 2. Monorepo — mapa de directorios

No hay `package.json` en la raíz: **no es un workspace npm/pnpm/turbo**. Son tres proyectos independientes con su propio `package.json` y su propio `node_modules`. Cada uno se instala y buildea por separado.

```
/Users/alannaimtapia/dev/app-upm
├── client/                     ← PWA (React 19 + Vite 8 + Tailwind 4). Deploy: gh-pages
│   ├── .claude/launch.json     ← dev server con Node 22 explícito (ver GOTCHA §9)
│   ├── .env.production         ← VITE_UPM_API_URL=https://upm-api-production.up.railway.app
│   ├── index.html              ← meta OG/Twitter, preconnect a rsms.me (Inter)
│   ├── vite.config.ts          ← base:'/app-upm/', VitePWA, alias '@'→src, port 5188, config de vitest
│   ├── public/
│   │   ├── data/*.json         ← 11 JSON de corpus curado (fuente de verdad de los datos estáticos)
│   │   ├── favicon.svg  southamerica.svg
│   └── src/
│       ├── App.tsx             ← HashRouter + rutas + lazy chunks + gates de auth/onboarding
│       ├── main.tsx  index.css ← index.css = design tokens Tailwind 4 (@theme)
│       ├── layouts/AppShell.tsx
│       ├── pages/ (13)         ← Login, Onboarding, Home, Assistant, Radar, NewsConversation,
│       │                          Laws, Library, Folders, Profile, Briefing, LegisladorProfile, Stats
│       ├── components/ (63)    ← UI + paneles de análisis (LawMap, MercosurChoropleth, TrendingPanel…)
│       ├── lib/ (41 módulos)   ← estado, auth, sync, hooks de datos, utilidades de dominio
│       │   └── sources/ (25)   ← fetchers CLIENTE (solo dev/demo sin backend — ver §6.2)
│       └── test/ (9 archivos)  ← vitest + testing-library
│
├── server/                     ← API + ingesta + RAG. Deploy: railway up
│   ├── .env / .env.example     ← .env NO está en git (gitignore raíz)
│   ├── .railwayignore          ← node_modules/, dist/, .env
│   ├── drizzle.config.ts       ← schema:./src/db/schema.ts, out:./drizzle
│   ├── drizzle/0000_careful_caretaker.sql  ← ÚNICA migración versionada (ver GOTCHA §9)
│   ├── data/*.json             ← snapshot de client/public/data (11 archivos) para Railway
│   └── src/
│       ├── index.ts            ← entrypoint: migrate → buildApp → listen → cron + boot-ingest
│       ├── app.ts              ← buildApp(config, db): Fastify + compress + cors + rutas
│       ├── config.ts           ← Zod EnvSchema (única fuente de verdad de variables de entorno)
│       ├── types.ts            ← CONTRATO compartido con client/src/lib/types.ts
│       ├── db/{schema,client}.ts
│       ├── routes/{health,feed,auth,me,assistant}.ts
│       ├── plugins/auth.ts     ← jose HS256: signToken / verifyToken / requireAuth
│       ├── lib/{otp,mailer}.ts ← OTP en memoria + email SMTP (nodemailer)
│       ├── llm.ts              ← capa LLM pluggable (Anthropic | Gemini con fallback multi-modelo)
│       ├── search.ts           ← búsqueda híbrida pgvector + FTS con fusión RRF
│       ├── embed/{embedder,run,proof}.ts  ← embeddings locales e5-small (transformers.js)
│       └── ingest/
│           ├── run.ts          ← orquestador: fetch paralelo → validar → upsert → registrar run
│           ├── registry.ts     ← FETCHERS[] : 39 fuentes (id, label, country, fn)
│           ├── fetchers/ (22)  ← un archivo por origen (varios exportan múltiples fetchers)
│           ├── topic.ts        ← detectTopic() heurístico ES/PT → enum Topic
│           └── util.ts         ← fetchJson (timeout 15s) + loadStaticJson (cascada FS→HTTP)
│
├── worker/                     ← LEGACY. Cloudflare Worker, nunca deployado
├── docs/                       ← BUILD MUERTO. Ignorar
├── work-agent/                 ← esta documentación
└── *.md (raíz)                 ← prompts y reportes históricos de auditoría/QA (contexto, no código)
```

---

## 3. Stack real por parte (versiones leídas de los `package.json`)

### 3.1 `client/` — `package.json` name: `client`

| Área | Paquete | Versión declarada |
|---|---|---|
| Framework | `react` / `react-dom` | `^19.2.5` |
| Router | `react-router-dom` | `^7.15.0` |
| Bundler | `vite` | `^8.0.10` |
| Plugin React | `@vitejs/plugin-react` | `^6.0.1` |
| CSS | `tailwindcss` + `@tailwindcss/vite` | `^4.2.4` |
| PWA | `vite-plugin-pwa` | `^1.3.0` |
| Iconos | `lucide-react` | `^1.14.0` |
| Utils CSS | `clsx` `^2.1.1`, `tailwind-merge` `^3.5.0` |
| TypeScript | `typescript` | `~6.0.2` (strict + `noUnusedLocals`/`noUnusedParameters`) |
| Tests | `vitest` `^4.1.7`, `@testing-library/react` `^16.3.2`, `jsdom` `^29.1.1` |
| Lint | `eslint` `^10.2.1`, `typescript-eslint` `^8.58.2` |

> El brief dice "Vite 7"; el `package.json` real dice **Vite 8** (`^8.0.10`). Manda el código.

Scripts: `dev` (vite, :5188), `build` (`tsc -b && vite build`), `lint`, `preview`, `test` (`vitest run`), `test:watch`.

Estado global: **sin Redux/Zustand**. `client/src/lib/store.ts` implementa un store propio con `useSyncExternalStore` + persistencia vía la fachada `lib/sync.ts`.

### 3.2 `server/` — `package.json` name: `upm-api`, `engines.node >=20`

| Área | Paquete | Versión declarada |
|---|---|---|
| HTTP | `fastify` | `^5.2.0` |
| Compresión | `@fastify/compress` | `^9.0.0` |
| CORS | `@fastify/cors` | `^10.0.1` |
| ORM | `drizzle-orm` | `^0.45.2` (subido desde 0.38 el 2026-06-20 por vuln high de SQL-injection en identificadores) |
| Migraciones | `drizzle-kit` | `^0.31.10` |
| Driver PG | `pg` | `^8.13.1` |
| Validación | `zod` | `^3.24.1` |
| JWT | `jose` | `^5.9.6` (HS256) |
| Email | `nodemailer` | `^9.0.0` |
| Cron | `node-cron` | `^3.0.3` |
| LLM | `@anthropic-ai/sdk` | `^0.39.0` (Gemini se llama con `fetch` crudo, sin SDK) |
| Embeddings | `@huggingface/transformers` | `^4.2.0` |
| Dev | `tsx` `^4.19.2`, `typescript` `^5.7.2`, `vitest` `^2.1.8` |

`tsconfig.json`: `module: NodeNext`, `target: ES2022`, `strict: true`, `outDir: dist`. **Por NodeNext todos los imports internos llevan sufijo `.js`** (`import { feedRoutes } from './routes/feed.js'`) aunque el archivo sea `.ts`. Omitirlo rompe el build.

Scripts relevantes:

```bash
npm run dev        # tsx watch src/index.ts
npm run build      # tsc
npm start          # node dist/index.js
npm run ingest     # tsx src/ingest/cli.ts  → ingesta standalone
npm run embed      # tsx src/embed/run.ts   → backfill incremental de embeddings
npm run sync-data  # rm -rf data && cp -r ../client/public/data ./data
npm run db:generate / db:migrate / db:push
npm test           # vitest run (unit + integración contra Postgres REAL)
```

### 3.3 `worker/` — LEGACY

`upm-feed`, solo devDependency `wrangler` `^4.0.0` + `@cloudflare/workers-types`. Nació para resolver CORS de UY/PY/BO/PE. **Nunca se deployó**: `server/` lo reemplazó por completo y varios de sus fetchers fueron portados 1:1 (los comentarios en `server/src/ingest/fetchers/*.ts` dicen literalmente "Portado del worker"). No borrarlo sin revisar, pero no invertir en él.

---

## 4. Flujo de datos end-to-end

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ORÍGENES                                                                  │
│                                                                              │
│   (a) APIs oficiales HTTP en vivo                                            │
│       Câmara BR · Senado BR · TCU BR · Socrata CO · Vista CO ·               │
│       Presidencia CO · Corte Constitucional CO · Parlamento UY · …           │
│   (b) JSON curados versionados en el repo                                    │
│       client/public/data/*.json (11 archivos: leyes-destacadas-ar,           │
│       csjn-ar, infoleg-ar, hcdn-exp, impo-uy, leyes-uy, scj-uy,              │
│       stf-br, tcu-br, leyes-ar, legisladores)                                │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │  server/src/ingest/fetchers/*.ts  (22 archivos)
                               │  · fetchJson()      → timeout 15s, UA propio
                               │  · loadStaticJson() → cascada FS local → HTTP GH Pages
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. INGESTA — server/src/ingest/run.ts :: runIngest(db, staticBase)           │
│                                                                              │
│   · FETCHERS[] (registry.ts) = 39 entradas, se ejecutan TODAS en paralelo    │
│     con Promise.all + .then(ok, err) → una fuente caída NO aborta el run     │
│   · isValid(item): valida id/title/date + que country/topic/type/relevance   │
│     estén dentro de los enums (un valor fuera rompería el pgEnum)            │
│   · dedupe in-batch por id (keep-first) — ON CONFLICT no puede tocar la      │
│     misma fila dos veces en un statement                                     │
│   · upsert en lotes de 100: INSERT … ON CONFLICT (id) DO UPDATE              │
│     → first_seen_at NUNCA se pisa; last_seen_at se refresca                  │
│   · upsert de estado por fuente en `sources` (lastOk/lastCount/lastError)    │
│   · registra la corrida en `ingest_runs` (con `detail` jsonb = reports[])    │
│   · lock en memoria (`let running`) → no solapa runs                         │
│                                                                              │
│   Disparadores: cron '*/30 * * * *' (node-cron, en index.ts)                 │
│                 + bootIngestIfStale() al arranque si DB vacía o último       │
│                   run terminó hace >30 min (corre en background, no          │
│                   bloquea el listen)                                          │
│                 + manual: `npm run ingest`                                    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. POSTGRES (Railway) + pgvector                                             │
│                                                                              │
│   normas   ← corpus. PK text `id`. Índices: country, topic, date DESC,       │
│              GIN FTS español sobre title||' '||excerpt                       │
│              + columnas NO gestionadas por Drizzle: embedding vector(384),   │
│                content_hash, embedded_at  (ver GOTCHA §9)                    │
│   sources  ← estado por fuente (lastRunAt/lastOk/lastCount/lastError)        │
│   ingest_runs ← histórico de corridas                                        │
│   operators / prefs / saved_state / notes_state ← usuario y su estado        │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │  npm run embed (OFF-Railway, manual)
                               │  Xenova/multilingual-e5-small q8, 384 dims
                               │  solo re-embebe si cambió content_hash
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. API FASTIFY — server/src/app.ts                                           │
│                                                                              │
│   GET  /            info + lista de endpoints                                │
│   GET  /health      db + último ingest + itemCount + uptime                  │
│   GET  /feed?pais&tema   {items, fetchedAt, sources} · balanceado por país   │
│   GET  /laws?pais&tema   idem, solo ley/decreto/reglamento/informe           │
│   GET  /search?q=   híbrido pgvector+FTS (RRF) · envelope + campo `mode`     │
│   GET  /sources     [{id,label,country}]                                     │
│   POST /auth/request-code   {email} → OTP 6 dígitos por SMTP                 │
│   POST /auth/verify         {email,code} → {token, operator}                 │
│   GET/PUT /me /me/prefs /me/saved /me/notes   (Bearer JWT)                   │
│   POST /assistant   RAG + LLM → {message, usage, provider}                   │
│                                                                              │
│   Middleware global: @fastify/compress (gzip/brotli — /feed pesa ~1.3 MB     │
│   en JSON plano) + @fastify/cors (origins de ALLOWED_ORIGINS)                │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │  HTTPS · CORS · gzip
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CLIENTE PWA — GitHub Pages                                                │
│                                                                              │
│   lib/sources/index.ts :: fetchLiveFeed()                                    │
│     → fetchFromWorker() pega a {VITE_UPM_API_URL}/feed                       │
│     → dedupe() + rank() client-side (relevancia + match con prefs)           │
│     → cache en localStorage 'upm.live-feed.v2' (fresh 5 min / TTL 24 h)      │
│     → hook useLiveFeed(): SWR + auto-refresh cada 5 min + render progresivo  │
│                                                                              │
│   lib/use-semantic-search.ts → GET /search (⌘K, badge "IA · por significado")│
│   pages/Assistant.tsx        → POST /assistant                               │
│   lib/sync.ts (restAdapter)  → PUT /me/prefs · /me/saved · /me/notes         │
│     write-through: localStorage SIEMPRE + push debounced 1,5 s al backend    │
│   lib/auth.tsx               → POST /auth/request-code + /auth/verify        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 El envelope `/feed` (contrato duro)

```ts
{ items: NewsItem[], fetchedAt: string /* ISO */, sources: SourceReport[] }
```

`/search` devuelve lo mismo **más** `mode: 'hybrid' | 'fts'`. Regla del `rowToItem()` en `server/src/routes/feed.ts`: **los campos opcionales que son `null` en la DB se OMITEN, nunca se emiten como `null`**. El test de integración lo verifica ítem por ítem (`expect(v).not.toBeNull()`).

Verificado en producción (2026-07-18):

```bash
curl -s "https://upm-api-production.up.railway.app/feed" | \
  python3 -c "import sys,json,collections; d=json.load(sys.stdin); \
  print(len(d['items']), collections.Counter(i['country'] for i in d['items']))"
# 500 Counter({'BR': 130, 'CO': 130, 'AR': 130, 'UY': 110})
```

---

## 5. Contrato de tipos compartido (client ↔ server ↔ DB)

Hay **tres copias** del mismo contrato que deben mantenerse sincronizadas a mano:

| Archivo | Rol |
|---|---|
| `client/src/lib/types.ts` | contrato original del front |
| `server/src/types.ts` | copia exacta del subset que usa la API (lo dice el comentario de la cabecera) |
| `server/src/db/schema.ts` | los mismos enums **inline** como `pgEnum` |

Los enums están duplicados dentro de `schema.ts` porque **drizzle-kit corre en CJS y no resuelve imports ESM con sufijo `.js`**. La red de seguridad es `server/test/unit/enums-sync.test.ts`, que compara `countryCode.enumValues` contra `COUNTRY_CODES` (y topic/docType/relevance) y **falla si divergen**.

Enums vigentes:

- `CountryCode`: `AR BR UY PY CL BO PE CO` (8) — pero **solo AR/CO/UY/BR tienen corpus real** y son los seleccionables en la UI (`ACTIVE_COUNTRY_CODES` en `client/src/lib/data.ts`).
- `Topic` (12): `ambiente, integracion-regional, corredores-bioceanicos, genero, educacion, salud, energia, rio-uruguay, mercosur, rrii, seguridad, economia-regional`
- `DocType` (9): `ley, decreto, reglamento, informe, acta, convenio, comunicado, minuta, dossier`
- `Relevance` (3): `alta, media, baja`

Cómo verificar la sincronía:

```bash
cd /Users/alannaimtapia/dev/app-upm/server && npx vitest run test/unit/enums-sync.test.ts
```

---

## 6. Decisiones arquitectónicas y por qué

### 6.1 RAG sobre el corpus, NO fine-tuning

El asistente (`server/src/routes/assistant.ts`) recupera top-6 normas con `hybridSearch()` y las inyecta como bloque de contexto en el system prompt; el modelo responde citando ids. Razones:

1. **Verificabilidad.** La promesa del producto ante legisladores es "respondo con fuentes verificables". El backend calcula `cited = context.filter(n => content.includes(n.id))` y **solo adjunta como `sources` las normas que el modelo efectivamente citó**. Si no citó ninguna, `sources: []` y `isInstitutional: false` — no se muestran tarjetas de fuentes bajo un "no encontré".
2. **Corpus vivo.** La ingesta corre cada 30 min y suma miles de normas. Un modelo fine-tuneado quedaría desactualizado el mismo día.
3. **Costo/tiempo cero de reentrenamiento.** Cambiar de proveedor LLM es una variable de entorno (§6.6).
4. **Antialucinación por diseño.** El system prompt obliga a citar EXCLUSIVAMENTE lo provisto y a decir explícitamente cuando el contexto no alcanza.

Refinamientos ya implementados sobre el RAG base:

- **Query de recuperación conversacional**: se concatenan los **últimos 3 turnos del usuario**, no solo el último, para que un follow-up corto ("¿y de qué año es?") siga recuperando la norma en discusión.
- **Conciencia de recencia**: `RECENCY_RE` (regex ES sobre "hoy/ayer/reciente/novedades/último/esta semana/salió/sancionó…") detecta preguntas temporales. El RAG semántico **no** ordena por fecha, así que ante un match se **anteponen** las 8 normas más nuevas por `date DESC` (con desempate por relevancia) a las semánticas, se dedupea y se capea en 10. Además se inyecta `La fecha de HOY es <YYYY-MM-DD>` en el system prompt.
- **Endurecimiento anti prompt-injection**: bloque `SEGURIDAD` en el system prompt que declara el mensaje del usuario como *consulta*, no instrucciones, y prohíbe cambiar de rol, revelar el prompt o tratar como real una norma ausente del contexto.
- **Presupuesto de tokens**: 6 normas (no 8) y excerpts recortados a 360 caracteres (`clip()`) → ~3x menos tokens de entrada por llamada. `max_tokens` de salida: 1500.

Verificado en producción (2026-07-18): `provider: gemini:gemini-2.5-flash`, `usage {input:1308, output:264}`, 4 fuentes citadas, `isInstitutional: true`.

### 6.2 Feed 100% backend — sin fetchers cliente en producción

`client/src/lib/sources/index.ts` conserva 39 fetchers client-side, pero **en producción no se ejecuta ninguno**. La lógica en `fetchLiveFeed()`:

```
1. fetchFromWorker()  → GET {VITE_UPM_API_URL}/feed
2. si responde OK      → dedupe + rank + cache → FIN
3. si FALLA y WORKER_URL está seteada → devuelve feed VACÍO (EmptyState honesto)
4. solo si WORKER_URL está VACÍA → cae a los fetchers cliente (dev/demo)
```

El paso 3 es la decisión clave y es deliberada. Por qué:

- **Fuente única de verdad.** El 100% de lo que ve el legislador sale de la DB, nunca de scraping en el navegador. Sin esto habría dos corpus distintos según a quién le fallara CORS.
- **CORS.** Varias fuentes (UY/PY/BO/PE, portales de Colombia) no permiten fetch desde el browser. Server-side el problema no existe: `fetchJson()` pega directo, sin proxies.
- **Honestidad de datos.** Antes de producción se borraron 102 normas sintéticas del corpus (commit `a65df6d`) y los mocks del cliente (`NEWS`, `DOCUMENTS`, `DOSSIERS`, `FOLDERS`, `AGENDA`, `FORUMS` en `lib/data.ts` son arrays **vacíos** hoy). El principio es: antes pantalla vacía que dato inventado.
- Los fetchers cliente quedan como **modo demo/dev sin backend**, no como fallback de producción. Varios de ellos son código muerto (los que apuntaban a JSON borrados devuelven vacío).

### 6.3 Feed balanceado por país (no date-sort global)

`server/src/routes/feed.ts`, constantes `FEED_LIMIT = 500` y `PER_COUNTRY = 130`.

El bug que originó esto: la Câmara de Brasil publica ~150 proposiciones/día y el fetcher las fecha por día de ingesta. Con un `ORDER BY date DESC LIMIT 500` global, Brasil ocupaba ~497 de 500 ítems y **empujaba a AR/CO/UY fuera del payload**. Como el cliente baja el `/feed` global sin filtro de país y rankea client-side, un legislador argentino veía casi puro Brasil.

Solución (`balancedRows()`): se toman los top-`PER_COUNTRY` más recientes de **cada** país presente en la tabla, se mergean, se ordenan por fecha y se capea en `FEED_LIMIT`. Con `?pais=` explícito el filtro vuelve a ser server-side puro. Aplica a `/feed` y `/laws`. No requiere reingesta: es puro cambio de query.

### 6.4 Filtro de ruido procesal (reversible, no destructivo)

```ts
// server/src/routes/feed.ts
export const noiseFilter = sql`${normas.id} not like 'br-votacao%' and ${normas.id} not like 'br-evento%'`
```

Excluye votaciones repetidas y eventos de agenda de Brasil de `/feed`, `/laws`, `/search` y del contexto RAG. **No borra datos** — es un predicado; sacarlo restituye todo. `server/src/search.ts` mantiene una versión raw en string (`NOISE_SQL`) porque los CTE crudos de la query híbrida no admiten el builder de Drizzle. **Si cambiás uno hay que cambiar el otro**: son el mismo predicado escrito dos veces.

### 6.5 Búsqueda híbrida: pgvector + FTS fusionados con RRF

`server/src/search.ts :: hybridSearch(db, query, limit)`:

- Embebe la query con `embedQuery()` (import **dinámico**, para no cargar transformers.js en el boot del server).
- Si obtiene vector: una sola query SQL con dos CTE — `vec` (top-40 por `embedding <=> vector`, distancia coseno) y `fts` (top-40 por `ts_rank` español) — fusionados con **Reciprocal Rank Fusion**: `score = Σ 1/(RRF_K + rank)`, con `RRF_K = 60`. Devuelve `mode: 'hybrid'`.
- Si no obtiene vector (modelo no carga, `SEMANTIC_SEARCH=off`, o excepción): cae a **FTS puro**, `mode: 'fts'`. Cero regresión respecto del `/search` anterior.

El FTS de búsqueda incluye `full_text` (`title || excerpt || coalesce(full_text,'')`), mientras que el índice GIN declarado en el schema solo cubre `title || ' ' || excerpt`. Es decir: **la expresión del índice y la expresión de la consulta no coinciden exactamente**, con lo cual la parte FTS de `/search` probablemente no usa el índice GIN. Funciona correctamente, pero es un candidato de optimización **(verificar con `EXPLAIN ANALYZE` antes de tocarlo)**.

Verificado en producción: `GET /search?q=proteccion de rios` → `mode: hybrid`, 40 ítems.

### 6.6 LLM pluggable por variable de entorno

`server/src/llm.ts :: getLlm(config)` elige proveedor por la key disponible:

| Condición | Proveedor | Notas |
|---|---|---|
| `ANTHROPIC_API_KEY` presente | `anthropic:claude-sonnet-4-6` | prioridad máxima; usa `@anthropic-ai/sdk` |
| si no, `GEMINI_API_KEY` presente | `gemini:${GEMINI_MODEL}` | free tier; `fetch` crudo contra `generativelanguage.googleapis.com/v1beta` |
| ninguna | `null` | `POST /assistant` responde **503** `{"error":"assistant unavailable"}` |

**Hoy producción corre con Gemini** (verificado: `provider: "gemini:gemini-2.5-flash"`). Subir a Claude = setear `ANTHROPIC_API_KEY` en Railway; **cero cambios de código**.

Fallback multi-modelo de Gemini (`modelChain`): el cupo del free tier se cuenta **por request/día POR MODELO** (cada modelo tiene su propio balde). Ante 429/500/503 se rota al siguiente de la cadena `[primary, gemini-2.5-flash, gemini-2.5-flash-lite, gemini-flash-latest, gemini-2.0-flash-lite]`. Ronda 1: rota por todos. Luego un `sleep(3000)`. Ronda 2: reintenta solo el primario. Un error que no sea 429/500/503 corta de inmediato (no es problema de cupo). También setea `thinkingConfig.thinkingBudget: 0` y `temperature: 0.3`.

### 6.7 HashRouter — obligado por GitHub Pages

`client/src/App.tsx` usa `<HashRouter>` y `vite.config.ts` fija `base: '/app-upm/'`. GitHub Pages es hosting estático sin rewrites: con `BrowserRouter`, entrar directo a `/app-upm/radar` daría 404 del servidor porque no existe tal archivo. Con hash, todo lo posterior al `#` lo maneja el cliente y el servidor solo ve `/app-upm/index.html`.

Consecuencias que hay que tener presentes:

- Todas las URLs compartibles tienen forma `https://soyalantapia.github.io/app-upm/#/radar/<id>`.
- Cambiar a `BrowserRouter` exige cambiar de hosting (o un hack de `404.html`). **No hacerlo sin migrar el deploy.**
- `base: '/app-upm/'` está acoplado al nombre del repo. Si el repo se renombra (probable — hay un proceso de naming en curso, "UPM" es el organismo cliente, no el producto), hay que actualizar **a la vez**: `vite.config.ts` (`base`, `manifest.start_url`, `manifest.scope`), `client/.env.production` si cambia la API, `server/config.ts` (`ALLOWED_ORIGINS`, `STATIC_DATA_BASE`) y las vars en Railway.

### 6.8 PWA (vite-plugin-pwa) + offline-first del estado

```ts
VitePWA({ registerType: 'autoUpdate', injectRegister: 'auto',
          workbox: { clientsClaim: true, skipWaiting: true },
          devOptions: { enabled: false }, manifest: {...} })
```

`autoUpdate` + `skipWaiting` + `clientsClaim` = el service worker se actualiza solo y toma control inmediato; evita que un usuario quede clavado en una versión vieja. El componente `PWAUpdateBanner` avisa; `OfflineBanner` muestra estado sin red.

El estado del usuario es **offline-first con espejo remoto** (`client/src/lib/sync.ts`): el `restAdapter` escribe **siempre** en localStorage y además hace push debounced (1,5 s) a `/me/*`. Cualquier fallo de red es silencioso — la app funciona igual sin backend. Un 401 limpia el token y reintenta una vez. Resolución de conflictos: **last-write-wins** sobre el documento completo (no hay merge por campo).

Mapeo de claves de localStorage a endpoints:

| Clave localStorage | Endpoint |
|---|---|
| `upm.app.state` → subdoc `prefs` | `PUT /me/prefs` |
| `upm.app.state` → `{saved, folders}` | `PUT /me/saved` |
| `upm.notes.v1` | `PUT /me/notes` |
| `upm.sync.token.v1` | JWT emitido por `/auth/verify` (lo guarda `lib/auth.tsx`) |
| `upm.app.operator` | objeto `Operator` de la sesión |
| `upm.live-feed.v2` | cache del feed (fresh 5 min, TTL duro 24 h) |

El cache del feed tiene dos protecciones anti-veneno: si el cache guardado tiene 0 ítems se trata como inexistente (fuerza refetch), y `writeCache()` **no sobrescribe** un cache con datos por uno vacío.

### 6.9 Auth: OTP por email, sin passwords

Cutover realizado en `129ea91` — **el backdoor `POST /auth/login` (cualquier email → JWT) fue eliminado**. Flujo actual:

1. `POST /auth/request-code {email}` → si `smtpConfigured` es false devuelve **503**. Si hay `ALLOWED_EMAILS` y el email no está, devuelve **`{ok:true}` sin mandar nada** (anti-enumeración: no revela quién está en la lista). Si pasa: `issueCode()` genera 6 dígitos con `randomInt`, guarda **solo el hash SHA-256 de `email:code`** en un `Map` en memoria, y `sendOtpEmail()` lo manda por SMTP.
2. `POST /auth/verify {email, code}` → `verifyCode()` compara con `timingSafeEqual`; el código se borra al primer uso. Si OK: upsert del `operator` (nombre derivado del handle del email por `deriveName()`) y `signToken()` HS256 con TTL `JWT_TTL` (default `7d`).
3. El cliente guarda `Operator` en `upm.app.operator` y el JWT en `upm.sync.token.v1`; el sync lo usa sin login extra.

Parámetros del OTP (`server/src/lib/otp.ts`): TTL 10 min · cooldown de reenvío 60 s por email · máximo 5 intentos. Códigos de error: `invalid`→401, `expired`→410, `too_many`→429.

**Consecuencia arquitectónica del store en memoria:** los OTP pendientes viven en el proceso. Un redeploy los invalida (el usuario pide uno nuevo) y **el diseño asume UNA sola instancia** — escalar horizontalmente `upm-api` rompe el login salvo que se mueva el store a Postgres o Redis.

### 6.10 Embeddings locales, generados fuera del server vivo

`Xenova/multilingual-e5-small`, 384 dimensiones, cuantizado `q8`, vía `@huggingface/transformers`. Sin API key, sin costo.

- Convención e5 respetada: prefijo `passage: ` para documentos, `query: ` para consultas. **Query y passage DEBEN salir del mismo modelo.** Si algún día se migra a una API (Voyage/OpenAI), hay que **re-embeber todo el corpus**.
- `npm run embed` es **incremental**: calcula `contentHash(title, excerpt, fullText)` y solo re-embebe lo que no tiene embedding o cuyo hash cambió.
- Corre **fuera de Railway** (esta máquina o un job aparte) para no arriesgar la RAM del servicio. El server vivo nunca carga el modelo para embeber pasajes; solo lo carga perezosamente para la query de `/search`, y con `try/catch` que cae a FTS.
- `src/embed/proof.ts` es una demo comparativa FTS vs semántica: `npx tsx src/embed/proof.ts "tu pregunta"`.

---

## 7. Variables de entorno (fuente de verdad: `server/src/config.ts`)

Zod valida al arranque; si algo falta, el proceso **muere** con `Config inválida: <campo>: <mensaje>`.

| Variable | Requerida | Default | Para qué |
|---|---|---|---|
| `DATABASE_URL` | **sí** | — | Postgres. En Railway usar la referencia `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | **sí** | — | firma HS256. Mínimo 16 caracteres (Zod lo exige) |
| `ALLOWED_ORIGINS` | no | `https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188` | CORS, coma-separado |
| `ANTHROPIC_API_KEY` | no | — | activa Claude (prioridad sobre Gemini) |
| `GEMINI_API_KEY` | no | — | activa Gemini free tier |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | modelo primario de la cadena de fallback |
| `STATIC_DATA_BASE` | no | `https://soyalantapia.github.io/app-upm/data` | fallback HTTP de los JSON curados |
| `PORT` | no | `3000` | puerto del server |
| `NODE_ENV` | no | `development` | `production` activa el logger completo de Fastify |
| `JWT_TTL` | no | `7d` | vida del token |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | no | `PORT=587` | envío del OTP. `smtpConfigured` = HOST && USER && PASS |
| `ALLOWED_EMAILS` | no | — | allowlist de login, coma-separado. Vacío = cualquiera puede pedir código |
| `SEMANTIC_SEARCH` | no | `on` | **leída directamente con `process.env` en `search.ts`, NO está en el schema Zod.** `off` fuerza FTS puro |

Cliente (build-time, Vite):

| Variable | Dónde | Efecto |
|---|---|---|
| `VITE_UPM_API_URL` | `client/.env.production` | base de la API. **Si está seteada, activa modo producción completo**: feed desde backend (sin fallback a fetchers cliente), sync REST, búsqueda semántica y asistente real |

`SMTP_PORT === 465` activa `secure: true` en nodemailer (TLS implícito); 587 usa STARTTLS.

---

## 8. Build, deploy y verificación

### 8.1 Desarrollo local

```bash
# Backend (usa server/.env — copiar de .env.example)
cd /Users/alannaimtapia/dev/app-upm/server
npm install && npm run dev            # puerto según PORT del .env (histórico: 3210)

# Frontend — NODE 22, no v25
cd /Users/alannaimtapia/dev/app-upm/client
npm install && npm run dev            # http://127.0.0.1:5188/app-upm/  (strictPort:true)
```

### 8.2 Deploy backend (Railway)

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway up --detach                   # el directorio ya está linkeado al servicio upm-api
```

Las migraciones corren **solas al boot** (`migrate()` en `src/index.ts` antes de levantar el server; si falla, `process.exit(1)`). Railway deploya históricamente desde la rama **`feat/backend`**; `main` está sincronizado.

### 8.3 Deploy frontend (GitHub Pages, MANUAL)

**No hay CI.** El deploy es manual sobre la rama `gh-pages`, que sirve el contenido de `client/dist/` más un `.nojekyll`. El patrón usado (worktree o copia a /tmp + push forzado):

```bash
cd /Users/alannaimtapia/dev/app-upm/client
npm run build                          # tsc -b && vite build → client/dist
# copiar dist a un worktree/clon de gh-pages, touch .nojekyll, commit, push -f origin gh-pages
```

Últimos commits de `gh-pages`: `3c9b6a0 deploy: revisión total lote 3 (index-DpEQkNiw.js)`. El mensaje de commit incluye el hash del bundle — **mantener esa convención**, es lo que permite verificar qué versión está viva.

**El directorio `docs/` NO se usa.** Fue el mecanismo anterior (GH Pages sirviendo `/docs` desde `main`); su último commit es de 2026-06-06 mientras `gh-pages` avanzó hasta 2026-06-20. Regenerar `docs/` no despliega nada.

### 8.4 Comandos de verificación

```bash
# API viva + estado del corpus
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool

# Balance del feed por país (debe ser ~130/130/130/110)
curl -s "https://upm-api-production.up.railway.app/feed" | python3 -c \
 "import sys,json,collections;d=json.load(sys.stdin);print(collections.Counter(i['country'] for i in d['items']))"

# ¿La búsqueda semántica está activa? (mode debe ser 'hybrid', no 'fts')
curl -s "https://upm-api-production.up.railway.app/search?q=contaminacion%20del%20agua" | python3 -c \
 "import sys,json;d=json.load(sys.stdin);print(d['mode'], len(d['items']))"

# ¿Qué fuentes están caídas?
curl -s "https://upm-api-production.up.railway.app/feed" | python3 -c \
 "import sys,json;d=json.load(sys.stdin);print([s['id'] for s in d['sources'] if not s['ok']])"

# Asistente end-to-end (proveedor + fuentes citadas)
curl -s -X POST https://upm-api-production.up.railway.app/assistant \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"m1","role":"user","content":"¿Qué normas de ambiente hay en Argentina?"}]}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['provider'], len(d['message']['sources']))"

# Tests (unit + integración contra la DB real; requiere server/.env con DATABASE_URL)
cd server && npm test
cd client && npm test
```

---

## 9. GOTCHAS (esto es lo que hace perder horas)

1. **Node 22 obligatorio para buildear el cliente.** La máquina tiene Node v25 por defecto. `client/.claude/launch.json` apunta explícitamente a `/opt/homebrew/opt/node@22/bin/npm`. Con v25 el build puede fallar. Usar `/opt/homebrew/opt/node@22/bin/npm run build`.

2. **`import.meta.env.VITE_X` SIN optional chaining.** Vite reemplaza únicamente el patrón textual exacto `import.meta.env.VITE_UPM_API_URL`. Si escribís `import.meta.env?.VITE_UPM_API_URL`, el define no aplica, la expresión queda `undefined` y **rollup elimina todo el bloque por dead-code**. Está documentado en comentarios de `lib/sync.ts` y `lib/use-semantic-search.ts`. Es un fallo silencioso: compila, deploya, y la feature simplemente no existe en el bundle.

3. **`embedding`, `content_hash` y `embedded_at` NO están en `db/schema.ts` ni en la migración `0000`.** Se crearon con SQL fuera de Drizzle (junto con `CREATE EXTENSION vector`). Consecuencias: (a) `search.ts` y `embed/run.ts` las usan con SQL crudo; (b) **si corrés `npm run db:push` Drizzle podría querer borrarlas** — nunca usar `db:push` contra producción; (c) recrear la DB desde cero con solo `db:migrate` deja el corpus sin columna vectorial y `/search` cae permanentemente a `mode:'fts'`. **(verificar el DDL exacto contra la DB antes de recrear un entorno.)**

4. **El `noiseFilter` está escrito dos veces.** Como builder de Drizzle en `routes/feed.ts` y como string raw (`NOISE_SQL`) en `search.ts`. Cambiar uno sin el otro produce inconsistencia entre `/feed` y `/search`.

5. **Enums duplicados en tres archivos.** `client/src/lib/types.ts`, `server/src/types.ts`, `server/src/db/schema.ts`. Agregar un topic/tipo exige tocar los tres + generar migración. El test `enums-sync.test.ts` cubre server↔schema pero **NO cubre client↔server**: esa divergencia pasa silenciosa.

6. **Imports internos del server llevan `.js`.** Por `module: NodeNext`. `import { getLlm } from './llm'` **no compila**; tiene que ser `'./llm.js'`.

7. **El manifest de la PWA referencia iconos que no existen.** `vite.config.ts` declara `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, pero `client/public/` solo tiene `favicon.svg` y `southamerica.svg`. Verificado en producción: `https://soyalantapia.github.io/app-upm/icon-192.png` → **404**. La instalación de la PWA queda sin icono propio. Fix: agregar los tres PNG a `client/public/` y redeployar.

8. **`server/README.md` está DESACTUALIZADO.** Documenta `POST /auth/login` (eliminado en `129ea91`), `/search` como "FTS español" (hoy es híbrido), y `/assistant` como "RAG FTS top-8 + claude-sonnet-4-6" (hoy es híbrido top-6 y corre con Gemini). El `README.md` de la raíz también: dice "Demo institucional sin backend" y puerto 5181 (el real es 5188). **Ante duda, manda el código.**

9. **`docs/` es un build muerto.** No es la fuente del sitio publicado. El sitio sale de la rama `gh-pages`.

10. **`camara-br` está fallando en producción** (verificado 2026-07-18: 38/39 fuentes OK, `camara-br` en la lista de fallidas). La ingesta no se rompe por diseño — la fuente queda con `lastError` y el resto continúa. Consultar el error concreto con `/feed` → `sources[].error`.

11. **Cupo del free tier de Gemini: por-modelo-por-día.** Testear en ráfaga agota el balde diario de un modelo y devuelve 429 persistente hasta medianoche Pacific. La cadena de fallback multiplica el cupo, pero no es infinita. Bajo carga concurrente el asistente puede dar 502 (`assistant upstream error`) y tardar >45 s (el cliente aborta a los 45 s). Para escalar: cargar `ANTHROPIC_API_KEY` en Railway.

12. **SSL de Postgres según el host.** `db/client.ts` decide: `*.railway.internal` → **sin SSL** (la red interna no lo soporta); `rlwy.net` o `sslmode=require` → SSL con `rejectUnauthorized:false`. Para correr migraciones o scripts **desde local** hay que usar la URL pública (`DATABASE_PUBLIC_URL` del dashboard), no la interna: `postgres.railway.internal` **no resuelve** fuera de Railway.

13. **La columna `normas.date` es TEXT, no DATE.** Se ordena y compara como string `'YYYY-MM-DD'` (`localeCompare` en el front, `date DESC` en SQL). Cualquier fetcher que emita otro formato rompe el orden silenciosamente.

14. **El OTP vive en memoria → una sola instancia.** Escalar horizontalmente `upm-api` rompe el login (el código se emite en una instancia y se verifica en otra). Cada redeploy invalida los pendientes.

15. **Los tests de integración necesitan `server/.env` con `DATABASE_URL` real** — lo parsean a mano sin dotenv y **fallan si el archivo no existe**. Además borran `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` del entorno (para ejercitar la rama 503 del asistente) y setean `SEMANTIC_SEARCH=off` (para no cargar el modelo de embeddings).

16. **Marca:** "UPM" = Unión Parlamentaria del Mercosur = **el organismo cliente, no el producto**. Hay un proceso de naming en curso sin decisión final. El string aparece hardcodeado en muchísimos lugares: `base:'/app-upm/'`, nombres del manifest, prefijos de claves de localStorage (`upm.*`), tokens de color (`--color-upm-*`), `SYSTEM_PROMPT` del asistente, el HTML del email OTP, ids de servicios de Railway. Un rebranding es un refactor transversal, no un cambio de copy.

---

## 10. Qué NO existe (para no buscarlo)

- No hay CI/CD: ningún workflow de GitHub Actions. Todo deploy es manual.
- No hay Docker/compose. Railway buildea desde el `package.json` con Nixpacks **(verificar la config exacta en el dashboard de Railway)**.
- No hay librería de estado (Redux/Zustand/Jotai): store propio con `useSyncExternalStore`.
- No hay React Query/SWR: los hooks (`useLiveFeed`, `useSemanticSearch`) implementan cache y revalidación a mano.
- No hay streaming SSE en el asistente: `POST /assistant` responde el mensaje completo. `StreamingMarkdown.tsx` simula el efecto en el cliente.
- No hay tabla de sesiones ni refresh tokens: JWT stateless de 7 días.
- No hay RBAC ni multi-tenancy: todos los operadores son iguales; el aislamiento es por `operatorEmail` en `prefs`/`saved_state`/`notes_state`.
- No hay rate limiting HTTP global (solo el cooldown del OTP y el anti-doble-click del cliente).
