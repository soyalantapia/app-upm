# work-agent · Documentación para continuar el proyecto

> **Para qué sirve esta carpeta:** es la **fuente de verdad** del proyecto, escrita para que una
> **inteligencia artificial que nunca lo vio** pueda retomarlo al detalle. Todo fue verificado contra
> el código real y contra la API de producción (no son suposiciones).
>
> **Última generación:** 2026-07-18 · `main` en `ace8dc4` · último commit de código `1b9a71b` (2026-06-20)

---

## ⚠️ LEÉ ESTO PRIMERO — hallazgos críticos abiertos

Estos problemas se detectaron **verificando producción en vivo** durante la generación de esta doc.
Ninguno estaba documentado antes. **No empieces a trabajar sin leerlos.**

| # | Hallazgo | Impacto | Detalle en |
|---|---|---|---|
| 1 | **43% del corpus sin embedding** — 1.992 de 4.589 normas tienen `embedding NULL` (BR 1.918, CO 50, UY 24, AR 0). El `npm run embed` corre **manual y off-Railway**, y quedó atrasado. | Esas normas **no son alcanzables por búsqueda semántica ni por el RAG del asistente**; solo por FTS. | `05-IA-BUSQUEDA-ASISTENTE.md` |
| 2 | **La fuente `camara-br` está fallando** (TimeoutError en el último ingest = el `failedSources: 1` de `/health`). `senado-br` y `materias-senado-br` devuelven count 0. | La fuente de mayor volumen no ingesta. | `04-INGESTA-Y-CORPUS.md` |
| 3 | **`POST /assistant` no tiene auth ni rate limit** | Cualquiera con la URL puede **quemar la cuota del LLM**. | `03-BACKEND-API.md` |
| 4 | **Deriva de esquema**: las columnas `embedding`, `content_hash`, `embedded_at`, el índice HNSW y las extensiones pgvector existen **solo en la DB de producción** — no están en `server/src/db/schema.ts` ni en la migración. | Una DB nueva creada con `npm run db:migrate` **rompe la búsqueda semántica**. | `03-BACKEND-API.md` |
| 5 | **`ALLOWED_EMAILS` vacía = allowlist ABIERTA** (`allowed()` devuelve `true` para todos). | Si esa variable se borra por error, **cualquiera puede pedir un código y entrar**. | `06-AUTH-OTP-EMAIL.md` |
| 6 | **El manifest de la PWA referencia íconos que no existen** (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png` → 404). | Instalación de la PWA degradada. | `02-ARQUITECTURA.md` |
| 7 | **Sesgo del corpus a Brasil: 61,7%** (BR 2.833 de 4.589). | El balanceo por país del `/feed` lo compensa, pero el desbalance crece. | `04-INGESTA-Y-CORPUS.md` |
| 8 | **Hay 33 operadores reales** en la tabla `operators` de producción. | Ya hay gente que entró: cuidado con cambios destructivos. | `01-PRODUCTO-Y-ESTADO.md` |

### 🚫 Documentos que NO debés creer
`README.md` y `HANDOFF.md` de la **raíz del repo** están **desactualizados**: describen la etapa de
demo sin backend. Lo mismo `server/README.md` (documenta `/auth/login`, que fue eliminado).
**Si esta carpeta y esos archivos se contradicen, mandan los documentos de `work-agent/`.**

---

## Orden de lectura recomendado

1. **`01-PRODUCTO-Y-ESTADO.md`** — qué es, para quién, y en qué estado está hoy. *(Empezá acá siempre.)*
2. **`10-GOTCHAS-CRITICOS.md`** — lo que te haría perder horas. *(Leelo antes de tocar código.)*
3. **`02-ARQUITECTURA.md`** — cómo está armado todo y por qué.
4. Después, el área en la que vayas a trabajar (tabla de abajo).
5. **`11-PENDIENTES-Y-ROADMAP.md`** — qué sigue, priorizado.

---

## Índice de documentos

| Documento | Cubre |
|---|---|
| `01-PRODUCTO-Y-ESTADO.md` | Producto, usuarios, posicionamiento, cobertura y tamaño del corpus (verificado), URLs/infra, modelo de negocio, estado end-to-end capa por capa, y el **proceso de naming** (se abandona "UPM") con el inventario de las 13 superficies a cambiar |
| `02-ARQUITECTURA.md` | Monorepo (3 proyectos npm independientes), stack con versiones reales, flujo end-to-end (39 fetchers → ingesta → Postgres+pgvector → Fastify → PWA), y las decisiones clave con su porqué |
| `03-BACKEND-API.md` | Los 13 endpoints con contrato exacto y códigos de error, esquema de DB (5 tablas + 4 enums + índices), `balancedRows`, `noiseFilter`, `feedEnvelope`, middleware de auth |
| `04-INGESTA-Y-CORPUS.md` | Registry de fuentes, `runIngest`, cron cada 30 min + boot-if-stale, upsert idempotente, `deriveLeyDate` (AR), `SIGLA_TO_TYPE` (BR), composición actual del corpus |
| `05-IA-BUSQUEDA-ASISTENTE.md` | Embeddings locales (e5-small, 384 dims), pgvector + HNSW, búsqueda híbrida vector+FTS con RRF, LLM pluggable (Gemini free tier), RAG, recencia, anti-inyección, límites de cuota |
| `06-AUTH-OTP-EMAIL.md` | Flujo OTP completo, seguridad del código (sha256, timingSafeEqual, TTL, cooldown, intentos), JWT, allowlist + anti-enumeración, SMTP Hostinger, el rediseño del email |
| `07-FRONTEND.md` | Rutas y páginas, `AppShell`, store y sincronización `/me/*`, `useLiveFeed`, flags de lanzamiento, `ACTIVE_COUNTRIES`, design system (azul institucional, Inter), PWA |
| `08-DEPLOY-Y-OPS.md` | **Runbook copiable**: deploy backend (`railway up`), deploy front (worktree manual a `gh-pages`), variables de entorno, acceso a la DB de producción, migraciones, troubleshooting |
| `09-QA-Y-AUDITORIAS.md` | Historial de auditorías, hallazgos por severidad y cómo se resolvieron, prompts de QA versionados, comandos de verificación |
| `10-GOTCHAS-CRITICOS.md` | Todo lo que rompe o hace perder tiempo (el documento más largo: 973 líneas) |
| `11-PENDIENTES-Y-ROADMAP.md` | Qué falta, priorizado: naming, entregabilidad del email, alta de legisladores, escalado del asistente, dominio propio, analytics |
| `12-HISTORIAL-COMMITS.md` | Cronología anotada por hitos: cómo el proyecto llegó a su estado actual |
| `PROMPT-ANALISIS-TOTAL-Y-CONTINUIDAD.md` | **Prompt reutilizable**: pegalo en una sesión nueva para que una IA reconstruya el estado, verifique contra producción y entregue un plan de continuidad |

---

## Verificación rápida (30 segundos)

```bash
# ¿La API vive y con cuánto corpus?
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool

# ¿El feed está balanceado por país?
curl -s "https://upm-api-production.up.railway.app/feed" | python3 -c "
import sys,json; from collections import Counter
d=json.load(sys.stdin)
print(dict(Counter(i['country'] for i in d['items'])))"

# ¿Compila y pasan los tests?
cd server && npx tsc --noEmit
cd ../client && PATH=\"/opt/homebrew/opt/node@22/bin:\$PATH\" npx tsc --noEmit && npx vitest run
```

---

## Reglas para quien continúe

- **El código manda.** Si un documento y el código difieren, gana el código — y **actualizá el documento**.
- **No rompas producción**: hay 33 operadores reales y un corpus vivo que se ingesta cada 30 minutos.
- **Nunca dispares códigos OTP** a emails de la allowlist para probar (gasta cuota y molesta a usuarios reales).
- **Nunca imprimas valores de secretos**; solo nombres de variables.
- El deploy del front es **manual** (worktree a `gh-pages`) — ver `08-DEPLOY-Y-OPS.md`.
