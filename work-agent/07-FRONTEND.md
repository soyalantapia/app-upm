# 07 · Frontend (client/)

**Última actualización:** 2026-07-18
**Para qué sirve este documento:** es la fuente de verdad del cliente web de App UPM (`client/`). Describe el árbol de rutas, el shell de navegación, cada página, el store y su sincronización con el backend, el pipeline de datos del feed, los flags de lanzamiento, el sistema de diseño tokenizado y la PWA. Si vas a tocar cualquier cosa que se renderice en el navegador, leé esto antes.

Todo lo que sigue fue verificado el 2026-07-18 leyendo el código en `main` (`ace8dc4`) y comprobando producción con `curl`. Lo que no verifiqué está marcado **(verificar)**.

---

## 1. Datos duros del proyecto

| Ítem | Valor real (verificado) |
|---|---|
| Directorio | `/Users/alannaimtapia/dev/app-upm/client` |
| Entrypoint | `client/src/main.tsx` → `client/src/App.tsx` |
| Build tool | **Vite `^8.0.10`** (`client/package.json`) — OJO: el brief dice "Vite 7", el `package.json` dice 8 |
| React | `^19.2.5` + `react-dom ^19.2.5` |
| Router | `react-router-dom ^7.15.0`, modo **HashRouter** |
| TypeScript | `~6.0.2`, `tsc -b` corre antes del build |
| CSS | **Tailwind 4** (`tailwindcss ^4.2.4` + `@tailwindcss/vite`), un solo archivo `client/src/index.css` con `@theme` |
| Iconos | `lucide-react ^1.14.0` (único set; no hay otro) |
| Utilidades clase | `clsx` + `tailwind-merge` vía `client/src/lib/cn.ts` |
| PWA | `vite-plugin-pwa ^1.3.0`, `registerType: 'autoUpdate'` |
| Tests | `vitest ^4.1.7` + `@testing-library/react`, entorno `jsdom` — **42 tests / 8 archivos, todos verdes** |
| Node local usado | `v25.9.0` (los tests pasan). El brief dice "Node 22 para buildear" — no hay `.nvmrc` ni campo `engines` en `client/package.json` **(verificar cuál exige el pipeline)** |
| `base` de Vite | `'/app-upm/'` — obligatorio para GitHub Pages |
| Front producción | https://soyalantapia.github.io/app-upm/ → HTTP 200, bundle `assets/index-DpEQkNiw.js` |

**Cómo verificar el estado de tests y bundle desplegado:**

```bash
cd /Users/alannaimtapia/dev/app-upm/client && npm test
cd /Users/alannaimtapia/dev/app-upm/client && npm run build     # tsc -b && vite build
curl -s https://soyalantapia.github.io/app-upm/index.html | grep -oE 'assets/[a-zA-Z0-9._-]+\.(js|css)'
```

**El front desplegado está al día con `main`.** Verificado:

```bash
cd /Users/alannaimtapia/dev/app-upm && git log --oneline d380120..main -- client/   # → sin salida
```

Los dos commits posteriores a `d380120` (`28d5aa8` auditoría profunda, `1b9a71b` drizzle) son **solo backend**. El último commit que tocó `client/` es `d380120` ("revisión total · lote 3"), y ese es exactamente el bundle publicado en `gh-pages` (`3c9b6a0 deploy: revisión total lote 3 (index-DpEQkNiw.js)`).

---

## 2. GOTCHA #1 (el que más horas cuesta): `import.meta.env` sin optional chaining

Hay **cuatro** lugares donde se lee la única variable de entorno del front, y los cuatro usan el mismo patrón exacto:

```ts
const X = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')
```

| Archivo | Constante |
|---|---|
| `client/src/lib/sync.ts:155` | `UPM_API_URL` |
| `client/src/lib/sources/index.ts:198` | `WORKER_URL` |
| `client/src/lib/use-semantic-search.ts:8` | `API_BASE` |
| `client/src/pages/Login.tsx:14` | `API_BASE` |
| `client/src/pages/Assistant.tsx:37` | `API_URL` |

**NUNCA escribas `import.meta.env?.VITE_UPM_API_URL`.** Vite estatiza (reemplaza en build) únicamente el patrón literal `import.meta.env.VITE_X`. Con `env?.` el `define` no aplica, la expresión queda `undefined` en runtime, y Rollup **elimina por dead-code el bloque entero** (el adapter REST, el fetch al backend, el login). Los comentarios en `sync.ts:152-154` y `use-semantic-search.ts:5-7` documentan esto. El síntoma es brutal: build verde, tests verdes, y en producción la app se comporta como si no hubiera backend (login roto, feed vacío).

**Cómo verificar que la var quedó inyectada en el bundle:**

```bash
cd /Users/alannaimtapia/dev/app-upm/client && npm run build
grep -o "upm-api-production.up.railway.app" dist/assets/*.js | head
```

Si no aparece, el `define` no se aplicó → revisar el patrón.

### Variables de entorno del front

| Variable | Dónde | Valor |
|---|---|---|
| `VITE_UPM_API_URL` | `client/.env.production` (único `.env` que existe) | `https://upm-api-production.up.railway.app` |

No hay `.env`, `.env.development` ni `.env.local`. **En `npm run dev` la var NO está definida** → el front cae al modo sin-backend (ver §6). Para desarrollar contra la API local (`:3210`) hay que crear `client/.env.development` con `VITE_UPM_API_URL=http://127.0.0.1:3210`.

Dev server: `port 5188`, `host 127.0.0.1`, `strictPort: true` (`client/vite.config.ts`). El 3000 lo ocupan otros proyectos del usuario.

---

## 3. Rutas (`client/src/App.tsx`)

Router = **`HashRouter`** (obligatorio: GitHub Pages no hace rewrite de SPA). Todas las URLs reales son `https://soyalantapia.github.io/app-upm/#/radar`.

El árbol es: `ErrorBoundary` → `AuthProvider` → `HashRouter` → `UIProvider` → (`Toasts`, `OfflineBanner`, `PWAUpdateBanner`, `Routes`).

