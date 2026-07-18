# 11 · Pendientes y roadmap

**Última actualización:** 2026-07-18 (todo lo afirmado acá se verificó ese día contra el repo local `/Users/alannaimtapia/dev/app-upm`, contra la API en producción vía `curl`, y contra la base Postgres de producción vía `psql`/`pg` con `DATABASE_PUBLIC_URL`).

**Para qué sirve este documento:** es la **lista de trabajo pendiente** del proyecto, priorizada y accionable, para una IA que lo continúa sin haber estado presente. Dice qué falta, por qué falta, dónde tocar (ruta exacta), cómo verificar que quedó hecho, y qué NO hay que hacer. Los documentos `01`–`06` describen lo que **ya existe**; este describe lo que **falta**.

> **Regla:** cada ítem trae su verificación reproducible. Lo que no pude verificar está marcado **(verificar)**. Si algo acá contradice al código, **manda el código**.

---

## 0. Estado en una línea

La app **está en producción y funciona end-to-end** (login OTP real por email, corpus real de 4.589 normas de 4 países, búsqueda híbrida, asistente Gemini citando normas verificables). Lo que falta **no es hacer funcionar el producto: es hacerlo lanzable a legisladores reales** — marca, entregabilidad de email, altas de usuarios, dominio, medición — más una cola de deuda técnica acotada.

Verificación del estado base (2026-07-18):

```bash
curl -s https://upm-api-production.up.railway.app/health
# → {"ok":true,"db":"up","lastIngest":{"finishedAt":"2026-07-18T14:00:16.001Z",
#    "okSources":38,"failedSources":1,"itemsUpserted":1988},"itemCount":4589,...}

curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
# → index-DpEQkNiw.js   (bundle desplegado = commit d380120 "lote 3")
```

---

## 1. Tabla maestra priorizada

Prioridades: **P0** = bloquea el piloto con legisladores reales · **P1** = degrada el piloto o el producto · **P2** = deuda técnica / calidad · **P3** = producto futuro.

| # | Prioridad | Pendiente | Bloqueante de | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | **P0** | Decidir el **nombre nuevo** (naming en curso, sin decisión final) | Todo lo demás de marca: dominio, email, ícono, copy | Decisión humana (no técnica) |
| 2 | **P0** | **Renombrar la marca** en toda la app + email + PWA + repo | Piloto con marca coherente | 3–5 h (ver §3 · superficie exacta medida) |
| 3 | **P0** | **DKIM** en `xnod.tech` (SPF y DMARC ya existen) + subir DMARC a `p=quarantine` | Que el código OTP no caiga en spam → que el legislador pueda entrar | 30 min DNS + 24–48 h de propagación |
| 4 | **P0** | Dar de alta legisladores reales en **`ALLOWED_EMAILS`** (hoy: 2 emails, ninguno de un legislador) | Que alguien externo pueda loguearse | 5 min por tanda |
| 5 | **P1** | **Dominio propio institucional** (hoy `soyalantapia.github.io/app-upm/`) | Credibilidad institucional; ligado a #1 | 2–4 h + DNS |
| 6 | **P1** | **Analytics / medición** del piloto (hoy: CERO instrumentación) | Saber si el piloto funcionó | 3–6 h |
| 7 | **P1** | Evaluar **`ANTHROPIC_API_KEY`** para el asistente bajo concurrencia | Aguantar una demo en vivo / varios legisladores a la vez | 10 min setear + decisión de costo |
| 8 | **P1** | **Re-correr embeddings**: 1.992 de 4.589 normas (43%) sin `embedding` | Calidad de la búsqueda semántica y del RAG | 1–2 h de corrida off-Railway |
| 9 | **P1** | **`server/.env` apunta a la DB de PRODUCCIÓN** → `npm test` escribe en prod | Higiene; ya ensució 31 filas en `operators` | 1 h |
| 10 | **P2** | Fuente `camara-br` falla por timeout en la última ingesta; corpus sesgado a BR (62%) | Calidad del radar | 2–4 h |
| 11 | **P2** | `npm audit`: 5 vulns en prod-deps (3 high, 2 moderate), todas con fix *breaking* | Seguridad | 2–4 h con verificación |
| 12 | **P2** | Deuda menor: 2 componentes huérfanos, `README.md` desactualizado, `docs/` (11 MB de build viejo), `worker/` legacy, `FUENTES_OFICIALES` hardcodeado | Limpieza | 2 h |
| 13 | **P3** | Reactivar features ocultas por flag: **Briefing / Biblioteca / Carpetas / Estadísticas** | Alcance de producto v2 | Ver §6 |
| 14 | **P3** | Backend de documentos propio (la Biblioteca no tiene fuente de datos) | Que Biblioteca deje de estar vacía | Alto (feature nueva) |

---

## 2. P0 · Naming (bloqueante #1)

### 2.1 El problema

**"UPM" = Unión Parlamentaria del Mercosur = el organismo CLIENTE, no el producto.** Llamar al producto "App UPM" / "Asistente IA UPM" confunde comprador con producto y regala la marca. Hay un **proceso de naming EN CURSO, sin decisión final**.

### 2.2 Finalistas

Aportados por el contexto del proyecto (**no verifiqué disponibilidad de dominios ni marcas — verificar antes de comprar**):

| Nombre | Lectura | Nota |
|---|---|---|
| **AsesorÍA Legislativa** | El juego "asesoría / IA" es explícito | Descriptivo, largo para un logotipo |
| **BancadIA** | "bancada" (bloque legislativo) + IA | Muy legislativo, corto |
| **VeedurÍA** | veeduría = control/fiscalización | Connota control, no asistencia |
| **CurulIA** | "curul" = banca legislativa (uso CO/MX/PE) | Menos legible en AR/UY |
| **ParlaIA** | parlamento + IA | Corto, regional, neutro |

**Estado de dominios: (verificar).** El contexto dice "dominios verificados" pero no lo confirmé en esta pasada. Antes de ejecutar el rename, correr:

```bash
for d in asesoria-legislativa.com bancadia.com veeduria.ai curulia.com parlaia.com; do
  echo "== $d"; whois $d 2>/dev/null | grep -iE "^(No match|Domain Name:|Creation Date:)" | head -2
done
```

### 2.3 Criterios de decisión (para quien continúe)

