# TAREA: Agregar más leyes de más fuentes oficiales al feed en vivo de app-upm

## 1. OBJETIVO Y CONTEXTO MÍNIMO

**app-upm** es una demo institucional (Vite 7 + React 19 + Tailwind 4) que muestra leyes, decretos y normas legislativas sudamericanas en un **feed "en vivo"** (Radar) que agrega ~45 fuentes oficiales de 8 países, las dedupea, rankea y cachea en `localStorage`.

- **Raíz del proyecto (cliente):** `/Users/alannaimtapia/dev/app-upm/client`
- **NO trabajes en iCloud/Desktop.** El repo real vive en `~/dev`. Trabajá siempre con rutas absolutas dentro de `/Users/alannaimtapia/dev/app-upm/client`.

**"Más leyes de más fuentes" significa, en este proyecto:**
1. Crear **fetchers nuevos** (uno por fuente oficial) que devuelvan `Promise<NewsItem[]>`.
2. Para fuentes sin API pública con CORS, crear un **archivo JSON estático** en `public/data/` con normas reales y un fetcher que lo lea. (No toda fuente nueva necesita JSON: ver §4 — las APIs live no llevan JSON.)
3. **Registrar** cada fetcher nuevo en el array `FETCHERS` del orquestador para que el feed lo consuma automáticamente.
4. El resultado visible: suben los contadores de **países / fuentes / normas** en la cinta de cobertura (`LiveCoverageBar`) y aparecen items nuevos en el Radar.

**Regla de oro:** NO rompas nada. El pipeline (dedupe, rank, cache, high-water, cleanTitle) ya existe y es automático. Tu trabajo es alimentarlo con datos que cumplan el schema EXACTO. No toques la lógica de agregación salvo el array `FETCHERS` y sus imports.

---

## 2. ARCHIVOS EXACTOS A TOCAR (rutas reales)

