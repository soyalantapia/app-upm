# 10 · Gotchas críticos

**Última actualización:** 2026-07-18 — cada ítem fue verificado leyendo el código en `main` (`ace8dc4`), consultando la DB de producción, golpeando la API con `curl` y leyendo las variables de Railway con `railway variables`. Lo que no pude verificar está marcado **(verificar)**.

**Para qué sirve este documento:** es la lista de trampas que hacen perder horas a quien retome App UPM sin haber estado presente. No explica la arquitectura (eso está en `work-agent/02-ARQUITECTURA.md`) ni los contratos de API (`03-BACKEND-API.md`): explica **qué se rompe, por qué, y cómo verificarlo**. Si vas a tocar build, deploy, ingesta, embeddings, auth o la marca, leé la sección correspondiente ANTES de escribir código.

Convención de severidad:

| Nivel | Significado |
|---|---|
| 🔴 | Rompe producción o te hace perder medio día. Leelo sí o sí. |
| 🟠 | Te hace debuggear en la dirección equivocada. |
| 🟡 | Fricción / confusión. Bueno saberlo. |

---

## 0. Índice rápido

| # | Gotcha | Sev |
|---|---|---|
| A1 | `import.meta.env.VITE_X` **sin** optional chaining (si no, DCE lo borra) | 🔴 |
| A2 | Node del cliente: Vite 8 exige `^20.19.0 \|\| >=22.12.0` | 🟠 |
| A3 | `base: '/app-upm/'` está cableado en 4 lugares distintos | 🟠 |
| A4 | HashRouter: todo va en `#/…`; los ids con `/` rompen rutas | 🟠 |
| A5 | Service worker sirve el bundle viejo tras deployar | 🔴 |
| A6 | El feed se cachea en `localStorage` 5 min / 24 h | 🟠 |
| A7 | Hay 9 claves de `localStorage`; "usuario limpio" = borrarlas todas | 🟡 |
| A8 | `LAUNCH.saveToFolder=false` apaga botones que "no hacen nada" | 🟡 |
| A9 | `COUNTRIES` tiene 8 países pero solo 4 son seleccionables | 🟠 |
| A10 | Si la API cae, el front muestra **vacío** a propósito (no fallback) | 🟠 |
| B1 | Deploy de `gh-pages` es **MANUAL**; push a `main` NO redeploya el front | 🔴 |
| B2 | `docs/` es un build muerto | 🟡 |
| B3 | Deploy backend = `railway up` (sube el directorio), no es git-based | 🟠 |
| B4 | `feat/backend` está **detrás** de `main`, no adelante | 🟠 |
| C1 | `postgres.railway.internal` NO resuelve desde local | 🔴 |
| C2 | `loadConfig()` valida TODO el env aunque tu script use una sola var | 🟠 |
| C3 | Migraciones al boot con `process.exit(1)`: migración mala = no bootea | 🔴 |
| C4 | Los códigos OTP viven en memoria: un redeploy los invalida | 🟠 |
| C5 | El lock de ingesta es in-process (no soporta réplicas) | 🟠 |
| C6 | El proyecto Railway ahora se llama **UPM**, no "zippy-harmony" | 🟡 |
| C7 | CORS: solo `:5188` en localhost | 🟠 |
| C8 | `strictPort: true` en el dev server (5188) | 🟡 |
| C9 | `server/.env` tiene credenciales REALES de prod y los tests las usan | 🔴 |
| D1 | `normas.date` es **TEXT**, no `date` | 🔴 |
| D2 | Cron cada 30 min + boot-if-stale que solo dispara si pasaron >30 min | 🟠 |
| D3 | Brasil inunda el corpus (2362 de 4589 filas hoy) | 🟠 |
| D4 | El cliente pide `/feed` **sin** `?pais=` → el server DEBE balancear | 🔴 |
| D5 | `noiseFilter` oculta filas que igual cuentan en `/health` | 🟡 |
| D6 | Hay fechas **futuras** en el corpus | 🟡 |
| D7 | Cambiar cómo se arma un título obliga a migrar filas + re-embeber | 🟠 |
| D8 | Fechas AR derivadas del número de ley (aproximadas) | 🟠 |
| D9 | `camara-br` está fallando por timeout ahora mismo | 🟡 |
| E1 | **Los embeddings están desactualizados: 2597/4589 (56,6 %)** | 🔴 |
| E2 | Query y passage DEBEN usar el mismo modelo (e5-small, 384 dims) | 🔴 |
| E3 | Cupo Gemini free = por-modelo-por-día; cae bajo ráfaga | 🟠 |
| E4 | `ANTHROPIC_API_KEY` tiene prioridad y **cuesta plata** | 🟠 |
| E5 | Las fuentes se detectan buscando el id literal en el texto del LLM | 🟠 |
| E6 | "Hoy" se inyecta en UTC (desfase nocturno vs Argentina) | 🟡 |
| F1 | `ALLOWED_EMAILS`: fuera de la allowlist el código nunca se manda (y da 200) | 🔴 |
| F2 | `SMTP_PASS` empieza con `=` → sintaxis especial en el CLI | 🟠 |
| F3 | Sin DKIM detectable en `xnod.tech` → riesgo de spam | 🟠 |
| G1 | Los tests de integración del server pegan a la **DB de producción** | 🔴 |
| G2 | `npm audit fix --only=prod` poda las devDeps → "This is not the tsc command" | 🟠 |
| G3 | Scripts fuera del proyecto no resuelven `pg`/`drizzle` → import absoluto | 🟠 |
| G4 | El binario `browse` de gstack puede quedarse sin Chromium | 🟡 |
| G5 | Enums duplicados entre `types.ts` y `schema.ts` (hay test guard) | 🟠 |
| H1 | Los `README.md` están DESACTUALIZADOS y contradicen el código | 🔴 |
| H2 | "UPM" está incrustado en ~10 capas: el rebrand NO es un find-replace | 🔴 |

---

## A · Frontend, Vite y build

### A1 🔴 `import.meta.env.VITE_X` debe ir SIN optional chaining

Vite reemplaza **el patrón textual exacto** `import.meta.env.VITE_UPM_API_URL` por el string literal en build. Si escribís `import.meta.env?.VITE_UPM_API_URL`, el `define` no matchea, la expresión queda como `undefined` en runtime, y **rollup elimina por dead-code-elimination todo el bloque que dependía de esa variable**. El síntoma es brutal: compila, no tira ningún error, y el bundle de producción simplemente no tiene el adapter REST / el fetch a la API. La app "funciona" pero sin backend.

Está documentado en el propio código:

- `client/src/lib/sync.ts:153-155`
- `client/src/lib/use-semantic-search.ts:6-8`

Los cinco lugares que leen `VITE_UPM_API_URL` respetan la regla:

| Archivo | Línea |
|---|---|
| `client/src/lib/sync.ts` | 155 |
| `client/src/lib/sources/index.ts` | 198 |
| `client/src/lib/use-semantic-search.ts` | 8 |
| `client/src/pages/Login.tsx` | 14 |
| `client/src/pages/Assistant.tsx` | 37 |

**Sutileza:** `import.meta.env?.BASE_URL` **sí** usa optional chaining en varios archivos (`client/src/lib/legisladores.ts:33`, `client/src/lib/sources/csjn-ar.ts:20`, etc.) y funciona correctamente en prod. La regla aplica a las variables custom `VITE_*`, no a `BASE_URL`/`DEV`. No "normalices" unas con otras.

**Cómo verificar:**

```bash
# 1) ninguna VITE_ con optional chaining
grep -rn "import\.meta\.env?\.\s*VITE_" /Users/alannaimtapia/dev/app-upm/client/src   # debe dar 0

# 2) la URL de la API tiene que estar EN el bundle compilado
cd /Users/alannaimtapia/dev/app-upm/client && npx vite build >/dev/null
grep -rl "upm-api-production.up.railway.app" dist/assets/    # debe listar al menos index-*.js
```

### A2 🟠 Node para buildear el cliente

`client/node_modules/vite/package.json` declara `engines: { node: "^20.19.0 || >=22.12.0" }`. Node 18, o un 20.x menor a 20.19, revientan el build con errores de esbuild/rollup difíciles de leer.

