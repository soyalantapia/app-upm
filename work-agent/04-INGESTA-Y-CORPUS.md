# 04 · Ingesta y corpus

**Última actualización:** 2026-07-18 (verificado contra el código en `main`/`feat/backend` y contra la DB de producción de Railway).

**Para qué sirve este documento:** es la fuente de verdad de *cómo entra el dato* a App UPM. Explica el registry de fuentes, el motor `runIngest`, la planificación (cron + boot-if-stale), el upsert idempotente, los fetchers que tienen lógica no trivial (`hcdn-ar`, `camara-br`), el filtro de ruido brasileño, la migración única de re-tipado de `br-camara` y la composición REAL del corpus hoy. Si vas a tocar cualquier cosa que afecte qué normas ve el legislador o qué recupera el RAG, leé esto primero.

Áreas que este documento NO cubre: contrato HTTP completo de la API, auth OTP, capa LLM/asistente, front. Ver los otros documentos de `work-agent/`.

---

## 1. Mapa de archivos

| Archivo | Rol |
|---|---|
| `server/src/ingest/registry.ts` | `FETCHERS`: array declarativo de las 39 fuentes (id, label, country, fn) |
| `server/src/ingest/run.ts` | `runIngest(db, staticBase)` — motor: fan-out, validación, upsert, reporte |
| `server/src/ingest/cli.ts` | Entrypoint standalone `npm run ingest` |
| `server/src/ingest/util.ts` | `fetchJson` (timeout 15s), `loadStaticJson` (FS → HTTP fallback), `truncateExcerpt` |
| `server/src/ingest/topic.ts` | `detectTopic(text)` — clasificador heurístico ES/PT → enum `Topic` |
| `server/src/ingest/fetchers/*.ts` | 28 archivos de fetchers (algunos exportan varias funciones) |
| `server/src/index.ts` | Boot: `migrate()` → `buildApp()` → `cron.schedule('*/30 * * * *')` → `listen` → `bootIngestIfStale()` |
| `server/src/db/schema.ts` | Tablas `normas`, `sources`, `ingest_runs` (+ operators/prefs/saved_state/notes_state) |
| `server/src/routes/feed.ts` | `noiseFilter`, `rowToItem`, `balancedRows` (consumidores del corpus) |
| `server/src/embed/run.ts` | `npm run embed` — backfill incremental de embeddings (fuera de la ingesta) |
| `server/data/` | Snapshot de `client/public/data` (JSON estáticos curados). Se regenera con `npm run sync-data` |

---

## 2. El registry de fuentes

`server/src/ingest/registry.ts` exporta un único array:

```ts
export type IngestFetcher = {
  id: string
  label: string
  country: CountryCode
  fn: (ctx: { staticBase: string }) => Promise<NewsItem[]>
}
export const FETCHERS: IngestFetcher[] = [ /* 39 entradas */ ]
```

**39 fuentes en total**, distribuidas así:

| País | Fuentes en el registry | Fuentes en DB (`/sources`) |
|---|---|---|
| AR | 20 | 20 |
| CO | 9 | 9 |
| BR | 7 | 7 |
| UY | 3 | 3 |
| **Total** | **39** | **39** |

Cómo verificar:

```bash
grep -c "^  { id:" /Users/alannaimtapia/dev/app-upm/server/src/ingest/registry.ts   # → 39
grep -o 'country: "[A-Z]*"' /Users/alannaimtapia/dev/app-upm/server/src/ingest/registry.ts | sort | uniq -c
curl -s https://upm-api-production.up.railway.app/sources | python3 -c "import json,sys,collections; d=json.load(sys.stdin); print(len(d), collections.Counter(x['country'] for x in d))"
```

### 2.1 Dos clases de fuente

1. **Estáticas curadas** — reciben `{ staticBase }` y llaman a `loadStaticJson(<id>, staticBase)`. Leen un JSON de `client/public/data/<id>.json` (dev) o `server/data/<id>.json` (Railway). Ej.: `leyes-destacadas-ar`, `hcdn-ar` (usa `leyes-ar.json`), `csjn-ar`, toda la familia `*-infoleg-ar`, `impo-uy`, `leyes-uy`, `tcu-br`.
2. **Live (HTTP en cada run)** — `fn: () => fetchX()`, sin `staticBase`. Ej.: `camara-br`, `senado-br`, todas las CO (Socrata/Vista/Presidencia/Corte), `parlamento-uy`, `materias-senado-br`, `votacoes-*-br`, `eventos-camara-br`.

`loadStaticJson` (`util.ts:25`) prueba, en orden:
1. `../../../client/public/data/<id>.json` (monorepo local)
2. `../../../../client/public/data/<id>.json`
3. `../../data/<id>.json` (snapshot bundleado en `server/data`, es el que gana en Railway)
4. Fallback HTTP a `${STATIC_DATA_BASE}/<id>.json` (default `https://soyalantapia.github.io/app-upm/data`)

> **GOTCHA:** si editás un JSON en `client/public/data/` y no corrés `npm run sync-data` (dentro de `server/`, hace `rm -rf data && cp -r ../client/public/data ./data`), en local vas a ver el cambio (candidato 1) pero en Railway NO (candidato 3 sigue viejo). Es una de las formas más rápidas de perder una hora.

### 2.2 Fuentes con problemas hoy (verificado en prod)

