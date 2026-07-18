# 08 · Deploy y operaciones (runbook)

**Última actualización:** 2026-07-18 — todo lo de este documento fue verificado ese día contra el repo local, el CLI de Railway y producción en vivo (comandos y salidas reales incluidos).

**Para qué sirve este documento:** es el runbook operativo del proyecto. Si sos una IA que llega a continuar este trabajo, acá está **cómo se deploya el backend, cómo se deploya el front, qué variables de entorno existen, cómo entrar a la base de producción desde tu máquina, cómo correr una migración puntual y qué hacer cuando algo se rompe**. Todos los comandos son copiables tal cual. Lo que no pude verificar está marcado **(verificar)**.

> **Regla madre de este documento:** el deploy de este proyecto es **100% manual**. No hay GitHub Actions, no hay auto-deploy desde una rama, no hay CI. Nadie va a deployar por vos. Si cambiás código y no corrés los comandos de §2 o §3, **producción no cambia**.

---

## 0. Mapa de producción en 20 segundos

| Pieza | Dónde vive | Cómo se deploya | Verificación |
|---|---|---|---|
| **Backend `upm-api`** | Railway, proyecto `UPM`, servicio `upm-api` | `railway up --detach` desde `server/` | `curl -s https://upm-api-production.up.railway.app/health` |
| **Base de datos** | Railway, mismo proyecto, servicio `Postgres` (PostgreSQL 18.4 + pgvector 0.8.2) | No se deploya (imagen `ghcr.io/railwayapp-templates/postgres-ssl:18`) | ver §4 |
| **Front (PWA)** | GitHub Pages, rama `gh-pages` del repo `soyalantapia/app-upm` | build con Node 22 + worktree manual (§3) | `curl -s https://soyalantapia.github.io/app-upm/ \| grep -o 'assets/index-[^"]*\.js'` |

- **API prod:** https://upm-api-production.up.railway.app
- **Front prod:** https://soyalantapia.github.io/app-upm/
- **Repo:** github.com/soyalantapia/app-upm

### Identificadores reales de Railway (verificados con `railway status --json`)

| Dato | Valor |
|---|---|
| Project name | **`UPM`** |
| Project id | `61cac5bf-f54d-4667-bb91-518d65a482d6` |
| Workspace | `Deenex` |
| Environment | `production` · id `89c372da-6a72-45fd-bed6-314bfc4701af` |
| Service `upm-api` | serviceId `4fac7d50-4855-44a7-8e20-0f338bfb17a4` |
| Service `Postgres` | serviceId `9abca508-d3cc-43f5-ad91-ce72ac2b0266` |
| Dominio público | `upm-api-production.up.railway.app` (sin custom domains) |
| Dominio interno | `upm-api.railway.internal` |
| Región | `us-west2`, 1 réplica |

> ⚠️ **GOTCHA de nomenclatura:** la memoria del proyecto, `server/README.md` y varios `PROMPT-*.md` dicen que el proyecto Railway se llama **`zippy-harmony`**. **Ya no.** Se llama `UPM`. El id (`61cac5bf-…`) es el mismo, así que es el mismo proyecto renombrado. El nombre viejo sigue cacheado en `~/.railway/config.json` (ver §2.1) — eso es cosmético y no afecta nada.

---

## 1. Prerrequisitos de la máquina

| Herramienta | Versión verificada | Cómo se chequea |
|---|---|---|
| Railway CLI | `4.29.0` | `railway --version` |
| Sesión Railway | `AlanTapia (alannaimtapia@gmail.com)` | `railway whoami` |
| Node (default del sistema) | `v25.9.0` (Homebrew) | `node -v` |
| **Node 22 (obligatorio para el front)** | `v22.22.2` en `/opt/homebrew/opt/node@22/bin` | `/opt/homebrew/opt/node@22/bin/node -v` |
| git | cualquiera | — |

> ⚠️ **GOTCHA Node:** el `node` del PATH es **v25**, y el build del cliente **rompe con v25+** (documentado en `HANDOFF.md:44`). Hay que prefijar el PATH con node@22 en **cada** comando de build del front. **No hay `.nvmrc`, no hay nvm, no hay fnm, no hay volta instalados** — la única forma es el prefijo de PATH manual:
> ```bash
> PATH="/opt/homebrew/opt/node@22/bin:$PATH" ...
> ```
> El backend, en cambio, corre bien con el node del sistema (`server/package.json` declara `"engines": { "node": ">=20" }`).

---

## 2. Deploy del BACKEND (`upm-api`)

### 2.1 Cómo funciona (leer antes de tocar nada)