| Ruta | Rol | ¿Editás? |
|---|---|---|
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/index.ts` | **Orquestador**: array `FETCHERS`, imports, dedupe, rank, cache. | **SÍ** (solo imports + entradas en `FETCHERS`) |
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/<id>.ts` | **Fetcher nuevo** (uno por fuente). | **SÍ** (crear archivos nuevos) |
| `/Users/alannaimtapia/dev/app-upm/client/public/data/<id>.json` | **Datos estáticos** (solo cuando NO hay API con CORS). | **SÍ** (crear archivos nuevos) |
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/types.ts` | **Schema**: `NewsItem`, `CountryCode`, `Topic`, `DocType`, `Relevance`. | Solo lectura (NO inventar enums nuevos sin actualizar acá Y en `data.ts`) |
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/data.ts` | Enums validados: `COUNTRIES` (línea ~14), `TOPICS`. | Solo lectura (salvo que agregues un país: ver §4.5) |
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/cors-fetch.ts` | Helper `fetchWithCorsFallback(url, init?)` para APIs sin CORS (intenta directo, luego 3 proxies). | Solo lectura (importás de acá) |
| `/Users/alannaimtapia/dev/app-upm/client/src/lib/use-live-feed.ts` | Hook consumer (`useLiveFeed`). **Existe en `src/lib/`, NO en `src/hooks/`. NO se toca.** | NO |
| `/Users/alannaimtapia/dev/app-upm/client/src/components/LiveCoverageBar.tsx` | Cinta de cobertura (high-water marks). **NO se toca.** | NO |

**ANTES de escribir nada**, leé estos archivos reales para confirmar líneas exactas y patrones vigentes:
- `src/lib/sources/index.ts` (imports líneas 1–46; array `FETCHERS` empieza en línea 155; tipo `Fetcher` línea 148).
- Un fetcher JSON wrapped de referencia: `src/lib/sources/senado-ar.ts` (patrón canónico de este prompt) o `src/lib/sources/asamblea-bo.ts`.
- Un fetcher de **API live** de referencia (sin JSON): `src/lib/sources/socrata-co.ts` o `src/lib/sources/congreso-cl.ts`.
- JSONs de referencia (notar que cada uno tiene **campos distintos**): `public/data/senado-ar.json`, `public/data/defensoria-ar.json`, `public/data/csjn-ar.json`, `public/data/infoleg-ar.json`.
- `src/lib/types.ts` (tipo `NewsItem` líneas 72–96 y enums líneas 1–43).
- `src/lib/sources/cors-fetch.ts` (firma de `fetchWithCorsFallback`).
- `src/lib/citations.ts` (líneas 58–62: patrones de `id` que el grafo de citaciones reconoce).

---

## 3. SCHEMA EXACTO QUE CADA REGISTRO DEBE CUMPLIR

Cada item del feed es un `NewsItem`. Campos **obligatorios**: `id, title, country, topic, type, date, relevance, excerpt, source`. El resto son opcionales.

```typescript
export type NewsItem = {
  id: string            // ÚNICO y ESTABLE en TODO el feed. Patrón: `${pais}-${fuente}-${idInterno}`
  title: string         // no vacío, .trim()
  country: CountryCode  // ver enum abajo
  topic: Topic          // ver enum abajo
  type: DocType         // ver enum abajo
  date: string          // EXACTO 'YYYY-MM-DD' (zero-padded). Inválido: '2026-5-8', '08/05/2026'
  relevance: Relevance  // 'alta' | 'media' | 'baja'
  excerpt: string       // no vacío; si >600 chars → slice(0,597)+'…'
  source: string        // label legible, ej: 'Honorable Senado de la Nación · Argentina'
  // opcionales:
  fullText?: string
  authors?: string
  status?: string
  tipoDocumento?: string
  tipoConteudo?: string
  keywords?: string[]
  sourceUrl?: string
  pdfUrl?: string
  dataPublicacao?: string
  dataAtualizacao?: string
  apiDetailUrl?: string
  comision?: string
  tramitaciones?: { fecha: string; descripcion: string; organo?: string; despacho?: string }[]
}
```

> **IMPORTANTE — distinguí dos `id` distintos:**
> - **`NewsItem.id`** (el del schema de arriba, en el JSON y en lo que devuelve el fetcher): es por-norma. Ej: `'ar-senado-s-2026-1245'`, `'cl-bcn-2026-003'`.
> - **`Fetcher.id`** (el del array `FETCHERS` en `index.ts`): es por-fuente, identifica el fetcher completo. Ej: `'senado-ar'`, `'bcn-cl'`.
> NO los confundas: un fetcher (id `'senado-ar'`) produce muchos `NewsItem` con ids como `'ar-senado-s-2026-1245'`.

**Valores válidos (enums cerrados — minúsculas, sin acentos donde se indica; usar `as const` en TS):**

- **`CountryCode`** (8): `'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'`
  → Si agregás un país NUEVO (ej. Ecuador `'EC'`), DEBÉS actualizar `types.ts` y `data.ts` (ver §4.5). **`'PE'` (Perú) ya existe en el enum pero NO tiene ningún fetcher client-side todavía: sumar Perú NO requiere §4.5.**
- **`Topic`** (12, exactos, minúscula con guiones): `'ambiente' | 'integracion-regional' | 'corredores-bioceanicos' | 'genero' | 'educacion' | 'salud' | 'energia' | 'rio-uruguay' | 'mercosur' | 'rrii' | 'seguridad' | 'economia-regional'`
  → Fallback si no detectás nada claro: `'integracion-regional'`.
- **`DocType`** (9 valores EXACTOS, en español, minúscula, sin acentos, sin plural): `'ley'` · `'decreto'` · `'reglamento'` · `'informe'` · `'acta'` · `'convenio'` · `'comunicado'` · `'minuta'` · `'dossier'`.
  → Inválidos: `'Ley'`, `'LEY'`, `'leyes'`, `'decretos'`, `'resolucion'`. Si la fuente dice "Resolución", mapeá a `'reglamento'`; si dice "Acuerdo/Tratado", a `'convenio'`.
- **`Relevance`** (3): `'alta' | 'media' | 'baja'`

**Estructura de los JSON estáticos — HAY DOS PATRONES REALES, ambos válidos. El fetcher es quien mapea cada uno a `NewsItem`:**

**Patrón A — "wrapped"** (objeto con metadatos + `items`). Ej: `defensoria-ar.json`, `senado-ar.json`, `asamblea-bo.json`, `csjn-ar.json`. **OJO: los nombres de campo dentro de `items` NO son universales** — cada fuente usa los suyos (`ementa`, `sumario`, `area`, `comision`, `organo`, `sala`, etc.). Vos definís los campos del JSON nuevo y los mapeás en el fetcher; no existe un set de campos obligatorio más allá de que puedas derivar los 9 campos requeridos de `NewsItem`.
```json
{
  "fuente": "Nombre Oficial del Organismo · País",
  "url": "https://organismo.gob.xx",
  "fetchedAt": "2026-06-07",
  "items": [
    {
      "id": "xx-fuente-2026-001",
      "tipoDocumento": "Ley N° 1234",
      "title": "TÍTULO LEGIBLE CON CONTEXTO",
      "fecha": "2026-05-19",
      "area": "Área temática u órgano",
      "ementa": "Resumen/cuerpo de la norma, 200–600 caracteres."
    }
  ]
}
```

**Patrón B — "direct array"** (array plano en la raíz, sin wrapper). Ej: `infoleg-ar.json` (`{id, tipo, numero, titulo, sumario, texto, fecha, ...}`), `leyes-uy.json` (`{Fecha, Numero_de_Ley, Titulo, textoCompleto, ...}`), `hcdn-exp.json` (`{expediente, numero, titulo, ...}`). Igual de válido; el fetcher hace `(await res.json()) as Row[]` y mapea.
```json
[
  { "id": "425307", "tipo": "Decreto", "titulo": "...", "sumario": "...", "fecha": "2026-04-29" }
]
```

Para fuentes nuevas, recomiendo **Patrón A** por legibilidad, salvo que copies un dump real que ya venga como array plano. Lo único innegociable es que el fetcher produzca `NewsItem[]` válidos.

---

## 4. PLAN PASO A PASO (literal)

### Paso 1 — Crear el archivo de datos JSON (solo cuando NO haya API con CORS)
Creá `/Users/alannaimtapia/dev/app-upm/client/public/data/<id>.json` con el Patrón A (wrapped) de §3. Poné entre **8 y 15 normas reales** por fuente (busca normas reales recientes 2025–2026 de cada organismo; usá títulos, números de ley/decreto y resúmenes verídicos, fechas `YYYY-MM-DD`).
- Cada `id` interno (= `NewsItem.id`) único dentro del archivo Y único en todo el feed, con prefijo `pais-fuente` (ej. `cl-bcn-2026-003`).
- Texto/resumen de 200–600 chars, en español, sin HTML.

> **Ubicación crítica (evita 404 silenciosos):** el JSON va SIEMPRE en `public/data/<id>.json`, nunca en `public/<base>/data/`. En dev (`localhost:5173`) `BASE_URL` es `/` y el archivo se sirve en `/data/<id>.json`. Pero esta app se despliega bajo subdirectorio (GitHub Pages, ej. base `/app-upm/`): ahí `import.meta.env.BASE_URL` será `/app-upm/` y el fetcher pedirá `/app-upm/data/<id>.json` **automáticamente**. Vite copia `public/` a la raíz del build, así que el archivo en `public/data/` se sirve correcto en ambos casos. NO crees `public/app-upm/data/` ni hardcodees el base; usá el patrón `PUBLIC_BASE` del Paso 2 y vas a estar bien en dev y en prod.

### Paso 2 — Crear el fetcher TypeScript
Creá `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/<id>.ts`. **Template canónico para fuente JSON estática (Patrón A), calcado de `senado-ar.ts`:**

```typescript
import type { DocType, NewsItem, Relevance, Topic } from '@/lib/types'