| Fuente | Estado | Detalle |
|---|---|---|
| `camara-br` | `last_ok = false` intermitente | `TimeoutError: The operation was aborted due to timeout` — la API de la Câmara excede los 15s de `fetchJson`. Alterna ok/fail entre runs (ver `ingest_runs`: 39/0 y 38/1 alternándose). Con 2.362 filas ya persistidas, un fallo no borra nada |
| `senado-br` | `last_ok = true`, `last_count = 0` | Devuelve 0 ítems y **nunca insertó ninguna fila** (0 en `normas`). El endpoint `legis.senado.leg.br/dadosabertos/processo?ano=<año>&format=json` no devuelve la estructura `ListaProcesso.Processos.Processo` esperada. **Fuente muerta silenciosa** (verificar / arreglar o sacar del registry) |
| `materias-senado-br` | `last_ok = true`, `last_count = 0` | Mismo caso: 0 filas en `normas`. Fuente muerta silenciosa |
| `eventos-camara-br` | ok pero volumen ~1 | Aporta 1 ítem por run; 241 acumulados |

> **GOTCHA:** una fuente que devuelve `[]` se reporta como **OK** (`ok: true, count: 0`). No hay alerta por "fuente viva pero vacía". Para detectarlas: `select id, last_ok, last_count from sources where last_count = 0`.

---

## 3. `runIngest` — el motor

`server/src/ingest/run.ts`. Firma: `runIngest(db: Db, staticBase: string): Promise<IngestResult>`.

```ts
export type IngestResult = {
  okSources: number
  failedSources: number
  itemsUpserted: number
  reports: SourceReport[]
}
```

Secuencia exacta:

1. **Lock en memoria** — `let running = false` a nivel de módulo. Si ya hay un run en curso, tira `throw new Error('ingest ya en curso')`. Evita que el cron se solape con el boot-ingest o con una corrida manual **en el mismo proceso**. No es un lock distribuido: dos réplicas de Railway sí se solaparían (hoy hay una sola).
2. **Fan-out paralelo con aislamiento por fuente** — `Promise.all(FETCHERS.map(f => f.fn({staticBase}).then(ok, err)))`. El `.then(onOk, onErr)` (no `.catch`) garantiza que **una fuente caída nunca aborta el run**; el error se captura como string recortado a 300 chars.
3. **Validación dura de enums** — `isValid(item)` filtra antes de tocar la DB. Exige: `id`, `title.trim()`, `excerpt !== undefined`, `date`, y que `country`/`topic`/`type`/`relevance` pertenezcan a `COUNTRY_CODES`/`TOPICS`/`DOC_TYPES`/`RELEVANCES` de `types.ts`. Un valor fuera del enum rompería el insert (`pgEnum`) y, peor, los filtros del front. **Los ítems inválidos se descartan en silencio** — no se cuentan ni se loguean.
4. **Upsert del estado de la fuente** en `sources` (`onConflictDoUpdate` sobre `sources.id`): `label`, `lastRunAt`, `lastOk`, `lastCount`, `lastError`.
5. **Dedupe in-batch por id (keep-first)** — `[...new Map(items.map(it => [it.id, it])).values()]`. Necesario porque Postgres no permite que un mismo `INSERT ... ON CONFLICT` toque la misma fila dos veces (`ON CONFLICT DO UPDATE command cannot affect row a second time`).
6. **Upsert idempotente de normas, en batches de 100** — ver §3.1.
7. **Registro del run** en `ingest_runs` (`startedAt`, `finishedAt`, `okSources`, `failedSources`, `itemsUpserted`, `detail` = array completo de `SourceReport` en jsonb).

### 3.1 Upsert idempotente

```ts
await db.insert(normas).values(batch).onConflictDoUpdate({
  target: normas.id,
  set: { title: sql`excluded.title`, /* …todas las columnas de contenido… */
         sourceId: sql`excluded.source_id`, lastSeenAt: now,
         // firstSeenAt NO se pisa
       },
})
```

Propiedades a tener presentes:

- **La clave es `normas.id`** (text, PK), fabricada por cada fetcher (`ar-ley-27346`, `br-camara-2632270`, `co-corte-c-269-25`, …). El id ES el contrato de identidad: si cambiás la forma del id en un fetcher, **duplicás todo el histórico de esa fuente** en vez de actualizarlo.
- **`firstSeenAt` es inmutable** (se setea con el `defaultNow()` del insert y no está en el `set`). `lastSeenAt` se refresca en cada run → sirve para detectar filas huérfanas.
- **`sourceId` SÍ se pisa.** Si dos fetchers emiten el mismo id, la columna `source_id` refleja **el último que corrió** en el orden del array `FETCHERS`. Ver el caso `ar-ley-*` en §5.1.
- **La ingesta nunca BORRA.** No hay tombstones ni purga por `lastSeenAt`. Consecuencia real: `defensoria-ar` fue removida del registry el 2026-06-14 pero **sus 10 filas siguen en `normas`** (`source_id = 'defensoria-ar'`, `last_seen_at = 2026-06-14`) y siguen apareciendo en `/feed`, `/search` y en el RAG. Verificar:

```sql
select n.source_id, count(*) from normas n
  left join sources s on s.id = n.source_id
 where s.id is null group by 1;   -- → defensoria-ar | 10
```

- **`itemsUpserted` NO es "ítems nuevos"**: cuenta filas enviadas al `INSERT`, insertadas o actualizadas. En prod ronda ~1.988–2.018 por run, con el corpus creciendo apenas.

### 3.2 Correr la ingesta a mano

```bash
cd /Users/alannaimtapia/dev/app-upm/server
npm run ingest          # tsx src/ingest/cli.ts — imprime ✓/✗ por fuente
```

