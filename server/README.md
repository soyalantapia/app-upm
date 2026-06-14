# upm-api · Backend de App UPM

Fastify + TypeScript + Drizzle + PostgreSQL (Railway). Sirve el feed normativo
agregado server-side (48 fuentes, sin proxies CORS), auth demo JWT, sync de
estado de usuario y asistente con Claude.

- **Prod**: https://upm-api-production.up.railway.app (proyecto Railway `zippy-harmony`, servicio `upm-api`)
- **DB**: servicio `Postgres` del mismo proyecto (referencia `${{Postgres.DATABASE_URL}}`)
- **Front**: https://soyalantapia.github.io/app-upm/ — se conecta vía `VITE_UPM_API_URL` (en `client/.env.production`); sin esa var o con la API caída, cae a sus fetchers client-side (modo demo intacto).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | service info |
| GET | `/feed?pais=&tema=` | **contrato de `fetchFromWorker()`**: `{ items, fetchedAt, sources }` (cap 500, date DESC) |
| GET | `/laws` | como `/feed`, solo `ley/decreto/reglamento/informe` |
| GET | `/search?q=` | FTS español (`ts_rank`, top 50) |
| GET | `/sources` | fuentes registradas |
| GET | `/health` | db + último ingest + itemCount |
| POST | `/auth/login` | demo: cualquier email → JWT 30d + Operator |
| GET/PUT | `/me/prefs` `/me/saved` `/me/notes` | sync jsonb last-write-wins (Bearer JWT) |
| POST | `/assistant` | RAG (FTS top-8) + `claude-sonnet-4-6`; **503 si falta `ANTHROPIC_API_KEY`** (el front cae al mock) |

## Variables (Railway → upm-api)

`DATABASE_URL` (referencia al Postgres) · `ALLOWED_ORIGINS` · `JWT_SECRET` · `NODE_ENV` · `ANTHROPIC_API_KEY` (opcional, habilita el asistente real) · `STATIC_DATA_BASE` (opcional, default GH Pages `/data`).

## Runbook

```bash
# dev local (usa server/.env — ver .env.example)
npm install && npm run dev            # :3210 (PORT en .env)

# ingesta manual (48 fuentes → upsert idempotente)
npm run ingest

# migraciones (también corren solas al boot)
npm run db:generate && npm run db:migrate

# tests (29: unit + integración contra Postgres real)
npm test

# deploy
railway up --detach                   # desde server/ (ya linkeado a upm-api)

# refrescar el snapshot de datos estáticos curados (server/data ← client/public/data)
npm run sync-data
```

## Ingesta

- Cron interno `*/30 * * * *` + run al boot si la DB está vacía o el último run >30 min.
- Aislamiento por fuente: una fuente caída se registra (`sources.lastError`) y NO aborta el run.
- Upsert por `id` (`ON CONFLICT DO UPDATE`), dedupe in-batch, `firstSeenAt` nunca se pisa.
- Datos estáticos curados: lee `client/public/data` (dev) → `server/data` (snapshot bundleado, Railway) → GH Pages (fallback).
- El server NO dedupea entre fuentes ni rankea: eso lo hace el front (contrato).