En esta máquina hay Node **v25.9.0** (`/opt/homebrew/bin/node`, sin nvm instalado) y el build funciona — verificado hoy: `npx tsc -b` exit 0, `npx vite build` OK en 500 ms, `npx vitest run` 42/42.

El server es más laxo: `server/package.json` declara `engines: { node: ">=20" }` y Railway lo resuelve solo.

**Cómo verificar:** `node -v` y compararlo con `node -e "console.log(require('./node_modules/vite/package.json').engines)"` desde `client/`.

### A3 🟠 `base: '/app-upm/'` está cableado en cuatro lugares

Si alguna vez se renombra el repo (probable, ver H2), estos cuatro tienen que cambiar **juntos**:

| Dónde | Qué |
|---|---|
| `client/vite.config.ts:9` | `base: '/app-upm/'` |
| `client/vite.config.ts` (manifest) | `start_url: '/app-upm/'` y `scope: '/app-upm/'` |
| `server/src/config.ts:13` | `STATIC_DATA_BASE` default = `https://soyalantapia.github.io/app-upm/data` |
| `server/src/ingest/util.ts:10` | `User-Agent: upm-api/1.0 (+https://soyalantapia.github.io/app-upm/)` |

Cambiar solo `base` deja la PWA instalada apuntando a un scope inexistente y el fallback de ingesta rompiendo con 404.

### A4 🟠 HashRouter: rutas con `#`, y los `/` dentro de un id rompen todo

`client/src/App.tsx:50` usa `<HashRouter>`. Todas las URLs reales son `https://soyalantapia.github.io/app-upm/#/radar`. Consecuencias:

- Un deep-link sin `#` cae en el Home. No sirve para compartir a mano si lo escribís mal.
- **Los ids de normas no pueden contener `/`.** Ya hubo un fix por esto: Socrata Colombia devuelve números como `"034/22"` y la ruta `/radar/co-ley-034/22` se parseaba como ruta anidada. La normalización vive en `client/src/lib/sources/socrata-co.ts:115-119` (`numero.replace(/[^a-zA-Z0-9]/g, '-')`). Si agregás un fetcher nuevo, sanitizá el id igual.
- En tests, navegar mutando `window.location.hash` no dispara `hashchange` de forma confiable en jsdom. Los 8 archivos de test actuales no ejercitan navegación por hash; si vas a testear rutas, usá `MemoryRouter` en lugar de manipular el hash. **(verificar en la práctica: hoy no hay ningún test de routing en `client/src/test/`)**

### A5 🔴 El service worker te muestra el bundle viejo después de deployar

`client/vite.config.ts` configura `VitePWA` con `registerType: 'autoUpdate'` + `workbox: { clientsClaim: true, skipWaiting: true }`, y `client/src/components/PWAUpdateBanner.tsx` fuerza **una** recarga cuando el SW nuevo toma control (`controllerchange`), con guarda `sessionStorage['upm.sw.reloaded']` para no entrar en loop y con un chequeo `hadController` para no recargar en la primera instalación.

Eso funciona bien para el usuario final. **El problema es cuando vos verificás un deploy**: si ya tenías la app abierta o instalada, es normal seguir viendo la versión anterior por una carga. Vas a debuggear un bug ya arreglado.

**Cómo verificar un deploy correctamente:**

```js
// pegar en la consola del navegador ANTES de recargar
(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister()
  for (const k of await caches.keys()) await caches.delete(k)
  sessionStorage.clear()
  location.reload()
})()
```

O, más rápido y sin navegador — comparar el hash del bundle:

```bash
cd /Users/alannaimtapia/dev/app-upm/client && npx vite build 2>&1 | grep 'dist/assets/index-'
curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
# Si coinciden, gh-pages está al día con tu working tree.
```

Verificado 2026-07-18: build local → `index-DpEQkNiw.js`; gh-pages sirve `index-DpEQkNiw.js`. **El front desplegado está al día con `main`.**

### A6 🟠 El feed vive cacheado en `localStorage`

`client/src/lib/sources/index.ts:60-64`:

```ts
const CACHE_KEY = 'upm.live-feed.v2'
const CACHE_TTL_MS   = 24 * 60 * 60 * 1000  // 24 h · hard expiry
const CACHE_FRESH_MS = 5 * 60 * 1000        // 5 min · no revalida
```

Arreglás algo en el backend, hacés `railway up`, recargás, y no ves el cambio: es este cache. Borralo con `localStorage.removeItem('upm.live-feed.v2')` o forzá con `fetchLiveFeed({ force: true })`.

### A7 🟡 Claves de `localStorage` / `sessionStorage`

Para reproducir "usuario nuevo" hay que borrar todas, no solo la sesión:

| Clave | Archivo | Contenido |
|---|---|---|
| `upm.app.operator` | `client/src/lib/auth.tsx:13` | operador logueado |
| `upm.sync.token.v1` | `client/src/lib/sync.ts:74` | JWT del OTP |
| `upm.app.state` | `client/src/lib/store.ts:6` | prefs, saved, alertas, onboarding |
| `upm.notes.v1` | `client/src/lib/notes.ts:6` | notas |
| `upm.watchlist.v1` | `client/src/lib/watchlist.ts:6` | seguimientos |
| `upm.live-feed.v2` | `client/src/lib/sources/index.ts:60` | cache del feed |
| `upm.visit.snapshot.v1` | `client/src/lib/visit-tracker.ts:7` | "qué cambió desde tu última visita" |
| `upm.telemetry.errors` / `upm.telemetry.events` | `client/src/lib/telemetry.ts:27-28` | telemetría local |
| `upm.alerts.evaluated` (**sessionStorage**) | `client/src/lib/use-live-feed.ts:104` | flag de re-evaluación de alertas |
| `upm.sw.reloaded` (**sessionStorage**) | `client/src/components/PWAUpdateBanner.tsx:15` | anti-loop de recarga del SW |

Ojo con el prefijo `upm.` de cara al rebrand (ver H2).

### A8 🟡 Botones que "no hacen nada" son un feature flag, no un bug

`client/src/lib/launch.ts`:

```ts
export const LAUNCH = { saveToFolder: false as boolean }
```

Apaga el botón **Guardar** del Asistente y del detalle de novedad, porque su destino ("Mi carpeta") está oculto del lanzamiento. La página de Leyes tiene su **propio** guardado con pestaña "Guardadas" que NO depende de este flag.

Además hay 4 rutas huérfanas a propósito (`/briefing`, `/biblioteca`, `/carpetas`, `/estadisticas`): existen para no romper deep-links, pero están fuera de la navegación de `AppShell`.

### A9 🟠 8 países en la constante, 4 con corpus

`client/src/lib/data.ts:14-23` define `COUNTRIES` con AR, BR, UY, PY, CL, BO, PE, CO. Pero:

```ts
export const ACTIVE_COUNTRY_CODES: CountryCode[] = ['AR', 'CO', 'UY', 'BR']
```

`COUNTRIES` quedó **solo como tabla de lookup** para `countryByCode()`. Todo selector de UI (Onboarding, Preferencias, Perfil, filtros del Radar) debe usar `ACTIVE_COUNTRIES`. Si usás `COUNTRIES` por error, el legislador puede elegir Chile y el Radar le queda vacío (el filtro es duro). Esto ya fue un bug reportado en la auditoría de lanzamiento y está arreglado — no lo reintroduzcas.

El enum de la DB (`country_code`) sí tiene los 8: `server/src/db/schema.ts:15`. No los saques, romperías la migración.

### A10 🟠 Con la API caída, el front muestra vacío A PROPÓSITO

`client/src/lib/sources/index.ts:243-256`: si `VITE_UPM_API_URL` está seteada pero `/feed` falla, **no** se cae a los fetchers del cliente — se devuelve un feed vacío y la UI muestra un EmptyState honesto. La decisión: en producción el 100 % de los datos sale de la DB, nunca de scraping client-side.

Corolario: todo `client/src/lib/sources/*.ts` (salvo `index.ts`) es **código muerto en producción**. Sigue ahí para el modo demo sin backend (`VITE_UPM_API_URL` vacío). No pierdas tiempo debuggeando un fetcher del cliente para arreglar un problema de datos de prod: el problema está en `server/src/ingest/`.

