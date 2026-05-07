# Handoff — Asistente AI UPM

Prompt completo para continuar el proyecto en otro agente. Copialo y mandáselo tal cual.

---

## Contexto del proyecto

Estás trabajando en **Asistente AI UPM** — una demo institucional para la Unión Parlamentaria del Mercosur (UPM). Es una webapp para legisladores de Argentina, Brasil, Uruguay, Paraguay, Chile, Bolivia, Perú y Colombia que integra:

- Radar normativo regional con datos en vivo de los congresos
- Biblioteca de leyes sancionadas con texto íntegro
- Asistente AI conversacional con respuestas pre-armadas
- Mi carpeta privada (guardados, briefs, minutas)
- Flow de venta completo (Signup → Checkout → Confirmación)

El producto se vende como **membresía premium USD 100/mes** a parlamentarios de la región.

### Repo y URLs

- **Repo GitHub**: https://github.com/soyalantapia/app-upm (público)
- **Producción**: https://soyalantapia.github.io/app-upm/
- **Local**: `~/dev/app-upm/`
- **Branch principal**: `main`. Branch de deploy: `gh-pages` (auto-generada con `dist/` + `.nojekyll`).

### Stack

- Vite 7 + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@theme inline` en `index.css`)
- React Router DOM 7 con **HashRouter** (deploy estático en GitHub Pages)
- vite-plugin-pwa
- Inter (Fontshare) + Lucide icons
- Estado en `localStorage` con `useSyncExternalStore`
- **No backend** — fetch directo a APIs gubernamentales públicas

### Cómo correr local

```bash
cd ~/dev/app-upm/client
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run dev
# → http://127.0.0.1:5181/app-upm/
```

⚠️ **Node 22 obligatorio** (no v25+). El path está configurado en `.claude/launch.json` del workspace.

### Cómo deployar

```bash
cd ~/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx vite build
cd ~/dev/app-upm && git add -A && git commit -m "..." && git push origin main

# Deploy gh-pages:
rm -rf /tmp/upm-pages && cp -R ~/dev/app-upm/client/dist /tmp/upm-pages
cd /tmp/upm-pages && touch .nojekyll && git init -b gh-pages
git add -A && git -c commit.gpgsign=false -c user.email=alannaimtapia@gmail.com -c user.name=soyalantapia commit -m "Deploy"
git remote add origin https://github.com/soyalantapia/app-upm.git
git push -f origin gh-pages
# Esperar ~30 segundos a que GitHub Pages compile
```

---

## Pantallas y rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/login` | `pages/Login.tsx` | Acceso institucional con form, demo, crear cuenta |
| `/registro` | `pages/Signup.tsx` | Hero de venta + form datos personales |
| `/checkout` | `pages/Checkout.tsx` | Form pago mock con tarjeta pre-cargada (4242...) |
| `/cuenta-activada` | `pages/AccountActivated.tsx` | Confirmación + CTA "Empezar a usar UPM" |
| `/onboarding` | `pages/Onboarding.tsx` | 3 pasos: países / temas / frecuencia |
| `/` | `pages/Home.tsx` | Tablero: hero, stats clickeables, alerta urgente, novedades, doc recomendado |
| `/asistente` | `pages/Assistant.tsx` | Chat con welcome + 4 capabilities + 3 sugerencias + acciones inline (copiar/guardar/brief/minuta/regenerar/historial) |
| `/radar` | `pages/Radar.tsx` | Feed live con filtros colapsables, stats por fuente, sort, badge "EN VIVO" |
| `/radar/:id` | `pages/NewsConversation.tsx` | Detalle de novedad con texto completo + metadata + único CTA "Hablar con Asistente" |
| `/leyes` | `pages/Laws.tsx` | Lista lateral de leyes sancionadas + detalle con sumario íntegro + keywords + Hablar con Asistente |
| `/biblioteca` | `pages/Library.tsx` | 8 categorías (Convenios, Actas, etc.) + filtros + Drawer detalle + banner "En vivo" con últimos proyectos |
| `/carpetas` | `pages/Folders.tsx` | Carpetas + Guardados (lista plana con badge tipo + carpeta) |
| `/perfil` | `pages/Profile.tsx` | Identidad + drawer "Editar perfil" + preferencias + membresía Premium |