El servicio **NO está conectado a GitHub**. Verificado:

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway status --json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(n['node']['serviceName'], n['node']['source']) for e in d['environments']['edges'] for n in e['node']['serviceInstances']['edges']]"
# upm-api {'repo': None, 'image': None}
```

`source.repo = null` ⇒ **Railway nunca mira una rama de git.** `railway up` toma **los archivos que tenés en el disco en `server/` en ese momento**, los comprime, los sube y los buildea.

Consecuencias prácticas, todas importantes:

1. **La "rama de deploy" `feat/backend` es una convención humana, no un mecanismo.** Podés estar parado en `main`, en `feat/backend` o en detached HEAD: Railway deploya lo que hay en el filesystem.
2. **Los cambios sin commitear SE DEPLOYAN.** Si tenés edits locales sucios y corrés `railway up`, se van a producción. Corré `git status` antes.
3. **Al revés también:** commitear y pushear a GitHub **no deploya nada**.
4. El link Railway↔directorio vive en `~/.railway/config.json`, **indexado por ruta absoluta exacta**:
   ```json
   "/Users/alannaimtapia/dev/app-upm/server": {
     "name": "zippy-harmony",
     "project": "61cac5bf-f54d-4667-bb91-518d65a482d6",
     "environment": "89c372da-6a72-45fd-bed6-314bfc4701af",
     "service": "4fac7d50-4855-44a7-8e20-0f338bfb17a4"
   }
   ```
   ⚠️ **GOTCHA:** si trabajás desde un **git worktree** o una copia del repo en otra ruta, el directorio **no está linkeado** y `railway up` va a fallar o preguntar interactivamente. Solución: `railway link` (y elegir project `UPM` → env `production` → service `upm-api`), o pasar `--service upm-api --project 61cac5bf-f54d-4667-bb91-518d65a482d6` explícitamente.

**Build:** builder **`RAILPACK`** (autodetect). No hay `Dockerfile`, ni `railway.json`, ni `railway.toml`, ni `nixpacks.toml` en el repo (verificado con `find`). Railpack detecta el `package.json` y corre:
- build → `npm run build` → `tsc` → emite `dist/`
- start → `npm start` → `node dist/index.js` (el manifest tiene `startCommand: null`, o sea usa el default del package)

**Qué se sube:** todo `server/` menos lo que excluyan `server/.railwayignore` (`node_modules/`, `dist/`, `.env`) y `server/.gitignore` (`node_modules/`, `dist/`, `.env`, `*.local`) — `railway up` respeta `.gitignore` salvo que pases `--no-gitignore`. **`server/data/` SÍ se sube** (no está ignorado) y es el snapshot de datos estáticos curados que la ingesta necesita.

### 2.2 El comando

```bash
cd /Users/alannaimtapia/dev/app-upm/server

# 0) higiene: mirá qué vas a mandar
git status --short
npx tsc --noEmit        # el build de Railway es tsc: si acá falla, allá falla

# 1) deploy
railway up --detach
```

Con `--detach` el CLI sube el tarball, dispara el build y **vuelve enseguida** sin quedarse pegado al stream de logs. Sin `--detach` te quedás con los logs de build en la terminal (útil cuando estás debuggeando un build roto; ver §6).

Opcional, para dejar rastro en el dashboard:
```bash
railway up --detach -m "fix: título BR por ementa"
```

### 2.3 Cómo saber si el deploy quedó VIVO

El build tarda ~2–4 min (verificar el número exacto; no lo cronometré esta sesión). **No confíes en que `railway up` volvió sin error** — eso solo dice que la subida salió bien, no que el proceso arrancó.

La verificación canónica es el campo **`uptime`** de `/health`, que es segundos desde el arranque del proceso (`server/src/routes/health.ts:6` define `const STARTED = Date.now()`):

```bash
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool
```

Respuesta real de producción hoy (2026-07-18):

```json
{
  "ok": true,
  "db": "up",
  "lastIngest": {
    "finishedAt": "2026-07-18T14:00:16.001Z",
    "okSources": 38,
    "failedSources": 1,
    "itemsUpserted": 1988
  },
  "itemCount": 4589,
  "uptime": 2380607
}
```

**Cómo se lee:**

| Campo | Qué significa | Qué esperás después de un deploy |
|---|---|---|
| `uptime` | segundos desde que arrancó **este** proceso | **un número CHICO (< 300)**. Si sigue siendo grande, el deploy viejo sigue vivo → el nuevo falló o todavía no cortó |
| `ok` / `db` | conectividad a Postgres | `true` / `"up"` |
| `itemCount` | filas en `normas` | ≥ al valor previo (la ingesta es upsert, nunca borra) |
| `lastIngest.finishedAt` | último run de ingesta | debería refrescarse dentro de los 30 min (cron) |

> El `uptime: 2380607` de arriba son **~27,5 días** — coincide con el último deploy real (`2026-06-21T01:03:07Z`, status `SUCCESS`). O sea: **el backend no se redeploya desde el 21 de junio y está estable.**

Loop copiable para esperar a que el deploy corte:

```bash
for i in $(seq 1 30); do
  U=$(curl -s -m 10 https://upm-api-production.up.railway.app/health | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptime','?'))" 2>/dev/null)
  echo "[$i] uptime=$U"
  case "$U" in ''|'?') ;; *) [ "$U" -lt 300 ] 2>/dev/null && echo "✅ deploy nuevo vivo" && break ;; esac
  sleep 10
done
```

Complementos:

```bash
railway logs --service upm-api --deployment          # stream de runtime
railway logs --service upm-api --build               # logs de build
railway logs --service upm-api --lines 200           # histórico, no stream
railway status                                       # Project / Environment / Service linkeados
```

En los logs de runtime, un arranque sano imprime en este orden (de `server/src/index.ts`):
```
migraciones ok
upm-api escuchando en :<PORT>
ingesta de arranque…            ← solo si la DB está vacía o el último run tiene >30 min
ingesta boot: ok=38 fail=1 upserted=…
```

> ⚠️ **`healthcheckPath` NO está configurado en Railway** (`healthcheckPath: null` en el manifest). Railway **no** valida `/health` antes de cortar tráfico al deploy nuevo: si el proceso levanta y después se muere, Railway lo reinicia (`restartPolicyType: ON_FAILURE`, hasta 10 reintentos) pero vos no te enterás salvo que mires. **Chequeá `/health` a mano siempre.**

> ⚠️ **Fallo de migración = deploy muerto.** `server/src/index.ts:14-20` hace `migrate()` y ante error hace `process.exit(1)`. Si una migración rompe, el contenedor entra en crash-loop y **el deploy anterior queda sirviendo** (por eso `uptime` no baja). Los logs de build van a decir SUCCESS igual — el error está en los logs de *deployment*.

### 2.4 Rollback / reinicio

```bash
railway redeploy --service upm-api        # re-deploya el último deployment (rebuild)
railway restart --service upm-api         # reinicia el proceso SIN rebuildear
railway down                              # elimina el deployment más reciente
```

Para volver a una versión anterior de código: no hay "deploy anterior" clickeable desde el CLI de forma confiable **(verificar en el dashboard web)**. La ruta segura es `git checkout <sha>` de los archivos de `server/` y volver a correr `railway up --detach`.

---

## 3. Deploy del FRONT (GitHub Pages)

### 3.1 Cómo funciona

- `client/vite.config.ts` define `base: '/app-upm/'` → **todas** las URLs de assets salen con ese prefijo. Si cambia el nombre del repo, hay que cambiar esto o la app queda en blanco.
- Router = **HashRouter** ⇒ no hace falta `404.html` ni rewrites de SPA; las rutas viven después del `#`.
- PWA vía `vite-plugin-pwa` con `registerType: 'autoUpdate'` + `clientsClaim: true` + `skipWaiting: true`.
- La rama `gh-pages` contiene **el contenido de `client/dist/` en la raíz** (no `dist/` adentro). Árbol real verificado con `git ls-tree --name-only origin/gh-pages`:
  ```
  .nojekyll  assets  data  favicon.svg  index.html  manifest.webmanifest  southamerica.svg  sw.js  workbox-9c191d2f.js
  ```