---

## B · Deploy

### B1 🔴 El deploy del front a `gh-pages` es MANUAL

**No hay GitHub Actions.** Verificado: no existe el directorio `.github/` en el repo, y no hay ningún script de deploy en `package.json`. Hacer push a `main` **no** actualiza https://soyalantapia.github.io/app-upm/.

El procedimiento es worktree + rsync (el que se usó en todos los deploys del historial):

```bash
cd /Users/alannaimtapia/dev/app-upm/client
npx vite build                        # verifica el hash que sale

cd /Users/alannaimtapia/dev/app-upm
rm -rf /tmp/upm-ghpages
git worktree add /tmp/upm-ghpages gh-pages
rsync -a --delete --exclude .git client/dist/ /tmp/upm-ghpages/
touch /tmp/upm-ghpages/.nojekyll        # imprescindible: sin esto Jekyll come /assets
cd /tmp/upm-ghpages && git add -A && git commit -m "deploy: <bundle>" && git push origin gh-pages
cd /Users/alannaimtapia/dev/app-upm && git worktree remove /tmp/upm-ghpages
```

El `.nojekyll` ya está en la rama (verificado con `git ls-tree --name-only origin/gh-pages`), pero el `rsync --delete` lo borra si no lo volvés a crear.

### B2 🟡 `docs/` es un build muerto

Contiene un build viejo (`docs/assets`, `docs/sw.js`, `docs/workbox-9c191d2f.js`) de cuando GitHub Pages servía `/docs`. **Ya no se sirve desde ahí.** No lo regeneres, no lo edites, no lo borres sin avisar (es histórico inofensivo).

### B3 🟠 El backend se deploya subiendo el directorio, no desde git

No hay `railway.json`, `railway.toml`, `nixpacks.toml`, `Procfile` ni `Dockerfile` en el repo. Railway usa Nixpacks autodetectado. El deploy es:

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway up --detach     # ya linkeado: Project=UPM, Environment=production, Service=upm-api
```

`railway up` **sube el contenido local del directorio**, respetando `server/.railwayignore` (`node_modules/`, `dist/`, `.env`). Implicaciones:

- Lo que se deploya es tu working tree, **no** lo que está commiteado. Podés deployar cambios sin commitear (y perderlos).
- `server/data/` **sí** se sube, y es necesario: los fetchers de JSON curados lo usan como segundo candidato (ver D12).
- `.env` NO se sube: la config de prod vive en las variables de Railway.

### B4 🟠 `feat/backend` está DETRÁS de `main`, no adelante

Verificado hoy:

```
origin/main         ace8dc4  merge: feat/backend -> main
origin/feat/backend 1b9a71b  fix(seguridad): upgrade drizzle-orm 0.38→0.45.2
git rev-list --count origin/main..origin/feat/backend   → 0
git rev-list --count origin/feat/backend..origin/main   → 10   (todos merge commits)
```

Es decir: **`feat/backend` no tiene nada que `main` no tenga**. Notas viejas dicen "feat/backend es la rama de deploy de Railway": eso es engañoso hoy, porque el deploy es por `railway up` (B3), no por git. **Trabajá sobre `main`.** El working tree local está limpio y sincronizado con `origin/main` (`ace8dc4`); lo único sin trackear es `work-agent/`.

---

## C · Backend, Railway y base de datos

### C1 🔴 `postgres.railway.internal` no resuelve desde tu máquina

La variable `DATABASE_URL` del servicio `upm-api` en Railway apunta a `postgres.railway.internal:5432` — dominio de la red privada de Railway. Desde tu laptop **no resuelve** (falla con `ENOTFOUND` / `EAI_AGAIN`) y vas a creer que la DB está caída.

Para cualquier cosa local (migraciones, `npm run embed`, scripts de auditoría, tests) usá la **`DATABASE_PUBLIC_URL`** del servicio `Postgres` en el dashboard de Railway. Es la que ya está en `server/.env`, apuntando al proxy público:

```
postgresql://postgres:<pass>@acela.proxy.rlwy.net:23222/railway
```

Además, desde fuera hace falta SSL permisivo. `server/src/embed/run.ts:11` lo resuelve condicionalmente:

```ts
ssl: /rlwy\.net|railway/.test(config.DATABASE_URL) ? { rejectUnauthorized: false } : undefined
```

Replicá ese patrón en cualquier script nuevo.

### C2 🟠 `loadConfig()` valida TODO el env, no solo lo que usás

`server/src/config.ts` valida el schema Zod completo y **tira** si falta algo: `DATABASE_URL` (min 1) y `JWT_SECRET` (**mín 16 chars**) son obligatorios. Un script que solo quiere leer la DB (como `src/embed/run.ts`, que llama `loadConfig()` en la línea 8) igual va a explotar si no le das `JWT_SECRET`.

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="<DATABASE_PUBLIC_URL>" JWT_SECRET="dummy-para-que-pase-el-zod" npm run embed
```

### C3 🔴 Migración mala = el server no arranca

`server/src/index.ts:15-21` corre `migrate(db, { migrationsFolder: './drizzle' })` al boot, y ante error hace `console.error` + **`process.exit(1)`**. Railway va a reiniciar en loop y el servicio queda caído.

Antes de deployar un cambio de schema: generá con `npm run db:generate`, revisá el SQL en `server/drizzle/`, y aplicalo primero a mano contra la `DATABASE_PUBLIC_URL` (`npm run db:migrate` con esa URL). El migrator es idempotente (drizzle lleva su journal en la DB), así que aplicar antes de deployar no rompe nada.

### C4 🟠 Los códigos OTP viven en memoria

`server/src/lib/otp.ts:6` — `const store = new Map<string, Entry>()`. El propio archivo lo aclara: "un redeploy invalida los códigos pendientes". Parámetros reales:

| Constante | Valor |
|---|---|
| `TTL_MS` | 10 min |
| `RESEND_COOLDOWN_MS` | 60 s por email (segundo pedido antes del minuto → **429** con `retryAfterMs`) |
| `MAX_ATTEMPTS` | 5 |
| single-use | sí, `store.delete(email)` tras verificar OK |

Si escalás a más de una réplica en Railway, el login **se rompe silenciosamente**: el código se emite en la instancia A y se verifica en la B. Antes de escalar horizontalmente hay que mover el store a la DB o a Redis.

### C5 🟠 El lock de ingesta también es in-process

`server/src/ingest/run.ts:29` — `let running = false`. Sirve para que el cron no se solape consigo mismo dentro del mismo proceso. Con múltiples réplicas, dos ingestas concurrentes. El upsert es idempotente (`ON CONFLICT DO UPDATE` por `id`), así que no corrompe datos, pero duplica el trabajo y el ancho de banda contra las fuentes oficiales.

### C6 🟡 El proyecto Railway se llama "UPM", no "zippy-harmony"

Notas viejas (y `work-agent/02-ARQUITECTURA.md`) dicen proyecto "zippy-harmony". Verificado hoy con `railway status` y `railway variables`:

```
RAILWAY_PROJECT_NAME = UPM
RAILWAY_PROJECT_ID   = 61cac5bf-f54d-4667-bb91-518d65a482d6
RAILWAY_SERVICE_NAME = upm-api
RAILWAY_SERVICE_ID   = 4fac7d50-4855-44a7-8e20-0f338bfb17a4
RAILWAY_ENVIRONMENT  = production
```

El **project id coincide** con el histórico (`61cac5bf-…`): es el mismo proyecto, renombrado. Si buscás "zippy-harmony" en el dashboard no lo vas a encontrar.

Variables actualmente seteadas en `upm-api` (valores sensibles omitidos): `ALLOWED_EMAILS`, `ALLOWED_ORIGINS`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, `JWT_SECRET`, `NODE_ENV=production`, `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_USER=ia@xnod.tech`, `SMTP_PASS`, `SMTP_FROM=App UPM <ia@xnod.tech>`. **No** están seteadas `ANTHROPIC_API_KEY`, `STATIC_DATA_BASE`, `PORT`, `JWT_TTL`, `SEMANTIC_SEARCH` — todas caen a su default.

### C7 🟠 CORS: solo el puerto 5188