Los modales/drawers globales viven en `lib/ui-provider.tsx`:
- `<DocumentDetailDrawer>` — abre con `openDocument(idOrDoc)`
- `<CreateNoteModal>` — abre con `openCreateMinuta()` o `openCreateBrief()`

---

## Live feed — APIs reales integradas

**5 fuentes oficiales con CORS abierto** que se traen directo desde el browser:

| Fuente | País | Endpoint | Schema | Items |
|---|---|---|---|---|
| **Câmara dos Deputados** | 🇧🇷 BR | `dadosabertos.camara.leg.br/api/v2/proposicoes` | `{dados: [{id, siglaTipo, numero, ano, ementa}]}` | 30 |
| **Senado Federal** | 🇧🇷 BR | `legis.senado.leg.br/dadosabertos/processo?ano=YYYY` | Array directo de procesos con ementa, autoria, urlDocumento | 30 |
| **HCDN Argentina** | 🇦🇷 AR | `/data/leyes-ar.json` (embebido, 1.3MB) | `[{ley, titulo, sumario, referencias}]` | 20 |
| **Senado Colombia** | 🇨🇴 CO | `datos.gov.co/resource/feim-cysj.json` con `$where=estado!='LEY'` | `[{n_senado, titulo, autor, f_presentado, comision, estado}]` | 25 |
| **Leyes Sancionadas Colombia** | 🇨🇴 CO | `datos.gov.co/resource/feim-cysj.json` con `$where=estado='LEY'` | igual que arriba | 30 |
| **TOTAL** | | | | **135 ítems live** |

### Arquitectura del feed

```
src/lib/sources/
├── camara-br.ts          # Fetcher Câmara + enrichCamaraItem
├── senado-br.ts          # Fetcher Senado
├── hcdn-ar.ts            # Lee /public/data/leyes-ar.json
├── socrata-co.ts         # fetchProyectosColombia + fetchLeyesColombia
├── cors-fetch.ts         # fetchWithCorsFallback (proxies fallback)
└── index.ts              # FETCHERS array + fetchLiveFeed con scoring + cache 30 min
```

### Cómo se conecta a las pantallas

**Radar y Library** usan `useLiveFeed(prefs)` (en `lib/use-live-feed.ts`):
- Auto-refresh cada 5 min
- Cache localStorage 30 min (`upm.live-feed.v2`)
- Scoring: relevance + match con prefs del user → items relevantes al tope
- Fallback a mock si todas las fuentes fallan
- Status `live` / `mixed` / `mock` mostrado como badge

**NewsConversation** usa `useNewsItem(id)` (en `lib/use-news-item.ts`):
- Resuelve item del feed por id
- **Enriquecimiento on-demand para Câmara BR**: dispara `enrichCamaraItem()` que llama `/proposicoes/{id}` + `/proposicoes/{id}/autores` y mete: ementaDetalhada, autores con partido y UF, statusProposicao, urlInteiroTeor (PDF oficial), keywords

**Laws** filtra el feed con `isSanctionedLaw()`:
- `id.startsWith('ar-ley-')` — leyes nacionales argentinas
- `id.startsWith('co-ley-')` — proyectos colombianos sancionados (estado='LEY')
- Excluye proyectos en trámite de Brasil

### Schema del NewsItem