1. **Pronunciable y escribible al teléfono** — el canal de venta es institucional y verbal.
2. **No colisiona con el cliente** — el nombre no puede contener "UPM", "Mercosur" ni "Parlamento" como marca registrable.
3. **Funciona en ES-AR / ES-CO / PT-BR** — el corpus ya es cuatripaís; "curul" no se usa en AR/UY, "bancada" sí funciona en BR.
4. **`.com` o `.ai` libre** + handle social libre.
5. **Sobrevive a que la IA deje de ser diferencial** — un nombre 100% construido sobre "IA" envejece.

**Decisión pendiente = humana.** Una IA que continúe NO debe elegir el nombre por su cuenta: debe presentar la matriz y esperar. Lo que sí puede hacer sin decisión: **dejar el rename parametrizado** (ver 3.4).

---

## 3. P0 · Rename de marca — superficie exacta

Medida el 2026-07-18 con `grep`. **Esta es la lista completa de lugares a tocar.**

### 3.1 Texto visible / metadatos

| Archivo | Ocurrencias `UPM` | Qué es |
|---|---|---|
| `client/src/components/Brand.tsx` | 2 | `aria-label="UPM"` (línea ~10) + **`"Asistente IA UPM"`** en `BrandLockup` (línea ~26) ← el logotipo |
| `client/index.html` | 7 | `<title>`, `og:title`, `og:description`, `twitter:*`, `meta description` |
| `client/vite.config.ts` | 5 | Manifest PWA: `name: 'Asistente AI UPM'`, `short_name: 'UPM'`, `base: '/app-upm/'`, `start_url`, `scope` |
| `client/src/pages/Library.tsx` | 12 | Copy de "Biblioteca UPM" (página oculta por flag, igual renombrar) |
| `client/src/pages/Assistant.tsx` | 6 | Copy del asistente |
| `client/src/pages/Login.tsx` | 4 | Copy institucional del login |
| `client/src/components/GlobalSearch.tsx` | 3 | Sección "Biblioteca UPM" en ⌘K |
| `client/src/components/SourceCard.tsx` | 2 | Badge "Oficial UPM" / "Curado por UPM" |
| `client/src/lib/export-law.ts` | 2 | Atribución del export: `"UPM · Mapa de la Ley"` |
| `client/src/components/{PhoneMockup,AddToCalendarButton,DocumentDetailDrawer,CoverageProof,HomeTour,AgendaMercosur}.tsx` | 1–2 c/u | Copy |
| `client/src/pages/{Radar,Profile,Onboarding,Briefing}.tsx` | 2 c/u | Copy |
| `client/src/{layouts/AppShell.tsx, lib/permissions.ts, lib/similarity.ts, lib/pt-es.ts, lib/sources/*}` | 1–3 c/u | Copy y comentarios |
| `client/src/test/permissions.test.ts` | 6 | Tests (fixtures con `@upm.org`) |

**Total client/src: 72 ocurrencias.** Comando para regenerar la lista:

```bash
cd /Users/alannaimtapia/dev/app-upm && grep -rn "UPM" client/src --include="*.ts" --include="*.tsx"
```

### 3.2 Backend

| Archivo | Ocurrencias | Qué es |
|---|---|---|
| `server/src/lib/mailer.ts` | **9** | ← **el email OTP**: subject `"<code> es tu código de acceso a App UPM"`, lockup con la "U", footer institucional, en `otpEmailHtml(code, year)` |
| `server/src/routes/assistant.ts` | 2 | `SYSTEM_PROMPT`: *"Sos el asistente legislativo de **App UPM**…"* (línea ~15) — el modelo se auto-nombra con la marca vieja |
| `server/src/config.ts` | 1 | Comentario |
| `server/src/{index.ts, routes/health.ts, ingest/util.ts}` | — | `upm-api` en minúscula (nombre del servicio Railway; se puede dejar) |

### 3.3 Cosas que rompen si se renombran mal — GOTCHAS

| Riesgo | Detalle | Mitigación |
|---|---|---|
| **Se borra el estado de todos los usuarios** | Claves de `localStorage` con prefijo `upm.`: `upm.app.state` (`client/src/lib/store.ts:6`), `upm.notes.v1` (`lib/notes.ts:6`), `upm.app.operator` (`lib/auth.tsx:13`), `upm.sync.token.v1` (`lib/auth.tsx:16`), `upm.alerts.evaluated` (sessionStorage, `store.ts:249,257`) | **NO renombrar las claves**, o escribir una migración que lea la clave vieja y reescriba la nueva. Renombrar `upm.sync.token.v1` **desloguea a todo el mundo**. |
| **Se rompe todo el CSS** | **761** usos de clases `upm-50…upm-900`, definidas como `--color-upm-*` en `client/src/index.css:10-19` | Renombrar tokens es un `sed` de 2 pasos (CSS + clases) o directamente **dejar los tokens como están** (son internos, no los ve el usuario). |
| **Se rompe el deploy de GitHub Pages** | `base: '/app-upm/'` en `client/vite.config.ts:9` está atado al **nombre del repo**. Cambiar el repo ⇒ cambiar `base`, `start_url` y `scope` del manifest, y `STATIC_DATA_BASE` del server (default `https://soyalantapia.github.io/app-upm/data`, `server/src/config.ts`) | Si se migra a dominio propio (§5), `base` pasa a `'/'` y el problema desaparece. Hacer **rename + dominio en el mismo movimiento**. |
| **Se rompe CORS** | `ALLOWED_ORIGINS` en Railway = `https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188` | Agregar el dominio nuevo a `ALLOWED_ORIGINS` **antes** de publicar el front nuevo. |
| **El asistente sigue diciendo el nombre viejo** | `SYSTEM_PROMPT` en `server/src/routes/assistant.ts` | Es texto en el prompt, no una constante: buscar a mano. |
| **El email sigue diciendo el nombre viejo** | Además de `mailer.ts`, la var `SMTP_FROM` en Railway = `App UPM <ia@xnod.tech>` | `railway variables --service upm-api --set "SMTP_FROM=<Nombre> <ia@xnod.tech>"` |

### 3.4 Recomendación de ejecución

**Antes de tener el nombre**, se puede desriesgar el rename creando una constante única de marca (no existe hoy):