`cli.ts` llama a `loadConfig()`, así que **exige todo el env válido** (`DATABASE_URL` y `JWT_SECRET` mín. 16 chars son obligatorios) aunque la ingesta solo use `DATABASE_URL` y `STATIC_DATA_BASE`. Para apuntar a producción desde local hay que usar `DATABASE_PUBLIC_URL` del servicio `Postgres` (el host interno `postgres.railway.internal` **no resuelve** desde afuera):

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL='   # NO pegar el valor en ningún lado
DATABASE_URL="<esa url>" JWT_SECRET=dummy-de-16-o-mas npm run ingest
```

---

## 4. Planificación: cron + boot-if-stale

Ambos viven en `server/src/index.ts`.

### 4.1 Boot

```
loadConfig() → createDb() → migrate(db, { migrationsFolder: './drizzle' })
  └─ si migrate falla → console.error + process.exit(1)   ← el server NO arranca
→ buildApp(config, db) → app.listen({ host: '0.0.0.0', port: config.PORT })
→ void bootIngestIfStale()      ← en background, NO bloquea el listen
```

### 4.2 `bootIngestIfStale()` (`index.ts:25`)

Dispara `runIngest` si **cualquiera** de estas es verdadera:
- `count(*) from normas === 0` (DB vacía), **o**
- no hay `ingest_runs` con `finishedAt`, **o**
- `Date.now() - last.finishedAt > 30 * 60 * 1000` (30 min).

Está envuelto en try/catch: si falla, loguea `'ingesta boot falló (no bloquea el server)'` y sigue.

> Consecuencia operativa: **cada `railway up` dispara una ingesta completa** salvo que se redeploye dentro de los 30 min del último cron. Es esperable ver un pico de ~2.000 upserts en el arranque.

### 4.3 Cron

```ts
cron.schedule('*/30 * * * *', async () => { … runIngest … })
```

`node-cron` ^3.0.3, en el timezone del proceso (Railway = UTC). Corre a `:00` y `:30` de cada hora. El lock de `runIngest` evita solapamiento con el boot-ingest.

Cómo verificar que está vivo:

```bash
curl -s https://upm-api-production.up.railway.app/health
# → {"ok":true,"db":"up","lastIngest":{"finishedAt":"…","okSources":38,"failedSources":1,"itemsUpserted":1988},"itemCount":4589,"uptime":…}
```

`lastIngest.finishedAt` nunca debería tener más de ~31 min. `uptime` es el del proceso: al 2026-07-18 marcaba 2.380.272 s (~27 días sin redeploy).

`ingest_runs` acumula **una fila por corrida sin ninguna retención** — 1.712 filas al 2026-07-18. Crece ~48/día. Cada fila lleva el `detail` jsonb con los 39 reports. No es un problema hoy pero no tiene purga.

---

## 5. Fetchers destacados

### 5.1 `hcdn-ar.ts` — `deriveLeyDate`

El archivo exporta dos funciones distintas:

| Función | Qué hace | ¿En el registry? |
|---|---|---|
| `fetchHcdnAR()` | CKAN live `datos.hcdn.gob.ar/api/3/action/datastore_search?resource_id=08c8ee72-…&limit=15`, ids `ar-hcdn-*` | **NO** — código preservado, sin uso |
| `fetchHcdnArgentina(staticBase)` | JSON curado `leyes-ar.json`, primeras `LEYES_AR_LIMIT = 200`, ids `ar-ley-<num>` | **SÍ** (`id: "hcdn-ar"`) |

**El problema que resuelve `deriveLeyDate`.** El dataset curado `leyes-ar.json` (dataset oficial `leyes-sumario` de HCDN) **no trae fecha estructurada**. La versión anterior del `mapLey` estampaba `today` (fecha de ingesta) en todas las leyes → "¿qué ley salió hoy?" devolvía leyes de 2017 presentadas como sancionadas hoy. Esto fue clasificado como **[Media] Recencia engañosa** en la auditoría de lanzamiento del 2026-06-15 y arreglado en `fb59a74`.

**El algoritmo.** Las leyes nacionales argentinas se numeran de forma **secuencial en el tiempo**, así que el número de ley es la señal temporal real. Se interpola linealmente entre 15 anclas verificadas `[nº de ley, año de sanción]`:

```ts
const AR_LEY_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [19550, 1972], [22421, 1981], [23551, 1988], [24240, 1993], [25326, 2000],
  [25675, 2002], [26061, 2005], [26485, 2009], [26994, 2014], [27275, 2016],
  [27350, 2017], [27499, 2018], [27541, 2019], [27610, 2020], [27701, 2022],
]
```

Pasos de `deriveLeyDate(leyNum)` (`hcdn-ar.ts:107`):

1. `n = Number(leyNum.replace(/\D/g, ''))`. Si no es finito o `<= 0` → **`null`**.
2. Elegir el segmento `lo`:
   - si `n >= A[último][0]` → `lo = A.length - 2` (extrapola con la pendiente del **último** tramo, `[27610,2020]`→`[27701,2022]`);
   - si no → avanzar `lo` mientras `n > A[lo+1][0]`. Nótese que para `n < 19550` queda `lo = 0`, o sea **extrapola hacia atrás** con la pendiente `[19550,1972]`→`[22421,1981]`.
3. Interpolar: `yFloat = y0 + ((n - n0) * (y1 - y0)) / (n1 - n0)`.
4. `year = clamp(floor(yFloat), 1900, añoUTCActual)` — **clampeado al año en curso**.
5. `dayOfYear = clamp(round(frac(yFloat) * 364), 0, 364)`; se construye `Date.UTC(year, 0, 1) + dayOfYear días` y se devuelve `YYYY-MM-DD`.

La parte fraccional NO pretende ser el día real de sanción: solo **preserva el orden por número de ley** dentro del año. Es explícito en el comentario del código.

Valores comprobados (`npx tsx` sobre la función real):

| nº ley | `deriveLeyDate` | Año real de sanción | Comentario |
|---|---|---|---|
| 11683 | `1947-05-04` | **1932** | ❌ extrapolación hacia atrás: 15 años de error |
| 19550 | `1972-01-01` | 1972 | ancla exacta |
| 24240 | `1993-01-01` | 1993 | ancla exacta |
| 27346 | `2016-12-11` | 2016 | interpolado, correcto |
| 27350 | `2017-01-01` | 2017 | ancla exacta |
| 27800 | `2024-03-05` | 2023/2024 | extrapolación hacia adelante, plausible |
| 30000 | `2026-07-12` | — | clampeado al año en curso |
| 99999 | `2026-12-19` | — | clampeado al año en curso |
| `"abc"` / `""` | `null` | — | `mapLey` cae a `today` |

> **GOTCHAS de `deriveLeyDate`:**
> - **Es una estimación, no un dato.** Nunca la presentes al usuario como "fecha de sanción oficial" ni la uses para razonamiento jurídico. Para las 200 leyes de `hcdn-ar` la fecha es derivada; para `leyes-destacadas-ar` (72 leyes curadas) es **real** y viene del JSON.
> - **Por debajo de 19550 es abiertamente incorrecta** (Ley 11.683 → 1947 en vez de 1932). Si algún día se levanta `LEYES_AR_LIMIT` o entran leyes viejas, agregar anclas por debajo de 19550 (p. ej. `[11683, 1932]`, `[20744, 1974]`).
> - **Números altos se clampean al año actual**, no fallan. Cualquier ley futura o un número basura aterriza "hoy-ish".
> - `mapLey` cae a `new Date().toISOString().slice(0,10)` (today) cuando `deriveLeyDate` devuelve `null` — el problema original sobrevive en ese caso marginal.
> - **No hay tests** de `deriveLeyDate`. `server/test/unit/` solo tiene `enums-sync`, `operator` y `topic`.

**Colisión de namespace `ar-ley-*` (importante).** Tres fuentes emiten ids con ese prefijo:

| Fuente | Filas `ar-ley-*` en prod | Fecha |
|---|---|---|
| `leyes-infoleg-ar` | 400 | real (BO) |
| `hcdn-ar` | 53 | derivada por `deriveLeyDate` |
| `leyes-destacadas-ar` | 49 (+3 `ar-decreto-*`) | real, curada y verificada |

El diseño es **intencional** (los comentarios lo dicen: ids idénticos a los del fetcher cliente para que el dedupe del front colapse server/cliente en uno), pero significa que **quien corre último en el array `FETCHERS` gana la fila entera**, no solo la fecha. Hoy no chocan mucho porque cubren rangos numéricos distintos (`hcdn-ar` ≈ 27346–27400 → fechas 2016-12-11 a 2017-08-16; `leyes-infoleg-ar` → 2017-09-18 a 2026-04-08; `leyes-destacadas-ar` → 1932-12-30 a 2019-04-17). Si alguna vez se solapan, la fecha derivada podría pisar una fecha real. Orden actual en `FETCHERS`: `leyes-destacadas-ar` (1º) … `hcdn-ar` (5º) … `leyes-infoleg-ar` (7º) → **infoleg gana** ante empate.

Cómo verificar:

```sql
select source_id, count(*) from normas where id like 'ar-ley-%' group by 1;
select source_id, min(date), max(date), count(*) from normas where country='AR' group by 1 order by 4 desc;
```

### 5.2 `camara-br.ts` — `SIGLA_TO_TYPE`, `SIGLA_FULL` y el título por ementa

Endpoint: `https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=30&ordem=DESC&ordenarPor=id` — **solo las últimas 30 proposiciones por run**.

#### Por qué el trámite brasileño NO puede ser `type: 'ley'`

La Câmara dos Deputados expone en un único endpoint todas las *proposições*, y la enorme mayoría **no son leyes sancionadas**: son proyectos y, sobre todo, artefactos de tramitación (requerimientos, pareceres, substitutivos, enmiendas, documentos). El fetcher original colapsaba **todo** a `type: 'ley'` — 102 de 121 ítems BR eran REQ/PRL/RIC/TCU/SBT/DOC etiquetados como ley. Ante un legislador eso **tergiversa el corpus**: el Radar mostraba "leyes" brasileñas que en realidad eran pedidos de informe. Hallazgo **[Alta]** de la re-auditoría del 2026-06-15, arreglado en `3810ebe`.

El fix es un mapeo explícito por sigla (`camara-br.ts:14`):

| Sigla(s) | `type` | Racional |
|---|---|---|
| `PL`, `PLP`, `PLN`, `PLV` | `ley` | proyectos de ley sustantivos |
| `PEC`, `PRC` | `reglamento` | enmienda constitucional / resolución |
| `MP`, `MPV`, `PDL`, `PDC` | `decreto` | medida provisoria / decreto legislativo |
| `REQ`, `RIC`, `INC`, `PFC`, `RCP` | `comunicado` | procesal: requerimientos, indicaciones |
| `PRL`, `PAR`, `SBT`, `SBR`, `ERD`, `EMC`, `EMR`, `EMP`, `PES`, `DOC`, `RDF`, `TCU`, `MSC` | `informe` | pareceres, substitutivos, enmiendas, documentos |
| **desconocida** | `informe` | `SIGLA_TO_TYPE[p.siglaTipo] ?? 'informe'` — **NUNCA `'ley'`** |

> El default a `'informe'` es deliberado: una sigla nueva de la Câmara jamás debe entrar al corpus como ley. **No cambiar ese fallback.**

`SIGLA_FULL` (`camara-br.ts:25`) traduce la sigla a nombre legible (`REQ` → `Requerimento`, `PRL` → `Parecer do Relator`, `PEC` → `Proposta de Emenda à Constituição`, …) y se usa para construir `docLabel = \`${full} ${p.numero}/${ano}\``, que queda en **`tipoDocumento`** (no en el título). Sin esto el usuario veía el críptico "REQ 39/2026".