`ALLOWED_ORIGINS` en Railway = `https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188`. Si levantás el cliente en otro puerto (o en `0.0.0.0`), todas las llamadas a la API fallan con error de CORS y en la consola parece un problema de red. Agregá el origen a la variable o usá el puerto correcto.

### C8 🟡 `strictPort: true` en el dev server

`client/vite.config.ts:37-41`: puerto **5188**, host `127.0.0.1`, `strictPort: true`. Si el 5188 está ocupado, Vite **no** salta al siguiente: falla. (El 3000 lo usa My Alquiler / Llave en esta máquina; el server de UPM en dev usa el `PORT` de `server/.env`.)

### C9 🔴 `server/.env` tiene credenciales de producción y los tests las usan

`server/.env` (gitignored, correcto) contiene la `DATABASE_PUBLIC_URL` con contraseña, el `JWT_SECRET` y `ALLOWED_ORIGINS` **reales de producción**. Y `server/test/integration/api.test.ts:8-12` lo parsea a mano (sin dotenv) para levantar el app.

**Conclusión: `npm test` en `server/` corre contra la base de datos de PRODUCCIÓN.** Hoy los asserts son de lectura, pero es una bomba: cualquier test nuevo que escriba toca prod. Si vas a agregar tests que muten datos, levantá un Postgres local primero.

Otras cosas que hace ese archivo de test y conviene saber (líneas 14-17):

```ts
delete process.env.ANTHROPIC_API_KEY   // fuerza la rama 503 del asistente
delete process.env.GEMINI_API_KEY
process.env.SEMANTIC_SEARCH = 'off'    // /search en FTS puro (no carga transformers.js)
```

Por eso los tests nunca ejercitan el camino real del LLM ni el de embeddings.

Nota de repo: `client/.env.production` **sí está trackeado en git** (`.gitignore` cubre `.env` y `.env.local`, no `.env.production`). Solo contiene `VITE_UPM_API_URL`, sin secretos — pero cambiar la URL de la API requiere commit + rebuild + redeploy manual del front.

---

## D · Corpus, ingesta y datos

### D1 🔴 `normas.date` es una columna **TEXT**

`server/src/db/schema.ts:41`:

```ts
date: text('date').notNull(),   // ISO string tal cual — el front ordena con localeCompare
```

Comparaciones y ordenamientos son **lexicográficos sobre `'YYYY-MM-DD'`**, no de fecha. Funciona porque el formato ISO ordena bien como string, pero:

- `where date > '2026-07-18'` es una comparación de strings. Si algún fetcher mete `'18/07/2026'` o un ISO con hora, el orden se rompe silenciosamente.
- No podés hacer `date - interval '7 days'` sin castear: `date::date`.
- El índice `normas_date_idx` está sobre `t.date.desc()` (texto). Un cast en el WHERE lo invalida.

Cualquier script ad-hoc: filtrá y comparά siempre como `'YYYY-MM-DD'`.

### D2 🟠 El cron corre cada 30 min y el boot-if-stale casi nunca dispara

`server/src/index.ts`:

- `cron.schedule('*/30 * * * *', …)` — línea 41.
- `bootIngestIfStale()` — líneas 24-38: **solo** ingesta si `count === 0` **o** si el último run terminó hace **más de 30 min** (`staleMs = 30 * 60 * 1000`).

Consecuencia práctica: si deployás justo después de una corrida del cron, el server arranca y **no ingesta nada**; tenés que esperar hasta 30 min para ver datos nuevos. No es un bug, es el diseño (evita martillar las fuentes oficiales en cada redeploy).

