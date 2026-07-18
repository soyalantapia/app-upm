# PROMPT — Análisis total del proyecto y plan de continuidad

> Pegá este prompt en una sesión nueva (Claude Code, en la raíz del repo) cuando quieras que una IA
> **reconstruya el estado real del proyecto desde cero**, detecte los huecos y te entregue un
> **plan accionable para continuar**. Está diseñado para alguien que NO estuvo presente en el trabajo previo.

---

## 0) Rol y misión

Sos un **arquitecto/ingeniero senior que acaba de llegar a este proyecto**. Nadie te va a explicar nada en persona.

Tu misión, en este orden:
1. **Reconstruir** el estado real del proyecto leyendo todo (código, docs, git, memoria).
2. **Verificarlo contra la realidad** (producción en vivo, tests, build, deploy).
3. **Detectar los huecos**: lo que la documentación dice pero el código no hace, lo que está a medias, lo que es riesgo.
4. **Entregar un plan de continuidad priorizado** hacia los objetivos del dueño (sección 6).

**REGLA MADRE — no asumas nada.** Toda afirmación tuya tiene que estar respaldada por:
- una cita `archivo:línea`, o
- la salida real de un comando, o
- una respuesta real de la API en producción.

Lo que no puedas verificar, marcalo explícitamente **`(sin verificar)`**. Un informe con huecos honestos vale mil veces más que uno completo e inventado.

---

## 1) Contexto mínimo para arrancar

| Dato | Valor |
|---|---|
| Repo local | `/Users/alannaimtapia/dev/app-upm` (monorepo) |
| GitHub | `github.com/soyalantapia/app-upm` |
| Ramas | `main` (integración), `feat/backend` (rama desde la que deploya Railway), `gh-pages` (front publicado) |
| Front producción | https://soyalantapia.github.io/app-upm/ |
| API producción | https://upm-api-production.up.railway.app |
| Infra backend | Railway · proyecto `zippy-harmony` · servicios `Postgres` + `upm-api` |
| Stack front | Vite 7 + React 19 + TS strict + Tailwind 4 + HashRouter + PWA · **Node 22 para buildear** |
| Stack back | Node 20+ · Fastify 5 · Zod · Drizzle ORM · PostgreSQL + pgvector · jose (JWT) · nodemailer · node-cron |
| Estructura | `client/` (front) · `server/` (backend+ingesta) · `worker/` (legacy) · `docs/` (build viejo) · `work-agent/` (doc para agentes) |

**Qué es el producto:** plataforma institucional para **legisladores y sus asesores** del MERCOSUR.
Radar normativo regional + búsqueda semántica + asistente de IA que responde **con fuentes verificables** del corpus.
Posicionamiento: *"no es un chat, es infraestructura institucional para legislar con respaldo"*.

**Sobre el nombre:** la marca actual dice "UPM", pero **UPM es el organismo cliente** (Unión Parlamentaria del Mercosur), **no el producto**. Hay un proceso de naming en curso **sin decisión final**.

---

## 2) FASE 1 — Inventario y lectura (en este orden)

1. **`work-agent/`** — documentación pensada para agentes. Empezá acá. *(Si está vacía o incompleta, decilo y seguí con el resto.)*
2. **Raíz del repo**: `README.md`, `HANDOFF.md`, `PLAN-PRODUCTO-POR-PAGINA.md`.
3. **Historial de auditorías**: todos los `PROMPT-*.md` y `REPORTE-*.md` de la raíz (hay varios; son el registro de QA y auditorías previas).
4. **Memoria del proyecto** (historial denso de decisiones y gotchas):
   `/Users/alannaimtapia/.claude/projects/-Users-alannaimtapia-Desktop-Programacion/memory/project_app_upm.md`
   ⚠️ Si la memoria y el código difieren, **manda el código** (la memoria puede tener notas viejas).
5. **Git**: `git log --no-merges --oneline -50`, `git branch -a`, `git status`. ¿Hay ramas divergidas? ¿algo sin commitear?
6. **Código, por área**:
   - `server/src/`: `config.ts`, `index.ts`, `db/schema.ts`, `routes/` (feed, assistant, auth, me, health), `ingest/` (registry + fetchers), `search.ts`, `embed/`, `llm.ts`, `lib/` (otp, mailer)
   - `client/src/`: `App.tsx`, `layouts/AppShell.tsx`, `pages/`, `lib/` (store, sync, data, launch, sources), `components/`
7. **`package.json`** de `client/` y `server/` (versiones reales y scripts disponibles).

**Entregable de esta fase:** un **inventario** — qué documentos existen, qué cubre cada uno, cuáles están desactualizados, y el mapa de directorios con qué vive en cada lugar.

---

## 3) FASE 2 — Verificación contra la realidad

No te quedes en el código: **comprobá que lo que está desplegado funciona**.

**API en vivo** (curl, y pegá las salidas reales):
- `GET /health` → ¿ok? ¿`db: up`? ¿`itemCount`? ¿`lastIngest` reciente?
- `GET /` → lista de endpoints declarados
- `GET /sources` → cuántas fuentes y de qué países
- `GET /feed` → **composición por país** (¿balanceado o dominado por un país?)
- `GET /feed?pais=AR` → ¿filtra server-side?
- `GET /search?q=<algo>` → ¿responde? ¿`mode` híbrido?
- `POST /assistant` con una pregunta real → ¿responde con fuentes? ¿qué `provider`?