| Path | Componente | Archivo | Carga | Protección |
|---|---|---|---|---|
| `/login` | `LoginPage` | `client/src/pages/Login.tsx` | **síncrona** | pública |
| `/onboarding` | `OnboardingPage` | `client/src/pages/Onboarding.tsx` | **síncrona** | `RequireAuth` |
| `/` (index) | `HomePage` | `client/src/pages/Home.tsx` | lazy | `RequireAuth` + `OnboardingGate` + `AppShell` |
| `/asistente` | `AssistantPage` | `client/src/pages/Assistant.tsx` | lazy | idem |
| `/radar` | `RadarPage` | `client/src/pages/Radar.tsx` | lazy | idem |
| `/radar/:id` | `NewsConversationPage` | `client/src/pages/NewsConversation.tsx` | lazy | idem |
| `/leyes` | `LawsPage` | `client/src/pages/Laws.tsx` | lazy | idem |
| `/briefing` | `BriefingPage` | `client/src/pages/Briefing.tsx` | lazy | idem · **oculta de la nav** |
| `/legislador/:id` | `LegisladorProfilePage` | `client/src/pages/LegisladorProfile.tsx` | lazy | idem · sin entrada de nav (se llega desde `AuthorChips` / ⌘K) |
| `/estadisticas` | `StatsPage` | `client/src/pages/Stats.tsx` | lazy | idem · **oculta de la nav** |
| `/biblioteca` | `LibraryPage` | `client/src/pages/Library.tsx` | lazy | idem · **oculta de la nav** |
| `/carpetas` | `FoldersPage` | `client/src/pages/Folders.tsx` | lazy | idem · **oculta de la nav** |
| `/perfil` | `ProfilePage` | `client/src/pages/Profile.tsx` | lazy | idem |
| `*` | — | — | — | `<Navigate to="/" replace />` |

Las páginas lazy van envueltas cada una en `<Suspense fallback={<PageLoader />}>`; `PageLoader` es un spinner `border-upm-200 / border-t-upm-600` (definido en `App.tsx:30`).

### Guards

- **`RequireAuth`** (`client/src/lib/auth.tsx:123`): si `!ready` devuelve `null` (evita flash); si no hay `operator` → `<Navigate to="/login" state={{ from: location }} replace />`.
- **`OnboardingGate`** (`App.tsx:38`): si hay `operator` y `!onboarded` → redirige a `/onboarding`. Si no hay operator, deja pasar (lo frena `RequireAuth`).

### Rutas huérfanas (decisión consciente, NO borrar)

`/briefing`, `/biblioteca`, `/carpetas`, `/estadisticas` **existen y funcionan**, pero no tienen entrada en ningún menú. Se dejaron accesibles para no romper deep-links y para poder reactivarlas cambiando solo `AppShell`. El scoping está documentado en `client/src/lib/launch.ts`. Si alguien reporta "hay páginas a las que no se llega", es intencional.

---

## 4. Layout: `AppShell` (`client/src/layouts/AppShell.tsx`)

Exporta **dos** shells:

### 4.1 `AppShell` — shell autenticado (usado como layout route)

Contenedor raíz: `<div className="bg-network-mesh min-h-[100svh]">`. Renderiza `<Outlet />` dentro de `<main className="min-w-0 flex-1 pb-32 md:pb-6">` (el `pb-32` mobile deja espacio para la bottom-nav flotante).

**Dos navegaciones distintas, con arrays distintos:**

```ts
// AppShell.tsx:27 — sidebar desktop
const NAV = [Inicio '/', Asistente '/asistente', Radar '/radar', Leyes '/leyes', Perfil '/perfil']

// AppShell.tsx:37 — bottom-nav mobile (mismo set, ORDEN distinto: Asistente al centro)
const MOBILE_NAV = [Inicio '/', Radar '/radar', Asistente '/asistente', Leyes '/leyes', Perfil '/perfil']
```

Si agregás una sección, hay que tocar **los dos arrays**.

- **Desktop (`md:`)**: `<aside>` sticky de `260px`, `rounded-3xl bg-white/85 ... shadow-glass backdrop-blur`. Contiene: `BrandLockup` + `NotificationsBell`, botón "Buscar… ⌘K" (abre `GlobalSearch`), la nav vertical, y al pie una tarjeta de usuario con avatar generado (`operator.name` → primera letra en mayúscula, fallback `'L'`), nombre, cargo y botón de cerrar sesión (`signOut()` + `navigate('/login', {replace:true})`).
- **Mobile (`md:hidden`)**: header sticky con `BrandLockup compact` + `NotificationsBell`; y una **bottom-nav flotante** `fixed inset-x-3 bottom-3 z-40 ... rounded-3xl bg-white/95 shadow-floating`, con `marginBottom: 'env(safe-area-inset-bottom)'` para iPhone.
- **FAB central**: el item `'/asistente'` se renderiza distinto — círculo de `h-14 w-14` con `-mt-8` (sobresale por encima de la barra), `bg-gradient-to-br from-upm-500 to-upm-700`, `ring-4 ring-white`, `shadow-floating`, y `scale-105` cuando está activo. Los otros 4 items son pills normales que cuando están activos usan el mismo gradiente con `shadow-cta`.

**Atajos de teclado** (`useEffect` en `AppShell.tsx:51`):

| Tecla | Efecto |
|---|---|
| `⌘K` / `Ctrl+K` | abre `GlobalSearch` |
| `/` | abre `GlobalSearch` — **solo** si el foco no está en un `INPUT` ni `TEXTAREA` |

**Efecto por cambio de ruta** (`AppShell.tsx:68`): en cada `location.pathname` hace `window.scrollTo({top:0, behavior:'instant'})` **y** `setSearchOpen(false)`. Lo segundo fue un fix explícito (commit `c3ee35f`): el modal ⌘K quedaba abierto al navegar.

### 4.2 `FullBleedShell` — shell no autenticado

Usado por `Login.tsx` y `Onboarding.tsx`. Fondo `bg-deep-mesh` (navy `#062b4d`) + dos radiales + `SouthAmericaBackdrop tone="dark"` (silueta de Sudamérica, una versión desktop `lg:block` y otra mobile). Lockup blanco arriba a la izquierda con el texto **"Asistente IA UPM" / "Acceso institucional"**.

---

## 5. Páginas — qué hace cada una

### `/login` — `pages/Login.tsx` (257 líneas)
Login **OTP real de dos pasos**, sin backdoor. Estado local `step: 'email' | 'code'`.

| Paso | Request | Manejo de status |
|---|---|---|
| 1 | `POST {API_BASE}/auth/request-code` body `{ email }` (lowercased, trim) | `ok`→ paso `code` + focus al input · `503`→"El acceso por email todavía no está habilitado…" · `429`→"Recién pediste un código…" · `502`→ problema de SMTP, NO culpa al email del usuario · otro→ genérico |
| 2 | `POST {API_BASE}/auth/verify` body `{ email, code }` | `ok`→ `{ token, operator }` → `signIn(operator, token)` + toast + navigate · `401`→"Código incorrecto" · `410`→"El código venció" · `429`→"Demasiados intentos" |

Sin `API_BASE` muestra "El servicio de acceso no está disponible en este momento" (guard explícito en ambos handlers). Hay botón "Reenviar código" que reusa `sendCode()`. Redirige a `postAuthTarget` = `/onboarding` si `!onboarded`, si no al `from` guardado por `RequireAuth`, si no a `/`.
Lateral desktop: pitch + `PhoneMockup` + `CoverageProof`.