Para forzar una ingesta ya:

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="<DATABASE_PUBLIC_URL>" JWT_SECRET="dummy-16-chars-min" npm run ingest
```

**Cómo verificar que el cron está vivo:**

```bash
curl -s https://upm-api-production.up.railway.app/health
# 2026-07-18 → {"ok":true,"db":"up","lastIngest":{"finishedAt":"2026-07-18T14:00:16.001Z",
#               "okSources":38,"failedSources":1,"itemsUpserted":1988},
#               "itemCount":4589,"uptime":2380690}
```

`uptime: 2380690` s ≈ **27,5 días sin reiniciar** — el proceso viene del deploy del 2026-06-20. Todo lo que se ingirió desde entonces lo hizo el cron.

### D3 🟠 Brasil inunda el corpus

La Câmara dos Deputados publica ~150 proposiciones por día. Composición real de la DB hoy (2026-07-18):

| País | Filas | Con embedding |
|---|---|---|
| BR | 2833 | 915 |
| AR | 1081 | 1081 |
| CO | 526 | 476 |
| UY | 149 | 125 |
| **Total** | **4589** | **2597** |

Por fuente: `camara-br` 2362, `leyes-infoleg-ar` 400, `eventos-camara-br` 241, `votacoes-camara-br` 200, `leyes-presidencia-co` 110, `leyes-co` 100, `sentencias-corte-co` 91, `decretos-presidencia-co` 80.

En junio el corpus era ~2600 filas; hoy 4589 y **casi todo el crecimiento es BR**. La DB crece sin tope: no hay retención ni purga. En algún momento hay que decidir una política (archivar procesales BR viejos, o al menos dejar de embeberlos).

### D4 🔴 El cliente pide `/feed` SIN filtro de país — el server DEBE balancear

`client/src/lib/sources/index.ts:203` (`fetchFromWorker`) hace `fetch(\`${WORKER_URL}/feed\`)`, **sin ningún query param**, y después rankea client-side según las preferencias del legislador (`rank(dedupe(items), prefs)`).

Por eso `server/src/routes/feed.ts` tiene `balancedRows()` (líneas 76-98): toma los **130 más recientes de CADA país** y los mergea por fecha, capeado a 500.

```ts
const FEED_LIMIT = 500
const PER_COUNTRY = 130
```

**Si alguien "simplifica" esto a un `ORDER BY date DESC LIMIT 500` global, Brasil se come el payload entero y un legislador argentino ve ~0 normas de Argentina.** Ese fue un bug crítico real (commit `0e935d9`). El comentario en el código lo explica; no lo borres.

Con `?pais=XX` explícito sí se filtra server-side (y `balancedRows` no se usa). Lo mismo aplica a `/laws`.

**Cómo verificar:**

```bash
curl -s https://upm-api-production.up.railway.app/feed \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const b={};for(const i of j.items)b[i.country]=(b[i.country]||0)+1;console.log(j.items.length,b)})"
# 2026-07-18 → 500 { BR: 130, UY: 110, CO: 130, AR: 130 }   ✅ balanceado
```

(UY da 110 porque tiene menos filas recientes que el tope, no porque falle el balanceo.)

### D5 🟡 `noiseFilter` oculta filas que igual cuentan en `/health`

`server/src/routes/feed.ts:19`:

```ts
export const noiseFilter = sql`${normas.id} not like 'br-votacao%' and ${normas.id} not like 'br-evento%'`
```

Se aplica a `/feed`, `/laws`, `/search` y al RAG del asistente (`server/src/search.ts` lo replica como string crudo `NOISE_SQL` para inyectarlo en los CTE). **No borra nada**: las filas siguen en la DB.

Trampa: `/health` reporta `itemCount: 4589` (`count(*)` sin filtro, `server/src/routes/health.ts:19`), pero el usuario nunca ve ~300 de esas (138 `br-votacao*` + 162 `br-evento*`). Si contás filas para "validar el corpus", aplicá el mismo filtro o vas a comparar peras con manzanas.

Si desactivás el filtro, el `NOISE_SQL` de `search.ts:5` y el `noiseFilter` de `feed.ts:19` tienen que cambiar **juntos** — son el mismo predicado escrito dos veces.

### D6 🟡 Hay fechas futuras en el corpus

Verificado hoy (2026-07-18): existe `br-evento-82755` con `date = '2026-07-21'` (una visita técnica de la agenda de la Câmara, fuente `eventos-camara-br`). Es esperable: son eventos agendados. Rango total del corpus: `1927-06-15` → `2026-07-21`.

Consecuencia: cualquier lógica de "lo más reciente" que ordene por `date DESC` va a poner eventos futuros arriba. Hoy quedan tapados porque `br-evento*` cae en el `noiseFilter`, pero si sacás el filtro o agregás una fuente con agenda, el "¿qué salió hoy?" del asistente empieza a mentir.

### D7 🟠 Cambiar cómo se arma un título obliga a migrar filas Y a re-embeber

Precedente: los títulos de Brasil eran `${sigla} ${numero}/${ano}`, lo que colapsaba cientos de pareceres al mismo texto ("Parecer do Relator 1/2026" ×97). El fix (`28d5aa8`) usa la **ementa** como título — `server/src/ingest/fetchers/camara-br.ts:52-66`:

```ts
title: ementa ? (ementa.length > 110 ? ementa.slice(0, 107) + '…' : ementa) : `${docLabel} · Brasil`
```

Pero el fetcher solo trae las últimas ~30 proposiciones, así que las ~744 históricas hubo que migrarlas con un script ad-hoc derivando el título del `excerpt`.

**Regla:** si cambiás la forma de derivar `title` / `excerpt` / `fullText`:

1. Migrá las filas existentes (el fetcher no las va a volver a visitar).
2. Poné `content_hash = NULL` en esas filas, para que `npm run embed` las detecte como pendientes. `server/src/embed/run.ts:27-30` decide qué re-embeber comparando `contentHash(title, excerpt, full_text)` contra la columna `content_hash`.

Si te olvidás del paso 2, el embedding queda apuntando a un texto que ya no existe y la búsqueda semántica devuelve resultados incoherentes con lo que se muestra.

### D8 🟠 Las fechas de leyes AR son derivadas, no reales

`server/src/ingest/fetchers/hcdn-ar.ts:140`:

```ts
const date = deriveLeyDate(leyNum) ?? new Date().toISOString().slice(0, 10)
```

Los JSON curados de leyes argentinas no traen fecha. Antes se estampaba `today`, lo que hacía que "¿qué ley salió hoy?" reportara leyes de 2017 como del día. El fix deriva un año aproximado del número de ley (`deriveLeyDate`, líneas 85-125) y solo cae a `today` como último recurso.

**Las fechas de esas leyes AR son aproximaciones, no la fecha de publicación en el Boletín Oficial.** No las uses para nada legalmente relevante sin enriquecer la fuente primero.

### D9 🟡 `camara-br` está fallando ahora mismo (y no pasa nada)

Estado actual de la tabla `sources`: una sola fuente con `last_ok = false`:

```
camara-br | TimeoutError: The operation was aborted due to timeout
```

Por eso `/health` dice `failedSources: 1` y `/sources` devuelve 39 fuentes con 38 ok. Es flakiness de la API de la Câmara, no un bug del código.

El aislamiento por fuente está garantizado en `server/src/ingest/run.ts:38-46`: cada fetcher se resuelve con `.then(ok, err)` y una fuente caída se registra en `sources.lastError` **sin abortar el run**. El timeout de red es de 15 s por defecto (`server/src/ingest/util.ts:8`).

### D10 🟡 Semántica del upsert

`server/src/ingest/run.ts`: upsert por `id` con `ON CONFLICT DO UPDATE`, en batches de 100. Dos detalles que sorprenden:

- `firstSeenAt` **nunca** se pisa (comentario explícito en el código); `lastSeenAt` sí.
- Hay dedupe in-batch keep-first (`new Map(items.map(it => [it.id, it]))`, línea 84) porque **Postgres no permite que un `ON CONFLICT` toque la misma fila dos veces en el mismo statement**. Si una fuente emite el mismo id dos veces sin ese dedupe, el insert explota entero.
- Antes de tocar la DB corre `isValid()` (líneas 10-21), que valida contra los enums. Un valor fuera del enum se **descarta silenciosamente** (no aparece en el corpus y no hay error). Si agregaste un topic/tipo nuevo y "no ingesta nada", es esto.

### D11 🟡 `server/data` es un snapshot manual de `client/public/data`

`npm run sync-data` = `rm -rf data && cp -r ../client/public/data ./data`. Hoy los dos directorios son idénticos (verificado con `diff <(ls server/data) <(ls client/public/data)`): 11 archivos (`csjn-ar.json`, `hcdn-exp.json`, `impo-uy.json`, `infoleg-ar.json`, `legisladores.json`, `leyes-ar.json`, `leyes-destacadas-ar.json`, `leyes-uy.json`, `scj-uy.json`, `stf-br.json`, `tcu-br.json`).

Si editás un JSON curado en `client/public/data` y **no** corrés `sync-data` + `railway up`, el backend sigue ingiriendo la versión vieja.

### D12 🟡 Dependencia circular front↔back en los JSON estáticos

`server/src/ingest/util.ts:19-35` busca cada `<id>.json` en este orden:

1. `../../../client/public/data` (monorepo, dev)
2. `../../../../client/public/data`
3. `../../data` → **`server/data`** (el snapshot que viaja a Railway)
4. Fallback HTTP: `${STATIC_DATA_BASE}/<id>.json` → por default `https://soyalantapia.github.io/app-upm/data/…`

O sea: **el backend puede terminar leyendo datos del front desplegado en GitHub Pages.** Hoy no pasa porque `server/data` viaja en el deploy (`.railwayignore` no lo excluye). Pero si alguien agrega `data/` al `.railwayignore` "para achicar el bundle", la ingesta pasa a depender de que gh-pages esté publicado y con los JSON.

---

## E · IA, embeddings y búsqueda semántica

### E1 🔴 Los embeddings están desactualizados — 2597/4589 (56,6 %)

Este es probablemente el hallazgo más importante de esta revisión. El 2026-06-20 el corpus estaba al **100 %** embebido (2597/2597). Hoy:

```
total: 4589 · con embedding: 2597 · SIN embedding: 1992
```

Desglose de los que faltan, por prefijo de id:

| Prefijo | Sin embedding |
|---|---|
| `br-camara` | 1618 |
| `br-evento` | 162 |
| `br-votacao` | 138 |
| `co-pres` | 50 |
| `uy-*` | 2 |

**Causa raíz:** `npm run embed` es un job **MANUAL** que corre **fuera de Railway** (el modelo local `Xenova/multilingual-e5-small` vía transformers.js consumiría demasiada RAM en el servicio). Nadie lo corre desde el 20 de junio, y el cron ingesta ~2000 filas/día. **La brecha crece todos los días.**

Consecuencia funcional: esas 1992 normas son **invisibles para la búsqueda semántica** (el CTE `vec` en `server/src/search.ts:63` filtra `where embedding is not null`). Solo aparecen si matchean por FTS. La mayoría es ruido procesal de BR, pero hay ~50 normas de Presidencia de Colombia que sí son sustantivas.

**Cómo verificar:**

```bash
cd /Users/alannaimtapia/dev/app-upm/server
node --input-type=module -e "
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
import fs from 'node:fs'
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)\$/m)[1].trim()
const pool = new pg.Pool({ connectionString: url, ssl:{rejectUnauthorized:false} })
console.log((await pool.query('select count(*)::int total, count(embedding)::int emb from normas')).rows)
await pool.end()"
```

**Cómo arreglarlo** (incremental por `content_hash`, ~4 filas/s con el modelo local → ~8 min para 2000):

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="<DATABASE_PUBLIC_URL>" JWT_SECRET="dummy-16-chars-min" npm run embed
```

**Decisión pendiente que hay que tomar:** o se automatiza (job programado, o embeber en el pipeline de ingesta con un modelo por API), o se filtra a normas sustantivas (excluyendo `br-camara` procesal). Hoy no hay ningún mecanismo que lo mantenga al día.

Infraestructura verificada en la DB de prod: PostgreSQL **18.4**, extensiones `vector 0.8.2`, `pg_trgm 1.6`, `unaccent 1.1`.

### E2 🔴 Query y passage tienen que usar el MISMO modelo de embeddings

La columna es `vector(384)` con índice HNSW cosine, poblada con `Xenova/multilingual-e5-small` (transformers.js, q8, local, sin API key). `embedQuery` y `embedPassage` viven en `server/src/embed/embedder.ts`.

Si cambiás de proveedor (Voyage, OpenAI, Gemini embeddings):

1. Cambia la dimensión → hay que alterar la columna y **recrear el índice HNSW**.
2. Hay que **re-embeber el corpus entero**. Mezclar espacios vectoriales no da error: da resultados basura, silenciosamente.

El embedder está pensado como pluggable, pero la migración de datos no es opcional.

### E3 🟠 `SEMANTIC_SEARCH=off` degrada a FTS puro

`server/src/search.ts:15`:

```ts
const SEMANTIC_ENABLED = (process.env.SEMANTIC_SEARCH ?? 'on').toLowerCase() !== 'off'
```

Es la única variable de entorno del server que **no** pasa por `config.ts` (se lee directo de `process.env`). Con `off`, `hybridSearch` devuelve `mode: 'fts'` y nunca carga transformers.js. Es lo que hacen los tests.

El fallback también es automático: si el embedding de la query falla por lo que sea, `tryEmbedQuery` devuelve `null` y cae a FTS. Cero regresión, pero **el `mode` del envelope de `/search` es tu único indicador de que la semántica está viva**.

```bash
curl -s "https://upm-api-production.up.railway.app/search?q=protecci%C3%B3n%20de%20glaciares%20y%20agua" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('mode',j.mode);j.items.slice(0,3).forEach((it,i)=>console.log(i+1,it.id,it.title.slice(0,50)))})"
# 2026-07-18 → mode hybrid · #1 ar-ley-27804 · #2 ar-ley-26639 (Ley de Glaciares)  ✅
```

### E4 🟠 Cupo de Gemini free tier: por-modelo-por-día, y cae bajo ráfaga

El límite del free tier es `GenerateRequestsPerDayPerProjectPerModel`: **cada modelo tiene su propio balde diario**. Testear fuerte agota el cupo de un modelo (ya pasó con `flash-lite`). Resetea a medianoche Pacific.

`server/src/llm.ts:59-62` mitiga rotando una cadena de modelos:

```ts
const fallbacks = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash-lite']
return [...new Set([primary, ...fallbacks])]
```

Lógica de reintento (líneas 87-113): **ronda 1** recorre toda la cadena saltando al siguiente modelo ante 429/500/503; después duerme 3 s; **ronda 2** reintenta solo el primario. Cualquier otro status corta de una. Si se agota todo, tira → `assistant.ts:139` responde **502**.

Además, bajo ráfaga (varios requests por minuto) el free tier da 502 y latencias >45 s; se auto-recupera. Un usuario espaciado ve 1,5–7 s. **Esto está ACEPTADO para el lanzamiento** — fue una decisión explícita, no un pendiente olvidado.

Verificado hoy con una llamada real: `provider: "gemini:gemini-2.5-flash"`, 2,66 s, `usage {input_tokens: 1187, output_tokens: 235}`, citó `ar-ley-26639` y `ar-ley-27804` correctamente.

### E5 🟠 `ANTHROPIC_API_KEY` tiene prioridad y **cuesta plata**

`server/src/llm.ts:21-25`:

```ts
if (config.ANTHROPIC_API_KEY) return anthropicLlm(config.ANTHROPIC_API_KEY)
if (config.GEMINI_API_KEY)    return geminiLlm(config.GEMINI_API_KEY, config.GEMINI_MODEL)
return null   // → POST /assistant responde 503
```

Setear `ANTHROPIC_API_KEY` en Railway cambia el proveedor a `claude-sonnet-4-6` **sin ningún cambio de código y sin aviso**. Es la salida para escalar más allá del free tier, pero es una decisión de costo. Hoy **no** está seteada (verificado): la app corre 100 % con Gemini.

Sin ninguna key, `/assistant` devuelve 503 y el front muestra un mensaje honesto (ya no hay fallback a respuestas simuladas: se eliminó `respond.ts` y `rag.ts`).

### E6 🟠 Las fuentes se detectan buscando el id LITERAL en el texto del modelo

`server/src/routes/assistant.ts:120`:

```ts
const cited = context.filter(n => content.includes(n.id))
```

Las `SourceCards` y el badge "Con fuentes UPM" (`isInstitutional: sourcesOut.length > 0`) dependen de que el LLM **escriba el id textual** (ej. `[ar-ley-26639]`) en su respuesta.

Si tocás el `SYSTEM_PROMPT` de forma que el modelo deje de imprimir los ids — por ejemplo pidiéndole que cite "por nombre de ley" o que sea más prosaico —, las fuentes desaparecen de la UI y toda respuesta pasa a "Respuesta general". Parece un bug de front y está en el prompt. Cualquier cambio de prompt: verificá `sources` en la respuesta de `/assistant`.

### E7 🟡 "Hoy" se inyecta en UTC

`server/src/routes/assistant.ts:105`:

```ts
const today = new Date().toISOString().slice(0, 10)
```

`toISOString()` es UTC. De 21:00 a 00:00 en Argentina (UTC-3), el asistente cree que ya es el día siguiente. Con `date` siendo TEXT `'YYYY-MM-DD'` y las fuentes publicando por día local, hay una ventana nocturna donde "¿qué salió hoy?" responde raro. Menor, pero explica reportes confusos.

### E8 🟡 Parámetros del RAG (por si "el asistente no ve una norma que existe")

| Parámetro | Valor | Dónde |
|---|---|---|
| Normas en contexto | 6 (10 si hay intención de recencia) | `assistant.ts:69, 87` |
| Excerpt recortado | 360 chars | `assistant.ts:97` |
| `maxTokens` de salida | 1500 | `assistant.ts:109` |
| Query de retrieval | concatena los **últimos 3 turnos del usuario** | `assistant.ts:60-65` |
| Recencia | `RECENCY_RE` (`assistant.ts:13-14`) antepone las 8 más nuevas por fecha | `assistant.ts:73-86` |
| RRF | `k = 60`, top-40 vectorial + top-40 FTS | `search.ts:16, 61-72` |

Con 6 normas de contexto, una norma real puede quedar afuera perfectamente. No es alucinación ni corpus faltante: es el tope de retrieval.

### E9 🟡 `sql.raw` en el CTE de búsqueda

`server/src/search.ts:58`:

```ts
const vecLit = sql.raw(`'[${vec.join(',')}]'::vector`)
```

Es seguro **hoy** porque `vec` viene del embedder local y son floats. Pero es `sql.raw`: nunca hagas pasar texto del usuario por ahí. Lo mismo con `sql.raw(NOISE_SQL)` (constante literal, no input).

Contexto: se subió `drizzle-orm` de 0.38 a 0.45.2 en `1b9a71b` justo por una vulnerabilidad high de inyección SQL en identificadores. No bajes la versión.

---

## F · Auth OTP y email

### F1 🔴 `ALLOWED_EMAILS`: fuera de la allowlist NO llega el código, y la API responde 200

`server/src/routes/auth.ts:36-38 y 50`:

```ts
const allowed = (email) => config.allowedEmails.length === 0 || config.allowedEmails.includes(email.toLowerCase())
…
if (!allowed(email)) return { ok: true }   // anti-enumeración: 200 sin mandar nada
```

Es una defensa deliberada contra enumeración de usuarios. Pero el síntoma para quien no lo sabe es desesperante: **"pedí el código, la API me dio 200 OK, y el mail nunca llega"**. No hay error, no hay log, no hay nada.

Valor actual en Railway: `ALLOWED_EMAILS = alannaimtapia@gmail.com,ia@xnod.tech`. **Cualquier legislador que se quiera loguear tiene que estar en esa lista.**

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --set "ALLOWED_EMAILS=alannaimtapia@gmail.com,ia@xnod.tech,nuevo@dominio.com"
```