`relevanceFor(sigla)`: `PEC`/`MP`/`MPV` → `alta`; `PL`/`PLP`/`PLN`/`PLV`/`PDL` → `media`; todo lo demás → `baja`.

#### El título ahora es la ementa

Antes: `title = \`${sigla} ${numero}/${ano}\`` → **colapsaba cientos de pareceres al mismo texto** ("Parecer do Relator 1/2026" ×97; 305 normas con título duplicado). Hallazgo **[Media]** de la auditoría profunda del 2026-06-20, arreglado en `28d5aa8`.

Ahora (`camara-br.ts:60`):

```ts
const ementa = (p.ementa ?? '').trim().replace(/\s+/g, ' ')
title: ementa ? (ementa.length > 110 ? ementa.slice(0, 107) + '…' : ementa) : `${docLabel} · Brasil`
```

La ementa es única por proposición. Los grupos de títulos duplicados bajaron de 305 a 148 en su momento; hoy hay **137 grupos** de título repetido en toda la tabla (`select count(*) from (select title from normas group by title having count(*)>1) t`) — el resto son ementas genuinamente idénticas de trámites casi iguales.

Otros campos que produce: `id = 'br-camara-' + p.id`, `topic = detectTopic(ementa + ' ' + siglaTipo)`, `source = \`Câmara dos Deputados — Brasil (${p.siglaTipo})\``, `sourceUrl` a la ficha de tramitación, `apiDetailUrl` a la API.