- `.nojekyll` es obligatorio: sin él, GitHub Pages corre Jekyll y **descarta los directorios/archivos que empiezan con `_`**.
- `docs/` en la raíz del repo es un **build viejo abandonado** (mismo contenido, de junio). **NO es el origen del deploy.** No lo toques ni lo uses.

### 3.2 Secuencia exacta (build + worktree)

```bash
# ---------- 1) BUILD (Node 22 obligatorio) ----------
cd /Users/alannaimtapia/dev/app-upm/client
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run build
# npm run build == "tsc -b && vite build"  → falla el deploy si hay error de tipos
# output: client/dist/

# ---------- 2) WORKTREE de gh-pages ----------
cd /Users/alannaimtapia/dev/app-upm
git fetch origin gh-pages
rm -rf /tmp/upm-ghpages
git worktree add /tmp/upm-ghpages gh-pages

# ---------- 3) VOLCAR el build (rsync borra lo que sobra, preserva .git) ----------
rsync -a --delete --exclude '.git' /Users/alannaimtapia/dev/app-upm/client/dist/ /tmp/upm-ghpages/
touch /tmp/upm-ghpages/.nojekyll

# ---------- 4) COMMIT + PUSH ----------
cd /tmp/upm-ghpages
git add -A
git status --short | head -20          # sanity: ¿cambió el hash del bundle?
git commit -m "deploy: <qué cambió> (index-XXXXXXXX.js)"
git push origin gh-pages

# ---------- 5) LIMPIAR el worktree ----------
cd /Users/alannaimtapia/dev/app-upm
git worktree remove /tmp/upm-ghpages
git worktree list                       # debe quedar solo el repo principal
```

Notas sobre cada paso:

- **`--delete` en rsync es necesario**: sin él, los bundles viejos (`index-*.js` de deploys anteriores) se acumulan para siempre en la rama.
- **`--exclude '.git'`** es crítico: el worktree tiene un archivo `.git` (no un directorio) que apunta al repo principal. Si rsync lo borra, el worktree se corrompe.
- El **mensaje de commit convencional del proyecto** incluye el hash del bundle entre paréntesis. Historial real de `gh-pages`:
  ```
  3c9b6a0 deploy: revisión total lote 3 (index-DpEQkNiw.js)
  e3b72f0 deploy: revisión total lote 2 (index-Cfp-hNL1.js)
  dd6acb3 deploy: revisión total lote 1 (index-DgBDlJgQ.js)
  ```
  Sacá el hash con: `ls /tmp/upm-ghpages/assets/index-*.js`

> ⚠️ **GOTCHA — NO uses el método de `HANDOFF.md:52-58`.** Ese documento describe un flujo viejo (`cp -R dist /tmp/upm-pages && git init -b gh-pages && … && git push -f origin gh-pages`) que crea una rama **huérfana y hace force-push**: te **destruye todo el historial de deploys** de `gh-pages`. El método canónico es el worktree de arriba. `HANDOFF.md` está desactualizado en general (describe la etapa demo-sin-backend).

### 3.3 Verificar el deploy del front

GitHub Pages tarda ~30–60 s en publicar después del push.

```bash
# 1) ¿qué bundle está sirviendo prod?
curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
# debe coincidir con: ls /Users/alannaimtapia/dev/app-upm/client/dist/assets/index-*.js

# 2) assets de PWA vivos
curl -s -o /dev/null -w "sw.js:%{http_code}\n"        https://soyalantapia.github.io/app-upm/sw.js
curl -s -o /dev/null -w "manifest:%{http_code}\n"     https://soyalantapia.github.io/app-upm/manifest.webmanifest
curl -s -o /dev/null -w "index:%{http_code}\n"        https://soyalantapia.github.io/app-upm/
```

Estado verificado hoy: bundle en vivo = **`assets/index-DpEQkNiw.js`**, que corresponde al commit `3c9b6a0` de `gh-pages`. `sw.js` y `manifest.webmanifest` → 200.

> **Dato de estado:** el front **no se redeploya desde el commit `d380120` (lote 3, 2026-06-19)**. Los dos commits posteriores de `main` (`28d5aa8` título BR por ementa, `1b9a71b` upgrade drizzle) son **solo de backend**, así que la falta de redeploy del front es correcta, no un olvido.

> ⚠️ **GOTCHA PWA — la caché miente.** El service worker está en `autoUpdate` con `skipWaiting`, pero un usuario con la PWA instalada o la pestaña abierta puede seguir viendo el bundle viejo hasta el próximo ciclo. Para verificar vos mismo usá **incógnito** o **Cmd+Shift+R**. Cuando le pases la URL al usuario, avisale lo mismo. Si el `curl` de arriba muestra el bundle nuevo pero el navegador muestra el viejo, es caché, no un deploy fallido.

