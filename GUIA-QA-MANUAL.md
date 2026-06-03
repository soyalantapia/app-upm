# 🧪 Guía de QA Manual — Asistente AI UPM
### Prompt + plan de testeo para entender el estado del proyecto y cazar bugs

> **Cómo usar este documento (2 formas):**
> 1. **Vos como tester humano:** seguí los casos `[TC-xx]` en orden, marcá ✅/❌ y anotá hallazgos con el formato de la sección 7.
> 2. **Pasárselo a un agente (Claude/otro):** copiá desde la sección "🎭 ROL" hasta el final y dejá que recorra la app y complete el reporte.
>
> Cada caso marcado **🆕 [sesión]** es algo que arreglamos/agregamos en la última ronda de trabajo — verificalos para entender qué cambió.

---

## ⚙️ CONFIGURACIÓN

```
PRODUCTO:        Asistente AI UPM — copiloto normativo para legisladores del Mercosur
URL LOCAL:       http://localhost:5181/app-upm/
URL PRODUCCIÓN:  https://soyalantapia.github.io/app-upm/
STACK:           Vite 8 + React 19 + Tailwind 4 · HashRouter · PWA
LOGIN DEMO:      Cualquier email + cualquier contraseña entra (es demo, no valida).
                 También hay botón "Entrar como demo".
USUARIO DEMO:    Dr. Martin · Legislador · país AR (Argentina)
                 Prefs: países AR/BR/UY/CO · temas Integración regional + Ambiente
IDIOMA:          Español rioplatense
```

**Resetear estado (para probar "primera vez"):** abrí la consola del navegador (F12) y corré:
```js
localStorage.clear(); sessionStorage.clear(); location.reload();
```
Esto borra sesión, prefs, guardados y caché del feed → vas a ver login + onboarding como usuario nuevo.

---

## 🎭 ROL

Sos **QA de producto** probando la app como lo haría un **legislador real que la usa varias veces por semana**: práctico, apurado, sin paciencia para la fricción. No mirás el código: mirás la **experiencia**. Cada cosa que tocás te preguntás: *"¿esto hace lo que dice, responde, y me ayuda — o me confunde/se rompe?"*

---

## 🎯 MISIÓN

Recorrer las **16 pantallas** y los **flujos clave**, confirmar que todo funciona (en especial lo marcado 🆕), y levantar **cualquier error, inconsistencia o fricción**. Al final, dar un veredicto del estado general del producto.

---

## 🔍 CÓMO TESTEAR (checklist mental en cada pantalla)

- **Funciona:** ¿el botón/acción hace lo que promete? ¿hay respuesta visible (toast/cambio/loading)?
- **Estados:** ¿qué pasa en carga, éxito, error y vacío? ¿hay skeleton/spinner? ¿el vacío es útil o desolado?
- **Microcopy:** ¿se entiende? ¿gramática/ortografía? ¿algún texto en portugués sin traducir? ¿números que no cierran?
- **Navegación:** ¿llego y vuelvo sin perderme? ¿los nombres del menú dicen lo que contienen?
- **Mobile:** ¿se rompe algo en pantalla chica? ¿hay scroll horizontal? ¿los toques caen bien?
- **Destructivo:** ¿borrar/eliminar pide confirmación o deja deshacer?

**Severidad:** 🔴 Crítica (bloquea/rompe) · 🟠 Alta (confunde serio / pierde tiempo) · 🟡 Media (molesta menor) · ⚪ Baja (cosmético)

---

## 📋 CASOS DE PRUEBA

### A. Acceso y onboarding (público)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-01 🆕 | **Login redirige bien** | Logueate con cualquier mail+pass | Entrás directo al **Home** (NO te manda a onboarding si ya estás configurado) | ☐ |
| TC-02 🆕 | **Hint de demo** | Mirá debajo del campo Contraseña | Dice *"Demo institucional · ingresá cualquier credencial para continuar"* | ☐ |
| TC-03 🆕 | **Olvidé mi contraseña** | Click en "Olvidé mi contraseña" | Abre tu cliente de correo con un mail a soporte@upm.org (NO un toast muerto) | ☐ |
| TC-04 | **Registro** | Andá a `#/registro` | Form con nombre/email/institución + planes + FAQ | ☐ |
| TC-05 🆕 | **Términos NO pre-tildados** | Mirá el checkbox de Términos en registro | Arranca **destildado**; "Continuar" deshabilitado hasta tildarlo | ☐ |
| TC-06 🆕 | **Links legales** | Click en "Términos" / "Privacidad" | Muestran un toast honesto (versión preliminar), no un `#` muerto | ☐ |
| TC-07 🆕 | **Checkout** | Completá registro → checkout | CTA dice **"Empezar prueba gratis · luego USD 100/mes"** y "Hoy pagás USD 0" | ☐ |
| TC-08 🆕 | **Onboarding vacío** | Reset (ver arriba) → login → onboarding | Países/temas arrancan **vacíos**; pide elegir al menos 1; hay "Saltar por ahora" | ☐ |