```ts
// client/src/lib/brand.ts  (NO EXISTE — crear)
export const BRAND = {
  name: 'Asistente IA UPM',
  short: 'UPM',
  tagline: 'Acceso institucional',
} as const
```

…y reemplazar los 72 literales por `BRAND.name`. Después, el rename real es **un archivo**. El equivalente server-side es una constante en `server/src/lib/brand.ts` usada por `mailer.ts` y por el `SYSTEM_PROMPT`.

**Verificación post-rename:**

```bash
cd /Users/alannaimtapia/dev/app-upm
grep -rn "UPM" client/src server/src client/index.html client/vite.config.ts | grep -v "upm-api" | grep -v "color-upm"
# → debe quedar vacío (salvo tokens CSS y el nombre del servicio Railway)
cd client && npx tsc --noEmit && npx vitest run    # 0 errores · 42 tests
```

---

## 4. P0 · Entregabilidad del email OTP (SPF / DKIM / DMARC)

### 4.1 Estado REAL verificado hoy (corrige la nota de memoria "falta SPF/DKIM/DMARC")

```bash
dig +short TXT xnod.tech
# → "v=spf1 include:_spf.mail.hostinger.com ~all"          ✅ SPF EXISTE
dig +short TXT _dmarc.xnod.tech
# → "v=DMARC1; p=none; rua=mailto:ia@xnod.tech; fo=1; adkim=r; aspf=r"   ✅ DMARC EXISTE (modo monitoreo)
for s in hostingermail1 hostingermail2 hostingermail3 default dkim mail selector1 selector2 titan hostinger; do
  dig +short TXT $s._domainkey.xnod.tech; dig +short CNAME $s._domainkey.xnod.tech
done
# → VACÍO en los 10 selectores probados                    ❌ DKIM NO CONFIGURADO
dig +short MX xnod.tech
# → 5 mx1.hostinger.com. / 10 mx2.hostinger.com.
```

| Registro | Estado | Acción |
|---|---|---|
| **SPF** | ✅ Presente, `~all` (softfail) | Opcional: endurecer a `-all` una vez confirmado que Hostinger es el único emisor |
| **DKIM** | ❌ **AUSENTE** | **Acción P0**: activar DKIM en el panel de Hostinger para `xnod.tech` y publicar el CNAME/TXT del selector que entregue Hostinger |
| **DMARC** | ⚠️ Presente pero `p=none` | Tras activar DKIM y observar `rua` unos días, subir a `p=quarantine` y luego `p=reject` |

**Por qué es P0:** sin DKIM, Gmail/Outlook no pueden validar alineación DKIM; con `p=none` no hay política. El mail **entra al inbox hoy** (verificado E2E en junio), pero es frágil: un legislador que no recibe el código **no puede entrar de ninguna forma** — no hay password, no hay backdoor (`/auth/login` fue eliminado en el commit `129ea91`).

**Verificación después del cambio:** enviarse un OTP real y leer los headers del mail recibido — deben aparecer `dkim=pass`, `spf=pass`, `dmarc=pass`.

```bash
curl -s -X POST https://upm-api-production.up.railway.app/auth/request-code \
  -H "Content-Type: application/json" -d '{"email":"alannaimtapia@gmail.com"}'
# → {"ok":true}   (y llega el mail; ver headers Authentication-Results)
```

### 4.2 Riesgo colateral: los códigos OTP viven **en memoria**

`server/src/lib/otp.ts` guarda los códigos en un `Map` de proceso (comentario explícito en la línea 3: *"suficiente para 1 instancia"*).

- **Un redeploy de Railway invalida todos los códigos pendientes.** Si se hace `railway up` mientras un legislador espera su código, ese código deja de servir (tiene que pedir otro, con cooldown de 60 s).
- **No escala a más de 1 instancia** del servicio: con 2 réplicas, el código emitido por la instancia A no valida en la B.
- Parámetros: TTL 10 min, cooldown 60 s, máx 5 intentos, single-use (`TTL_MS`, `RESEND_COOLDOWN_MS`, `MAX_ATTEMPTS`).

**Acción P1 si el piloto crece:** mover a tabla `otp_codes` en Postgres (hash + expiry + attempts) — la lógica de `otp.ts` ya está aislada, es un cambio de storage, no de contrato. **Regla operativa mientras tanto: no deployar durante una sesión de onboarding en vivo.**

---

## 5. P0 · Altas de legisladores reales (`ALLOWED_EMAILS`)

### 5.1 Estado hoy

```bash
cd /Users/alannaimtapia/dev/app-upm/server && railway variables --service upm-api --kv | grep ALLOWED_EMAILS
# → ALLOWED_EMAILS=alannaimtapia@gmail.com,ia@xnod.tech
```

**Solo 2 emails, ambos internos. Ningún legislador puede entrar hoy.**

### 5.2 Cómo funciona el gate (leído en `server/src/routes/auth.ts`)

- `POST /auth/request-code` **sí** chequea la allowlist. Si el email no está, devuelve **`{ok:true}` igual, sin mandar nada** (anti-enumeración, línea ~45). **GOTCHA operativo enorme:** un legislador no dado de alta ve "te mandamos el código" y **nunca recibe nada**; no hay error visible. Si alguien reporta "no me llega el mail", **lo primero a chequear es `ALLOWED_EMAILS`, no el SMTP.**
- `POST /auth/verify` **no** chequea la allowlist (solo valida el código). El gate está únicamente en la emisión.
- Si `ALLOWED_EMAILS` está **vacía**, `allowed()` devuelve `true` para todos (`config.allowedEmails.length === 0 || …`) → **abre el registro a cualquiera con un email válido**. No dejarla vacía sin decisión explícita.
- Al verificar, `upsertOperator()` crea la fila en `operators` y deriva nombre/cargo/país del email: `deriveName()` pone **siempre `cargo:'Legislador'` y `pais:'AR'`**. Un legislador colombiano arranca marcado como AR hasta que edita su perfil. **(Mejora P2: pedir país en el onboarding y persistirlo vía `PUT /me/prefs`, o parametrizar el alta.)**

### 5.3 Comando de alta