---

## 4. Variables de entorno del servicio `upm-api`

### 4.1 Listar (sin exponer valores)

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --service upm-api --kv | sed 's/=.*/=<REDACTED>/'
```

### 4.2 Inventario completo (verificado 2026-07-18)

**Variables de aplicación** — las lee `server/src/config.ts` con un schema Zod (`EnvSchema`). Si falta una obligatoria o no valida, `loadConfig()` **tira** y el proceso no arranca.

| Variable | ¿Seteada en prod? | Obligatoria | Default (`config.ts`) | Para qué |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | **sí** | — | Postgres. En prod es la URL **interna**: `postgresql://…@postgres.railway.internal:5432/railway` |
| `JWT_SECRET` | ✅ (secreto) | **sí** (mín 16 chars) | — | Firma de los JWT con `jose`. **Rotarla desloguea a todos.** |
| `ALLOWED_ORIGINS` | ✅ | no | `https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188` | CORS, coma-separado, **sin barra final**. Valor real en prod = el default |
| `NODE_ENV` | ✅ = `production` | no | `development` | define `config.isProd` |
| `PORT` | ❌ (la inyecta Railway) | no | `3000` | el server hace `listen({ host: '0.0.0.0', port: config.PORT })` |
| `GEMINI_API_KEY` | ✅ (secreto) | no | — | LLM del asistente (free tier). Sin ningún proveedor → `/assistant` responde **503** |
| `GEMINI_MODEL` | ✅ = `gemini-2.5-flash` | no | `gemini-2.5-flash` | modelo primario; `llm.ts` rota a otros ante 429/503 |
| `ANTHROPIC_API_KEY` | ❌ **no seteada** | no | — | Si se setea, **tiene prioridad sobre Gemini** (`llm.ts`). Es la palanca para escalar el asistente. Cero cambios de código |
| `SMTP_HOST` | ✅ = `smtp.hostinger.com` | no | — | OTP por email |
| `SMTP_PORT` | ✅ = `465` | no | `587` | 465 ⇒ nodemailer `secure: true` (TLS implícito) |
| `SMTP_USER` | ✅ (`ia@xnod.tech`) | no | — | usuario SMTP |
| `SMTP_PASS` | ✅ (secreto) | no | — | password SMTP |
| `SMTP_FROM` | ✅ = `App UPM <ia@xnod.tech>` | no | — | remitente del mail de OTP |
| `ALLOWED_EMAILS` | ✅ (2 entradas) | no | — | **allowlist anti-enumeración**: solo estos emails pueden pedir código. Ampliar con emails de legisladores, coma-separados |
| `JWT_TTL` | ❌ | no | `7d` | vida del JWT |
| `STATIC_DATA_BASE` | ❌ | no | `https://soyalantapia.github.io/app-upm/data` | fallback de los JSON curados cuando no están en el filesystem |

> ⚠️ **`smtpConfigured` es derivado**: `config.ts:43` lo calcula como `Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)`. Si borrás cualquiera de las tres, el login OTP se cae entero (`/auth/request-code` → 503) **sin que el proceso falle al arrancar**. Falla silenciosa: el usuario ve "no pude mandar el código".

**Variable NO declarada en el schema Zod:**

| Variable | Dónde se lee | Efecto |
|---|---|---|
| `SEMANTIC_SEARCH` | `server/src/search.ts:15` — `process.env.SEMANTIC_SEARCH ?? 'on'` | Ponerla en `off` apaga la búsqueda semántica y deja `/search` y el RAG en **FTS puro**. Kill-switch de emergencia si el embedder se rompe. **No pasa por `loadConfig()`**, así que no la vas a ver en `config.ts` |

**Variables inyectadas por Railway** (no las setees a mano): `RAILWAY_ENVIRONMENT`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_PROJECT_ID`, `RAILWAY_PROJECT_NAME`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_SERVICE_ID`, `RAILWAY_SERVICE_NAME`, `RAILWAY_SERVICE_UPM_API_URL`, `RAILWAY_STATIC_URL`.

### 4.3 Setear / borrar variables

```bash
cd /Users/alannaimtapia/dev/app-upm/server

railway variables --service upm-api --set "GEMINI_MODEL=gemini-2.5-flash"

# ampliar la allowlist de login
railway variables --service upm-api --set "ALLOWED_EMAILS=alannaimtapia@gmail.com,ia@xnod.tech,legislador@ejemplo.gov"

# valores con caracteres raros: leer de stdin
printf '%s' 'valor=con=iguales' | railway variables --service upm-api --set-from-stdin SMTP_PASS

railway variables --service upm-api --set "X=1" --skip-deploys   # sin redeploy automático
```

> ⚠️ **GOTCHA `SMTP_PASS` empieza con `=`.** El parser de `--set "K=V"` corta en el **primer** `=`, así que hay que escribir `--set "SMTP_PASS==elvalor"` (doble igual) o —mejor— usar `--set-from-stdin` como arriba.

> ⚠️ **Setear una variable dispara un redeploy** salvo que pases `--skip-deploys`. Eso significa que **el proceso se reinicia**: se pierden los códigos OTP en vuelo (`server/src/lib/otp.ts` los guarda **en memoria**, TTL 10 min). Un usuario que estaba escribiendo su código va a recibir "código inválido". Evitá tocar variables mientras alguien está logueándose.

### 4.4 Variables del entorno local (`server/.env`)

`server/.env` existe y contiene **solo 4 claves**: `DATABASE_URL`, `ALLOWED_ORIGINS`, `JWT_SECRET`, `PORT`. Está en `.gitignore` y en `.railwayignore` — nunca se sube. Plantilla en `server/.env.example`.