```ts
type NewsItem = {
  id: string                    // ej. 'br-camara-2622789', 'ar-ley-27541', 'co-proyecto-034/22'
  title: string
  country: 'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'
  topic: Topic                  // 'ambiente' | 'integracion-regional' | etc.
  type: DocType                 // 'ley' | 'decreto' | 'reglamento' | 'informe' | etc.
  date: string                  // ISO YYYY-MM-DD
  relevance: 'alta' | 'media' | 'baja'
  excerpt: string               // 280 chars máx (lo que se muestra en cards del Radar)
  source: string                // ej. 'Câmara dos Deputados — Brasil (PL)'

  // Campos opcionales para detalle
  fullText?: string             // texto íntegro (sumario, ementa completa)
  authors?: string              // autoría (legislador, comisión)
  status?: string               // estado de tramitación
  tipoDocumento?: string        // PL, PEC, MP, RQN, etc.
  tipoConteudo?: string         // 'Norma Geral', etc.
  keywords?: string[]           // del campo referencias o equivalente
  sourceUrl?: string            // URL del PDF/documento oficial
  pdfUrl?: string
  dataPublicacao?: string
  dataAtualizacao?: string
  apiDetailUrl?: string         // endpoint para enrich on-demand (solo Câmara)
}
```

---

## Decisiones técnicas importantes

1. **HashRouter, no BrowserRouter** — porque GitHub Pages no soporta SPA routing server-side.

2. **No usamos `bg-bg` como utility de Tailwind** — el CSS variable `--color-bg` no genera utility automática en Tailwind v4. Usar `bg-white` o `style={{ backgroundColor: '#f6f8fb' }}` cuando necesitás el bg base.

3. **Hooks order estable** — `useLiveFeed` recibe `prefs` como parámetro (no llama `useStore` internamente) para evitar Rules of Hooks. Patrón: el componente hace `const prefs = useStore(s => s.prefs)` y pasa el resultado.

4. **`useMemo` con `NEWS` en deps** — cuando el feed cambia, los componentes que filtran (Radar, Laws) deben tener el array completo en deps del useMemo.

5. **CORS fallback** — `fetchWithCorsFallback` intenta 3 proxies: codetabs, corsproxy.io, allorigins. Pero los proxies fallan con payloads >1MB, por eso HCDN AR está embebido en `/public/data/leyes-ar.json`.

6. **Drawer/Modal con `flex` no `grid`** — `grid place-items-center` rompe `w-full max-w` en mobile. Usar `flex items-center justify-center`.

7. **NotificationsBell con `createPortal`** — el bell vive dentro del aside con `backdrop-blur` que crea stacking context. Render del dropdown vía portal a `document.body` con `position: fixed` y posición calculada por `getBoundingClientRect`.

8. **Tarjeta demo del checkout pre-cargada** — `4242 4242 4242 4242 / 12/28 / 123` para que el botón Confirmar canje arranque activo.

9. **Cliente Argentina con archivo local** — `datos.hcdn.gob.ar` no tiene CORS abierto y los proxies públicos rechazan el JSON de 1.3MB. Solución: descargar una vez (script en commit `d5c9b79`) y servir desde `client/public/data/leyes-ar.json`. El cliente usa `import.meta.env.BASE_URL` para respetar el subpath `/app-upm/` de GitHub Pages.

10. **Backend listo pero no deployado** — en `/worker/` hay un Cloudflare Worker completo con README para deployar (5 min, gratis). Soportaría las fuentes sin CORS (UY, PY, BO, PE) y cache edge global. Setear `VITE_UPM_API_URL=...workers.dev` en `.env.production` para activarlo.

---

## Diseño y UX

- **Paleta UPM**: azul institucional `#062B4D` (deep) → `#2F80ED` (acento). Sin violeta Deenex.
- **Tipografía**: Inter desde `rsms.me/inter/inter.css`.
- **Light only** — no hay dark mode. `color-scheme: light !important`.
- **Rounded agresivo**: `rounded-2xl` (16px) mínimo, `rounded-3xl` (24px) para cards principales, `rounded-full` para botones pill.
- **Glass cards** con `bg-white/85 backdrop-blur` para overlays.
- **Silueta de Sudamérica decorativa** en `components/SouthAmerica.tsx` con SVG + nodos de integración.
- **Empty states amigables** — ej. notifs vacías muestran "Tu radar está al día" en vez de "Sin notificaciones".
- **Mobile-first** — el bottom nav tiene 5 items, header compacto con brand + search + bell + avatar.
- **Auto-scroll-to-top** al cambiar de ruta.
- **⌘K / `/`** abren búsqueda global (rutas + novedades + documentos).