> **GOTCHA de fechas:** `date = new Date().toISOString().slice(0,10)` — **la fecha de ingesta, no la de la proposición**. Es aceptable (las proposições SON del día) pero significa que `camara-br` estampa "hoy" en 30 ítems nuevos cada 30 minutos. Es la causa raíz del flood de Brasil, mitigado —no eliminado— por `balancedRows` (ver §7).

### 5.3 `leyes-destacadas-ar.ts`

72 leyes AR curadas y verificadas a mano, con **fecha real** (`row.fecha`), `relevance: 'alta'` fija, `status: 'Sancionada y promulgada'`, `authors`, `dataPublicacao` y `sourceUrl` a `argentina.gob.ar/normativa/nacional/<numero>`. Ids `ar-ley-<num>` o `ar-decreto-<num>` según `row.type`. En prod quedan 52 filas con `source_id = 'leyes-destacadas-ar'` (el resto fue pisado por otras fuentes AR, ver §5.1).

---

## 6. `noiseFilter` — ruido procesal de Brasil

`server/src/routes/feed.ts:18`:

```ts
export const noiseFilter = sql`${normas.id} not like 'br-votacao%' and ${normas.id} not like 'br-evento%'`
```

Y su gemelo raw para los CTE de la búsqueda híbrida (`server/src/search.ts:8`):

```ts
const NOISE_SQL = "id not like 'br-votacao%' and id not like 'br-evento%'"
```

**Qué excluye:** registros de Brasil sin contenido legislativo — votaciones repetidas ("Votación aprobada…") de `votacoes-camara-br` (prefijo `br-votacao-`) y eventos de agenda de `eventos-camara-br` (prefijo `br-evento-`). Al 2026-07-18: **200 + 241 = 441 filas filtradas**.

**Dónde se aplica** (grep `noiseFilter` en `server/src/`):

| Consumidor | Línea |
|---|---|
| `/feed` — `balancedRows` (conteo de países, top por país) | `feed.ts:85`, `feed.ts:92` |
| `/feed?pais=` | `feed.ts:116` |
| `/laws` | `feed.ts:135` |
| `/search` — rama FTS y CTEs `vec`/`fts` del híbrido | `search.ts:55`, `search.ts` (CTEs vía `NOISE_SQL`) |
| Asistente / RAG — recencia y retrieval | `assistant.ts:71`, `assistant.ts:84` |

**Propiedades:**
- Es **reversible**: filtra por predicado SQL, **no borra datos**. Para revertir alcanza con sacar el `where`.
- **No toca leyes AR reales** con título genérico (`"Ley NNNNN · DISPOSICIONES"` de InfoLeg) — esas son normas legítimas.
- Los ítems filtrados **sí están en la tabla** y **sí se embeben** (`npm run embed` no conoce el filtro), pero nunca salen por ningún endpoint.

> **GOTCHA / hueco confirmado:** `votacoes-senado-br` emite ids con prefijo **`br-senado-vot-`**, que el `noiseFilter` **no matchea**. Hay 20 filas del tipo `br-senado-vot-7084 · "Votación MSF 16/2026 · Submete à apreciação do Senado Federal…"` con `type: 'ley'` circulando por `/feed`, `/laws`, `/search` y el RAG. Es exactamente el mismo tipo de ruido procesal que motivó el filtro. Si se quiere cerrar: agregar `and id not like 'br-senado-vot%'` en `noiseFilter` **y** en `NOISE_SQL` (los dos, están duplicados).

Verificar el hueco:

```sql
select id, left(title,60) from normas where id like 'br-senado-vot%' limit 3;
```

---

## 7. Feed balanceado (por qué la ingesta condiciona el front)

No es ingesta pero es su consecuencia directa. `feed.ts:76-97`: `FEED_LIMIT = 500`, `PER_COUNTRY = 130`.

La Câmara es una manguera (~150 proposiciones/día, fechadas por día de ingesta) → `camara-br` acumuló 2.362 filas. Un `order by date desc limit 500` global hacía que Brasil ocupara ~497 de 500 y **empujara AR/CO/UY fuera del payload**. Como el cliente baja el `/feed` global sin filtro de país y rankea client-side, un legislador argentino veía casi puro Brasil. Bug crítico encontrado y arreglado el 2026-06-19 (`0e935d9`).