Si la variable queda **vacía**, `allowedEmails.length === 0` → **cualquier email del mundo puede pedir un código**. No la borres "para simplificar".

Otro 503 posible: si `smtpConfigured` es false (falta `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS`), `/auth/request-code` devuelve **503 `email no configurado`** antes de mirar la allowlist.

### F2 🟠 `SMTP_PASS` empieza con `=`

La contraseña de Hostinger arranca con `=`, y el CLI de Railway parte el argumento en el **primer** `=`. Hay que duplicarlo:

```bash
railway variables --set "SMTP_PASS==elrestodelapass"
```

Si lo hacés mal, la variable queda vacía o truncada, `smtpConfigured` sigue dando true (la var existe) y el envío falla con **502 `no se pudo enviar el email`**.

### F3 🟠 Entregabilidad: SPF y DMARC sí, DKIM no lo encontré

Verificado hoy con `dig` sobre `xnod.tech`:

| Registro | Estado |
|---|---|
| SPF | ✅ `v=spf1 include:_spf.mail.hostinger.com ~all` |
| DMARC | ✅ `v=DMARC1; p=none; rua=mailto:ia@xnod.tech; fo=1; adkim=r; aspf=r` |
| DKIM | ❌ sin respuesta en los selectores probados: `hostingermail`, `hostingermail1`, `hostingermail2`, `default`, `dkim`, `hostinger` |