### `/onboarding` — `pages/Onboarding.tsx` (191 líneas)
Wizard de 3 pasos (`step: 0|1|2`): **países** (de `ACTIVE_COUNTRIES`) → **temas** (`TOPICS`, 12) → **frecuencia** (`diario` / `semanal` / `alertas`). Al terminar: `store.setPrefs({countries, topics, frequency, language:'es', notifications:true})` + toast + `navigate('/', {replace:true})`. Tiene "saltar" → `store.setDefaults()` (aplica `DEFAULT_PREFS`) + toast informativo.

### `/` — `pages/Home.tsx`
Dashboard del legislador. Consume `useLiveFeed(prefs)`.

**Patrón "high-water mark"** (`Home.tsx:36`): el feed en vivo fluctúa (un refresh parcial puede reemplazar un feed completo por uno con menos ítems). Home guarda en un `useRef` el snapshot **más grande** visto y usa ése (`bestFeed`) para todo. Consecuencia: las stats y la cinta de cobertura nunca "caen a 0" durante una revalidación, pero **sí suben durante la carga fría** (esto se auditó y se concluyó que es la animación `CountUp` aterrizando, no un bug).

Estado de error: si `error && loading` (o sea, falló y no hay cache) renderiza un bloque con `WifiOff` + "No pudimos cargar las novedades" + botón **Reintentar** → `refresh()`. Antes de ese fix quedaba un skeleton eterno.

Secciones, en orden, con `animate-fade-up` escalonado (0/80/160/240 ms):
1. `HomeTour` — coach de 3 tooltips, flag `localStorage['upm.home-tour.dismissed']`, se abre desde un chip "¿Te oriento?".
2. `HomeHero` — saludo (apellido de `operator.name`), cobertura en vivo, buscador, 3 stats de HOY.
3. `DiffSinceLastVisit` — qué cambió vs `visit-tracker`.
4. `HomeRadarPreview` — items filtrados por `prefs`.
5. `AgendaMercosur` — eventos de los próximos días derivados del feed.

Home navega al Radar con presets: `/radar?preset=hot|with-tramite|mi-comision`.

### `/radar` — `pages/Radar.tsx` (634 líneas)
El feed normativo completo, filtrable. La página más pesada.

- Filtros: `q` (debounced 200 ms vía `useDebounced`), `country` (de **`ACTIVE_COUNTRIES`**), `topic`, `type` (`ley|decreto|reglamento|informe|comunicado|acta`), `relevance` (`alta|media|baja`), `organismo` (top-20 emisores derivados del propio feed contando `item.authors`), y `sort` (`fecha-desc|fecha-asc|relevancia`).
- **Presets** (`QuickFilterPills`, tipo `FilterPresetId`): `all`, `mi-comision`, `hot`, `recent-sancionadas`, `crossborder`, `this-week`, `with-tramite`. **Se hidratan desde la URL** (`Radar.tsx:87`): lee `searchParams.get('preset')` y lo valida contra la lista; si no matchea, `'all'`. Este fue un bug reportado (Home navegaba con preset y el Radar lo ignoraba) y está resuelto.
- `q` también se hidrata de `searchParams.get('q')`.
- **Paginación**: arranca en 50 ítems y suma 100 por scroll infinito (`IntersectionObserver` con `rootMargin: '600px 0px'` sobre un sentinel). Necesario: el corpus supera los 1.700 ítems y montarlos todos mata la performance.
- Búsqueda tolerante a sinónimos vía `lib/synonyms.ts` (`matchesQuery`).
- Al visitar, escribe `writeSnapshot(items)` (`lib/visit-tracker.ts`) para alimentar el diff del Home.
- Panel lateral de **Fuentes** (`sourcesOpen`) con el reporte por fuente del feed, y `PulseToday` (exporta `OTHER_COUNTRIES`, reusado por Radar para la regex/fecha unificada).
- Cards: `RadarSmartCard`, enriquecidas con el grafo de citas (`useCitationGraph` / `getCitationCount`).

### `/radar/:id` — `pages/NewsConversation.tsx` (604 líneas)
Detalle de una norma. Carga el ítem con `useNewsItem(id)`. Muestra título limpio (`cleanTitle`, `looksPortuguese` para mostrar el original en `lang="pt"`), metadatos, `extractContext`, y paneles: `SimilarItemsPanel`, `BacklinksPanel`, `LawMap`, `RegulatoryConstellation`, `AuthorChips` (linkean a `/legislador/:id`), `NotesPanel`, `ExportLawButton`, `AddToCalendarButton`, `WatchToggleButton`, `OverflowActions`. **El botón "Guardar" está gateado por `LAUNCH.saveToFolder`** (`NewsConversation.tsx:165`).

### `/leyes` — `pages/Laws.tsx` (829 líneas — la más grande)
Explorador de leyes con vista lista + vista detalle (misma ruta, `searchParams`). Tiene **su propio guardado y pestaña "Guardadas"**, que **NO** depende de `LAUNCH.saveToFolder` (esto está documentado explícitamente en `lib/launch.ts`). Incluye `GenealogyBreadcrumb`, `ArticuladoPanel`, `SuggestedComparison`, `JurisprudenciaPanel`, `PageTOC`, `SimilarItemsPanel`, `BacklinksPanel`, `LawMap`, `LawComparator` (1 vs 1 entre países) y `MultiComparator` (hasta 3 países). Usa `isPlaceholderText` (`lib/law-content.ts`) para no mostrar/exportar texto-plantilla.

### `/asistente` — `pages/Assistant.tsx` (533 líneas)
Chat con el LLM del backend. **No hay fallback simulado.**

```ts
// Assistant.tsx:50 — tryBackendAssistant
POST {API_URL}/assistant   body: { messages: history }   timeout: AbortSignal.timeout(45_000)
// !res.ok  ó  sin json.message.content  ó  excepción  → devuelve null
```

Si devuelve `null`, se pinta `unavailableMessage()`: *"El asistente no está disponible en este momento… Solo respondo con el modelo real sobre el corpus normativo: no genero respuestas sin conexión para no darte información sin verificar."* Esto es deliberado (commit `8785c48`, "asistente honesto"): antes había respuestas pre-armadas y un RAG local simulado; se borraron.

Otros detalles: mensaje inicial `INITIAL` con `isInstitutional: true`; sugerencias de arranque; historial de conversaciones en el store (cap 25, ver `saveConversation`); textarea autogrow (`taRef`) con soporte IME (`isComposing`); guard anti doble-submit por timestamp (`lastSubmitRef`); `StreamingMarkdown` para render; `SourceCard` para las fuentes que devuelve el backend; **prefill** vía `sessionStorage['upm.asistente.prefill']` (lo setea Leyes al mandar una pregunta sugerida). Las acciones **Brief** y **Minuta** están gateadas por `LAUNCH.saveToFolder` (`Assistant.tsx:370`).