`balancedRows(db, extra)` toma los `PER_COUNTRY = 130` más recientes de **cada** país (una query por país, en `Promise.all`), los mergea, ordena por `date` desc y corta a 500. Con `?pais=` explícito se filtra server-side sin balancear.

Verificación en vivo (2026-07-18):

```bash
curl -s https://upm-api-production.up.railway.app/feed | python3 -c "
import json,sys,collections; d=json.load(sys.stdin)
print(len(d['items']), collections.Counter(i['country'] for i in d['items']))"
# → 500 Counter({'BR': 130, 'CO': 130, 'AR': 130, 'UY': 110})
```

---

## 8. La migración única de re-tipado de `br-camara`

**No está en el repo.** Fueron scripts one-shot ejecutados desde `/tmp` y descartados. Se documentan acá porque su efecto está **persistido en la DB de producción** y no es reproducible desde el código.

`server/drizzle/` contiene **una sola migración**: `0000_careful_caretaker.sql` (86 líneas). No hay ninguna migración de datos.

| # | Cuándo | Script | Qué hizo | Por qué hizo falta |
|---|---|---|---|---|
| 1 | 2026-06-15 (`3810ebe`) | `/tmp/retipo-br.mjs` | `UPDATE` del `type` de las ~111 filas `br-camara-*` históricas, aplicando `SIGLA_TO_TYPE` derivado del texto ya guardado. Resultado: BR pasó de `ley:111` → `ley:23` (solo PL reales) + `informe:53` + `comunicado:52` + `decreto:2` + `reglamento:1` | El fetcher solo trae las **últimas 30** proposiciones por run. Corregir el código arregla lo nuevo pero **jamás re-visita** las ~111 filas viejas: sin la migración habrían quedado etiquetadas `ley` para siempre |
| 2 | 2026-06-20 (`28d5aa8`) | migración ad-hoc con `pg` | Re-título de las 744 filas `br-camara-*` existentes, derivando el nuevo título del `excerpt` (que ya contenía la ementa truncada), y **`content_hash = NULL`** para forzar el re-embedding | Idéntico motivo: el cambio "título = ementa" solo aplicaba a las 30 nuevas por run |

**Patrón a reutilizar** para cualquier fetcher de ventana corta (`camara-br` 30, `senado-br` 20, `votacoes-*` …): **cambiar el mapeo del fetcher NO reescribe el histórico.** Todo cambio de `type`, `title`, `relevance` o `topic` en un fetcher de ventana necesita una migración de datos acompañante.

Gotchas operativos de esas corridas (siguen valiendo):
- El host interno `postgres.railway.internal` **no resuelve desde local** → usar `DATABASE_PUBLIC_URL` del servicio `Postgres`.
- Al importar `pg` desde un `.mjs` suelto en `/tmp`, Node no resuelve el paquete → **importar por path absoluto**: `import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'`.
- La conexión pública requiere `ssl: { rejectUnauthorized: false }`.
- Si tocás `title`/`excerpt`/`full_text`, **nulleá `content_hash`** o `npm run embed` no va a detectar el cambio… en realidad `embed/run.ts` recalcula el hash y compara, así que lo detecta igual; nullear es el atajo explícito.

---

## 9. Composición actual del corpus (verificado 2026-07-18)

Consultado directamente contra la DB de producción (`DATABASE_PUBLIC_URL` del servicio `Postgres`, proyecto Railway `UPM` / entorno `production`).

**Total en `normas`: 4.589 filas.** Sin ruido (`noiseFilter`): **4.148**.

### Por país

| País | Total | Sin ruido | % del corpus servible |
|---|---|---|---|
| BR | 2.833 | 2.392 | 57,7 % |
| AR | 1.081 | 1.081 | 26,1 % |
| CO | 526 | 526 | 12,7 % |
| UY | 149 | 149 | 3,6 % |

> El corpus está **fuertemente sesgado a Brasil** (58 %), y ese 58 % es en su enorme mayoría trámite procesal de la Câmara. El sesgo crece ~30 filas cada 30 min. `balancedRows` lo neutraliza en el `/feed`, pero **NO en `/search` ni en el RAG del asistente**, que consultan la tabla entera.

### Por tipo (sin ruido)

| `type` | Filas |
|---|---|
| `informe` | 1.430 |
| `ley` | 1.193 |
| `comunicado` | 815 |
| `decreto` | 359 |
| `reglamento` | 326 |
| `convenio` | 25 |
| `acta` / `minuta` / `dossier` | 0 |

### `br-camara-*` por tipo (efecto del re-tipado)

| `type` | Filas |
|---|---|
| `informe` | 1.269 |
| `comunicado` | 669 |
| `ley` | 277 |
| `decreto` | 140 |
| `reglamento` | 7 |

Solo el 11,7 % de lo que trae la Câmara es `ley` — antes del fix era el 100 %.

### Por topic (sin ruido)

| `topic` | Filas |
|---|---|
| `integracion-regional` | 3.058 (73,7 %) |
| `economia-regional` | 270 |
| `salud` | 201 |
| `seguridad` | 190 |
| `ambiente` | 106 |
| `educacion` | 82 |
| `genero` | 80 |
| `rrii` | 68 |
| `energia` | 54 |
| `corredores-bioceanicos` | 39 |
| `rio-uruguay` / `mercosur` | 0 |

> **GOTCHA:** `detectTopic` (`ingest/topic.ts:17`) devuelve `'integracion-regional'` como **fallback cuando ningún regex matchea**. Por eso 3 de cada 4 normas tienen ese topic: no es una señal, es el cajón de sastre. Los filtros por tema del Radar son, en la práctica, poco discriminativos. Dos topics del enum (`rio-uruguay`, `mercosur`) **nunca se asignan** por ninguna heurística. Cualquier mejora de clasificación tiene alto retorno aquí.