**(verificar)** — puede ser que Hostinger use otro selector. Pero si realmente no hay DKIM, con `DMARC p=none` los mails de OTP pueden caer en spam de Gmail/Outlook, y el síntoma es idéntico al de F1 ("no me llega el código"). Antes de debuggear código, revisá la carpeta de spam y el panel de Hostinger.

### F4 🟡 Detalles del transporte SMTP

- `server/src/lib/mailer.ts:15`: `secure: config.SMTP_PORT === 465`. Puerto 465 = TLS implícito; cambiar a 587 activa STARTTLS automáticamente. **No hay que tocar código para migrar de proveedor**, solo las `SMTP_*`.
- El `transporter` se cachea en un módulo (`let transporter` en la línea 7): un cambio de credenciales **requiere reiniciar el servicio**, no basta con cambiar la variable.
- Config actual: `smtp.hostinger.com:465`, user/from `ia@xnod.tech`, `SMTP_FROM = "App UPM <ia@xnod.tech>"`.

### F5 🟡 JWT y sesión

- `server/src/plugins/auth.ts`: HS256, `sub = email`, TTL por `JWT_TTL` (default **7d**).
- Rotar `JWT_SECRET` **desloguea a todos** de golpe (los tokens guardados en `upm.sync.token.v1` dejan de validar y `/me/*` empieza a dar 401).
- **`POST /auth/login` ya no existe** (eliminado en `129eaa91`/`129ea91`: era el backdoor de la demo, cualquier email → JWT 30d). No lo re-agregues "para testear rápido". Verificado: la lista de endpoints de `GET /` ya no lo menciona.
- `deriveName()` (`server/src/routes/auth.ts:14-20`) **inventa** el nombre a partir del handle del email (`martin.pereira@…` → "Martin Pereira") y hardcodea `cargo: 'Legislador'`, `pais: 'AR'`. Editable después desde el perfil, pero explica por qué un usuario nuevo aparece como argentino.

---

## G · Testing, tooling y entorno

### G1 🔴 (ver C9) Los tests del server pegan a producción

Repetido acá porque es fácil de pasar por alto: `server/test/integration/api.test.ts` lee `server/.env` y usa la `DATABASE_PUBLIC_URL` de **prod**.

### G2 🟠 `npm audit fix --only=prod` te rompe el toolchain local

Ya pasó: `npm audit fix --only=prod` **podó las devDependencies** de `server/` (typescript, vitest) y `npx tsc` empezó a tirar **"This is not the tsc command"**. El `package.json` sigue completo y Railway instala todo, así que producción no se entera; el roto sos vos.

**Fix:** `cd /Users/alannaimtapia/dev/app-upm/server && npm install`.

### G3 🟠 Estado actual de vulnerabilidades (2026-07-18)

`server/` con `npm audit --omit=dev` → **5 vulnerabilidades (3 high, 2 moderate)**:

| Sev | Paquete | Origen |
|---|---|---|
| high | `adm-zip` | ZIP crafteado dispara alocación de 4 GB |
| high | `onnxruntime-node` | depende de `adm-zip` |
| high | `@huggingface/transformers` | depende de `onnxruntime-node` |
| moderate | `uuid` | falta bounds check en v3/v5/v6 |
| moderate | `node-cron` | depende de `uuid` |

**Contexto que importa:** las 3 high vienen todas de la cadena del **embedder**, que solo se ejecuta en el job manual `npm run embed` (`transformers.js` se importa dinámicamente y solo se carga si la búsqueda semántica embebe una query). No hay superficie de ataque desde HTTP con ZIPs de terceros. Igual conviene actualizar. El fix de `node-cron` es **breaking** (`node-cron@4.6.0`).

`client/` con `npm audit --omit=dev` → **2 low**: `react-router` / `react-router-dom` 7.15.0, CSRF potencial vía requests PUT/PATCH/DELETE de documento (GHSA-84g9-w2xq-vcv6). `npm audit fix` no-breaking lo resuelve.

Histórico ya cerrado: `nodemailer` high (parcheado en `28d5aa8`), `drizzle-orm` 0.38→0.45.2 inyección SQL en identificadores (`1b9a71b`).

### G4 🟠 Los scripts ad-hoc fuera del proyecto no resuelven `pg`

Si escribís un script en `/tmp` o en el home, `import pg from 'pg'` falla: Node resuelve desde el directorio del script y ahí no hay `node_modules`. Dos salidas:

```js
// A) import por path absoluto (funciona desde cualquier lado)
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
```

```bash
# B) mejor: escribir el script dentro de server/ y correrlo con tsx
cd /Users/alannaimtapia/dev/app-upm/server && npx tsx mi-script.ts
```

Plantilla que funciona hoy (verificada) para consultar prod sin exponer credenciales en la línea de comandos:

```js
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
import fs from 'node:fs'
const url = fs.readFileSync('/Users/alannaimtapia/dev/app-upm/server/.env','utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1].trim()
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
console.log((await pool.query('select count(*)::int from normas')).rows)
await pool.end()
```

(El `ssl: { rejectUnauthorized: false }` es obligatorio contra el proxy de Railway.)

### G5 🟠 Los enums están duplicados a propósito (y hay un test que lo vigila)

`server/src/db/schema.ts:14-27` repite **inline** `COUNTRY_CODES`, `TOPICS`, `DOC_TYPES`, `RELEVANCES`, con este comentario:

> Inline (drizzle-kit CJS no resuelve imports ESM .js): mantener EN SINCRONÍA con src/types.ts

La fuente de verdad conceptual es `server/src/types.ts`. Si agregás un topic o un tipo de documento tenés que tocar **los dos**, y además generar la migración del enum de Postgres.

El guard existe: `server/test/unit/enums-sync.test.ts` compara `countryCode.enumValues` etc. contra `types.ts` y falla si divergen. **Si ese test se pone rojo, no lo "arregles" tocando solo un lado.**

Y hay un tercer lugar: `client/src/lib/types.ts` tiene su propia copia del contrato del front. Los tres tienen que coincidir para que el filtrado client-side funcione.

### G6 🟡 El binario `browse` de gstack puede quedarse sin Chromium

El binario existe (`/Users/alannaimtapia/.claude/skills/gstack/browse/dist/browse`), pero en esta máquina **no encontré cache de Chromium**: no hay `~/.cache/puppeteer` ni `~/.cache/ms-playwright`. Históricamente el `chrome-headless-shell-1208` desapareció y `browse restart` empezó a fallar.

Para QA visual, usar el MCP de Chrome DevTools o el de Playwright en vez de pelearse con `browse`. **(verificar en el momento: puede haberse reinstalado)**

### G7 🟡 Build incremental de TypeScript en el cliente

`client/package.json` usa `tsc -b` (build mode, con `tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo"`). Un `.tsbuildinfo` obsoleto puede hacer que `tsc -b` diga "todo bien" sin recompilar. Ante dudas: `npx tsc -b --force`.

Detalle raro pero intencional: el cliente usa **TypeScript 6.0.3** con `"ignoreDeprecations": "6.0"` en `client/tsconfig.app.json`. No lo bajes a 5.x sin revisar las flags.

### G8 · Comandos verde-verificados hoy (2026-07-18)

```bash
cd /Users/alannaimtapia/dev/app-upm/client
npx tsc -b            # exit 0, 0 errores
npx vitest run        # 8 archivos · 42/42 tests · 2,27 s
npx vite build        # OK en 500 ms → dist/assets/index-DpEQkNiw.js (301,98 kB / 93,22 kB gzip)
                      # PWA: 42 entradas precacheadas (816,06 KiB)
```