> ⚠️ **No completes una compra real ni pongas datos de tarjeta reales** — es demo, pero igual no hace falta.

### B. Home (`/`)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-10 | **Primera impresión** | Entrá al Home | Saludo + hora, search prominente, 3 stats "HOY" (Alta relevancia / Por votar / Audiencias) | ☐ |
| TC-11 | **Stats accionables** | Click en cada stat | "Alta relevancia" → Radar filtrado; "Audiencias" → Briefing | ☐ |
| TC-12 | **Diff regulatorio** | Mirá el panel oscuro "X normas nuevas desde…" | Refleja novedades desde tu última visita; "Ver en Radar" funciona | ☐ |
| TC-13 🆕 | **Títulos sin repetición** | Mirá las tarjetas de "En tu radar" | Ningún título se repite a sí mismo (antes salía "Homenagem… Homenagem…") | ☐ |
| TC-14 | **Buscador** | Escribí "ambiente" + Enter | Te lleva al Radar con ese filtro de búsqueda | ☐ |
| TC-15 | **IR A** | Mirá las tarjetas de acceso rápido | Radar / Leyes / Asistente / Briefing, todas navegan | ☐ |

### C. Radar — lista (`/radar`)  ← *pantalla central*

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-20 | **Pulso de hoy** | Mirá las 3 tarjetas grandes | Sancionadas / Por votar / Cuestiones cruzadas, con "ÚLTIMO" | ☐ |
| TC-21 🆕 | **Mi comisión curado** | Click en chip "Mi comisión" vs "Todas" | "Mi comisión" es **bastante menor** que "Todas" (~40%, no ~58%); excluye baja relevancia | ☐ |
| TC-22 | **Filtros + búsqueda** | Probá chips (Alta relevancia, Esta semana…) + buscador | Filtran y el contador "X novedades" se actualiza | ☐ |
| TC-23 🆕 | **Eventos ceremoniales** | Buscá "Solene" o "Homenagem" | Aparecen con relevancia **Baja** (no Alta como antes) | ☐ |
| TC-24 🆕 | **Link "ver" fuente** | En una tarjeta, click "ver" | Abre una **página legible** (o no aparece), NO un JSON crudo de API | ☐ |
| TC-25 | **Vistas** | Cambiá Lista / Timeline / Redes | Cada vista renderiza sin romperse | ☐ |
| TC-26 | **Export** | Click "Exportar (N)" | Descarga CSV/briefing del listado filtrado | ☐ |

### D. Radar — detalle de novedad (`/radar/:id`)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-30 | **Abrir detalle** | Click en una tarjeta del Radar | Abre la vista con acciones (Volver/Guardar/Compartir/Asistente/Más) | ☐ |
| TC-31 🆕 | **Coherencia de relevancia** | En un ítem de relevancia BAJA, leé "¿Por qué importa?" | NO dice "Prioridad alta" si es baja (dice "Coincide con tu tema… relevancia baja") | ☐ |
| TC-32 🆕 | **Metadata bien rotulada** | Mirá la barra de metadata | "Categoría" (no "Identificación" con un tipo), datos coherentes | ☐ |
| TC-33 🆕 | **Texto completo** | Si la norma no tiene cuerpo | NO muestra "Texto completo" con el título repetido; muestra nota honesta o lo oculta | ☐ |
| TC-34 | **Guardar / Compartir** | Click "Guardar" | Toast de confirmación; aparece en Mi carpeta | ☐ |
| TC-35 | **Mandar al Asistente** | Click "Asistente →" | Abre el Asistente con la norma precargada | ☐ |
| TC-36 🆕 | **Error de ID inexistente** | Navegá a `#/radar/zzz-no-existe` | "NORMA NO INDEXADA" + botón "Volver al Radar" (no pantalla en blanco) | ☐ |