### `/perfil` — `pages/Profile.tsx` (463 líneas)
Datos del operador (editables vía `updateOperator`), rol derivado (`roleOf`/`roleLabel` de `lib/permissions.ts`), preferencias de países (`ACTIVE_COUNTRIES`, con el contador "Disponibles: {ACTIVE_COUNTRIES.length}" en la línea 141) y temas, gestión de **alertas** (crear/togglear/eliminar → `store.createAlert` etc.), `PreferencesDrawer`, y cerrar sesión. El `select` de Cargo respeta un cargo free-text que no esté en `CARGOS` (fix del lote 1).

### `/briefing` — `pages/Briefing.tsx` (443 líneas) · **oculta**
Genera un 1-pager imprimible para pre-sesión: tema + países + ventana temporal (`7d`/`30d`/`90d`/`12m`, ver `WINDOW_LABEL` y `withinWindow`), destila los puntos relevantes del feed y usa `window.print()` con CSS print-friendly.

### `/estadisticas` — `pages/Stats.tsx` (291 líneas) · **oculta**
Dashboard del corpus: distribución por país/tema/año/tipo, top citadas (`computeTrendingLaws` sobre el grafo de `useCitationGraph`), `ActivityHeatmap`, `MercosurChoropleth`, `SectorHeatmap`, `BudgetRanking`, `TermFrequency`, y salud de fuentes.

### `/biblioteca` — `pages/Library.tsx` (387 líneas) · **oculta**
Biblioteca institucional UPM por categorías (convenios, actas, comunicados, informes, documentos base, normativa, académico). **Se muestra vacía**: se alimenta de `DOCUMENTS` de `lib/data.ts`, que es `[]` (no existe backend de documentos institucionales todavía). El botón de subir documentos está gateado por `can(cargo, 'library:write')`.

### `/carpetas` — `pages/Folders.tsx` (398 líneas) · **oculta**
"Mi carpeta": los `SavedItem` del store agrupados en `folders`, con crear carpeta, mover ítem y leer contenido en un `Drawer`. Se le sacó la auto-siembra de 5 ítems falsos → hoy arranca con `EmptyState` real.

### `/legislador/:id` — `pages/LegisladorProfile.tsx` (245 líneas)
Ficha de un legislador **real** (`lib/legisladores.ts`, cargado async desde `client/public/data/legisladores.json`). Cruza el feed buscando su nombre en `item.authors` (normalizado: `toUpperCase().normalize('NFD')` sin diacríticos) para listar leyes que firma y calcular co-autores.

---

## 6. Pipeline de datos del feed

### 6.1 `fetchFromWorker` y la regla de oro de producción

`client/src/lib/sources/index.ts` es el módulo central. Flujo de `fetchLiveFeed(opts)`:

```
1. si !opts.force y hay cache válido        → devuelve cache
2. fetchFromWorker()  → GET {WORKER_URL}/feed
       ok  → rank(dedupe(items), prefs) → writeCache → RETURN
3. si WORKER_URL está definido pero el paso 2 falló
       → RETURN feed VACÍO  { items: [], status: 'live', sources: [] }     ← NO cae a los fetchers
4. solo si WORKER_URL === ''  (dev/demo sin backend)
       → corre los 45 FETCHERS del cliente en paralelo, con render progresivo
```

**Esta es una decisión de producto, no un bug** (`sources/index.ts:241-255`, commit `69ed479`): en producción el 100% de los datos viene del backend (la DB). Si `/feed` cae, la app muestra un `EmptyState` honesto en vez de scrapear fuentes desde el navegador. **Nunca datos sintéticos, nunca mock.**

Consecuencia práctica para quien debuguee: **si la app se ve vacía en producción, el problema es el backend o el CORS, no el front.** Verificar primero:

```bash
curl -s https://upm-api-production.up.railway.app/health
curl -s "https://upm-api-production.up.railway.app/feed" | head -c 400
```

`/health` al 2026-07-18 devuelve `{"ok":true,"db":"up","itemCount":4589,...}`.

**`fetchFromWorker` no manda filtro de país.** Baja el `/feed` global y rankea client-side. Por eso el backend tuvo que implementar `balancedRows()` (top-130 recientes por país): sin eso, Brasil (que produce ~150 proposiciones/día) copaba el payload y un legislador argentino veía casi puro BR. Si alguna vez cambiás el ranking del cliente, tené presente que **el balanceo es responsabilidad del server**.

`byCountry` se reconstruye en el cliente sumando `s.count` de cada `SourceReport` que devuelve el backend.

### 6.2 Los 45 fetchers cliente (`FETCHERS`, `sources/index.ts:148`)

Registro de 45 adaptadores (AR/BR/CO/UY) que golpean APIs oficiales directamente desde el navegador. **En producción no se ejecutan nunca** (paso 3 corta antes). Sirven para: (a) dev sin backend, (b) referencia de qué fuentes existen. El orden importa: las fuentes AR curadas van primero porque el `dedupe` es *keep-first* y sus títulos/topics son mejores que los dumps en mayúsculas.

Los fetchers de PY/BO/CL/PARLASUR fueron eliminados del array (quedan comentarios en `sources/index.ts:191-193` marcando el hueco).

### 6.3 Cache del feed

Clave `localStorage['upm.live-feed.v2']`.

| Constante | Valor | Qué hace |
|---|---|---|
| `CACHE_TTL_MS` | 24 h | hard expiry: pasado eso, `readCacheStatus()` devuelve `null` |
| `CACHE_FRESH_MS` | 5 min | dentro de esta ventana el cache se considera *fresh* y no se revalida |

Dos protecciones anti-cache-envenenado:
- `readCacheStatus()` trata un cache con **0 ítems** como si no existiera (fuerza refetch).
- `writeCache()` **no sobrescribe** un cache con datos por uno de 0 ítems (mejor datos viejos que pantalla vacía).

### 6.4 `useLiveFeed` (`client/src/lib/use-live-feed.ts`)

```ts
const { feed, loading, revalidating, error, refresh } = useLiveFeed(prefs?)
```

- Hidrata sincrónicamente desde `readCacheStatus()` en el primer render → primer paint instantáneo, sin skeleton, aunque el cache esté stale (dentro de 24 h).
- `loading` es `true` **solo si no hay cache**; si hay, la revalidación sucede en background con `revalidating`.
- `feedRef` mantiene el feed sincrónico para el `setInterval`; sin ese ref, el `useEffect` con `deps=[]` capturaba el valor inicial y cada ciclo de 5 min mostraba `loading=true`.
- **Auto-refresh cada 5 minutos** (`AUTO_REFRESH_MS`).
- `onProgress` permite render progresivo (solo relevante en modo sin-backend).
- Al terminar cada carga corre `evaluateAlerts(feed)`.