Consecuencia: **en local no hay `GEMINI_API_KEY` ni SMTP**, así que `/assistant` da 503 y el OTP no manda mails. Eso es esperado, no un bug. Los tests de integración lo asumen (borran las keys de LLM a propósito, `test/integration/api.test.ts:17-19`).

---

## 5. Acceso a la base de PRODUCCIÓN desde tu máquina

### 5.1 El problema

`DATABASE_URL` del servicio `upm-api` apunta a **`postgres.railway.internal:5432`**, que es un hostname de la red privada de Railway. **No resuelve desde afuera.** Si copiás esa URL a tu máquina vas a ver `ENOTFOUND postgres.railway.internal` o `getaddrinfo` y vas a perder media hora.

### 5.2 La solución: `DATABASE_PUBLIC_URL` del servicio `Postgres`

El servicio **`Postgres`** (no `upm-api`) expone `DATABASE_PUBLIC_URL`, que apunta al **TCP proxy público** de Railway (host `*.rlwy.net`) y **sí** resuelve desde internet.

```bash
cd /Users/alannaimtapia/dev/app-upm/server
export DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
```

Variables completas que expone el servicio `Postgres`: `DATABASE_PUBLIC_URL`, `DATABASE_URL`, `PGDATA`, `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `SSL_CERT_DAYS`, `RAILWAY_TCP_PROXY_DOMAIN`, `RAILWAY_TCP_PROXY_PORT`, `RAILWAY_VOLUME_*`.

**SSL:** el proxy público exige TLS; la red interna **no lo soporta**. `server/src/db/client.ts:9-11` implementa exactamente esa heurística:
```ts
const isInternal = /\.railway\.internal/.test(databaseUrl)
const needsSsl = !isInternal && /rlwy\.net|sslmode=require/.test(databaseUrl) && !/sslmode=disable/.test(databaseUrl)
```
En scripts sueltos, pasá `ssl: { rejectUnauthorized: false }` explícito.

Alternativa sin escribir código: `railway connect Postgres` abre un `psql` contra la base (requiere `psql` instalado localmente — **(verificar)** si está en esta máquina).

### 5.3 El gotcha del `import pg` en scripts `.mjs`

Si escribís un script one-off fuera de `server/` (típicamente en el scratchpad o `/tmp`), **`import pg from 'pg'` falla**: Node resuelve módulos relativo a la ubicación del script, y ahí no hay `node_modules`. La solución probada es **importar por ruta absoluta**:

```js
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'
```

### 5.4 Plantilla de script de consulta (probada hoy contra prod)

```js
// q.mjs — consulta puntual contra la DB de producción
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,   // ← DATABASE_PUBLIC_URL
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const { rows } = await c.query(
  `select country, count(*)::int n, count(embedding)::int emb
     from normas group by 1 order by 2 desc`
)
console.table(rows)

await c.end()
```

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DB=$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)
DATABASE_URL="$DB" node /ruta/a/q.mjs
```

Salida real de hoy:

```
country   n     emb
BR        2833  915
AR        1081  1081
CO        526   476
UY        149   125
```
Total: **4589 normas, 2597 con embedding** ⇒ **1992 pendientes de embeber** (ver §7.2).

### 5.5 Estado verificado de la base

```
PostgreSQL 18.4 (Debian 18.4-1.pgdg13+1)
extensiones: plpgsql 1.0 · pg_trgm 1.6 · unaccent 1.1 · vector 0.8.2
índices de normas: normas_pkey · normas_country_idx · normas_topic_idx ·
                   normas_date_idx · normas_fts_idx · normas_embedding_hnsw
sources: 39 registradas, 39 habilitadas
```

---

## 6. Migraciones

### 6.1 Cómo se aplican normalmente

Las migraciones **corren solas al arranque del server** (`server/src/index.ts:14-20`):

```ts
await migrate(db, { migrationsFolder: './drizzle' })
```

Es idempotente: drizzle lleva su journal en la tabla `drizzle.__drizzle_migrations` de la propia base. Estado actual: **una sola entrada**, hash `6c5149…`, correspondiente a `drizzle/0000_careful_caretaker.sql`.

Flujo normal para un cambio de schema:

```bash
cd /Users/alannaimtapia/dev/app-upm/server
# 1) editar src/db/schema.ts
npm run db:generate                      # drizzle-kit genera drizzle/000N_*.sql + journal
git add drizzle/ src/db/schema.ts && git commit -m "feat(db): …"
# 2) el deploy la aplica sola
railway up --detach
# 3) confirmar
railway logs --service upm-api --deployment | grep "migraciones ok"
```

Para aplicarla a mano contra prod sin deployar:
```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)" npm run db:migrate
```
(`drizzle.config.ts` lee `process.env.DATABASE_URL`.)

### 6.2 🔴 GOTCHA CRÍTICO: hay DRIFT entre el schema de drizzle y la base real

**Producción tiene objetos que `src/db/schema.ts` no conoce.** Verificado hoy consultando `information_schema.columns`:

| Objeto en prod | ¿Está en `src/db/schema.ts`? | ¿Está en `drizzle/0000_*.sql`? |
|---|---|---|
| `normas.embedding` (tipo `vector`) | ❌ **NO** | ❌ **NO** |
| `normas.content_hash` (text) | ❌ **NO** | ❌ **NO** |
| `normas.embedded_at` (timestamptz) | ❌ **NO** | ❌ **NO** |
| índice `normas_embedding_hnsw` (HNSW cosine) | ❌ **NO** | ❌ **NO** |
| extensiones `vector`, `pg_trgm`, `unaccent` | ❌ **NO** | ❌ **NO** |