### E. Asistente (`/asistente`)  ← *value-prop central*

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-40 | **Estado vacío** | Entrá al Asistente | Tarjetas "Qué puedo hacer" + sugerencias "Probá con" | ☐ |
| TC-41 | **Consulta** | Click en una sugerencia (o escribí una pregunta) | Loading ("buscando en corpus") → respuesta estructurada | ☐ |
| TC-42 🆕 | **Citas clickeables** | En la respuesta, mirá "Fuente · [...]" | Es un **link clickeable** que abre la norma — NO texto crudo con corchetes `[...](...)` | ☐ |
| TC-43 🆕 | **Honestidad de match** | Mirá la metadata de cada resultado | Dice "**Coincidencia: fuerte/media/parcial · NN%**"; el header cuenta solo las relevantes ("3 relevantes (+2 parciales)") | ☐ |
| TC-44 🆕 | **Sin markdown crudo** | Revisá toda la respuesta | No hay asteriscos `*` ni `**` a la vista; negritas/itálicas renderizadas | ☐ |
| TC-45 🆕 | **Acciones rápidas** | Sobre una respuesta, mirá la barra "Acciones" | Copiar/Guardar/Brief/Minuta visibles + "Más ⋯" (no se desborda en mobile) | ☐ |
| TC-46 | **Nueva conversación** | Click "Nueva" | Limpia el chat; guarda la anterior en Historial | ☐ |

### F. Leyes (`/leyes`)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-50 🆕 | **Header honesto** | Mirá el subtítulo | "X leyes indexadas · metadata oficial y texto íntegro cuando la fuente lo publica" (NO "texto íntegro" a secas) | ☐ |
| TC-51 🆕 | **Sin boilerplate** | Mirá los excerpts de las tarjetas | NINGUNA dice "Leteral primer nivel Documentos y Leyes…" (texto basura) | ☐ |
| TC-52 | **Búsqueda + filtros** | Buscá por nº/tema + filtros de estado (Activas/Latentes…) | Filtran bien; chips "PROBÁ" funcionan | ☐ |
| TC-53 | **Detalle rico** | Abrí una ley | Secciones: Genealogía, Equivalente regional, Articulado, Tramitación, Impacto fiscal, Jurisprudencia, Mis notas, etc. | ☐ |
| TC-54 🆕 | **Articulado honesto** | Abrí una ley sin texto real | Muestra "El texto íntegro… todavía no está disponible…" (NO una plantilla con `[NOMBRE]`/`[MINISTERIO]`) | ☐ |
| TC-55 | **Comparar / Asistente** | Probá "Comparar" y "Asistente →" | Abre comparador / manda la ley al Asistente | ☐ |
| TC-56 | **TOC sticky** | Scrolleá el detalle (desktop) | La tabla de contenidos sigue visible (chip flotante en mobile) | ☐ |

### G. Briefing · Estadísticas · Biblioteca

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-60 🆕 | **Briefing — promesa dinámica** | Entrá a Briefing | "Destilamos **hasta** 5 normas clave… según tus filtros" (no promete fijo "5+3+3") | ☐ |
| TC-61 | **Briefing — armar + guardar** | Elegí tema/países/ventana → "Guardar en Mi carpeta" | Genera el 1-pager; guarda y avisa | ☐ |
| TC-62 🆕 | **Stats — métricas legibles** | Andá a `#/estadisticas` | Tarjeta dice "Conexiones entre normas" (no "Backlinks en grafo"); "N fuentes oficiales" coincide con el panel de fuentes | ☐ |
| TC-63 | **Stats — paneles** | Scrolleá | Heatmap, mapa, sectores, ranking presupuestario, frecuencia de términos renderizan | ☐ |
| TC-64 🆕 | **Biblioteca — subir bloqueado** | En Biblioteca, mirá "Subir documento" | Está atenuado con badge "Pronto" (no es un botón primario que tira excusa) | ☐ |
| TC-65 🆕 | **Biblioteca — sin skeleton falso** | Escribí en el buscador de Biblioteca | Filtra al instante (no aparece un skeleton fake en cada tecla) | ☐ |

### H. Mi carpeta (`/carpetas`)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-70 🆕 | **Ítems de ejemplo marcados** | Entrá a Mi carpeta (estado inicial) | Los 5 ítems sembrados tienen badge **"Ejemplo"** (queda claro que no los guardaste vos) | ☐ |
| TC-71 🆕 | **Todos los ítems abren** | Tocá cada ítem (novedad/documento/respuesta/brief/minuta) | **Todos** abren algo (drawer de lectura o navegan) — ninguno tira "no tiene vista disponible" | ☐ |
| TC-72 🆕 | **Borrar con deshacer** | Borrá un ítem (ícono tacho) | Toast "Eliminado… **Deshacer**"; al tocar Deshacer **vuelve** | ☐ |
| TC-73 🆕 | **Borrar carpeta con deshacer** | Creá una carpeta, metele ítems, eliminala | Toast con "Deshacer" que **recrea** la carpeta y reasigna los ítems | ☐ |
| TC-74 | **Crear + mover** | Crear carpeta + mover un ítem a ella | Funciona; contadores correctos | ☐ |