```bash
cd /Users/alannaimtapia/dev/app-upm/server
railway variables --service upm-api \
  --set "ALLOWED_EMAILS=alannaimtapia@gmail.com,ia@xnod.tech,legislador1@senado.gov.ar,asesor1@senado.gov.ar"
# OJO: reemplaza el valor completo → incluir SIEMPRE los que ya estaban.
# Setear una variable dispara redeploy del servicio (y por §4.2 invalida OTPs pendientes).
```

### 5.4 GOTCHA: la tabla `operators` de producción está contaminada

```sql
select split_part(email,'@',2) dom, count(*) from operators group by 1 order by 2 desc;
-- upm.org   31   ← filas vitest.<pid>@upm.org creadas por los tests de integración
-- gmail.com  1
-- upm.test   1
-- y.com      1
```

**31 de 34 operadores son basura de tests** (ver §9). Antes del piloto, limpiar para que las métricas de adopción no mientan:

```sql
delete from operators where email like 'vitest.%@upm.org';
-- verificar antes: select count(*) from operators where email like 'vitest.%@upm.org';
```

---

## 6. P1 · Dominio propio institucional

**Hoy:** `https://soyalantapia.github.io/app-upm/` — subdominio personal de GitHub del desarrollador. Para vender a un organismo parlamentario, esto es un problema de credibilidad, no de infraestructura.

