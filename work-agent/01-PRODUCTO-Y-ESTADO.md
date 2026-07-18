# 01 · Producto y estado actual

**Última actualización:** 2026-07-18 (verificado contra producción en vivo ese mismo día).

**Para qué sirve este documento:** es la puerta de entrada del proyecto para una IA que va a continuarlo sin haber estado presente. Define qué es el producto, para quién, cómo se posiciona, qué cubre el corpus hoy (números reales, no estimados), cuáles son las URLs de producción, cuál es el modelo de negocio, y —lo más importante— **qué funciona end-to-end hoy y qué no**. Los detalles de implementación (arquitectura, endpoints, ingesta, deploy) viven en los otros documentos de `work-agent/`.

> **Regla de lectura:** todo número o afirmación de este documento fue verificado con un comando concreto (documentado abajo). Lo que no pude verificar está marcado **(verificar)**. Si en el futuro algo acá contradice al código, **manda el código**.

---

## 1. Qué es el producto

Plataforma institucional de **inteligencia normativa regional** para el Poder Legislativo del MERCOSUR. Tres capacidades acopladas:

| Capacidad | Qué hace | Dónde vive |
|---|---|---|
| **Radar normativo regional** | Ingesta automática de 39 fuentes oficiales de 4 países; feed diario balanceado por país, filtrable por país / tema / tipo / relevancia | `server/src/ingest/`, `server/src/routes/feed.ts`, `client/src/pages/Radar.tsx` |
| **Búsqueda semántica** | Búsqueda híbrida (embeddings pgvector + FTS español, fusión RRF) sobre el corpus. Encuentra por significado, no por palabra exacta | `server/src/search.ts`, `client/src/lib/use-semantic-search.ts` (⌘K) |
| **Asistente de IA con fuentes** | RAG sobre el corpus real: responde en español citando **normas que existen en la base**, con el id verificable. No inventa normas | `server/src/routes/assistant.ts`, `client/src/pages/Assistant.tsx` |

La app es una **PWA** (instalable, offline shell) pensada mobile-first: la promesa es "el asesor en el bolsillo del legislador".

### Qué NO es
- **No es un chatbot genérico.** El asistente solo responde sobre el corpus ingestado y declara explícitamente cuando el contexto no alcanza (system prompt en `server/src/routes/assistant.ts:16-26`).
- **No es un boletín oficial ni un buscador jurídico exhaustivo.** El corpus es curado por fuentes, no es la totalidad del derecho de cada país.
- **Ya no es una demo.** Fue una demo sin backend hasta 2026-06-12; desde entonces hay backend real, corpus real y login real. Cuidado: `README.md` y `HANDOFF.md` de la raíz **siguen describiendo la etapa de demo** y están desactualizados (ver §9 Gotchas).

---

## 2. Para quién

Dos perfiles, misma app, mismo login:

| Perfil | Necesidad | Cómo la resuelve el producto |
|---|---|---|
| **Legislador / parlamentario** | Llegar a la sesión sabiendo qué pasó, con qué respaldo, sin leer 300 páginas | Radar priorizado por sus temas/países + brief del asistente con fuentes citadas |
| **Asesor legislativo** | Producir insumos (informes, comparativas, fundamentos) rápido y con trazabilidad | Búsqueda semántica sobre el corpus + asistente que devuelve ids de norma verificables + exportación |

El onboarding pide **países + temas** y a partir de ahí se rankea el feed client-side (`client/src/pages/Onboarding.tsx`, preferencias sincronizadas a `/me/prefs`).

La identidad del usuario se guarda en la tabla `operators` (columnas reales: `email`, `name`, `cargo`, `pais`, `created_at`, `last_login_at`). **Hay 33 operadores registrados en la base de producción** al 2026-07-18.

---

## 3. Propuesta de valor y posicionamiento

**Frase de posicionamiento (canónica, se sostiene desde el inicio del proyecto):**

> "No es un chat. Es **infraestructura institucional para legislar con respaldo**."

Los tres pilares que la sostienen, y cómo se prueban en producto:

1. **Respaldo verificable.** Cada respuesta del asistente cita ids de norma que existen en la base y son consultables (`/search`, `/feed`). El backend setea `isInstitutional: sourcesOut.length > 0` y el front muestra el badge "Con fuentes UPM" solo cuando efectivamente hubo fuentes.
2. **Cobertura regional real.** 39 fuentes oficiales, 4 países, ingesta automática cada 30 minutos. El componente `client/src/components/CoverageProof.tsx:11-12` muestra `PAISES = 4` y `FUENTES_OFICIALES = 39` — **coincide con la realidad de `/sources`** (verificado hoy).
3. **Cero dato fabricado.** Hubo dos rondas explícitas de eliminación de mocks (junio 2026): se borraron 102 normas sintéticas, 9 fuentes inventadas, los arrays mock de `client/src/lib/data.ts` (`NEWS`, `DOCUMENTS`, `DOSSIERS`, `FOLDERS`, `AGENDA` = `[]`), las respuestas pre-armadas del asistente y el RAG local simulado. La credibilidad institucional es el activo: un dato falso visible mata la venta.

**Diferencial frente a ChatGPT/Gemini genérico:** el modelo de lenguaje es intercambiable y commodity; **el corpus curado + el retrieval son el activo**. Decisión estratégica tomada y vigente: **RAG, no entrenar un modelo propio**.

---

## 4. Países y corpus (números verificados hoy)

### Países cubiertos

**4 países con corpus real: Argentina, Brasil, Colombia, Uruguay.**

Gotcha importante: `client/src/lib/data.ts:13-22` declara 8 países en `COUNTRIES` (AR, BR, UY, PY, CL, BO, PE, CO) — esa lista quedó **solo como tabla de lookup**. Lo que la UI ofrece como seleccionable es `ACTIVE_COUNTRY_CODES = ['AR', 'CO', 'UY', 'BR']` (`client/src/lib/data.ts:41`). PY/CL/BO/PE fueron retirados de la selección porque su data era demo y se borró. El enum de la DB (`server/src/db/schema.ts:15`) sigue aceptando los 8 códigos, así que ampliar cobertura no requiere migración de esquema, solo fuentes nuevas + agregar el código a `ACTIVE_COUNTRY_CODES`.

### Tamaño del corpus — 2026-07-18

`GET /health` en vivo:

```json
{"ok":true,"db":"up","lastIngest":{"finishedAt":"2026-07-18T14:00:16.001Z","okSources":38,"failedSources":1,"itemsUpserted":1988},"itemCount":4589,"uptime":2380254}
```

**4.589 normas.** Composición real (consulta directa a la DB de producción):

| País | Normas | % |
|---|---:|---:|
| BR | 2.833 | 61,7 % |
| AR | 1.081 | 23,6 % |
| CO | 526 | 11,5 % |
| UY | 149 | 3,2 % |

Por tipo de documento:

| Tipo | Cantidad |
|---|---:|
| informe | 1.430 |
| comunicado | 1.256 |
| ley | 1.193 |
| decreto | 359 |
| reglamento | 326 |
| convenio | 25 |

Rango de fechas: **1927-06-15 → 2026-07-21** (hay 1 registro con fecha futura respecto de hoy — ruido menor de un fetcher, **(verificar)** cuál).

Ruido procesal brasileño excluido por `noiseFilter` (ids `br-votacao*` / `br-evento*`): **441 registros** — no se borran, se filtran en `/feed`, `/laws`, `/search` y el RAG (`server/src/routes/feed.ts:19`).

### Fuentes

**39 fuentes** en `/sources`, distribuidas: **AR 20 · CO 9 · BR 7 · UY 3**.

Estado del último ingest: **38 OK / 1 fallida**. La fallida es `camara-br` (`Câmara dos Deputados`) con `TimeoutError: The operation was aborted due to timeout`. Como el upsert es idempotente y hay otras fuentes BR activas, no rompe el feed, pero es un fallo recurrente a vigilar.