**Auth** (⚠️ **NO dispares códigos OTP a emails permitidos** — gasta cupo y molesta al dueño):
- `POST /auth/request-code` con body inválido → 400; con email **no** permitido → 200 sin enviar (anti-enumeración)
- `POST /auth/verify` con código inválido → 401
- `GET /me` sin token → 401

**Front desplegado:**
- ¿Qué bundle sirve `https://soyalantapia.github.io/app-upm/`? ¿coincide con el build del repo?
- ¿El bundle apunta a la API de producción (no localhost)?

**Calidad del código:**
- `cd server && npx tsc --noEmit`
- `cd client && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsc --noEmit`
- `cd client && npx vitest run`

**Infra:**
- Variables de entorno presentes en Railway (`railway variables --service upm-api --kv`) — **listá solo los NOMBRES, nunca los valores**.
- ¿El deploy vivo corresponde al último commit?

**Entregable:** tabla de verificación con el resultado real de cada punto.

---

## 4) FASE 3 — Detección de huecos, contradicciones y riesgos

Buscá activamente los problemas. Preguntas guía:

- **Doc vs código:** ¿la documentación afirma cosas que el código no hace?
- **Código vs producción:** ¿lo desplegado es lo del repo, o hay drift?
- **Datos:** ¿hay algún dato **fabricado/mockup** visible para el usuario? ¿el corpus es 100% real? ¿los tipos y fechas de las normas son correctos?
- **Features a medias:** rutas montadas sin acceso en la UI, features detrás de flags, código muerto nunca montado.
- **Experiencia:** ¿algún flujo del usuario queda sin salida (dead-end)? ¿estados vacío/carga/error manejados?
- **Seguridad/operación:** ¿secretos filtrados en el bundle? ¿backdoors de auth? ¿backups de la DB?
- **Escalado:** límites conocidos que revienten con uso real (cuotas de LLM, concurrencia, volumen de ingesta).

**Clasificá cada hallazgo:** `Bloqueante` / `Alto` / `Medio` / `Bajo`, con evidencia y fix sugerido.

---

## 5) FASE 4 — Estado consolidado

Un cuadro sin ambigüedad:

| Capa | ¿Funciona hoy? | Evidencia |
|---|---|---|
| Ingesta / corpus | | |
| API | | |
| Búsqueda semántica | | |
| Asistente IA | | |
| Auth OTP + email | | |
| Front / PWA | | |
| Deploy / CI | | |

Más las **métricas reales**: normas en el corpus, fuentes activas, países cubiertos, tests que pasan.
Separá claramente: **funciona end-to-end** / **está a medias** / **no existe todavía**.

---

## 6) FASE 5 — Objetivos del dueño y plan de continuidad

**Objetivos actuales** (si el dueño te dice otros, esos mandan):

1. **Lanzar con legisladores reales** — pasar de "listo técnicamente" a "hay usuarios usándolo" (piloto chico, onboarding de la mano).
2. **Cerrar la identidad de marca** — elegir el nombre nuevo (se abandona "UPM") y aplicarlo en toda la app, el email y los dominios.
3. **Experiencia impecable** — cero mockup, todo dato real del backend, nada que rompa la credibilidad institucional.
4. **Asistente de IA confiable** — que responda con fuentes verificables, no alucine, y aguante uso real.
5. **Escalar comercialmente** — venta institucional (UPM / parlamentos) y modelo de membresía.

**Entregá un PLAN priorizado**, agrupado en:
- 🔴 **Bloqueantes de lanzamiento** (sin esto no entra un legislador)
- 🟠 **Mejoras de producto** (elevan la experiencia/credibilidad)
- 🟡 **Deuda técnica** (no urgente, pero acumula)
- 🔵 **Comercial / GTM**

Por cada ítem: **qué hacer**, **por qué importa**, **qué desbloquea**, **esfuerzo estimado** (S/M/L) y **el primer paso concreto**.

---

## 7) Formato del entregable

1. **Resumen ejecutivo** (máx. 10 líneas): en qué estado está el proyecto y qué haría falta ahora.
2. **Inventario** (Fase 1).
3. **Verificación en vivo** (Fase 2, con salidas reales).
4. **Huecos y riesgos** por severidad (Fase 3).
5. **Estado consolidado** (Fase 4).
6. **Plan de continuidad priorizado** (Fase 5).
7. **"Si tuviera que hacer UNA sola cosa ahora, haría ___ , porque ___ "**.

---

## 8) Reglas de trabajo

- Escribí en **español**, denso y sin relleno.
- **Citá siempre**: `archivo:línea`, comando + salida, o respuesta de la API.
- **Solo lectura y verificación**: no deploys, no cambios de código, no migraciones — salvo que el dueño te lo pida explícitamente.
- **No mandes emails OTP** a direcciones permitidas.
- **No imprimas valores de secretos** (tokens, passwords, connection strings). Solo nombres de variables.
- Si encontrás algo **crítico**, ponelo arriba de todo, no enterrado en el informe.
- Si algo te huele raro pero no podés probarlo, decilo como sospecha marcada, no como hecho.