**`evaluateAlerts`**: una vez por sesión (flag `sessionStorage['upm.alerts.evaluated']`), recorre las alertas activas del store, filtra el feed por `countries`/`topics` de la alerta y busca `keyword` (lowercase) en `title + ' ' + excerpt`; si hay matches, llama `store.updateAlertMatchCount()` y `store.pushNotification()`. Crear o togglear una alerta hace `sessionStorage.removeItem('upm.alerts.evaluated')` para forzar la re-evaluación en el próximo ciclo (si no, una alerta nueva no se evaluaba hasta recargar la app).

`fetchLiveLaws()` es un wrapper que filtra el mismo feed a `type ∈ {ley, decreto, reglamento, informe}`.

### 6.5 Búsqueda semántica (`lib/use-semantic-search.ts`)

`useSemanticSearch(query, { fallback })` → `{ items, loading, mode }` con `mode: 'hybrid' | 'fts' | 'local'`.

- Pega a `GET {API_BASE}/search?q=…`, timeout **9 s** (`setTimeout` + `AbortController`).
- Cae a filtro local (`matchesQuery` sobre `title + excerpt + tipoDocumento`) si: no hay `API_BASE`, la request falla, o el backend devolvió **0 ítems**.
- Recibe el query **ya debounced** (quien debouncea es `GlobalSearch` con `useDebounced(q, 150)`).
- Usa `fallbackRef` para no re-disparar el efecto cuando cambia la identidad del array de fallback (el feed se revalida cada 5 min); el único dep es `term`.

Consumidor: `client/src/components/GlobalSearch.tsx`, grupo "Normas del corpus", con badge "IA · por significado".

---

## 7. Estado: `lib/store.ts` + `lib/sync.ts`

### 7.1 El store

Store **artesanal** (no Zustand/Redux): un objeto module-level `state`, un `Set` de listeners, y el hook `useStore(selector)` construido sobre `useSyncExternalStore`. Clave de persistencia: **`upm.app.state`**.

Forma de `State`:

| Campo | Tipo | Notas |
|---|---|---|
| `prefs` | `Preferences \| null` | países, temas, frecuencia, idioma, notificaciones |
| `onboarded` | `boolean` | lo pone `setPrefs()` / `setDefaults()` |
| `saved` | `SavedItem[]` | `type: 'novedad'\|'documento'\|'respuesta'\|'minuta'\|'brief'` |
| `folders` | `Folder[]` | seed = `FOLDERS` de `data.ts` = **`[]`** |
| `notifications` | `Notification[]` | `SEED_NOTIFICATIONS = []` |
| `conversations` | `Conversation[]` | historial del Asistente |
| `alerts` | `Alert[]` | `SEED_ALERTS = []` |
| `toasts` | `Toast[]` | **NO se persiste** (`persist()` lo desestructura y descarta) |

Los seeds están vacíos a propósito: un usuario nuevo arranca limpio, sin datos fabricados.

API del store (todos disparan `update()` → `persist()` → `notify()`): `setPrefs`, `resetOnboarding`, `saveItem`, `removeSaved`, `moveSavedToFolder`, `isSaved`, `createFolder`, `removeFolder`, `pushToast`, `dismissToast`, `setDefaults`, `markNotificationRead`, `markAllNotificationsRead`, `pushNotification`, `saveConversation`, `removeConversation`, `createAlert`, `toggleAlert`, `removeAlert`, `updateAlertMatchCount`.

Duración de toasts por tono (`store.ts:185`): con acción 7000 ms · `success` 3000 · `info` 4000 · `warning` 5000 · `danger` 6000.

### 7.2 `lib/sync.ts` — el adaptador de persistencia

Tres implementaciones de la interfaz `SyncAdapter { read, write, clear, name }`:

| Adapter | Cuándo |
|---|---|
| `localStorageAdapter` | default |
| `createMemoryAdapter()` | tests (`client/src/test/sync.test.ts`) |
| `createRestAdapter(baseUrl)` | **auto-activado** si `VITE_UPM_API_URL` está definido y hay `window` (`sync.ts:156`) |

**`createRestAdapter` es write-through, no read-through.** `read()` lee **siempre de localStorage** — nunca hace GET al backend. `write()` escribe localStorage primero (offline-first) y **además** agenda un push debounced de **1500 ms por key**.

Mapeo key → endpoint (`pushKey`, `sync.ts:115`):

| Key de storage | Requests |
|---|---|
| `upm.app.state` | `PUT /me/prefs` con el subdoc `prefs` (si existe) · `PUT /me/saved` con `{ saved, folders }` (si existe alguno) |
| `upm.notes.v1` | `PUT /me/notes` con `{ notes: [...] }` |

Detalles del `put()`:
- JWT leído de `localStorage['upm.sync.token.v1']`, cacheado en la closure. **Sin token no sincroniza nada** — se queda en localStorage y no falla.
- Header `Authorization: Bearer <t>`, `AbortSignal.timeout(10_000)`.
- Ante `401` (una sola vez, `retry=true`): limpia el token de memoria y de storage, y reintenta con `retry=false`. **No hay re-login automático** — el token lo emite `/auth/verify`; si venció, el usuario tiene que volver a loguearse.
- Cualquier error de red es **silencioso**: la app funciona idéntica sin backend.

**Consecuencia importante para multi-dispositivo:** el estado se *empuja* al backend pero nunca se *trae*. Si un legislador entra desde otro dispositivo, arranca con el estado local vacío de ese dispositivo aunque el backend tenga sus prefs. Traer `GET /me` al boot es trabajo pendiente **(verificar si hay decisión escrita al respecto)**.

Consumidores del facade `sync`: `lib/store.ts` (línea 111) y `lib/notes.ts` (línea 4).

### 7.3 Auth (`lib/auth.tsx`)

Dos claves de `localStorage`:

| Clave | Contenido |
|---|---|
| `upm.app.operator` | objeto `Operator` `{ email, name, cargo, pais, loggedAt }` |
| `upm.sync.token.v1` | JWT emitido por `/auth/verify` — **la misma constante que lee `sync.ts`** |

`signIn(operator, token?)` guarda ambas; `signOut()` borra ambas. `updateOperator(patch)` re-escribe solo el operator.

**Guard de storage bloqueado** (`isStorageAvailable()`, `auth.tsx:33`): si `localStorage` está bloqueado (incógnito, cuota llena), `AuthProvider` **cortocircuita y renderiza una pantalla dedicada** ("Almacenamiento bloqueado" 🔒 + botón Recargar) antes de cualquier hijo. Sin este guard, `RequireAuth` generaba un loop infinito login→home→login.