Fuentes con `count: 0` en la última corrida (OK pero sin ítems): `senado-br`, `materias-senado-br`. **(verificar)** si es normal o si el fetcher se rompió en silencio.

**Cómo verificar todo lo anterior:**

```bash
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool
curl -s https://upm-api-production.up.railway.app/sources | python3 -c "import json,sys,collections; d=json.load(sys.stdin); print(len(d), collections.Counter(s['country'] for s in d))"
curl -s "https://upm-api-production.up.railway.app/search?q=glaciares&limit=2" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['mode']); print([s for s in d['sources'] if not s['ok']])"
```

Para los conteos por país/tipo (lectura directa de la DB de producción — `server/.env` tiene la `DATABASE_URL` pública del proxy Railway):

```bash
cd /Users/alannaimtapia/dev/app-upm/server
set -a; source .env; set +a
# usar node con el pg de server/node_modules; SOLO SELECT
```

---

## 5. URLs y entornos de producción

| Qué | URL / valor | Notas |
|---|---|---|
| Front producción | https://soyalantapia.github.io/app-upm/ | GitHub Pages, rama `gh-pages`, deploy **manual**. Bundle servido hoy: `index-DpEQkNiw.js` |
| API producción | https://upm-api-production.up.railway.app | HTTP 200, `db: up` |
| Repo | github.com/soyalantapia/app-upm | Público |
| Infra backend | Railway · proyecto **UPM** · env `production` · servicio `upm-api` + `Postgres` | `railway status` desde `server/` devuelve `Project: UPM / Environment: production / Service: upm-api`. La memoria vieja lo llamaba "zippy-harmony" — **el nombre actual del proyecto Railway es `UPM`** |
| Base de datos | PostgreSQL con extensiones `vector`, `pg_trgm`, `unaccent` | Tablas: `normas`, `sources`, `ingest_runs`, `operators`, `prefs`, `saved_state`, `notes_state` |
| Email transaccional | Hostinger SMTP, remitente `ia@xnod.tech` | Vars `SMTP_HOST/PORT/USER/PASS/FROM` en Railway |
| Proveedor LLM activo | **Gemini** (`gemini:gemini-2.5-flash`), free tier | Confirmado en la respuesta real de `/assistant`. **No hay `ANTHROPIC_API_KEY` cargada en Railway** |

### Ramas git

| Rama | Rol | Estado 2026-07-18 |
|---|---|---|
| `main` | Integración | HEAD = `ace8dc4` (merge de `feat/backend`) |
| `feat/backend` | **Rama desde la que deploya Railway** | Existe y sigue viva |
| `gh-pages` | Front publicado (`client/dist` + `.nojekyll`) | Publicado, deploy manual |

### Variables de entorno presentes en Railway (`upm-api`) — solo nombres