### Filas por fuente (todas, prod)

```
2362 camara-br            400 leyes-infoleg-ar      241 eventos-camara-br
 200 votacoes-camara-br   110 leyes-presidencia-co  100 leyes-co
  91 sentencias-corte-co   80 decretos-infoleg-ar    80 decretos-presidencia-co
  80 leyes-uy              67 expedientes-hcdn-ar    60 mercosur-comercio-ar
  54 parlamento-uy         53 hcdn-ar                53 resoluciones-ar
  52 leyes-destacadas-ar   50 decisiones-admin-ar    50 vista-co
  40 bcra-ar               31 disposiciones-ar       30 acordadas-ar
  30 corte-const-co        30 economia-ar            30 salud-ar
  25 energia-ar            25 seguridad-ar           25 senado-co
  25 tratados-co           20 csjn-ar                20 enacom-ar
  20 votacoes-senado-br    15 impo-uy                15 votaciones-co
  10 defensoria-ar (huérfana) 10 tcu-br               5 circulares-ar
   0 senado-br              0 materias-senado-br
```

### Comando de verificación completo

```bash
cd /Users/alannaimtapia/dev/app-upm/server
cat > /tmp/upm-corpus.mjs <<'EOF'
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
const c = new pg.Client({ connectionString: process.env.DBURL, ssl: { rejectUnauthorized: false } })
await c.connect()
const NOISE = "id not like 'br-votacao%' and id not like 'br-evento%'"
const q = async (l, s) => { console.log('###', l); console.table((await c.query(s)).rows) }
await q('total',        'select count(*)::int from normas')
await q('por pais',     `select country, count(*)::int from normas where ${NOISE} group by 1 order by 2 desc`)
await q('por tipo',     `select type, count(*)::int from normas where ${NOISE} group by 1 order by 2 desc`)
await q('por topic',    `select topic, count(*)::int from normas where ${NOISE} group by 1 order by 2 desc`)
await q('por fuente',   'select source_id, count(*)::int from normas group by 1 order by 2 desc')
await q('embeddings',   'select count(*)::int total, count(embedding)::int con_emb from normas')
await q('huerfanas',    'select n.source_id, count(*)::int from normas n left join sources s on s.id=n.source_id where s.id is null group by 1')
await q('fuentes rotas','select id, last_ok, last_count, left(coalesce(last_error,\'\'),60) err from sources where last_ok=false or last_count=0')
await c.end()
EOF
DBURL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)" node /tmp/upm-corpus.mjs
```

---

## 10. Embeddings: estado real y deuda operativa

La ingesta **NO embebe**. `npm run embed` (`server/src/embed/run.ts`) es un proceso aparte, manual, pensado para correr **fuera de Railway** (usa transformers.js con `Xenova/multilingual-e5-small`, q8, 384 dims — pesa RAM).

Es incremental: trae todas las filas, recalcula `contentHash(title, excerpt, full_text)` y marca pendiente si `!has_emb || content_hash !== hash`. Ritmo observado ~4 filas/s.

**Estado al 2026-07-18 — hay una brecha grande:**

| | Filas |
|---|---|
| Total en `normas` | 4.589 |
| Con `embedding` | **2.597 (56,6 %)** |
| **Sin `embedding`** | **1.992 (43,4 %)** |

Sin embedding, por país: BR 1.918 · CO 50 · UY 24 · AR 0.
Sin embedding, por fuente: `camara-br` 1.618 · `eventos-camara-br` 162 · `votacoes-camara-br` 138 · `decretos-presidencia-co` 40 · `parlamento-uy` 24 · `leyes-presidencia-co` 10.

Interpretación: el último `npm run embed` fue el 2026-06-20 (dejó 2.597/2.597 = 100 %). Desde entonces la ingesta agregó ~1.992 filas nuevas, casi todas de la Câmara, **ninguna embebida**. La rama semántica de `hybridSearch` (`where embedding is not null`) simplemente **no las ve**.

- Impacto **bajo** para el usuario: 1.618 de esas 1.992 son trámite procesal BR; y ~300 son ruido `br-votacao`/`br-evento` filtrado igual. El gap sustantivo real es ~74 filas CO/UY (`decretos-presidencia-co`, `leyes-presidencia-co`, `parlamento-uy`).
- Impacto **estructural**: la brecha crece ~1.400 filas/mes por sí sola. Cualquier norma CO/UY/AR nueva queda fuera de la búsqueda semántica hasta que alguien corra el script a mano.

> **GOTCHA:** no hay automatización del embedding. Es un paso manual que hay que recordar después de cambios de corpus. Correrlo:
> ```bash
> cd /Users/alannaimtapia/dev/app-upm/server
> DATABASE_URL="<DATABASE_PUBLIC_URL de Postgres>" JWT_SECRET=dummy-de-16-o-mas npm run embed
> ```
> `loadConfig()` valida **todo** el config aunque el script solo use `DATABASE_URL` → de ahí el `JWT_SECRET` dummy. El modelo e5-small no está cacheado localmente: la primera corrida lo descarga.