### 7.4 Otras claves de `localStorage` / `sessionStorage`

| Clave | Módulo | Qué guarda |
|---|---|---|
| `upm.app.state` | `lib/store.ts` | estado principal |
| `upm.app.operator` | `lib/auth.tsx` | sesión |
| `upm.sync.token.v1` | `lib/auth.tsx` + `lib/sync.ts` | JWT |
| `upm.notes.v1` | `lib/notes.ts` | notas por norma |
| `upm.live-feed.v2` | `lib/sources/index.ts` | cache del feed |
| `upm.visit.snapshot.v1` | `lib/visit-tracker.ts` | IDs vistos (para el diff del Home) |
| `upm.watchlist.v1` | `lib/watchlist.ts` | normas seguidas |
| `upm.telemetry.errors` / `upm.telemetry.events` | `lib/telemetry.ts` | ring buffer de 50 |
| `upm.home-tour.dismissed` | `components/HomeTour.tsx` | tour ya visto |
| `upm.alerts.evaluated` | *sessionStorage* · `use-live-feed.ts` + `store.ts` | alertas ya evaluadas esta sesión |
| `upm.asistente.prefill` | *sessionStorage* · `pages/Assistant.tsx` | pregunta pre-cargada |
| `upm.sw.reloaded` | *sessionStorage* · `PWAUpdateBanner.tsx` | anti-loop de recarga del SW |

---

## 8. `LAUNCH` y alcance del lanzamiento (`lib/launch.ts`)

El archivo entero tiene un solo flag:

```ts
export const LAUNCH = {
  saveToFolder: false as boolean,
}
```

**Qué apaga:** los botones "Guardar" / "Brief" / "Minuta" del **Asistente** (`Assistant.tsx:370`) y del **detalle de noticia** (`NewsConversation.tsx:165`). Razón: guardaban a "Mi carpeta" (`/carpetas`), que está oculta de la navegación → sin destino visible.

**Qué NO apaga:** el guardado propio de `/leyes` y su pestaña "Guardadas", que es independiente y siempre está activo. Está comentado en el propio `launch.ts`.

Para reactivar la feature completa hay que: (1) poner `saveToFolder: true`, y (2) devolver `/carpetas` a los arrays `NAV` y `MOBILE_NAV` de `AppShell.tsx`.

---

## 9. `ACTIVE_COUNTRIES` (`lib/data.ts`)

```ts
export const ACTIVE_COUNTRY_CODES: CountryCode[] = ['AR', 'CO', 'UY', 'BR']
export const ACTIVE_COUNTRIES: Country[] = ACTIVE_COUNTRY_CODES
  .map(code => COUNTRIES.find(c => c.code === code))
  .filter((c): c is Country => Boolean(c))
```

`COUNTRIES` sigue teniendo **8** entradas (AR, BR, UY, PY, CL, BO, PE, CO) pero **solo como tabla de lookup para `countryByCode()`** — hay normas históricas y labels que pueden referenciar cualquiera. Lo seleccionable en la UI son los 4 de `ACTIVE_COUNTRIES`.

Esto se creó para cerrar un hallazgo de auditoría: PY/CL/BO/PE eran seleccionables en Onboarding/Perfil/Radar aunque la API no tiene corpus de esos países → elegir "Chile" en el Radar daba lista vacía (filtro duro).

**Los 5 lugares que consumen `ACTIVE_COUNTRIES` — si ampliás el corpus, revisá los 5:**

| Archivo:línea | Uso |
|---|---|
| `client/src/pages/Onboarding.tsx:90` | grilla de selección paso 1 |
| `client/src/pages/Radar.tsx:475` | filtro de país |
| `client/src/pages/Profile.tsx:141` | texto "Disponibles: {N}" |
| `client/src/pages/Profile.tsx:267` y `:412` | chips de preferencias |
| `client/src/components/PreferencesDrawer.tsx:76` | chips del drawer |

`DEFAULT_PREFS` (`data.ts`) usa los mismos 4 países + temas `['ambiente','integracion-regional','corredores-bioceanicos','mercosur']`, frecuencia `diario`.

**Los otros exports de `data.ts` son arrays vacíos a propósito:** `NEWS`, `DOCUMENTS`, `DOSSIERS`, `FOLDERS`, `AGENDA`, `FORUMS` = `[]`. Eran los mocks de la demo; se vaciaron al pasar a producción. **No los repuebles.** Todavía se importan como fallback (`Home.tsx` importa `NEWS as MOCK_NEWS`, `GlobalSearch` y `Library` importan `DOCUMENTS`) — el import es residual pero inofensivo porque el array es vacío.

`TOPICS` tiene 12 entradas reales y sí se usa.

---

## 10. Sistema de diseño

### 10.1 Tokens (`client/src/index.css`, bloque `@theme` de Tailwind 4)

No hay `tailwind.config.js`: en Tailwind 4 los tokens viven en `@theme` dentro del CSS, y generan utilidades automáticamente (`bg-upm-600`, `text-ink-500`, `shadow-glass`, …).

**Escala azul UPM** (la marca):

| Token | Hex |
|---|---|
| `--color-upm-50` | `#eef5ff` |
| `--color-upm-100` | `#dcebfa` |
| `--color-upm-200` | `#b9d5f0` |
| `--color-upm-300` | `#8dbae3` |
| `--color-upm-400` | `#4f96d4` |
| `--color-upm-500` | `#2f80ed` ← acento |
| `--color-upm-600` | `#145da0` |
| `--color-upm-700` | `#0b3a66` ← corporativo |
| `--color-upm-800` | `#062b4d` ← profundo (`theme_color` de la PWA) |
| `--color-upm-900` | `#03182d` |

**Escala de texto `ink`** — con la regla de accesibilidad anotada en el propio CSS:

| Token | Hex | Contraste sobre blanco |
|---|---|---|
| `ink-900` | `#111827` | — |
| `ink-800` | `#1f2937` | AAA 13.8:1 |
| `ink-700` | `#374151` | AAA 9.4:1 |
| `ink-600` | `#4b5563` | AA 6.7:1 |
| `ink-500` | `#6b7280` | AA 5.1:1 — **mínimo legible para texto** |
| `ink-400` | `#9ca3af` | 3.7:1 — **solo iconos**, no AA para texto |
| `ink-300` | `#d1d5db` | placeholder / disabled |
| `ink-200` | `#dadee3` | escalón agregado en el lote 2 |
| `ink-100` / `ink-50` | `#e5e7eb` / `#f3f4f6` | bordes / fondos |