`ALLOWED_EMAILS`, `ALLOWED_ORIGINS`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `JWT_SECRET`, `NODE_ENV`, `SMTP_FROM`, `SMTP_HOST`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_USER` (+ las `RAILWAY_*` que inyecta la plataforma).

**Ausentes a propósito:** `ANTHROPIC_API_KEY` (opcional; si se carga, `server/src/llm.ts` le da prioridad sobre Gemini sin ningún cambio de código) y `STATIC_DATA_BASE` (usa el default de `server/src/config.ts`).

El esquema completo de configuración está en `server/src/config.ts` (`EnvSchema`, validado con Zod; si falta una var obligatoria el proceso **no arranca**).

Verificación:

```bash
cd /Users/alannaimtapia/dev/app-upm/server && railway status
cd /Users/alannaimtapia/dev/app-upm/server && railway variables --service upm-api --kv | cut -d= -f1 | sort
```

---

## 6. Modelo de negocio

Dos vectores, no excluyentes:

### a) Venta institucional (vector principal)
El cliente es el **organismo**: la UPM (Unión Parlamentaria del Mercosur), un parlamento nacional, un bloque o una cámara. Se vende como infraestructura para el cuerpo, con acceso para legisladores y sus equipos de asesores. Encaja con el posicionamiento ("infraestructura institucional") y con el hecho de que el acceso hoy es **por allowlist controlada** (`ALLOWED_EMAILS`), no autoservicio.

### b) Membresía individual
Registro histórico: **USD 100/mes por parlamentario**, con trial de 7 días (documentado en `HANDOFF.md:17` y en el flujo de checkout de la etapa demo). **Este pricing es histórico, no está confirmado como vigente — (verificar) con el dueño.**

**Estado del cobro hoy: NO EXISTE.** Es fundamental que quien continúe lo tenga claro:
- Las páginas `Signup`, `Checkout` y `AccountActivated` **fueron borradas** junto con sus rutas al pasar a producción (2026-06-14). `client/src/App.tsx` no tiene ninguna ruta de compra.
- La tarjeta de membresía falsa ("UPM Premium · renovación 2026") y el badge "Plan Premium · Activo" fueron **removidos** de `client/src/pages/Profile.tsx` por auditoría (mostraban un plan inexistente).
- Lo único que queda en Perfil es un badge institucional `Miembro UPM` (`client/src/pages/Profile.tsx:116`).
- No hay integración de pagos de ningún tipo en el repo.

**Cómo se controla el acceso hoy:** allowlist por email en `ALLOWED_EMAILS` (coma-separada). `server/src/routes/auth.ts:36` decide si el email está permitido; si **no** lo está, la API igual responde 200 sin enviar nada (anti-enumeración, `auth.ts:44`). Sumar un legislador al piloto = agregar su email a esa variable en Railway y redeploy/restart.

---

## 7. Estado actual: qué funciona end-to-end HOY

Todo lo de esta tabla fue verificado el 2026-07-18 contra producción.

| Capa | ¿Funciona? | Evidencia |
|---|---|---|
| **Ingesta / corpus** | ✅ Sí | `/health` → `lastIngest.finishedAt: 2026-07-18T14:00:16Z`, 38 fuentes OK / 1 fallida, 1.988 ítems upserteados. 4.589 normas en DB |
| **API REST** | ✅ Sí | `GET /` lista 9 endpoints; `/feed`, `/laws`, `/sources`, `/health` responden 200 |
| **Feed balanceado por país** | ✅ Sí | `balancedRows()` en `server/src/routes/feed.ts:79` toma top-130 por país. `/feed?pais=AR` filtra server-side (500 = tope `FEED_LIMIT`) |
| **Búsqueda semántica híbrida** | ✅ Sí, con degradación | `/search?q=glaciares` → `"mode":"hybrid"`, primer resultado `ar-ley-26639` (Ley de Glaciares). **PERO**: 1.992 de 4.589 normas (43%) **no tienen embedding** — ver §8 |
| **Asistente IA con fuentes** | ✅ Sí | `POST /assistant` con "¿Qué establece la Ley de Glaciares en Argentina?" → 200, respuesta citando `ar-ley-26639` y `ar-ley-27804`, `isInstitutional: true`, `provider: "gemini:gemini-2.5-flash"`, `usage: {input_tokens: 1221, output_tokens: 178}` |
| **Auth OTP por email** | ✅ Sí | `GET /me` sin token → **401**. SMTP configurado en Railway (Hostinger). Verificado E2E con mail real en junio. **No se dispararon OTP hoy** (gasta cupo y molesta) |
| **Sync de estado multi-dispositivo** | ✅ Sí | Tablas `prefs`, `saved_state`, `notes_state` existen en producción; `client/src/lib/sync.ts` hace write-through a localStorage + push debounced a `/me/*` |
| **Front / PWA desplegado** | ✅ Sí | `https://soyalantapia.github.io/app-upm/` → 200, sirve `index-DpEQkNiw.js`. `client/.env.production` apunta a la API de producción |
| **Protección anti prompt-injection** | ✅ Sí (verificado en junio) | System prompt endurecido en `server/src/routes/assistant.ts:16-26`; probado que no repite payloads ni cita normas inventadas |
| **RAG consciente de recencia** | ✅ Sí | `RECENCY_RE` (`assistant.ts:12`) antepone las normas más nuevas cuando la pregunta es sobre novedades |
| **Cobro / suscripción** | ❌ **No existe** | Sin rutas ni integración de pagos (ver §6) |
| **Alta autoservicio** | ❌ No | Acceso solo por allowlist `ALLOWED_EMAILS` |
| **CI / deploy automático** | ❌ No | Deploy de front y back son **manuales** (`git push -f origin gh-pages`, `railway up`) |

### Features montadas pero ocultas en la navegación

Existen las rutas (deep-links no rompen) pero no están en el menú, por decisión de alcance de lanzamiento (`client/src/lib/launch.ts`):

`/briefing`, `/biblioteca`, `/carpetas`, `/estadisticas`.

El flag `LAUNCH.saveToFolder = false` apaga los botones "Guardar / Brief / Minuta" del Asistente y del detalle de noticia, porque su destino (Mi carpeta) está oculto. **Cuidado:** la página `/leyes` tiene su propio guardado con pestaña "Guardadas" que **no** depende de ese flag.

Nav visible real (`client/src/layouts/AppShell.tsx:28-32`): **Inicio · Asistente · Radar · Leyes · Perfil**.

---

## 8. Riesgos abiertos conocidos

| # | Riesgo | Severidad | Detalle |
|---|---|---|---|
| 1 | **43% del corpus sin embedding** | 🟠 Alto | 1.992 de 4.589 normas tienen `embedding IS NULL`. Desglose: **BR 1.918 sin embeber de 2.833** · CO 50/526 · UY 24/149 · **AR 0/1.081**. Esas normas solo son alcanzables por FTS, no por búsqueda semántica ni por el RAG semántico. La causa: el embed (`npm run embed`) corre **manual y off-Railway**, y el corpus creció ~77% desde la última corrida (2.597 → 4.589). El grueso del faltante es procesal brasileño (bajo valor), pero hay ~74 normas CO/UY sustantivas afectadas |
| 2 | **Fuente `camara-br` fallando por timeout** | 🟠 Alto | Es la fuente de mayor volumen del corpus. Falló en el último ingest. Si persiste, el feed BR se congela |
| 3 | **Gemini free tier bajo carga** | 🟠 Alto | Cupo diario **por modelo**; bajo ráfaga da 502 y >45s. `server/src/llm.ts` rota una cadena de modelos para triplicar el cupo. Un usuario espaciado anda 1,5–7s. **Riesgo directo si entran varios legisladores a la vez.** Fix conocido: cargar `ANTHROPIC_API_KEY` en Railway (cero cambios de código) — es una decisión de costo del dueño |
| 4 | **SPF/DKIM/DMARC de `xnod.tech` sin configurar** | 🟠 Alto | El mail de OTP puede caer en spam. Bloquea de facto el onboarding de un legislador nuevo. **(verificar)** si se configuró desde junio |
| 5 | **Corpus sesgado a Brasil (61,7%) y con ruido procesal** | 🟡 Medio | El `balancedRows()` lo resuelve en el feed, pero el sesgo persiste en la búsqueda y el RAG |
| 6 | **Deploys manuales, sin CI** | 🟡 Medio | Front y back se deployan a mano; fácil que gh-pages quede desfasado del repo |
| 7 | **Sin backups verificados de la DB** | 🟡 Medio | **(verificar)** si Railway tiene backups automáticos habilitados en este proyecto |
| 8 | **`README.md` y `HANDOFF.md` de la raíz mienten** | 🟡 Medio | Describen la etapa demo ("No backend", "respuestas pre-armadas", flujo Signup→Checkout que ya no existe). Una IA que los lea como verdad va a trabajar sobre una realidad de hace dos meses |

---

## 9. El tema del NOMBRE (naming en curso, sin decisión)

**El nombre "UPM" se abandona.** El motivo es de fondo, no cosmético: **UPM = Unión Parlamentaria del Mercosur = el organismo cliente**, no el producto. Llamar al producto igual que al cliente impide venderlo a otro parlamento, bloque o cámara, y confunde la propiedad de la marca.

### Finalistas (proceso abierto, **sin decisión final**)

| Candidato | Lectura |
|---|---|
| **AsesorÍA Legislativa** | Juego "asesoría / IA". El más descriptivo y explícito del rol |
| **BancadIA** | "bancada" + IA. Muy político-parlamentario, cercano al usuario |
| **VeedurÍA** | "veeduría" (control/fiscalización) + IA. Tono de contralor institucional |
| **CurulIA** | "curul" (banca legislativa) + IA. Fuerte en CO/PE, menos legible en AR/UY |
| **ParlaIA** | "parlamento/parlar" + IA. El más corto y regional |

Ninguno está elegido. **No apliques ninguno sin confirmación explícita del dueño.**

### Estado del rebranding en el código: 0% hecho

La marca "UPM" está incrustada en muchos lugares. Inventario de los puntos de cambio conocidos (verificados hoy):

| Superficie | Ubicación exacta | Valor actual |
|---|---|---|
| Título / meta / OG / Twitter | `client/index.html:10,13,14,19,20,24` | "Asistente IA UPM" |
| Logo / wordmark | `client/src/components/Brand.tsx:11,26` | `aria-label="UPM"`, texto "Asistente IA UPM" |
| Login (mockup + toast + soporte) | `client/src/pages/Login.tsx:91,165,248` | "Bienvenido a UPM", "Asistente IA UPM", `mailto:soporte@upm.org` |
| Badge de perfil | `client/src/pages/Profile.tsx:116` | "Miembro UPM" |
| Accesibilidad cobertura | `client/src/components/CoverageProof.tsx:46` | "Cobertura del corpus UPM" |
| System prompt del asistente | `server/src/routes/assistant.ts:17` | "Sos el asistente legislativo de **App UPM**" |
| Email OTP (asunto + cuerpo) | `server/src/lib/mailer.ts` (`otpEmailHtml`) | Asunto "… es tu código de acceso a App UPM"; lockup con ícono "U" |
| Badge de fuentes en respuestas | front del Asistente | "Con fuentes UPM" |
| Tokens de color Tailwind | `client/src/index.css` | prefijo `upm-*` (`text-upm-800`, `border-upm-200`, …) |
| Variable de entorno del front | `client/.env.production` | `VITE_UPM_API_URL` |
| Servicio / dominio backend | Railway | proyecto `UPM`, servicio `upm-api`, dominio `upm-api-production.up.railway.app` |
| Repo y base path | GitHub + Vite | `app-upm`, base `/app-upm/` |

**Cómo listar todas las apariciones antes de un rebrand:**

```bash
cd /Users/alannaimtapia/dev/app-upm
grep -rn "UPM\|upm" --include="*.ts" --include="*.tsx" --include="*.html" --include="*.css" client/src client/index.html server/src | grep -v node_modules
```

**Gotchas del rebranding (leer antes de tocar nada):**
- Los tokens `upm-*` de Tailwind son **prefijo de diseño**, no marca visible. Renombrarlos es un refactor grande y de riesgo alto por beneficio cero para el usuario. Separá "marca visible" de "prefijo interno" y hacé primero solo lo visible.
- Cambiar `VITE_UPM_API_URL`, el nombre del servicio Railway o el base path del repo **rompe el deploy** si no se actualizan en conjunto `client/.env.production`, `ALLOWED_ORIGINS` (CORS) y el `base` de Vite.
- El email OTP fue rediseñado con cuidado para ser email-client-safe (tablas + CSS inline + ghost-table MSO). Al cambiar el lockup, no lo rehagas con CSS moderno: se rompe en Outlook.
- `soporte@upm.org` en `Login.tsx:248` es un dominio que **no controlamos**. Hoy es un mailto muerto — cambiarlo aunque el naming no esté cerrado.

---

## 10. Objetivos vigentes del dueño

En orden de prioridad declarada:

1. **Lanzar con legisladores reales** — pasar de "listo técnicamente" a "hay usuarios usándolo": piloto chico, onboarding acompañado.
2. **Cerrar la identidad de marca** — elegir el nombre nuevo y aplicarlo en app, email y dominios.
3. **Experiencia impecable** — cero mockup, todo dato real, nada que rompa la credibilidad institucional.
4. **Asistente de IA confiable** — con fuentes verificables, sin alucinaciones, que aguante uso real.
5. **Escalar comercialmente** — venta institucional (UPM / parlamentos) + modelo de membresía.

Contexto operativo: el proyecto pasó por múltiples rondas de auditoría (lanzamiento, re-auditoría, revisión total de detalle en 3 lotes, auditoría profunda) entre el 2026-06-14 y el 2026-06-20; **toda la cola técnica de esas auditorías está cerrada**. El último commit funcional es `1b9a71b` (2026-06-20, upgrade de seguridad de drizzle-orm 0.38 → 0.45.2). **Desde entonces no hubo cambios de código: lo único que se movió es el corpus, que siguió creciendo solo por el cron de ingesta.**

---

## 11. Verificación rápida de salud (copiable)

```bash
# 1. API viva y corpus
curl -s https://upm-api-production.up.railway.app/health | python3 -m json.tool

# 2. Endpoints declarados
curl -s https://upm-api-production.up.railway.app/ | python3 -m json.tool

# 3. Fuentes: cuántas, de qué país, cuáles fallan
curl -s https://upm-api-production.up.railway.app/sources | python3 -c "import json,sys,collections; d=json.load(sys.stdin); print(len(d),'fuentes'); print(collections.Counter(s['country'] for s in d))"

# 4. Búsqueda híbrida (debe decir mode=hybrid y traer ar-ley-26639 arriba)
curl -s "https://upm-api-production.up.railway.app/search?q=glaciares" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['mode'], [i['id'] for i in d['items'][:3]])"

# 5. Asistente con fuentes reales (OJO: el body necesita id+role+content)
curl -s -X POST https://upm-api-production.up.railway.app/assistant \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"m1","role":"user","content":"¿Qué establece la Ley de Glaciares en Argentina?"}]}' \
  | python3 -m json.tool

# 6. Auth protegida
curl -s -o /dev/null -w "%{http_code}\n" https://upm-api-production.up.railway.app/me   # → 401

# 7. Front publicado
curl -s -o /dev/null -w "%{http_code}\n" https://soyalantapia.github.io/app-upm/        # → 200

# 8. Infra
cd /Users/alannaimtapia/dev/app-upm/server && railway status
```

⚠️ **No dispares `POST /auth/request-code` contra emails de la allowlist** al hacer verificaciones: gasta cupo SMTP y le llegan mails al dueño. Para probar el endpoint sin efectos, usá un email que NO esté en `ALLOWED_EMAILS` (devuelve 200 sin enviar) o un body inválido (devuelve 400).

---

## 12. Gotchas transversales de este documento

- **`README.md` y `HANDOFF.md` de la raíz están desactualizados** (describen la demo sin backend, respuestas pre-armadas y un flujo de checkout que ya no existe). No los uses como fuente de verdad; están conservados como registro histórico.
- **`docs/` es un build viejo** de GitHub Pages, no la documentación del proyecto. El deploy real es la rama `gh-pages`. `worker/` es legacy (Cloudflare Worker de la etapa sin backend).
- **Node 22 es obligatorio para buildear el cliente** (no v25+). El sistema tiene v25 por default: `PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.
- **`import.meta.env.VITE_X` debe ir SIN optional chaining.** `import.meta.env?.VITE_X` rompe el `define` de Vite y rollup elimina el código por DCE. Ya pasó una vez.
- **La columna `date` de `normas` es TEXT** (ISO `YYYY-MM-DD`), no timestamp. Comparar como string.
- **El host interno `postgres.railway.internal` no resuelve desde local.** Para consultas locales contra la DB de producción hay que usar la URL pública del proxy (la que ya está en `server/.env`).
- **La contraseña SMTP empieza con `=`.** Al setearla por CLI hay que usar `--set "SMTP_PASS==valor"` (el split es en el primer `=`).