Estas columnas/índice/extensiones se aplicaron **con SQL manual** cuando se construyó la capa de búsqueda semántica (commit `ad91c38`), y nunca se reflejaron en el schema de drizzle. `server/src/search.ts` y `server/src/embed/run.ts` las usan con SQL crudo, por eso todo funciona.

**Consecuencias — leé esto dos veces:**

1. 🔴 **`npm run db:push` DESTRUYE la búsqueda semántica.** `drizzle-kit push` sincroniza la base al schema declarado; como el schema no declara `embedding`/`content_hash`/`embedded_at`, las va a proponer para **DROP**. Perdés 2597 embeddings y el índice HNSW. **No corras `db:push` contra producción. Nunca.**
2. ⚠️ **`npm run db:generate` va a generar un diff sucio.** La próxima migración autogenerada probablemente incluya el drop de esas tres columnas. **Revisá el `.sql` generado línea por línea y borrá a mano cualquier `DROP COLUMN embedding / content_hash / embedded_at` o `DROP INDEX normas_embedding_hnsw` antes de commitear.**
3. **Arreglo recomendado (pendiente, no hecho):** declarar las tres columnas en `src/db/schema.ts` (con `customType` para `vector(384)`) y agregar una migración `.sql` a mano con `CREATE EXTENSION IF NOT EXISTS vector;` + los `ADD COLUMN IF NOT EXISTS` + el `CREATE INDEX IF NOT EXISTS … USING hnsw`, marcada como aplicada. Hasta que eso pase, **el drift es una mina antipersonal**.

### 6.3 Migración puntual de DATOS (patrón one-off)

Cuando hay que corregir filas existentes (no schema) — el caso histórico fue re-tipar 744 normas de Brasil que estaban mal etiquetadas como "ley", y después re-derivar sus títulos desde la ementa. El patrón probado:

```js
// migracion-puntual.mjs
import pg from '/Users/alannaimtapia/dev/app-upm/server/node_modules/pg/lib/index.js'

const DRY = process.env.DRY !== '0'          // por defecto NO escribe
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()

// 1) SIEMPRE contar primero el universo afectado
const { rows: [pre] } = await c.query(
  `select count(*)::int n from normas where country='BR' and type='ley'`)
console.log('afectadas:', pre.n)

if (DRY) {
  const { rows } = await c.query(
    `select id, title, type from normas where country='BR' and type='ley' limit 10`)
  console.table(rows)
  console.log('DRY RUN — no se escribió nada. Correr con DRY=0 para aplicar.')
} else {
  await c.query('begin')
  const r = await c.query(
    `update normas set type='informe' where country='BR' and type='ley' and tipo_documento like 'PRL%'`)
  console.log('filas actualizadas:', r.rowCount)
  await c.query('commit')
}

// 2) verificar el después
console.table((await c.query(
  `select type, count(*)::int n from normas where country='BR' group by 1 order by 2 desc`)).rows)
await c.end()
```

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DB=$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)

DATABASE_URL="$DB" node /ruta/migracion-puntual.mjs          # dry-run
DATABASE_URL="$DB" DRY=0 node /ruta/migracion-puntual.mjs    # aplicar
```

**Reglas para migraciones de datos en esta base:**

1. **Dry-run primero, siempre.** Contá el universo afectado y mirá 10 filas de muestra antes de escribir.
2. **`begin` / `commit` explícitos.** El driver `pg` está en autocommit por default.
3. **Si tocás `title`, `excerpt` o `full_text`, tenés que invalidar el embedding.** El `content_hash` se calcula sobre esos tres campos (`server/src/embed/embedder.ts`, `contentHash(title, excerpt, fullText)`). Después del update, hacé `update normas set content_hash = null where …` y corré `npm run embed` (§7.2), o la búsqueda semántica va a seguir apuntando al texto viejo.
4. **La ingesta es upsert por `id` y corre cada 30 min.** Si "corregís" un campo que el fetcher vuelve a escribir, **el cron te lo pisa en menos de media hora**. El fix real va en el fetcher (`server/src/ingest/fetchers/*.ts`) **y** la migración de datos limpia lo histórico. Las dos cosas, no una.
5. **No hay backup automático configurado (verificar en el dashboard de Railway).** Para un cambio riesgoso, dumpeá antes:
   `pg_dump "$DATABASE_URL" -t normas -f /tmp/normas-backup.sql` **(verificar que `pg_dump` esté instalado en esta máquina)**.

---

## 7. Tareas operativas recurrentes

### 7.1 Ingesta manual

La ingesta corre sola: cron `*/30 * * * *` dentro del proceso (`src/index.ts:42`) + un run al boot si la DB está vacía o el último run tiene más de 30 min. Para forzarla desde local contra la base de prod:

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)" \
JWT_SECRET=dummy-solo-para-pasar-el-schema-zod \
npm run ingest
```

Imprime por fuente: `✓/✗ <id> (<país>) → <count>` y el error truncado si falló. Una fuente caída **no aborta el run** (aislamiento por fuente; el error queda en `sources.last_error`).

> ⚠️ `JWT_SECRET` dummy es necesario porque `loadConfig()` valida **todo** el schema aunque el script solo use `DATABASE_URL`. Mismo truco aplica a `npm run embed`.

Ver qué fuentes están fallando:
```sql
select id, country, last_ok, last_count, last_run_at, left(last_error, 120)
from sources where last_ok is not true order by 1;
```
Estado hoy: **1 de 39 fuentes fallando** — `camara-br` con `TimeoutError: The operation was aborted due to timeout`. Coincide con `failedSources: 1` de `/health`. Es la fuente más pesada (la Câmara de Brasil tira ~150 proposiciones/día); el timeout es intermitente **(verificar si es crónico o esporádico mirando varios runs)**.

### 7.2 Re-embeber (backfill de embeddings)