**No uses `ink-400` o menor para texto.** Está documentado en el CSS y salió de una auditoría de accesibilidad.

Estados: `success #10b981`, `warning #f59e0b`, `danger #ef4444`, `info #0ea5e9`, cada uno con `-bg` y `-fg`. **Usá los tokens, no colores crudos de Tailwind** (un hallazgo de auditoría fue `bg-emerald-400` crudo en `CoverageProof`).

Fondos: `--color-bg #f6f8fb`, `--color-surface #ffffff`, `--color-surface-2 #eef5fa`.

**CERO violeta.** El proyecto nació como copia de otro repo con la paleta violeta de Deenex (`#695ede`) y se purgó. Verificado hoy:

```bash
cd /Users/alannaimtapia/dev/app-upm/client/src && grep -rniE "violet|#695ede|purple|indigo" .   # → sin resultados
```

Si aparece un violeta, es una regresión.

### 10.2 Tipografía

`--font-sans` y `--font-display` = `'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif`. Institucional, no startup.

**GOTCHA:** Inter se carga desde una **CDN externa** en `client/index.html`:

```html
<link rel="preconnect" href="https://rsms.me" />
<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
```

Es la única dependencia de red externa del front. Si `rsms.me` cae o el usuario está offline, la tipografía degrada al stack de sistema (sin romper nada). Si querés hacer la PWA verdaderamente offline-first, hay que auto-hostear Inter en `client/public/` **(pendiente, no hecho)**.

`.tabular-nums` (`font-variant-numeric: tabular-nums`) para que los contadores no bailen.

### 10.3 Utilidades custom (`@utility` de Tailwind 4)

| Utilidad | Qué es |
|---|---|
| `glass` / `glass-strong` | cards translúcidas con `backdrop-filter: blur(14px|18px) saturate(140%|160%)` + `shadow-glass` |
| `skeleton` | gradiente + animación `shimmer` |
| `bg-network-mesh` | fondo del `AppShell`: 2 radiales azules + grid de puntos de 28px (metáfora de red / integración regional) |
| `bg-deep-mesh` | fondo navy `#062b4d` del `FullBleedShell` (login/onboarding) |
| `bg-dot-grid`, `bg-soft-lines` | fondos secundarios |
| `animate-fade-up`, `animate-fade-in`, `animate-toast-in`, `animate-slide-in-right`, `animate-pulse-soft`, `animate-badge-pop`, `animate-ring-expand`, `animate-confetti`, `animate-step-wave` | animaciones nombradas |

Sombras: `shadow-card`, `shadow-card-hover`, `shadow-floating`, `shadow-cta` (glow azul del CTA), `shadow-toast`, `shadow-glass`.
Easings: `--ease-out-expo`, `--ease-spring`.

### 10.4 Reglas globales

- `:root { color-scheme: light !important; }` — la app es **light-only**. No hay dark mode; no lo agregues sin decisión de producto.
- `:focus-visible { outline: 2px solid var(--color-upm-500); outline-offset: 2px; }` — foco de teclado visible en toda la app (WCAG 2.4.7 AA). Los componentes con su propio anillo lo pisan.
- `@media (prefers-reduced-motion: reduce)` reduce **todas** las animaciones y transiciones a 0.01ms.

### 10.5 Primitivas de UI (`client/src/components/ui.tsx`)

`Button`, `Card`, `GlassCard`, `Chip`, `Badge`, `Eyebrow`, `PageHeader`, `EmptyState`, `Input`, `Divider`, `Stat`. Usalas antes de escribir clases sueltas. Otras piezas transversales: `Modal` (con focus-trap vía `lib/use-focus-trap.ts`), `Drawer`, `Toasts`, `Markdown` (parser propio, **con soporte de tablas** agregado en el lote 3), `StreamingMarkdown`, `CountUp`, `OverflowActions`, `PageTOC`, `ErrorBoundary`.

---

## 11. PWA y service worker

Config en `client/vite.config.ts`, plugin `VitePWA`:

| Opción | Valor |
|---|---|
| `registerType` | `'autoUpdate'` |
| `injectRegister` | `'auto'` |
| `workbox` | `{ clientsClaim: true, skipWaiting: true }` |
| `devOptions.enabled` | `false` — **el SW no corre en `npm run dev`** |

Manifest: `name: 'Asistente AI UPM'` · `short_name: 'UPM'` · `theme_color: '#062B4D'` · `background_color: '#F6F8FB'` · `display: 'standalone'` · `start_url` y `scope` = `'/app-upm/'` · iconos `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`.

**GOTCHA:** el manifest referencia tres PNG que **no están en `client/public/`** — ahí solo hay `favicon.svg`, `southamerica.svg` y `data/`. Los iconos probablemente estén ausentes y el manifest apunte a 404 **(verificar contra el deploy: `curl -I https://soyalantapia.github.io/app-upm/icon-192.png`)**. Si faltan, "Agregar a pantalla de inicio" en Android puede usar un icono genérico.

**`PWAUpdateBanner`** (`client/src/components/PWAUpdateBanner.tsx`) — el nombre miente: **no renderiza UI** (`return null`). Lo que hace:
1. `useRegisterSW({ immediate: true })` y, en `onRegistered`, engancha `visibilitychange` para llamar `registration.update()` cada vez que el usuario vuelve a la pestaña.
2. Escucha `controllerchange` en `navigator.serviceWorker` y recarga la página **una sola vez**, con dos guardas: solo si `navigator.serviceWorker.controller` ya existía al cargar (o sea, es una actualización real y no la primera instalación), y solo si no está puesto `sessionStorage['upm.sw.reloaded']` (anti-loop).

Esto existe porque los usuarios quedaban varados en versiones viejas del bundle.

**`OfflineBanner`** (`client/src/components/OfflineBanner.tsx`): banner sticky amarillo (`bg-warning`) con `role="status"` `aria-live="polite"` cuando `navigator.onLine === false`; se auto-oculta al volver la conexión y es descartable.

---

## 12. Build y deploy del front

```bash
cd /Users/alannaimtapia/dev/app-upm/client
npm run dev        # vite · http://127.0.0.1:5188  (SIN backend: no hay .env.development)
npm run build      # tsc -b && vite build → client/dist/  (usa .env.production)
npm run preview    # sirve dist
npm test           # vitest run · 42 tests
npm run lint       # eslint
```

**El deploy a GitHub Pages es MANUAL.** No hay workflow de CI ni script npm que lo haga; el directorio `docs/` del repo es un build viejo y **no** es lo que se publica. La rama publicada es `gh-pages`, cuyo contenido en el árbol es: `.nojekyll`, `assets/`, `data/`, `favicon.svg`, `index.html`, `manifest.webmanifest`, `southamerica.svg`, `sw.js`, `workbox-*.js`.