---

## Lo que YA está hecho — no rehacer

✅ Login, Signup, Checkout, AccountActivated (flow de venta completo)
✅ Onboarding 3 pasos
✅ Tablero con stats clickeables, alerta urgente, doc recomendado
✅ Asistente con 4 capabilities + sugerencias + historial conversaciones + copiar/guardar/brief/minuta/regenerar
✅ Radar con feed live de 5 fuentes, filtros colapsables, sort, stats por fuente, badge En vivo
✅ NewsConversation con texto completo + metadata oficial + enrich Câmara + link PDF
✅ Leyes con feed live filtrado a sancionadas, buscador entre 1194+ items, sumario íntegro, keywords
✅ Biblioteca con 8 categorías + filtros + Drawer detalle + banner En vivo
✅ Mi carpeta con Carpetas + Guardados + mover/eliminar
✅ Perfil con Editar drawer (updateOperator persiste)
✅ NotificationsBell con portal, badge unread, empty state, click navega
✅ Búsqueda global ⌘K con rutas + novedades + docs
✅ Mobile responsive
✅ Cloudflare Worker código en `/worker/` con README

---

## 🎯 Próximo paso

**Hacer que las descripciones de Radar y Leyes sean más largas y completas.**

### Problema actual

En las cards del **Radar** (lista) y **Leyes** (lista lateral), el `excerpt` se trunca a **280 caracteres** en `cards.line-clamp-2`. El usuario ve solo 2 líneas y necesita más contexto antes de decidir si abrir el detalle.

Lo mismo en la vista de detalle (`NewsConversation` y `Laws` panel derecho): el `fullText` muchas veces es solo el sumario corto, no toda la información disponible que las APIs devuelven.

### Qué tenés que hacer

1. **Auditar qué campos extra están disponibles en cada fuente y NO se están mostrando**:
   - Câmara BR `/proposicoes/{id}`: además de `ementa`, trae `ementaDetalhada`, `keywords`, `dataApresentacao`, `descricaoTipo`, `urlInteiroTeor`, `statusProposicao.descricaoSituacao`, `statusProposicao.descricaoTramitacao`, `statusProposicao.dataHora`, `descricaoSituacao`, `siglaOrgaoUltimoEncaminhamento`, `descricaoSituacaoUltimoEncaminhamento`, `despachoUltimoEncaminhamento`. Hay además `/proposicoes/{id}/tramitacoes` (historial de pasos) y `/proposicoes/{id}/temas`.
   - Senado BR `/processo`: ya devuelve mucho (`autoria`, `tipoConteudo`, `tipoDocumento`, `tramitando`, `urlDocumento`, fechas). Verificar si hay endpoint `/processo/{id}` con más detalle (`/processo/{codigoMateria}/textos`, `/processo/{id}/tramitacao`).
   - HCDN AR (`leyes-ar.json` embebido): el campo `sumario` ya es largo. Pero el campo `referencias` puede tener más palabras clave que las 8 actuales. Verificar.
   - Senado CO `feim-cysj`: el `titulo` ya es completo. Considerar tirar de `xs56-s7w6` (Vista Proyectos de Ley) que tiene URLs a la gaceta oficial con texto íntegro descargable.

2. **Aumentar el `excerpt` mostrado en las cards** (hoy es 280 chars en `line-clamp-2`):
   - Subirlo a 500-600 caracteres con `line-clamp-4` o `line-clamp-5`
   - Considerar mostrar **título + autor + estado** sin truncar y luego sumario truncado a más caracteres
   - En mobile mantener compacto, en desktop mostrar más
   - Probar layout: ¿cards más altas? ¿abrir el contenido inline tipo accordion?