Si alguno de los tres se pone rojo sin que hayas tocado nada, sospechá del entorno (versión de Node, devDeps podadas por G2) antes que del código.

---

## H · Repo, documentación y marca

### H1 🔴 Los `README.md` mienten — no los uses como fuente

Verificado línea por línea. `server/README.md` documenta un backend que ya no existe:

| Dice el README | Realidad en el código |
|---|---|
| `POST /auth/login` — "demo: cualquier email → JWT 30d" | **Eliminado.** Hoy es `/auth/request-code` + `/auth/verify` (OTP, JWT 7d) |
| "`/search?q=` FTS español (`ts_rank`, top 50)" | Búsqueda **híbrida** pgvector + FTS con fusión RRF (`search.ts`) |
| "`/assistant` RAG (FTS top-8) + `claude-sonnet-4-6`; 503 si falta `ANTHROPIC_API_KEY`" | Híbrido top-**6**, y hoy corre con **Gemini** (`llm.ts` es pluggable) |
| "48 fuentes" | **39** fuentes registradas (`GET /sources` → 39; `/health` → 38 ok, 1 fallando) |
| Variables: no menciona `GEMINI_*`, `SMTP_*`, `ALLOWED_EMAILS`, `JWT_TTL` | Todas existen en `config.ts` y están seteadas en Railway |

`README.md` (raíz) también está viejo: dice "Demo institucional **sin backend**", "Vite 7" (es Vite 8.0.10), y `http://127.0.0.1:5181/app-upm/` (el puerto es **5188**). `client/README.md` es el template genérico de Vite, sin valor.

**La fuente de verdad es `work-agent/` + el código.** Idealmente: arreglar los README o marcarlos como obsoletos apuntando a `work-agent/`.

### H2 🔴 El rebrand de "UPM" NO es un find-replace

"UPM" = **Unión Parlamentaria del Mercosur** = el organismo **cliente**, no el producto. Hay un proceso de naming en curso sin decisión final. Cuando llegue, esto es lo que hay que tocar — y algunos ítems tienen costo real para los usuarios:

| Capa | Dónde | Riesgo al cambiar |
|---|---|---|
| Nombre del repo | `github.com/soyalantapia/app-upm` | rompe la URL de GH Pages y `STATIC_DATA_BASE` |
| `base` de Vite | `client/vite.config.ts:9` + manifest `start_url`/`scope` | PWA instaladas quedan huérfanas |
| Host de la API | `upm-api-production.up.railway.app` | hay que actualizar `client/.env.production` (trackeado en git) + `ALLOWED_ORIGINS` |
| Servicio Railway | `upm-api` | cambia el dominio público |
| **Claves de `localStorage` `upm.*`** | 9 claves (ver A7) | 🔴 **renombrarlas desloguea a todos y borra sus notas, guardados y watchlist**. Si se cambian, hay que escribir una migración de claves en el boot del cliente |
| Manifest PWA | `name: 'Asistente AI UPM'`, `short_name: 'UPM'` | cosmético |
| `SMTP_FROM` | `App UPM <ia@xnod.tech>` | requiere revisar SPF/DKIM del dominio nuevo |
| `SYSTEM_PROMPT` del asistente | `assistant.ts:16` — "Sos el asistente legislativo de App UPM" | cosmético, pero afecta el tono |
| Copy de la UI | badges "Oficial UPM", "Con fuentes UPM", "Biblioteca UPM" | cosmético |
| `User-Agent` de ingesta | `server/src/ingest/util.ts:10` — `upm-api/1.0` | cosmético |

También: la marca en la UI es **"IA"**, no "AI" (se hizo un `sed` global en `6e86669` sobre `index.html`, `Brand`, `AppShell`, `PhoneMockup`, `AddToCalendar`, `Assistant`, `Briefing`, `GlobalSearch`, `mailer`). El `README.md` raíz todavía dice "Asistente **AI** UPM": es la excepción que quedó.

### H3 🟡 Código muerto que parece vivo

| Qué | Estado |
|---|---|
| `worker/` | Cloudflare Worker original. **Nunca deployado**, superado por `server/`. |
| `docs/` | Build viejo de GH Pages. Muerto (ver B2). |
| `client/src/lib/sources/*.ts` (menos `index.ts`) | Fetchers client-side. Dead code en prod (ver A10). |
| Rutas `/briefing`, `/biblioteca`, `/carpetas`, `/estadisticas` | Huérfanas a propósito, fuera de la nav. |

Cuando busques dónde se hace algo, **arrancá por `server/src/`**, no por `worker/` ni por `client/src/lib/sources/`.

### H4 🟡 Documentos de prompts en la raíz

`PROMPT-AUDITORIA-FINAL-LANZAMIENTO.md`, `PROMPT-VERIFICACION-E2E.md`, `PROMPT-QA-PRODUCCION.md`, `PROMPT-BACKEND.md`, `PROMPT-MAS-FUENTES.md`, `PROMPT-TESTEO-COMPLETO.md`, `PROMPT-AUDITORIA-DISENO-UX.md`, y varios `REPORTE-AUDITORIA-*.md`.

Son **prompts reutilizables y reportes históricos**, no documentación del sistema. Sirven para re-correr auditorías, pero sus hallazgos ya fueron resueltos (ver el historial de commits: lotes 1/2/3 del 2026-06-19/20). No los leas como si describieran bugs abiertos.

---

## I · Checklist de "primer día" para quien retome

```bash
# 0) posicionarse
cd /Users/alannaimtapia/dev/app-upm && git status && git log --oneline -3

# 1) ¿la API está viva y el cron ingiriendo?
curl -s https://upm-api-production.up.railway.app/health

# 2) ¿el feed viene balanceado por país? (D4)
curl -s https://upm-api-production.up.railway.app/feed \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const b={};for(const i of j.items)b[i.country]=(b[i.country]||0)+1;console.log(j.items.length,b)})"

# 3) ¿la búsqueda semántica está activa? (E3)
curl -s "https://upm-api-production.up.railway.app/search?q=protecci%C3%B3n%20de%20glaciares" | head -c 200

# 4) ¿el asistente responde y con qué proveedor? (E4)
curl -s -X POST https://upm-api-production.up.railway.app/assistant \
  -H 'content-type: application/json' \
  -d '{"messages":[{"id":"1","role":"user","content":"¿Qué dice la ley de glaciares?"}]}' | head -c 300

# 5) ¿el front desplegado coincide con main? (A5/B1)
cd client && npx vite build 2>&1 | grep 'dist/assets/index-'
curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'

# 6) toolchain sano (G2/G8)
npx tsc -b && npx vitest run

# 7) el pendiente operativo más urgente (E1)
#    → embeddings al 56,6 %: correr `npm run embed` desde server/
```

---

## J · Pendientes operativos conocidos (no son bugs, son decisiones sin tomar)

| # | Pendiente | Impacto |
|---|---|---|
| 1 | **Re-embeber el corpus** (2597/4589) y decidir cómo mantenerlo al día | 🔴 la búsqueda semántica ignora el 43 % del corpus y la brecha crece a diario |
| 2 | Política de retención del corpus BR (2833 filas y subiendo, sin tope) | 🟠 costo de DB y ruido |
| 3 | Verificar/configurar **DKIM** en `xnod.tech` | 🟠 los OTP pueden ir a spam |
| 4 | Ampliar `ALLOWED_EMAILS` con los legisladores reales | 🔴 bloqueante para cualquier usuario nuevo |
| 5 | Decidir Gemini free tier vs `ANTHROPIC_API_KEY` (costo vs 502 bajo ráfaga) | 🟠 |
| 6 | Actualizar o deprecar los `README.md` | 🟡 confunden a quien llega |
| 7 | `npm audit fix` de la cadena del embedder (3 high) + react-router (2 low) | 🟡 |
| 8 | Enriquecer títulos genéricos AR ("Ley NNNNN · DISPOSICIONES") | 🟡 baja la precisión del retrieval |
| 9 | Migrar el store de OTP fuera de memoria si se escala a >1 réplica | 🟠 |
| 10 | Automatizar el deploy de `gh-pages` (hoy 100 % manual) | 🟡 |