**Corré esto FUERA de Railway**, en tu máquina. El modelo (`Xenova/multilingual-e5-small` vía transformers.js) se ejecuta local; correrlo en el contenedor arriesga la RAM del servicio.

```bash
cd /Users/alannaimtapia/dev/app-upm/server
DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)" \
JWT_SECRET=dummy-solo-para-pasar-el-schema-zod \
npm run embed
```

`src/embed/run.ts` es **incremental**: solo procesa filas sin embedding o cuyo `content_hash` cambió. Imprime `normas: N · pendientes de embeber: M` y avanza a ~4 filas/s.

> **Estado hoy: 2597/4589 embebidas ⇒ 1992 pendientes.** El corpus creció (sobre todo BR: 2833 filas, 915 embebidas) y nadie corrió `embed` desde el 2026-06-20. La búsqueda semántica **no ve esas 1992 normas** — caen a la rama FTS de la fusión RRF. A ~4/s son ~8 minutos de cómputo. **Es la deuda operativa más concreta que tiene el proyecto hoy.**
>
> ⚠️ **La primera corrida descarga el modelo** (no está cacheado localmente): necesitás internet y unos minutos extra.
>
> ⚠️ **Query y passage embeddings tienen que ser del MISMO modelo.** Si alguna vez se migra a una API (Voyage, OpenAI), hay que **re-embeber el corpus entero**, no se puede mezclar.

### 7.3 Tests

```bash
cd /Users/alannaimtapia/dev/app-upm/server && npm test     # unit + integración
cd /Users/alannaimtapia/dev/app-upm/client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test
```

> ⚠️ **Los tests de integración pegan contra una Postgres REAL.** `test/integration/api.test.ts:8-12` **lee `server/.env` a mano** (parseo con regex, sin `dotenv`) y usa su `DATABASE_URL`. Si `server/.env` no existe o no tiene `DATABASE_URL`, los tests explotan al importar. **Ojo: si ese `.env` apunta a producción, los tests corren contra producción.** Verificá a dónde apunta antes.
>
> Los tests desactivan a propósito: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` (para forzar la rama 503 del asistente) y setean `SEMANTIC_SEARCH=off` (para no cargar el modelo de embeddings).

### 7.4 Sincronizar el snapshot de datos estáticos

```bash
cd /Users/alannaimtapia/dev/app-upm/server && npm run sync-data
# rm -rf data && cp -r ../client/public/data ./data
```
Correlo cada vez que cambien los JSON curados de `client/public/data/`, **antes** de `railway up` (si no, el contenedor sigue con el snapshot viejo).

---

## 8. Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `railway up` termina OK pero `/health` sigue con `uptime` grande | El deploy nuevo crasheó al arrancar y Railway dejó vivo el viejo | `railway logs --service upm-api --deployment`. Buscá `Config inválida:` (falta una env var) o `migrate falló:` |
| Logs: `Config inválida: JWT_SECRET: JWT_SECRET muy corto` | Zod rechazó el env | Corregí la variable (§4.3). `JWT_SECRET` necesita ≥16 chars |
| Logs: `migrate falló:` + crash-loop | Migración rota. `index.ts` hace `process.exit(1)` | Revertí la migración, arreglá el `.sql`, `railway up` de nuevo. Ver §6.2 (drift) |
| `/health` responde `503 {"ok":false,"db":"down"}` | Postgres caído o pool sin conexiones | `railway logs --service Postgres`; probá conectar con §5.4 |
| `ENOTFOUND postgres.railway.internal` desde tu máquina | Usaste el `DATABASE_URL` interno | Usá `DATABASE_PUBLIC_URL` del servicio **Postgres** (§5.2) |
| `Error: Cannot find module 'pg'` en un script `.mjs` | Node resuelve módulos relativo al script | Import por ruta absoluta (§5.3) |
| `self signed certificate` / error TLS al conectar | Falta `ssl` en el cliente pg | `ssl: { rejectUnauthorized: false }` (§5.2) |
| `POST /assistant` → **503** | No hay ningún proveedor LLM configurado | Verificá `GEMINI_API_KEY` en Railway. `ANTHROPIC_API_KEY` tiene prioridad si existe |
| Asistente lento (>45 s) o 502 esporádicos bajo ráfaga | Límite del free tier de Gemini. `llm.ts` rota modelos ante 429/503 con backoff | Aceptado para el volumen actual. Para escalar: setear `ANTHROPIC_API_KEY` (cero cambios de código) |
| Gemini da 429 persistente todo el día | **El cupo free es POR-MODELO-POR-DÍA** y se agotó testeando | Cambiá `GEMINI_MODEL` a otro (cada modelo tiene su balde propio). Resetea a medianoche Pacific |
| `POST /auth/request-code` → **503** | `smtpConfigured === false`: falta `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS` | §4.2. Chequeá que las tres estén |
| El mail de OTP no llega | Puede ser spam: **falta configurar SPF/DKIM/DMARC de `xnod.tech` en Hostinger** (pendiente conocido) | Revisá spam. La solución real es configurar los DNS |
| "Código inválido" a un usuario que acaba de recibirlo | Los códigos viven **en memoria** (`src/lib/otp.ts`) y un redeploy/restart los borra | No toques variables ni deployes mientras alguien se loguea. Pedile que reintente |
| CORS bloqueado en el navegador | Origen no está en `ALLOWED_ORIGINS` | Agregalo, **sin barra final**, coma-separado |
| Front deployado pero el navegador muestra lo viejo | Caché del service worker | Cmd+Shift+R o incógnito. Confirmá con el `curl` de §3.3 |
| Front en blanco después de deployar | `base` mal (`/app-upm/`) o falta `.nojekyll` | Verificá ambos en `/tmp/upm-ghpages` antes de pushear |
| `npm run build` del cliente falla raro | Estás usando Node 25 | Prefijá `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` |
| `tsc: This is not the tsc command` | Alguien corrió `npm audit fix --only=prod`, que **podó las devDependencies** | `cd server && npm install` (el `package.json` está intacto). Railway instala todo igual |
| Feed lleno de Brasil, casi sin AR/CO/UY | Regresión del balanceo por país | `feed.ts` tiene `balancedRows()` (top-130 por país). Verificá: `curl -s '…/feed' \| python3 -c "import sys,json,collections; print(collections.Counter(i['country'] for i in json.load(sys.stdin)['items']))"` |
| Búsqueda semántica no encuentra normas nuevas | Embeddings desactualizados | `npm run embed` (§7.2). Hoy hay 1992 pendientes |
| `railway up` pide elegir proyecto / no encuentra el link | Estás en una ruta distinta de `/Users/alannaimtapia/dev/app-upm/server` (worktree, copia) | `railway link` o pasá `--project`/`--service` explícitos (§2.1) |

### Comandos de diagnóstico rápido

```bash
# ¿está vivo el backend y con qué uptime?
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool

# ¿qué endpoints declara?
curl -s https://upm-api-production.up.railway.app/

# ¿el feed sigue balanceado por país?
curl -s 'https://upm-api-production.up.railway.app/feed' \
  | python3 -c "import sys,json,collections; d=json.load(sys.stdin); print(len(d['items']), collections.Counter(i['country'] for i in d['items']))"

# ¿la búsqueda semántica está en modo híbrido?
curl -s 'https://upm-api-production.up.railway.app/search?q=proteccion+de+glaciares' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('mode'), len(d.get('results') or d.get('items') or []))"

# ¿el front sirve el bundle que buildeaste?
curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'

# logs
railway logs --service upm-api --deployment
railway logs --service upm-api --build
```
*(el nombre exacto de los campos de la respuesta de `/search` — `mode`, `results` vs `items` — **verificar** contra `server/src/routes/feed.ts`.)*

---

## 9. Resumen de gotchas que hacen perder horas

1. **No hay CI ni auto-deploy.** Commitear ≠ deployar. Railway no mira ninguna rama (`source.repo = null`).
2. **`railway up` sube el filesystem, no un commit.** Los cambios sin commitear **van a producción**. `git status` antes, siempre.
3. **El link Railway es por ruta absoluta** (`~/.railway/config.json`). Desde un worktree hay que `railway link`.
4. **Node 22 obligatorio para el front**, y el `node` del PATH es v25. Prefijo manual en cada comando.
5. **`postgres.railway.internal` no resuelve desde afuera.** Usá `DATABASE_PUBLIC_URL` del servicio `Postgres`, con SSL.
6. **`import pg from 'pg'` falla en scripts sueltos.** Ruta absoluta a `server/node_modules/pg/lib/index.js`.
7. 🔴 **DRIFT de schema: `embedding`, `content_hash`, `embedded_at`, el índice HNSW y las extensiones NO están en drizzle.** `db:push` los borraría. Revisá a mano todo `db:generate`.
8. **`uptime` en `/health` es el único indicador confiable de que el deploy cortó.** No hay healthcheck configurado en Railway.
9. **Setear una variable dispara redeploy** → mata los códigos OTP en memoria.
10. **`SMTP_PASS` empieza con `=`** → `--set "SMTP_PASS==valor"` o `--set-from-stdin`.
11. **Cupo de Gemini free = por-modelo-por-día.** Testear fuerte lo agota; cambiar `GEMINI_MODEL` da un balde nuevo.
12. **La ingesta (cron 30 min, upsert) pisa correcciones manuales de datos.** Arreglá el fetcher **y** migrá lo histórico.
13. **Los tests de integración usan `server/.env` real** — pueden estar corriendo contra producción.
14. **`npm audit fix --only=prod` poda las devDeps locales** → `npm install` para recuperarlas.
15. **`HANDOFF.md` y `README.md` de la raíz están desactualizados** (describen la etapa demo-sin-backend y un deploy de gh-pages con force-push que destruye el historial). `docs/` es un build viejo abandonado, no es el origen del deploy.
16. **El proyecto Railway ya no se llama `zippy-harmony`**, se llama `UPM` (mismo id).

---

## 10. Estado operativo al 2026-07-18 (snapshot verificado)

| Métrica | Valor | Fuente |
|---|---|---|
| Backend | vivo, `uptime` 2.380.607 s (~27,5 días) | `GET /health` |
| Último deploy de `upm-api` | `2026-06-21T01:03:07Z`, status `SUCCESS` | `railway status --json` |
| Última ingesta | `2026-07-18T14:00:16Z` · 38 ok / 1 fail / 1988 upserted | `GET /health` |
| Corpus | **4589** normas (BR 2833 · AR 1081 · CO 526 · UY 149) | SQL directo |
| Embeddings | **2597 / 4589** (⚠️ 1992 pendientes) | SQL directo |
| Fuentes | 39 registradas, 39 habilitadas, **1 fallando** (`camara-br`, timeout) | SQL directo |
| Front | bundle `index-DpEQkNiw.js` = commit `3c9b6a0` de `gh-pages` (2026-06-19) | `curl` + `git log` |
| Ramas | `main` = `ace8dc4` (contiene todo `feat/backend`; divergencia 10↔0) | `git rev-list --left-right --count` |
| Working tree | limpio salvo `work-agent/` sin trackear | `git status --short` |

**Deuda operativa priorizada:**
1. Correr `npm run embed` — 1992 normas fuera de la búsqueda semántica (~8 min de cómputo).
2. Cerrar el drift de schema de §6.2 antes de que alguien corra `db:generate` o `db:push`.
3. Investigar el timeout crónico de `camara-br`.
4. Configurar SPF/DKIM/DMARC de `xnod.tech` para entregabilidad del OTP.