// Tipo de la fila TAL CUAL está en tu JSON. Ajustá los nombres de campo a los
// que vos hayas puesto en public/data/<id>.json (no hay set universal).
type Row = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  area: string
  ementa: string
}
type SourceData = { fuente: string; url: string; fetchedAt: string; items: Row[] }

// Respeta el subpath en GitHub Pages (BASE_URL = '/app-upm/' en prod, '/' en dev).
const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/<id>.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|bosque|humedal|clima|residuo/i.test(t)) return 'ambiente'
  if (/corredor|bioceánic|bioceanic|ferrovi/i.test(t)) return 'corredores-bioceanicos'
  if (/género|genero|mujer|paridad|femicid/i.test(t)) return 'genero'
  if (/educac|escolar|universi/i.test(t)) return 'educacion'
  if (/salud|hospital|sanitari|medicament/i.test(t)) return 'salud'
  if (/energ|electric|petról|petrol|gas|litio|renovable/i.test(t)) return 'energia'
  if (/río uruguay|rio uruguay|caru/i.test(t)) return 'rio-uruguay'
  if (/mercosur/i.test(t)) return 'mercosur'
  if (/segurid|narco|fronter|polic/i.test(t)) return 'seguridad'
  if (/comercio|arancel|exportac|economía regional|economia regional|pyme/i.test(t)) return 'economia-regional'
  if (/tratado|cancill|diplom|relaciones internacionales/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectType(tipoDocumento: string): DocType {
  const t = tipoDocumento.toLowerCase()
  if (/decreto/.test(t)) return 'decreto'
  if (/reglament|resoluci/.test(t)) return 'reglamento'
  if (/convenio|tratado|acuerdo/.test(t)) return 'convenio'
  if (/informe|dictamen/.test(t)) return 'informe'
  if (/acta/.test(t)) return 'acta'
  return 'ley'
}

function detectRelevance(area: string): Relevance {
  if (/sancionad|promulgad|aprobad|vigente/i.test(area)) return 'alta'
  return 'media'
}

export async function fetch<NombreFuente>(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  try {
    const res = await fetch(DATA_URL, { signal: opts?.signal })
    if (!res.ok) throw new Error(`<Fuente> data error: ${res.status}`)
    const data = (await res.json()) as SourceData
    return data.items.slice(0, limit).map(row => ({
      id: row.id,                                   // NewsItem.id (por-norma), no el Fetcher.id
      title: row.title,
      country: '<XX>' as const,                     // CountryCode válido, ej. 'CL'
      topic: detectTopic(row.title + ' ' + row.ementa),
      type: detectType(row.tipoDocumento),
      date: row.fecha,
      relevance: detectRelevance(row.area),
      excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
      source: '<Institución> · <País>',
      fullText: row.ementa,
      tipoDocumento: row.tipoDocumento,
      authors: row.area,
      dataPublicacao: row.fecha,
      sourceUrl: '<URL oficial>',
    }))
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') throw e
    throw new Error(`<Fuente> fetch failed: ${String(e).slice(0, 100)}`)
  }
}
```

**Para fuente con API real sin CORS:** importá `fetchWithCorsFallback` desde `./cors-fetch` (intenta directo y, si CORS falla, reintenta con 3 proxies públicos) en vez de `fetch`, y mapeá la respuesta de la API a `NewsItem[]` con el mismo criterio. **Estas fuentes NO llevan JSON estático.** Mirá `socrata-co.ts` o `congreso-cl.ts` como referencia. Si la API falla, dejá que el fetcher tire error (el orquestador lo captura y marca la fuente como `ok:false` sin romper el feed).

### Paso 3 — Registrar el fetcher en el orquestador
En `/Users/alannaimtapia/dev/app-upm/client/src/lib/sources/index.ts`:

**(a)** Agregá el import junto a los otros imports de fetchers. Los imports ocupan las líneas 1–46; tu import nuevo va en la **línea 47 o siguiente** (justo después del último import de fetcher, antes de `export type SourceStatus`):
```typescript
import { fetch<NombreFuente> } from './<id>'
```

**(b)** Agregá una entrada al array `FETCHERS` (empieza en línea 155, respetá el tipo `Fetcher` de línea 148):
```typescript
{ id: '<id>', label: '<Institución> · <País>', country: '<XX>', fn: ({ signal }) => fetch<NombreFuente>({ limit: 30, signal }) },
```
- `id` = **`Fetcher.id`**, único y representativo por fuente (ej. `'bcn-cl'`, `'impo-uy-decretos'`). NO es el `NewsItem.id`.
- `label` legible, <80 chars.
- `country` un `CountryCode` válido.

### Paso 4 — Auto-hook (no se toca nada más)
Listo. `fetchLiveFeed()` ejecuta TODOS los `FETCHERS` en paralelo, emite progresivamente, dedupea por `id`, rankea y cachea. `use-live-feed.ts` (hook `useLiveFeed`, en `src/lib/`) y `LiveCoverageBar.tsx` NO requieren cambios.

### Paso 5 — (Solo si agregás un PAÍS nuevo, ej. Ecuador `'EC'`)
1. En `types.ts` (línea 1–2): agregá el código al union `CountryCode` → `... | 'EC'`.
2. En `data.ts` (array `COUNTRIES`, ~línea 14): agregá → `{ code: 'EC', name: 'Ecuador', flag: '🇪🇨' }`.
3. Recién entonces podés usar `country: 'EC'` en los fetchers.
   → **Perú `'PE'` ya existe en el enum (línea 21 de `data.ts`), NO requiere este paso** aunque hoy no tenga fetchers client-side.

---

## 5. RESTRICCIONES DURAS (para no romper)

1. **`NewsItem.id` único y estable.** Si dos items comparten `id`, `dedupe()` (index.ts línea 121) borra el segundo en silencio. Usá prefijo `pais-fuente`. NO cambies el `id` entre refetches.
2. **`date` EXACTO `YYYY-MM-DD` zero-padded.** El ranking ordena con `localeCompare` de strings (index.ts línea 144); un formato distinto rompe el orden cronológico.
3. **Enums cerrados.** `country`, `topic`, `type`, `relevance` deben matchear EXACTAMENTE los valores de §3 (minúsculas, sin acentos, sin plural). `type` solo acepta los 9 `DocType`. Usá `as const`. Inventar un valor = filtros y contadores rotos + error de `tsc`.
4. **`title` y `excerpt` no vacíos** (`.trim()`). Si una fila no tiene contenido, descartala (`return null` + `.filter(Boolean)` o `.filter((x): x is NewsItem => x !== null)`), no la metas vacía.
5. **`excerpt` ≤ 600 chars**: truncá con `slice(0,597)+'…'`.
6. **No mock en el feed real.** Si el fetch falla, tirá error o devolvé `[]`. Nunca hardcodees data demo como fallback (el orquestador ya muestra EmptyState si todo falla; nunca mezcla mock).
7. **Respetá `AbortSignal`.** Pasá `opts.signal` al `fetch` y re-lanzá `AbortError` tal cual (no lo envuelvas) — ver el `catch` del template.
8. **No toques** `dedupe`, `rank`, el cache, `cleanTitle`/`deShout`/`translatePtEs`, ni los high-water marks de `LiveCoverageBar`. Son automáticos: `cleanTitle` normaliza MAYÚSCULAS y PT→ES en render; los contadores nunca bajan (toman `Math.max` histórico).
9. **Auto-referencia en citations (citations.ts líneas 58–62):** el grafo de citaciones reconoce ids con patrón EXACTO `ar-ley-<num>`, `uy-ley-<num>`, `ar-ley-infoleg-<num>` (num de 4–5 dígitos). Si tu norma es una **ley argentina o uruguaya** y querés que el grafo la enganche, usá ese patrón de `id`. **Si NO** (otro país, o no querés engancharla), usá un prefijo distinto (`cl-bcn-...`, `pe-elperuano-...`) para evitar colisiones accidentales.
10. **`fetchLiveLaws()`** (index.ts línea 308, endpoint derivado) solo conserva `type ∈ {ley, decreto, reglamento, informe}`. Elegí bien el `type` según intención.

---

## 6. FUENTES NUEVAS REALES A SUMAR (por país)

Para cada fuente indico **país · institución · tipo de norma** y si conviene **JSON estático** o **API live**. Regla general: **JSON estático** (Patrón A + 8–15 normas reales) salvo que confirmes que la API tiene CORS abierto, en cuyo caso usá `fetchWithCorsFallback` y NO crees JSON. Recordá: Colombia hoy ya está cubierta enteramente con **APIs live** (`socrata-co`, `vista-co`, `votaciones-co`, `presidencia-co`, etc.) sin JSON; Perú está en el enum pero **sin ningún fetcher**.

**Argentina (AR) — reforzar:**
- AR · **Boletín Oficial de la República Argentina** (boletinoficial.gob.ar) · leyes y decretos publicados (`type: 'ley'`/`'decreto'`) · **JSON estático**.
- AR · **Corte Suprema de Justicia de la Nación (CSJN)** · sumarios/acordadas (`'informe'`/`'acta'`) · **JSON estático**. **Ya existe `public/data/csjn-ar.json` (Patrón A, con campos `sala`, `ley`, `sumario`) pero NO tiene fetcher ni entrada en `FETCHERS`: creá el fetcher `csjn-ar.ts` que lo lea y registralo.**
- AR · **InfoLEG temático** · si ya existe `infoleg-ar`, NO dupliques; sumá una variante temática (ambiente/energía) solo con `Fetcher.id` distinto si querés.

**Chile (CL) — reforzar:**
- CL · **Diario Oficial de Chile** (diariooficial.interior.gob.cl) · normas promulgadas (`'ley'`/`'decreto'`) · **JSON estático**.
- CL · **Senado / Cámara de Diputadas y Diputados** · proyectos de ley en trámite (`'ley'`) · **JSON estático**. (Ya existe `congreso-cl` / BCN; usá `Fetcher.id` y `NewsItem.id` distintos.)

**Uruguay (UY) — reforzar:**
- UY · **IMPO – decretos recientes** · si ya existe `impo-uy`, sumá variante con `Fetcher.id` e ids de norma distintos · **JSON estático**.
- UY · **Parlamento del Uruguay** · ya existe `parlamento-uy`; solo sumá si aportás normas con ids nuevos.

**Bolivia (BO) — reforzar:**
- BO · **Gaceta Oficial del Estado Plurinacional** (gacetaoficialdebolivia.gob.bo) · leyes y decretos supremos (`'ley'`/`'decreto'`) · **JSON estático**.
- BO · **Cámara de Senadores** · proyectos (`'ley'`) · **JSON estático** con `Fetcher.id` distinto a `asamblea-bo`.

**Perú (PE) — país en el enum pero SIN fetchers (no requiere §4.5):**
- PE · **El Peruano – Diario Oficial** (busquedas.elperuano.pe) · leyes y decretos supremos (`'ley'`/`'decreto'`) · **JSON estático**.
- PE · **Congreso de la República del Perú** (congreso.gob.pe) · proyectos y leyes aprobadas (`'ley'`) · **JSON estático**.
- Prefijo de `NewsItem.id`: `pe-elperuano-...`, `pe-congreso-...`.

**Ecuador (EC) — país NUEVO (requiere §4.5):**
- EC · **Registro Oficial del Ecuador** (registrooficial.gob.ec) · leyes y decretos ejecutivos (`'ley'`/`'decreto'`) · **JSON estático**.
- EC · **Asamblea Nacional del Ecuador** (asambleanacional.gob.ec) · proyectos de ley (`'ley'`) · **JSON estático**.
- Antes de usar `country: 'EC'`: agregá `'EC'` a `CountryCode` en `types.ts` y `{ code: 'EC', name: 'Ecuador', flag: '🇪🇨' }` a `COUNTRIES` en `data.ts`.

> Para cada fuente: normas **reales y verificables** (títulos, números de ley/decreto y fechas verídicas recientes, 2025–2026). `NewsItem.id` globalmente único con prefijo `pais-fuente`. 8–15 items por fuente. Si una fuente ya existe en `FETCHERS`, NO la dupliques: o sumás normas nuevas a su JSON, o creás un fetcher con `Fetcher.id` distinto.

---

## 7. VERIFICACIÓN (obligatoria antes de dar por terminado)

Ejecutá, en este orden, desde la raíz del cliente. **Usá rutas absolutas; no dependas del cwd entre comandos.** Si el repo está recién clonado (sin `node_modules`), corré primero la instalación:

```bash
# 0. Instalar dependencias (solo si node_modules no existe)
cd /Users/alannaimtapia/dev/app-upm/client && [ -d node_modules ] || npm install

# 1. Typecheck estricto
cd /Users/alannaimtapia/dev/app-upm/client && npx tsc --noEmit

# 2. Build de producción (debe pasar sin errores)
cd /Users/alannaimtapia/dev/app-upm/client && npm run build

# 3. Tests unitarios (si existe config de vitest)
cd /Users/alannaimtapia/dev/app-upm/client && npx vitest run
```

1. **tsc + build verdes.** Si `tsc` se queja de `country`/`topic`/`type`/`relevance`, casi siempre es un valor fuera del enum o falta el `as const`. Corregilo, no fuerces con `any`.
2. **Validación de cada JSON nuevo:** confirmá que parsea como JSON válido **y** que toda `fecha`/`date` matchea `YYYY-MM-DD`. Comando (ajustá el nombre del campo de fecha a tu JSON; `fecha` en Patrón A wrapped, `date`/`Fecha` según corresponda):
   ```bash
   # JSON válido
   cd /Users/alannaimtapia/dev/app-upm/client && for f in public/data/<id>.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('OK', '$f')"; done
   # Toda fecha en formato YYYY-MM-DD (no debe imprimir NINGUNA línea con fecha mal formada):
   cd /Users/alannaimtapia/dev/app-upm/client && grep -oE '"fecha": *"[^"]*"' public/data/<id>.json | grep -vE '"fecha": *"[0-9]{4}-[0-9]{2}-[0-9]{2}"' || echo "Todas las fechas OK"
   ```
   La segunda línea NO debe encontrar matches (`grep` con `|| echo` imprime "Todas las fechas OK" si está limpio).
3. **Levantá la app y revisá el Radar visualmente:**
   ```bash
   cd /Users/alannaimtapia/dev/app-upm/client && npm run dev
   ```
   - En la **cinta de cobertura (`LiveCoverageBar`)**: deben **subir** los contadores de **fuentes** (cantidad de `SourceReport` con `ok:true`) y de **normas** (total de items). Si agregaste país nuevo, debe aparecer su contador por país.
   - En el **Radar/feed**: deben aparecer items de las fuentes nuevas (filtrá por país o buscá por término de la norma).
   - En el reporte de fuentes, cada fetcher nuevo debe figurar con `ok: true` y `count > 0`. Si aparece `ok: false`, leé el `error` (CORS, 404 — típicamente JSON mal ubicado, ver §4 Paso 1 —, o JSON mal formado) y corregí.
   - **Tip:** para forzar refetch sin esperar el cache, limpiá `localStorage` (key `upm.live-feed.v2`) o usá el botón de refresh del feed.
4. **Checklist final por cada fuente agregada:**
   - [ ] Fetcher creado en `src/lib/sources/<id>.ts`, exporta `Promise<NewsItem[]>`.
   - [ ] (Solo si es JSON estático) JSON en `public/data/<id>.json` válido, 8–15 normas reales, fechas `YYYY-MM-DD`, ubicado en `public/data/` (NO bajo subdirectorio).
   - [ ] (Si es API live) usa `fetchWithCorsFallback`, SIN JSON estático.
   - [ ] Import agregado en `index.ts` (línea 47+).
   - [ ] Entrada agregada al array `FETCHERS` con `Fetcher.id`/`label`/`country`/`fn` correctos.
   - [ ] `country/topic/type/relevance` dentro de los enums (con `as const`); `type` es uno de los 9 `DocType`.
   - [ ] `NewsItem.id` globalmente únicos con prefijo `pais-fuente`, distintos del `Fetcher.id`.
   - [ ] Si es ley AR/UY y querés grafo de citaciones: `id` con patrón `ar-ley-<num>`/`uy-ley-<num>`; si no, prefijo propio.
   - [ ] `tsc --noEmit`, `npm run build` y `vitest run` verdes.
   - [ ] La fuente aparece en el feed con `ok: true` y suben los contadores de la cinta.

**No commitees ni pushees** salvo que se te pida explícitamente. Si lo hacés, NUNCA a `main` directo: usá una rama (ej. `feat/mas-fuentes-leyes`).
