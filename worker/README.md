# UPM Feed — Backend Cloudflare Worker

Backend serverless gratuito que agrega fuentes oficiales del MERCOSUR ampliado y las normaliza al schema que consume el frontend de Asistente AI UPM.

## Por qué un Worker

El frontend ya hace fetch directo a las APIs que tienen CORS abierto (Câmara BR, Senado BR, HCDN AR, Socrata CO). Pero los siguientes países **bloquean CORS** desde el browser:

- 🇺🇾 Uruguay (Parlamento, IMPO)
- 🇵🇾 Paraguay (Diputados, SILPY)
- 🇧🇴 Bolivia (Gaceta Oficial)
- 🇵🇪 Perú (Congreso)
- 🇨🇱 Chile (BCN parcial)

El Worker **no tiene esa restricción** — puede hacer fetch + scraping HTML desde el server side y devolver JSON con CORS abierto al frontend.

## Costos

- **Cloudflare Workers free tier**: 100.000 requests/día gratis
- **Cloudflare KV (cache)**: 100.000 reads/día gratis, 1.000 writes/día
- **Total**: USD 0/mes para esta demo

## Deploy en 5 pasos

```bash
cd worker
npm install
npx wrangler login                    # 1. abre browser, te logueás con cuenta CF
npx wrangler kv:namespace create UPM_CACHE   # 2. crea cache KV (gratis)
# copiá el id que devuelve y pegalo en wrangler.toml descomentando el bloque KV
npx wrangler deploy                   # 3. despliega
# → URL pública: https://upm-feed.<tu-cuenta>.workers.dev
```

Después en el frontend, en `client/.env.production`:

```
VITE_UPM_API_URL=https://upm-feed.tu-cuenta.workers.dev
```

Y el frontend automáticamente preferirá el Worker sobre las APIs directas (más fuentes, más rápido por el cache).

## Endpoints

| Método | Path | Descripción |
|---|---|---|
| GET | `/` | Health check |
| GET | `/feed` | Todas las fuentes agregadas |
| GET | `/feed?pais=BR` | Filtrado por país |
| GET | `/feed?tema=ambiente` | Filtrado por tema |
| GET | `/sources` | Lista de fuentes registradas |

## Arquitectura

```
Browser (GitHub Pages)
  ↓ fetch
Cloudflare Worker (free tier, edge global)
  ↓ Promise.allSettled
┌──────────────┬──────────────┬──────────────┐
APIs públicas   APIs c/scraping  Cache KV
(BR, AR, CO)    (UY, PY, PE)     (TTL 30min)
```

## Roadmap del Worker

- [x] Brasil — Câmara dos Deputados (API)
- [x] Brasil — Senado Federal (API)
- [x] Argentina — HCDN datasets (CKAN)
- [ ] Chile — BCN/LeyChile (parcial, requiere XML parser)
- [ ] Colombia — Senado/Función Pública (Socrata)
- [ ] Uruguay — Parlamento (HTMLRewriter)
- [ ] Paraguay — SILPY (HTMLRewriter)
- [ ] Perú — Congreso (Socrata datosabiertos.gob.pe)
- [ ] Bolivia — Gaceta Oficial (PDF parsing, complejo)
- [ ] Schedule cron para warm cache cada 30min
- [ ] Webhook a Slack/Discord cuando aparece norma de alta relevancia

## Schema de respuesta

```typescript
type FeedResponse = {
  items: NewsItem[]              // todas las novedades agregadas
  fetchedAt: string              // ISO timestamp
  sources: {                     // estado de cada fuente
    id: string
    label: string
    country: CountryCode
    ok: boolean
    count: number
    error?: string
  }[]
}
```

## Desarrollo local

```bash
npm run dev   # arranca worker en localhost:8787
curl http://localhost:8787/feed | jq
```