**Dependencia:** el dominio sale del naming (#1). No comprar antes de decidir.

**Plan (una vez decidido el nombre):**

1. Comprar el dominio (Hostinger ya es el proveedor de mail de `xnod.tech`, conviene consolidar).
2. Front: elegir hosting.
   - **Opción A (mínimo cambio):** seguir en GitHub Pages con dominio custom → agregar `client/public/CNAME`, apuntar DNS a GitHub, y cambiar `base: '/app-upm/'` → `base: '/'` en `client/vite.config.ts:9` (más `start_url` y `scope` del manifest PWA).
   - **Opción B:** servir el front desde Railway/Cloudflare Pages junto a la API (permite dejar de usar `HashRouter` y pasar a rutas limpias).
3. **Antes de publicar**, agregar el origen nuevo a `ALLOWED_ORIGINS` en Railway o el front nuevo se come un CORS error en todos los `fetch`.
4. Actualizar `STATIC_DATA_BASE` (default apunta a `https://soyalantapia.github.io/app-upm/data`).
5. Considerar un subdominio para la API (`api.<nuevodominio>`) en vez de `upm-api-production.up.railway.app` → cambiar `client/.env.production` (`VITE_UPM_API_URL`).

**GOTCHA PWA:** cambiar `scope`/`start_url` deja huérfanos los service workers ya instalados en el dominio viejo. Si algún legislador ya instaló la PWA en la URL de github.io, **hay que avisarle que la reinstale**; el `registerType:'autoUpdate'` no cruza de dominio.

---

## 7. P1 · Analytics y medición del piloto

**Estado verificado: NO HAY NINGUNA instrumentación.**

```bash
grep -rin "gtag\|plausible\|posthog\|analytics\|umami\|matomo" client/src client/index.html server/src
# → 0 resultados relevantes (solo matchea "editingTags" en NotesPanel.tsx)
```

Hoy, la única fuente de verdad sobre uso es la tabla `operators` (`email`, `name`, `cargo`, `pais`, `created_at`, `last_login_at`) y la tabla `prefs` (30 filas hoy). Eso responde "¿entró?" pero **no responde "¿le sirvió?"**.

### 7.1 Qué medir (mínimo viable para juzgar el piloto)

| Evento | Por qué importa | Dónde instrumentar |
|---|---|---|
| `login_completado` | Tasa de activación real vs. altas | `client/src/pages/Login.tsx` (post `/auth/verify` 200) |
| `otp_solicitado` / `otp_fallido` | Detecta problemas de entregabilidad **sin depender de que el usuario reporte** | `Login.tsx` + log estructurado en `server/src/routes/auth.ts` |
| `asistente_pregunta` (+ largo, + país del operador) | **La métrica central**: ¿usan el asistente o solo miran el feed? | `client/src/pages/Assistant.tsx` / server en `routes/assistant.ts` |
| `asistente_respuesta` (`isInstitutional`, nº de fuentes, `provider`, latencia) | Calidad percibida: respuestas sin fuentes = producto flojo | `server/src/routes/assistant.ts` (ya calcula `isInstitutional` y `provider`) |
| `busqueda_semantica` (query + nº resultados) | **Alimenta el roadmap del corpus**: las queries con 0 resultados son la lista de fuentes que faltan | `client/src/lib/use-semantic-search.ts` + `routes/feed.ts:142` (`/search`) |
| `radar_filtro_aplicado` (país/tema/tipo) | Qué países/temas importan de verdad | `client/src/pages/Radar.tsx` |
| `norma_abierta` | Del feed al documento: el funnel del radar | `DocumentDetailDrawer.tsx` |
| `sesion_duracion` | Retención | shell |

### 7.2 Recomendación de implementación

**Preferir instrumentación server-side** sobre un SDK de terceros:

- Ya existe Postgres y ya existe Fastify: una tabla `events (id, email, event, props jsonb, created_at)` + un `POST /events` autenticado con el JWT es ~60 líneas y **no agrega un tercero que reciba datos de legisladores**. Para un cliente institucional, "no mandamos datos a terceros" es un argumento de venta, no una limitación.
- Si se quiere un producto llave en mano: **Plausible** (self-hostable, sin cookies, GDPR-friendly) por sobre GA4. **Evitar GA4** en un producto parlamentario.
- **GOTCHA CSP/PWA:** cualquier script externo hay que agregarlo al `workbox` config o queda cacheado raro.

**Sin esto, el piloto es no-falsable:** no vas a poder decir si funcionó.

---

## 8. P1 · Asistente bajo concurrencia (`ANTHROPIC_API_KEY`)

### 8.1 Estado verificado hoy

```bash
railway variables --service upm-api --kv | grep -E "^(GEMINI_MODEL|ANTHROPIC)"
# → GEMINI_MODEL=gemini-2.5-flash
# → ANTHROPIC_API_KEY: NO ESTÁ SETEADA
```

`server/src/llm.ts` → `getLlm(config)` prioriza `ANTHROPIC_API_KEY`; si no está, usa Gemini free tier; sin ninguna key, devuelve `null` y `/assistant` responde **503**.

**Medición real 2026-07-18 (5 requests en paralelo contra prod):**

```
req3 HTTP:200 t=1.69s | req2 HTTP:200 t=1.90s | req5 HTTP:200 t=1.98s
req4 HTTP:200 t=2.12s | req1 HTTP:200 t=2.63s
```

**5 concurrentes hoy: 5/5 OK, ~2 s.** Esto **matiza** la nota histórica ("Gemini free tier falla en ráfaga con 502 y >45 s"): el fallo **no es determinístico** — depende del cupo diario consumido. El cupo del free tier es **por-modelo-por-día** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`) y resetea a medianoche del Pacífico. `llm.ts` ya mitiga rotando una cadena de modelos ante 429/503 (cada modelo = balde propio).

### 8.2 Decisión pendiente (es de COSTO, no técnica)

| Opción | Costo | Riesgo |
|---|---|---|
| Seguir con Gemini free tier | $0 | Una demo en vivo con el organismo puede caerse si el cupo diario ya se consumió testeando. **Riesgo reputacional concentrado en el peor momento.** |
| Setear `ANTHROPIC_API_KEY` | Pago por uso (input ~1k tokens/consulta gracias al contexto RAG recortado a 6 normas / excerpts 360c) | Ninguno técnico. **Cero cambios de código**: `llm.ts` ya le da prioridad. |

**Recomendación:** setear la key **antes de cualquier demo en vivo o del arranque del piloto**. El volumen de un piloto de 10–20 legisladores es trivial en costo comparado con el riesgo de que el asistente devuelva 503 delante del cliente.

```bash
railway variables --service upm-api --set "ANTHROPIC_API_KEY=sk-ant-..."
# Verificar que cambió el proveedor:
curl -s -X POST https://upm-api-production.up.railway.app/assistant \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"¿Qué establece la ley de glaciares?"}]}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['provider'])"
# hoy → gemini:gemini-2.5-flash   ·   con la key → anthropic:claude-...
```

---

## 9. P1 · Deuda técnica verificada (hallazgos nuevos de esta pasada)

### 9.1 🔴 43% del corpus sin embedding — la búsqueda semántica está degradada

**Verificado contra la DB de producción:**

```sql
select count(*) total, count(embedding) con_emb from normas;
-- total 4589 · con_emb 2597  →  1992 SIN EMBEDDING (43%)

select country, count(*) n, count(embedding) emb from normas group by 1 order by 2 desc;
-- BR 2833 / 915   ← 1918 sin embedding
-- AR 1081 / 1081  ← completo
-- CO  526 / 476   ← 50 sin
-- UY  149 / 125   ← 24 sin
```

El corpus creció de 2.597 (última corrida de `npm run embed`, 2026-06-20) a **4.589** hoy. La ingesta **no genera embeddings**: `npm run embed` es un script manual que corre off-Railway.

**Síntoma observable:** la calidad de recuperación bajó.

```bash
curl -s "https://upm-api-production.up.railway.app/search?q=proteccion%20de%20glaciares&limit=3"
# → #1 = br-camara-2633997 "Estratégia Nacional de Prevenção ... Obesidade Infantil"  ← RUIDO
curl -s "https://upm-api-production.up.railway.app/search?q=proteccion%20de%20glaciares%20y%20agua"
# → ar-ley-26639 (Ley de Glaciares) recién en posición #3
```

En junio, "protección de glaciares y agua" devolvía la Ley de Glaciares **#1**. Hoy no. **(Hipótesis a confirmar: el ruido procesal de BR sin embedding entra por la rama FTS del RRF y desplaza los hits semánticos. Verificar comparando el ranking antes/después de re-embeber.)**

**Acción:**

```bash
cd /Users/alannaimtapia/dev/app-upm/server
# GOTCHA: loadConfig valida TODO el config aunque embed solo use DATABASE_URL →
# hay que pasar un JWT_SECRET dummy de ≥16 chars.
DATABASE_URL="<DATABASE_PUBLIC_URL del servicio Postgres>" JWT_SECRET="dummy-dummy-dummy-32" npm run embed
```

- Modelo: `Xenova/multilingual-e5-small` (transformers.js q8, sin API key), ~4 normas/s → **~8 min para 1.992** (más la descarga del modelo, que **no queda cacheado** entre corridas).
- Es **incremental por `content_hash`**: re-correrlo es seguro e idempotente.
- Correr **fuera de Railway** (la carga del modelo se come la RAM del servicio).
- **GOTCHA:** el host interno `postgres.railway.internal` **no resuelve desde local** → usar `DATABASE_PUBLIC_URL`.
- **GOTCHA de modelo:** query-embeddings y passage-embeddings **deben ser del mismo modelo**. Cambiar a una API (Voyage/OpenAI) obliga a re-embeber los 4.589.

**Acción P2 asociada:** que la ingesta encole embeddings de lo nuevo (hoy es un paso manual que se olvida, y este es exactamente el resultado de olvidarlo).

### 9.2 🔴 `server/.env` apunta a la base de PRODUCCIÓN

**Verificado (comparando hosts sin exponer credenciales):**

```
DATABASE_PUBLIC_URL (Railway/Postgres) → acela.proxy.rlwy.net:23222
server/.env DATABASE_URL               → acela.proxy.rlwy.net:23222
MISMO: true
```

Consecuencia: **`npm test` en `server/` corre los tests de integración contra la base de producción.** `server/test/integration/api.test.ts:94` crea `vitest.${process.pid}@upm.org` → **31 filas basura acumuladas en `operators`**, la más reciente de **hoy 2026-07-18T14:22Z**.

No hay evidencia de daño en `normas` (los tests no escriben ahí), pero el riesgo estructural es alto: cualquier test futuro que haga `delete` o `truncate` borra producción.

**Acción P1:**
1. Provisionar un Postgres separado (Railway environment `dev`, o `docker run postgres` local con `pgvector`).
2. Apuntar `server/.env` ahí, y crear `server/.env.test` explícito.
3. Añadir un guard en el setup de vitest que **aborte si `DATABASE_URL` contiene el host de producción**.
4. Limpiar `operators` (query en §5.4).

`server/.env` está en `.gitignore` (verificado) → no hay filtración de credenciales al repo.

### 9.3 🟠 `camara-br` timeout + corpus sesgado a Brasil

```bash
curl -s https://upm-api-production.up.railway.app/health
# → "okSources":38,"failedSources":1
curl -s https://upm-api-production.up.railway.app/sources | grep -o '"camara-br".\{0,200\}'
# → "ok":false,"count":0,"error":"TimeoutError: The operation was aborted due to timeout"
```

El timeout de fetch es de **15 s** (`server/src/ingest/util.ts:8`, `AbortSignal.timeout(opts?.timeoutMs ?? 15_000)`). La API de la Câmara es lenta e intermitente.

Y el sesgo estructural: **BR = 2.833 de 4.589 normas (62%)**, casi todo procesal (pareceres, requerimentos, indicações). El `/feed` **ya está protegido** por `balancedRows()` en `server/src/routes/feed.ts` (verificado en vivo: `{"BR":130,"UY":110,"CO":130,"AR":130}` sobre 500) y `noiseFilter` excluye `br-votacao*`/`br-evento*`. **Pero `/search` y el RAG buscan sobre el corpus completo** → el ruido BR compite en la recuperación (ver 9.1).

**Acciones:** (a) subir `timeoutMs` a 30 s para `camara-br`; (b) evaluar excluir del embedding/retrieval los tipos procesales BR **o** ponderar por `relevance` en el RRF; (c) `senado-br`, `materias-senado-br` devuelven `count:0` con `ok:true` — **fuentes vivas pero vacías, verificar si el endpoint upstream cambió**.

### 9.4 🟠 Vulnerabilidades de dependencias (prod-only)

```bash
cd server && npm audit --omit=dev
# 5 vulnerabilities (2 moderate, 3 high)
```

| Severidad | Paquete | Rango | Fix |
|---|---|---|---|
| high | `@huggingface/transformers` | `>=4.0.0-next.0` | downgrade a `3.8.1` — **semver major** |
| high | `adm-zip` | `<0.6.0` | vía `@huggingface/transformers@3.8.1` |
| high | `onnxruntime-node` | `>=1.22.0-dev…` | vía `@huggingface/transformers@3.8.1` |
| moderate | `node-cron` | `3.0.2–3.0.3` | `node-cron@4.6.0` — **semver major** |
| moderate | `uuid` | `<11.1.1` | vía `node-cron@4.6.0` |

Las tres `high` cuelgan de `@huggingface/transformers` = **el embedder local**; bajarlo a 3.8.1 puede cambiar la salida del modelo → **si cambia, hay que re-embeber los 4.589**. Tratar como upgrade controlado con verificación de que un embedding de prueba sigue dando el mismo ranking.

`node-cron` 3→4 solo afecta `server/src/index.ts:42` (`cron.schedule('*/30 * * * *', …)`); la API es estable, es el upgrade más barato de los dos.

**GOTCHA histórico (ya pisado una vez):** `npm audit fix --only=prod` **poda las devDependencies locales** (typescript, vitest) y aparece *"This is not the tsc command"*. Restaurar con `npm install`.

### 9.5 🟡 Datos: fechas en el futuro

```sql
select min(date), max(date) from normas;  -- 1927-06-15 → 2026-07-21
select country, count(*) from normas where date > '2026-07-18' group by 1;  -- BR: 1
```

Una norma BR (`br-evento-82755`, agenda de la Câmara, visita técnica programada) tiene fecha **futura**. Es correcto como dato (es una agenda) pero **rompe la semántica del feed "novedades"** y puede confundir la lógica de recencia del asistente (`RECENCY_RE` en `server/src/routes/assistant.ts:12`). Volumen: 1 fila → bajo impacto, pero decidir si los eventos de agenda deben vivir en `normas` o en otra tabla.

### 9.6 🟡 Deuda menor

| Ítem | Ubicación | Acción |
|---|---|---|
| **2 componentes huérfanos** (no importados por nadie) | `client/src/components/FlowSteps.tsx` (66 líneas), `client/src/components/SourceHealthBanner.tsx` (58 líneas) | Borrar. Se tree-shakean (0 bytes en prod) pero confunden. Verificar con `grep -rl "FlowSteps" client/src` |
| **`FUENTES_OFICIALES = 39` hardcodeado** | `client/src/components/CoverageProof.tsx:12` | Hoy coincide con `/sources` (39 entradas) por casualidad. Consumir de `/health`+`/sources` o dejar el comentario de mantenimiento bien visible |
| **`README.md` raíz desactualizado** | `/README.md` | Dice *"Demo institucional **sin backend**"*, lista pantallas que ya no existen (Dossiers, Foros, Comparativa vs ChatGPT) y da el puerto **5181** cuando `client/vite.config.ts` usa **5188**. Reescribir apuntando a `work-agent/` |
| **`docs/` = 11 MB de build viejo commiteado** | `/docs/` | Era el deploy anterior de GitHub Pages; hoy se publica desde la rama `gh-pages`. Borrar del repo |
| **`worker/` legacy** | `/worker/` (24 KB, Cloudflare Worker) | El front ya no lo usa (`fetchFromWorker()` pega a `/feed` del backend). Confirmar y borrar |
| 20 `console.log` en `server/src`, 3 `TODO` | varios | Cosmético; reemplazar por `req.log` de Fastify |
| `deriveName()` fija `pais:'AR'` | `server/src/routes/auth.ts:12-17` | Un legislador CO/UY/BR arranca marcado como argentino |

**Verdes confirmados hoy:** `npx tsc --noEmit` en `client/` → **0 errores**. 42 tests de cliente en 8 archivos. `client/.env.production` correcto (`VITE_UPM_API_URL=https://upm-api-production.up.railway.app`). El bundle desplegado en gh-pages (`index-DpEQkNiw.js`) **está al día**: los dos commits posteriores (`28d5aa8`, `1b9a71b`) tocaron **solo `server/`** (verificado con `git show --stat`).

---

## 10. P3 · Features ocultas por flag

Existen y compilan, pero **no están en la navegación**. Las rutas siguen registradas en `client/src/App.tsx` (líneas 79–83) para no romper deep-links, pero `NAV_ITEMS` / `DESKTOP_NAV` en `client/src/layouts/AppShell.tsx:28-42` solo listan **Inicio · Asistente · Radar · Leyes · Perfil**.

| Feature | Ruta | Archivo (líneas) | Por qué está oculta | Qué falta para activarla |
|---|---|---|---|---|
| **Briefing** | `/briefing` | `client/src/pages/Briefing.tsx` (443) | Alcance de lanzamiento | Definir el producto "brief diario": ¿resumen generado por IA del feed del día del legislador? Requiere job programado + entrega (¿email?) |
| **Biblioteca** | `/biblioteca` | `client/src/pages/Library.tsx` (387) | **Muestra vacío**: consume `DOCUMENTS` de `client/src/lib/data.ts`, que fue vaciado al sacar los mocks | Requiere un **backend de documentos** que no existe (P3 real, feature nueva) |
| **Mi carpeta** | `/carpetas` | `client/src/pages/Folders.tsx` (398) | Sin contenido que guardar mientras Biblioteca esté vacía | Ver flag `saveToFolder` abajo |
| **Estadísticas** | `/estadisticas` | `client/src/pages/Stats.tsx` (291) | Alcance | **La más barata de reactivar**: ya deriva de `useLiveFeed()`, o sea del feed real. Revisar que no muestre números raros y agregarla al nav |

### 10.1 El flag transversal

```ts
// client/src/lib/launch.ts:13
export const LAUNCH = {
  saveToFolder: false as boolean,
}
```

Consumido en **2 lugares** (verificado con `grep -rn "LAUNCH" client/src`):
- `client/src/pages/Assistant.tsx:370` — botones "Guardar"/"Brief"/"Minuta" del asistente
- `client/src/pages/NewsConversation.tsx:165` — "Guardar" en el detalle de novedad

Apagados porque guardaban a **Mi carpeta**, que está oculta → guardaban a un destino invisible. **Poner `saveToFolder: true` sin reactivar `/carpetas` en el nav reintroduce ese bug.** Van juntos.

**OJO:** la página **Leyes** tiene su **propio** guardado con pestaña "Guardadas" dentro de la página, que **no depende de este flag** y está siempre activo.

### 10.2 Orden recomendado de reactivación

1. **Estadísticas** — datos reales ya disponibles, costo casi cero.
2. **Mi carpeta + `saveToFolder: true`** — juntos, en el mismo cambio.
3. **Briefing** — requiere decisión de producto sobre la entrega.
4. **Biblioteca** — última; necesita backend nuevo.

---

## 11. Plan de piloto con legisladores

### 11.1 Precondiciones (no arrancar sin esto)

| # | Precondición | Estado | Bloquea |
|---|---|---|---|
| 1 | Nombre decidido y renombrado en app + email | ❌ | Todo (§2, §3) |
| 2 | DKIM activo en `xnod.tech` + DMARC ≥ `p=quarantine` | ❌ DKIM ausente | Que llegue el código (§4) |
| 3 | `ALLOWED_EMAILS` con los emails reales de los participantes | ❌ 2 emails internos | Que puedan entrar (§5) |
| 4 | `ANTHROPIC_API_KEY` seteada | ❌ | Que el asistente no muera en la demo (§8) |
| 5 | Embeddings al 100% | ❌ 57% | Calidad de búsqueda y RAG (§9.1) |
| 6 | Analytics mínimo (login, pregunta al asistente, búsqueda) | ❌ inexistente | Poder evaluar el piloto (§7) |
| 7 | `operators` limpia de filas `vitest.*` | ❌ 31 filas | Métricas creíbles (§5.4) |
| 8 | Dominio propio | ⚠️ deseable, no bloqueante | Credibilidad (§6) |

**Precondiciones 1–7 son ejecutables en ~1–2 días de trabajo una vez decidido el nombre.** El nombre es el cuello de botella real.

### 11.2 Diseño del piloto

**Tamaño: 8–12 participantes.** Suficiente para señal cualitativa, chico para dar soporte 1-a-1 (que es lo que se necesita: el login OTP no perdona — si no llega el mail, el usuario no tiene alternativa).

**Composición sugerida:** cubrir los 4 países **con corpus real** — **AR, CO, UY, BR**. **NO incluir legisladores de PY / CL / BO / PE**: aunque `COUNTRIES` en `client/src/lib/data.ts:14-23` lista 8 países, `ACTIVE_COUNTRY_CODES` (línea 43) restringe la UI a `['AR','CO','UY','BR']` justamente porque no hay corpus del resto. Un legislador paraguayo abre el radar y **no ve nada**.

Mezclar **legisladores** y **asesores**: la hipótesis fuerte del producto es que quien usa la herramienta a diario es el asesor, y el legislador consume el output. El piloto debería falsar o confirmar eso.

**Duración: 3 semanas.**

| Semana | Foco | Qué se mide |
|---|---|---|
| **0 (previa)** | Alta en `ALLOWED_EMAILS`, mail de bienvenida, sesión de onboarding de 20 min por participante (video o presencial) | Tasa de activación: % que completa el login OTP sin ayuda |
| **1** | Uso libre. Contacto de soporte abierto | Nº de logins, nº de preguntas al asistente, queries de búsqueda con 0 resultados |
| **2** | Empujón dirigido: pedirle a cada uno una tarea real ("buscá qué se movió sobre <tu tema> este mes") | ¿El asistente responde con fuentes (`isInstitutional:true`) o sin ellas? |
| **3** | Entrevistas de salida (30 min c/u) + medición de retención | ¿Volvieron sin que se los pidan? |

### 11.3 Métricas de éxito (definirlas ANTES de arrancar)

| Métrica | Umbral propuesto | Cómo se obtiene |
|---|---|---|
| Activación | ≥ 80% completa el login sin soporte | `operators.last_login_at` vs. lista de altas |
| Uso real | ≥ 60% hace ≥ 3 preguntas al asistente en 3 semanas | Analytics `asistente_pregunta` (§7) — **hoy imposible de medir** |
| Calidad percibida | ≥ 70% de las respuestas con `isInstitutional:true` | Log server-side en `routes/assistant.ts` |
| Retención | ≥ 40% vuelve en la semana 3 sin que se lo pidan | `operators.last_login_at` + eventos |
| Cualitativo | ≥ 5 de 10 dicen "lo usaría si mi oficina lo paga" | Entrevistas de salida |

### 11.4 Riesgos operativos del piloto (y su mitigación)

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **El código OTP no llega y el usuario abandona** | Alta sin DKIM | §4 + tener un canal de WhatsApp abierto durante el onboarding + **chequear `ALLOWED_EMAILS` primero** ante cualquier reporte (§5.2) |
| **Un deploy invalida los OTP pendientes** | Media | Congelar deploys durante las ventanas de onboarding (§4.2) |
| **El asistente devuelve 503 en una demo** | Media con free tier | Setear `ANTHROPIC_API_KEY` (§8) |
| **El legislador busca su tema y no hay corpus** | Media | Loggear las queries con 0 resultados → es el roadmap del corpus, no un fracaso |
| **El usuario BR ve puro procesal** | Media | El feed ya está balanceado, pero el **62% del corpus es BR procesal**; considerar filtrar tipos procesales para usuarios BR |
| **La marca vieja aparece en el email** | Alta si no se hace §3 | El email es el **primer** contacto con el producto; `mailer.ts` tiene 9 ocurrencias de "UPM" |

### 11.5 Guion de soporte para el equipo

Cuando un participante dice **"no me llega el código"**, chequear en este orden:

1. `railway variables --service upm-api --kv | grep ALLOWED_EMAILS` → **¿está su email exacto, en minúsculas?** Si no está, la API devuelve `{ok:true}` y no manda nada. **Esta es la causa más probable.**
2. Spam / correo no deseado (mientras no haya DKIM).
3. `curl -s https://upm-api-production.up.railway.app/health` → ¿la API está viva?
4. ¿Pidió otro código en menos de 60 s? → `429` con `retryAfterMs` (cooldown).
5. ¿Pasaron más de 10 minutos desde que lo pidió? → `410 expired`, pedir uno nuevo.
6. ¿Falló 5 veces? → `429 too_many`, se borró la entrada, pedir uno nuevo.

---

## 12. Roadmap sugerido en tres movimientos

### Movimiento 1 · "Lanzable" (bloqueado por la decisión de nombre)
`#1 naming` → `#2 rename` → `#3 DKIM/DMARC` → `#4 ALLOWED_EMAILS` → `#7 ANTHROPIC_API_KEY` → `#8 re-embed` → `#6 analytics` → limpiar `operators`.
**Salida:** producto con marca propia, email que entrega, usuarios reales adentro, búsqueda al 100% y medición. Habilita el piloto.

### Movimiento 2 · "Sostenible" (post-piloto, en paralelo)
`#9 separar DB de tests` → `#5 dominio propio` → `#10 camara-br + sesgo BR` → `#11 vulns` → `#12 limpieza` → embeddings automáticos en la ingesta → OTP a Postgres si crece el piloto.
**Salida:** operable por alguien que no sea el autor original.

### Movimiento 3 · "Producto v2" (dirigido por los datos del piloto)
`#13 reactivar Estadísticas → Carpetas → Briefing` → `#14 backend de documentos (Biblioteca)` → ampliar corpus a PY/CL/BO/PE según demanda medida → enriquecer títulos genéricos AR (`"Ley NNNNN · DISPOSICIONES"` de InfoLeg degrada la recuperación).
**Salida:** el alcance lo decide lo que midió el piloto, no la intuición.

---

## 13. Qué NO hacer (aprendido a los golpes)

| No hacer | Por qué |
|---|---|
| **No correr `npm test` en `server/` sin revisar `DATABASE_URL`** | Hoy apunta a **producción** (§9.2) |
| **No mergear a `main` a ciegas** | `feat/backend` es la rama de deploy de Railway; `main` está sincronizada hoy (`ace8dc4`) pero el deploy sale de `feat/backend` |
| **No renombrar las claves de `localStorage` (`upm.*`)** | Desloguea y borra el estado de todos los usuarios (§3.3) |
| **No dejar `ALLOWED_EMAILS` vacía** | Abre el registro a cualquier email válido (§5.2) |
| **No deployar durante un onboarding en vivo** | Invalida los OTP pendientes (§4.2) |
| **No correr `npm run embed` en Railway** | El modelo local se come la RAM del servicio; correrlo off-Railway (§9.1) |
| **No cambiar el modelo de embeddings sin re-embeber todo** | Query y passage deben ser del mismo modelo (§9.1) |
| **No usar `npm audit fix --only=prod`** | Poda las devDependencies locales y rompe `tsc`/`vitest` (§9.4) |
| **No agregar PY/CL/BO/PE a `ACTIVE_COUNTRY_CODES`** sin corpus | El usuario ve pantallas vacías (§11.2) |
| **No comprar dominio antes de decidir el nombre** | §2 bloquea §6 |

---

## 14. Apéndice · Comandos de verificación de este documento

```bash
# --- Estado de producción
curl -s https://upm-api-production.up.railway.app/health
curl -s https://upm-api-production.up.railway.app/sources | python3 -m json.tool | grep -c '"id"'
curl -s https://soyalantapia.github.io/app-upm/ | grep -o 'index-[A-Za-z0-9_-]*\.js'

# --- Variables de entorno (sin exponer secretos)
cd /Users/alannaimtapia/dev/app-upm/server
railway status
railway variables --service upm-api --kv | grep -o '^[A-Z_]*' | sort
railway variables --service upm-api --kv | grep -E '^(ALLOWED_EMAILS|GEMINI_MODEL|ALLOWED_ORIGINS|SMTP_FROM|SMTP_HOST|NODE_ENV)='

# --- Base de datos (usar DATABASE_PUBLIC_URL; el host interno no resuelve desde local)
export U=$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)
psql "$U" -c "select count(*) total, count(embedding) con_emb from normas;"
psql "$U" -c "select country, count(*) n, count(embedding) emb from normas group by 1 order by 2 desc;"
psql "$U" -c "select split_part(email,'@',2) dom, count(*) from operators group by 1 order by 2 desc;"

# --- DNS del dominio de email
dig +short TXT xnod.tech && dig +short TXT _dmarc.xnod.tech
for s in hostingermail1 hostingermail2 default selector1; do dig +short CNAME $s._domainkey.xnod.tech; done

# --- Salud del repo
cd /Users/alannaimtapia/dev/app-upm/client && npx tsc --noEmit && npx vitest run
cd ../server && npm audit --omit=dev
grep -rn "UPM" client/src server/src --include="*.ts" --include="*.tsx" | wc -l   # superficie del rename
```