3. **Enriquecer el detalle de cada novedad** (NewsConversation y Laws panel):
   - Para items de Câmara, además de `enrichCamaraItem` actual, sumar **historial de tramitación** (las últimas 5-10 acciones del proyecto en orden cronológico) llamando a `/proposicoes/{id}/tramitacoes`
   - Para items de Senado BR sumar **fechas relevantes** y **URL del texto íntegro**
   - Para Argentina mostrar las **referencias completas** (no solo 8 keywords) como un chip cloud
   - Para Colombia agregar la **comisión** y el **estado completo** ya está, pero podrías sumar URL a la Gaceta Oficial si está disponible

4. **Pantalla de detalle ampliada**:
   - Sección "Cronología de tramitación" con timeline de fechas y eventos
   - Sección "Documentos relacionados" con links a PDFs/gacetas oficiales
   - Sección "Texto completo" expandible si hay más de N caracteres
   - Sección "Autores y comisión" con info enriquecida

### Restricciones a respetar

- **Sin backend nuevo**: usar fetch directo o el Worker ya escrito. No introducir Supabase/Firebase/etc.
- **CORS**: cualquier endpoint nuevo de Câmara/Senado BR / Socrata CO funciona desde browser. APIs de UY/PY/PE necesitarían el Worker.
- **Cache**: no spamear las APIs. Si agregás un fetch extra para enriquecer, hacelo on-demand cuando el user abre el detalle (no al listar).
- **TypeScript strict**: extender `NewsItem` en `lib/types.ts` con los campos nuevos como opcionales.
- **No romper Mobile**: las cards más altas o expansibles tienen que verse bien en 375px también.

### Cómo verificar que funciona

```bash
# Levantar local
cd ~/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run dev

# Login con cuenta demo, ir a /radar, abrir cualquier item de Brasil, verificar que muestra:
# - Texto completo más largo (4-5 líneas en card, párrafos completos en detalle)
# - Autores con partido y UF
# - Estado actual de tramitación
# - Historial cronológico (lo que agregues nuevo)
# - Link al PDF oficial

# Verificar también /leyes para AR y CO
```

### Una vez terminado

```bash
# TS check
cd ~/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsc -b --noEmit

# Build
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx vite build

# Commit
cd ~/dev/app-upm && git add -A && git commit -m "Descripciones largas en Radar y Leyes" && git push origin main

# Deploy gh-pages (ver bloque arriba)
```

---

## Convenciones del proyecto

- **No agregar dependencias** sin razón fuerte.
- **Componentes reusables** en `src/components/` (Drawer, Modal, NotificationsBell, etc.). UI primitives en `src/components/ui.tsx`.
- **Cliente API** en `src/lib/sources/{nombre}.ts`. Cada cliente exporta una función `fetchXxx({limit, signal})` que devuelve `Promise<NewsItem[]>`. Detección heurística de `topic` y `relevance` por keywords.
- **Markdown del Asistente** en `src/lib/respond.ts` con patrones por keyword. No es IA real — es matcher.
- **Iconos**: Lucide. Tamaños 11-22 según contexto. `strokeWidth` default.
- **Animaciones**: `animate-fade-up`, `animate-toast-in`, `animate-slide-in-right`, `animate-pulse-soft`.

## Notas finales del agente saliente

- El usuario es Alan (alannaimtapia@gmail.com), habla español, prefiere comunicación directa y concisa.
- El usuario valora ver resultados rápido. Cuando haya que decidir entre "perfecto pero lento" y "bueno y desplegado en 30 min", elegí lo segundo y deployá.
- Cada cambio que hagas → build + deploy + share URL. La PWA cachea, así que siempre instruir Cmd+Shift+R o incógnito.
- El último commit en `main` cuando arranques debería ser **`96c82ed`** ("Colombia integrado: 55 ítems live"). Si ves otro más nuevo, leelo primero.
- Cuando algo falle por CORS o conectividad del preview tool, no concluyas que está roto en producción — verificá con `curl -I` desde la terminal qué responde el endpoint.

Buena suerte. Tenés todo el contexto, andá a hacer las descripciones largas.