> **GOTCHA CRÍTICO — pgvector fuera de las migraciones.** `server/drizzle/0000_careful_caretaker.sql` **no** crea la extensión `vector` ni las columnas `embedding vector(384)`, `content_hash`, `embedded_at`, ni el índice `normas_embedding_hnsw`. Se aplicaron **a mano** sobre la DB de producción. Verificado en prod:
> - extensiones: `vector 0.8.2`, `pg_trgm 1.6`, `unaccent 1.1`, `plpgsql 1.0`
> - índices de `normas`: `normas_pkey`, `normas_country_idx`, `normas_topic_idx`, `normas_date_idx`, `normas_fts_idx` (GIN, `to_tsvector('spanish', title || ' ' || excerpt)`), **`normas_embedding_hnsw`** → `USING hnsw (embedding vector_cosine_ops)`
>
> **Levantar una DB nueva desde cero corriendo solo `migrate()` produce un esquema SIN vector**: `npm run embed` fallará y `hybridSearch` caerá a FTS. Si vas a recrear el entorno, aplicá a mano:
> ```sql
> create extension if not exists vector;
> alter table normas add column if not exists embedding vector(384);
> alter table normas add column if not exists content_hash text;
> alter table normas add column if not exists embedded_at timestamptz;
> create index if not exists normas_embedding_hnsw on normas using hnsw (embedding vector_cosine_ops);
> ```
> (Los `add column` reproducen el estado observado; el DDL original exacto no está versionado — **verificar** contra `information_schema.columns` tras aplicarlo.)

---

## 11. Resumen de gotchas de esta área

| # | Gotcha | Dónde |
|---|---|---|
| 1 | Editar `client/public/data/*.json` sin `npm run sync-data` → cambio invisible en Railway | `util.ts:19-23` |
| 2 | Una fuente que devuelve `[]` reporta **OK**. `senado-br` y `materias-senado-br` llevan 0 filas desde siempre | `run.ts:52-83` |
| 3 | Los ítems que no pasan `isValid` se descartan **en silencio**, sin log ni contador | `run.ts:10-21` |
| 4 | La ingesta **nunca borra**: sacar una fuente del registry deja sus filas vivas (`defensoria-ar`, 10 filas huérfanas) | `run.ts` |
| 5 | Cambiar la forma del `id` de un fetcher **duplica** todo su histórico en vez de actualizarlo | `run.ts:121` |
| 6 | Ids `ar-ley-*` compartidos por 3 fuentes → gana el último del array `FETCHERS`, fila entera incluida la fecha | `registry.ts` orden |
| 7 | `deriveLeyDate` es una **estimación**. Bajo la ley 19550 extrapola mal (11.683 → 1947, real 1932); sobre el rango clampea al año actual | `hcdn-ar.ts:107` |
| 8 | `camara-br` fecha por **día de ingesta**, no por fecha de la proposición → flood BR permanente | `camara-br.ts:48` |
| 9 | Sigla BR desconocida → `'informe'`. **Nunca** cambiar ese fallback a `'ley'` | `camara-br.ts:63` |
| 10 | Los fetchers de ventana corta (30 ítems) no re-visitan el histórico: cualquier cambio de mapeo exige migración de datos | §8 |
| 11 | `noiseFilter` está **duplicado** (`feed.ts:18` como SQL de drizzle y `search.ts:8` como string raw): hay que tocar los dos | `feed.ts` / `search.ts` |
| 12 | `br-senado-vot-*` (20 filas de votaciones del Senado BR, `type: 'ley'`) **escapa** al `noiseFilter` | `votacoes-senado-br.ts` |
| 13 | 73,7 % del corpus tiene `topic = 'integracion-regional'` porque es el **fallback** de `detectTopic`, no una clasificación | `topic.ts:17` |
| 14 | 1.992 filas (43 %) **sin embedding**: el embed es manual y no corrió desde el 2026-06-20 | `embed/run.ts` |
| 15 | `vector`/`embedding`/`content_hash`/HNSW **no están en las migraciones** — DB nueva = sin semántica | `drizzle/0000_*.sql` |
| 16 | `npm run ingest` y `npm run embed` exigen `JWT_SECRET` (≥16 chars) aunque no lo usen: `loadConfig()` valida todo | `config.ts:29` |
| 17 | `postgres.railway.internal` no resuelve desde local → usar `DATABASE_PUBLIC_URL` + `ssl.rejectUnauthorized:false` | operativo |
| 18 | **Cero tests** sobre fetchers, `runIngest`, `deriveLeyDate` o `SIGLA_TO_TYPE`. `test/unit/` solo cubre `enums-sync`, `operator`, `topic` | `server/test/` |
| 19 | `ingest_runs` crece ~48 filas/día sin retención (1.712 al 2026-07-18), cada una con un `detail` jsonb de 39 reports | `index.ts:42` |
| 20 | Cada `railway up` dispara una ingesta completa de arranque (pico de ~2.000 upserts) | `index.ts:25` |

---

## 12. Trabajo pendiente identificado (sin decisión tomada)

1. **Correr `npm run embed`** para cerrar la brecha de 1.992 filas (idealmente filtrado a normas sustantivas, no a los pareceres de la Câmara).
2. **Versionar el DDL de pgvector** como migración drizzle, para que una DB nueva quede completa.
3. **Cerrar el hueco `br-senado-vot-*`** en `noiseFilter` + `NOISE_SQL`.
4. **Arreglar o quitar `senado-br` y `materias-senado-br`** (0 filas desde siempre).
5. **Subir el timeout de `fetchJson` para `camara-br`** (falla intermitente a los 15s) o hacerlo configurable por fuente.
6. **Mejorar `detectTopic`**: el fallback a `integracion-regional` vacía de sentido el filtro por tema; `rio-uruguay` y `mercosur` nunca se asignan.
7. **Purga / retención de `ingest_runs`** y decisión sobre filas huérfanas (`defensoria-ar`).
8. **Anclas adicionales en `AR_LEY_ANCHORS`** por debajo de 19550 si se amplía `LEYES_AR_LIMIT`.

> Nota de marca: el nombre "UPM" aparece hardcodeado en esta área en `util.ts:9` (User-Agent `upm-api/1.0 (+https://soyalantapia.github.io/app-upm/)`) y en labels/`source` de varios fetchers. Hay un proceso de naming en curso sin decisión final — tenerlo en cuenta al renombrar.