### I. Perfil + preferencias + alertas (`/perfil`)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-80 🆕 | **Institución por país** | Mirá "Datos institucionales" | "Honorable Congreso de la Nación · Argentina" (deriva del país AR, no hardcodeado Uruguay) | ☐ |
| TC-81 🆕 | **Temas reales** | Compará "Temas prioritarios" vs "Temas seguidos" | Coinciden con tus prefs reales (no un 3er tema fantasma) | ☐ |
| TC-82 | **Editar preferencias** | Click "Editar preferencias" | Abre drawer con países/temas/frecuencia; guardar avisa ("actualizadas" / "sin cambios") | ☐ |
| TC-83 🆕 | **Alertas — borrar con deshacer** | "Gestionar alertas" → borrá una | Toast con "Deshacer" que la **restaura** | ☐ |
| TC-84 | **Editar datos / cerrar sesión** | Editá nombre/cargo; logout | Se reflejan los cambios; logout vuelve a login | ☐ |

### J. Transversales (mobile, PWA, global)

| # | Caso | Pasos | Esperado ✅ | OK? |
|---|------|-------|------------|-----|
| TC-90 🆕 | **Nav mobile completa** | Achicá a 375px (o probá en el celu) | Barra inferior: **Inicio · Asistente · Radar · Leyes · Más** | ☐ |
| TC-91 🆕 | **Sheet "Más"** | Tocá "Más" en la barra inferior | Abre hoja con **Briefing · Biblioteca · Mi carpeta · Estadísticas · Perfil** | ☐ |
| TC-92 🆕 | **Leyes en mobile** | Abrí Leyes en mobile | **Sin scroll horizontal**; una sola columna; el stepper de tramitación scrollea solo | ☐ |
| TC-93 | **Búsqueda global** | Apretá `⌘K` (o `/`) | Abre buscador global; encuentra normas/leyes/secciones | ☐ |
| TC-94 | **Notificaciones** | Click en la campanita | Lista de notificaciones; marcar como leídas | ☐ |
| TC-95 🆕 | **PWA auto-update** | (Prod) recargá tras un deploy nuevo | Toma la última versión sola (no queda en versión vieja) | ☐ |
| TC-96 | **Offline** | Cortá la red (DevTools → Offline) | Aparece banner de offline; la app no explota | ☐ |

---

## 7. 🐞 FORMATO PARA REGISTRAR BUGS

Por cada hallazgo, copiá este bloque:

```
[BUG-##] Título corto
🆔 Caso:        TC-xx (o "exploratorio")
📍 Dónde:       pantalla / ruta / componente
📱 Dispositivo: desktop 1280 / mobile 375 / ambos
👀 Qué hice:    pasos exactos para reproducir
💥 Qué pasó:    lo que vi (con captura si podés)
✅ Qué esperaba: lo que debería pasar
🔥 Severidad:   🔴 Crítica / 🟠 Alta / 🟡 Media / ⚪ Baja
```

---

## 8. 📊 VEREDICTO FINAL (completar al terminar)

```
Casos probados:     __ / 60
✅ Pasaron:          __
❌ Fallaron:         __
🐞 Bugs:  🔴 __  🟠 __  🟡 __  ⚪ __

Sensación general (2-3 líneas):
¿La app se siente cuidada, confiable y ágil? ¿Dónde fluí, dónde me frené?

Top 3 a arreglar primero:
1.
2.
3.
```

---

## 9. 🗺️ Mapa rápido de rutas (para navegar a mano)

`#/login` · `#/registro` · `#/checkout` · `#/onboarding` · `#/` (Home) · `#/asistente` · `#/radar` · `#/radar/:id` · `#/leyes` · `#/briefing` · `#/estadisticas` · `#/biblioteca` · `#/carpetas` · `#/perfil`

---

### 📌 Contexto: qué se trabajó en la última sesión (para que sepas qué confirmás)

Los casos 🆕 corresponden a tres tandas de mejoras tras una auditoría UX (reporte en `REPORTE-AUDITORIA-UX-R4.md`):

- **10 Quick wins:** funnel de acceso (login/registro/checkout), nav mobile con "Más", dedup de títulos, honestidad de números (Stats/Perfil/Biblioteca/Briefing), link "ver" fuente, coherencia del detalle de Radar.
- **Mejoras estratégicas:** citas clickeables del Asistente, "Deshacer" en borrados (carpeta/alertas), Leyes honesto (oculta contenido placeholder), Leyes responsive en mobile, relevancia honesta del RAG, "Mi comisión" curado, eventos ceremoniales → baja relevancia.
- **Fix PWA:** auto-update del service worker (para no quedar varado en versión vieja en el celu).

> Lo que **queda pendiente** (fuera de alcance front-end): traer el **texto real** de las leyes (hoy hay placeholders, mitigados con notas honestas) — es trabajo de ingesta de datos/backend.