Procedimiento registrado (worktree + rsync; **verificá cada paso antes de correrlo tal cual**):

```bash
cd /Users/alannaimtapia/dev/app-upm/client && npm run build
rm -rf /tmp/upm-ghpages
cd /Users/alannaimtapia/dev/app-upm && git worktree add /tmp/upm-ghpages gh-pages
rsync -a --delete --exclude .git client/dist/ /tmp/upm-ghpages/
touch /tmp/upm-ghpages/.nojekyll
cd /tmp/upm-ghpages && git add -A && git commit -m "deploy: <descripción> (<nombre-del-bundle>.js)" && git push origin gh-pages
```

Convención de mensaje de commit en `gh-pages`: incluir el hash del bundle (`index-XXXXXXXX.js`), así se puede correlacionar lo desplegado con el commit de código. Ver `git log --oneline gh-pages`.

**`.nojekyll` es obligatorio**: sin él, GitHub Pages ignora los directorios que empiezan con `_` y el build de Vite se rompe.

**Al hacer push a `main` NO se redeploya nada.** Front y backend se deployan por separado (backend: `railway up` desde `server/`, rama `feat/backend`).

---

## 13. Checklist de gotchas del front (resumen)

| # | Gotcha | Impacto |
|---|---|---|
| 1 | `import.meta.env.VITE_UPM_API_URL` **sin** optional chaining | con `env?.` Rollup borra el código por DCE → app sin backend en prod, build verde |
| 2 | En prod, si `/feed` falla el front devuelve **feed vacío**, no scrapea | app vacía = problema de backend/CORS, no de front |
| 3 | `createRestAdapter` es write-through: **nunca lee** del backend | el estado no se hidrata en un dispositivo nuevo |
| 4 | Hay **dos** arrays de navegación (`NAV` y `MOBILE_NAV`) | agregar sección en uno solo = invisible en el otro viewport |
| 5 | `base: '/app-upm/'` + `HashRouter` | cambiar cualquiera rompe todas las URLs publicadas |
| 6 | `.nojekyll` en `gh-pages` | sin él, assets 404 |
| 7 | `NEWS`/`DOCUMENTS`/`FOLDERS`/`AGENDA`/`DOSSIERS`/`FORUMS` en `data.ts` son `[]` a propósito | no repoblar: eran los mocks de la demo |
| 8 | 4 rutas huérfanas + `LAUNCH.saveToFolder=false` | "features que no funcionan" que en realidad están apagadas a propósito |
| 9 | Inter viene de `https://rsms.me` (CDN externa) | única dependencia de red del front; rompe el ideal offline-first |
| 10 | Manifest referencia `icon-192/512*.png` que no están en `client/public/` | posible 404 de iconos PWA **(verificar)** |
| 11 | `devOptions.enabled: false` en VitePWA | el SW no se prueba en dev; los bugs de SW solo aparecen en el build |
| 12 | Los 45 fetchers de `lib/sources/*` son **dead code en producción** | no invertir tiempo en arreglarlos creyendo que sirven datos reales |
| 13 | `ACTIVE_COUNTRIES` ≠ `COUNTRIES` | ampliar corpus exige tocar 5 puntos de consumo |
| 14 | Marca: es "**IA**", no "AI", en toda la UI (`sed` global en el lote 1) | excepto el `manifest.name` de `vite.config.ts`, que quedó como "Asistente AI UPM" |

**Nota de marca:** todo el producto se llama "UPM", pero UPM es el organismo cliente (Unión Parlamentaria del Mercosur), no el producto. Hay un proceso de naming en curso sin decisión final. Cuando se decida, hay que tocar como mínimo: el prefijo de tokens `--color-upm-*` en `index.css`, `components/Brand.tsx`, el `manifest` y los meta OG de `client/index.html`, los `title` de las páginas, y **todos los prefijos de claves de `localStorage` (`upm.*`)** — cambiarlos invalida el estado guardado de los usuarios existentes, así que conviene una migración o mantener las claves viejas.

---

## 14. Mapa rápido de `client/src/lib/`

| Archivo | Rol |
|---|---|
| `auth.tsx` | `AuthProvider`, `useAuth`, `RequireAuth`, guard de storage bloqueado |
| `store.ts` | store global (`useSyncExternalStore`) |
| `sync.ts` | adaptadores de persistencia; `createRestAdapter` → `/me/*` |
| `notes.ts` | notas por norma (`upm.notes.v1`) |
| `data.ts` | `COUNTRIES`, `ACTIVE_COUNTRIES`, `TOPICS`, `DEFAULT_PREFS`, mocks vaciados |
| `types.ts` | `NewsItem`, `Operator`, `Document`, `Preferences`, `Topic`, `DocType`, `Relevance`, … |
| `launch.ts` | flags de alcance del lanzamiento |
| `sources/index.ts` | `fetchLiveFeed`, `fetchFromWorker`, cache, `rank`, `dedupe`, registro de 45 fetchers |
| `sources/*.ts` (44 más) | adaptadores por fuente (dead code en prod) |
| `use-live-feed.ts` | hook del feed + `evaluateAlerts` |
| `use-semantic-search.ts` | `GET /search` híbrido con fallback local |
| `use-citations.ts`, `citations.ts` | grafo de citas entre normas |
| `use-similarity.ts`, `similarity.ts` | normas parecidas |
| `use-news-item.ts` | resuelve un ítem por id |
| `use-jurisprudencia.ts`, `jurisprudencia.ts` | fallos vinculados |
| `use-debounced.ts`, `use-focus-trap.ts` | hooks utilitarios |
| `synonyms.ts` | `matchesQuery` tolerante a sinónimos |
| `pt-es.ts` | `cleanTitle`, `looksPortuguese` (contenido BR) |
| `format.ts` | `formatDate`, `formatDateTime`, `decodeHtml` |
| `permissions.ts` | `roleOf`, `can`, `roleLabel` |
| `visit-tracker.ts`, `watchlist.ts` | snapshot de visita, normas seguidas |
| `telemetry.ts` | `reportError`, `trackEvent` (console + ring buffer de 50) |
| `export-law.ts`, `law-content.ts` | exportación e `isPlaceholderText` |
| `legisladores.ts` | carga async de `public/data/legisladores.json` (personas reales) |
| `clusters.ts`, `trending.ts`, `genealogy.ts`, `impact.ts`, `sectors.ts`, `budget.ts`, `glossary.ts`, `vigencia.ts`, `extract-context.ts`, `source-url.ts`, `share.ts`, `cn.ts` | derivaciones y helpers |

Tests en `client/src/test/`: `ErrorBoundary`, `OverflowActions`, `PageTOC`, `format`, `permissions`, `pt-es`, `sync`, `synonyms` (8 archivos, 42 tests).
