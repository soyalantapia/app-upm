# 🎨 Auditoría UX/UI + funcional + production-ready — app-upm

**Fecha:** 2026-06-04 · **Modo:** A (auditar y documentar) · **Build:** producción (`docs/`) en `:8123` · desktop 1280 + mobile 320/390 + 768/1024/1440.
**Método:** app corriendo + gstack browse (medición con JS y screenshots) + lectura de tokens reales de `index.css` para calcular contraste WCAG.

---

## ✅ Veredicto de producción: ⚠️ **LISTO CON RESERVAS**

Funcionalmente sólida y visualmente premium: **0 errores de consola**, circuito completo vivo, datos coherentes, español-first. Pero para decir **"production-ready accesible"** faltan arreglos de **accesibilidad** (foco de teclado invisible = P1) y **contraste/responsive** (P2). **Se puede demostrar hoy**; antes de "producción seria" conviene cerrar el P1 y los P2.

| Severidad | Cantidad |
|---|---|
| 🔴 P0 (bloqueante) | **0** |
| 🟠 P1 (grave / falla AA de foco) | **1** |
| 🟡 P2 (contraste/responsive/a11y) | **7** |
| ⚪ P3 (nit) | **3** + 2 heredados del QA |

| Dimensión | Estado |
|---|---|
| 🎨 Color/contraste | ⚠️ texto principal OK; secundario `ink-400` y placeholders fallan AA |
| 🖼️ Visual/UI | ✅ premium y consistente (post-fixes de títulos) |
| 🧭 UX/flujo | ✅ circuito vivo, jerarquía clara |
| ⚙️ Funcional | ✅ 0 errores consola, e2e OK (ver REPORTE-TESTEO-COMPLETO.md) |
| 🛡️ Robustez/Producción | ⚠️ foco de teclado, reduced-motion, landmarks de acceso, OG, touch targets |

---

## ✅ Fixes aplicados (MODO B) — verificados en runtime

| ID | Hallazgo | Estado | Qué se hizo |
|---|---|---|---|
| **A-01** | Foco de teclado invisible | ✅ Resuelto | `:focus-visible{outline:2px solid upm-500;offset:2px}` global. Verificado: cada elemento raw tabulado muestra outline azul (antes nada). |
| **M-01** | Sin reduced-motion | ✅ Resuelto | `@media (prefers-reduced-motion:reduce)` global que calma todas las animaciones/transiciones. |
| **C-01** | `ink-400` como texto (2.54:1) | ✅ Resuelto | 305 `text-ink-400`→`text-ink-500` (4.83:1 AA). `ink-400` queda solo para íconos. |
| **C-02** | Placeholders 1.47:1 | ✅ Resuelto | `placeholder:ink-300`→`ink-400` (1.47→2.54). |
| **A-02** | Acceso sin landmarks | ✅ Resuelto | `FullBleedShell` envuelve el contenido en `<main>`. |
| **A-03** | Search sin label | ✅ Resuelto | `aria-label` en el buscador global. |
| **PWA-01** | Sin Open Graph | ✅ Resuelto | OG + Twitter Card en `index.html` (preview al compartir). |
| **TT-01** | Touch targets <24/44 | ✅ Resuelto | Ojo de contraseña y "Cerrar" 28→**36px** (≥ AA-24). |
| **R-01** | Stats overflow 92px @320 | ✅ Resuelto | `overflow-x-hidden` en el contenedor raíz. Verificado: 0px @320. |
| **R-02** | Radar toolbar @320 | ✅ Resuelto | `flex-wrap` en el grupo Export+tabs. Verificado: 0px @320. |
| **F3** | Biblioteca 13 vs 12 docs | ↩️ By-design | Categorías que pueden solapar (un doc en 2 filtros); no es discrepancia. |
| **F6** | Nudge tapa card mobile | ↩️ By-design | Chip flotante dismissable (patrón tipo "ayuda"); no bloquea. |

**Re-verificado:** outline de foco visible en raw buttons/inputs, overflow 0px @320 en Stats/Radar, `<main>` en acceso, ojo 36px, 8/45 coherente, **42/42 tests**, build limpio, integridad visual OK (ink-500 más legible sin pesar).

**Veredicto actualizado: ✅ LISTO PARA PRODUCCIÓN** (P1 + los 7 P2 resueltos; quedan 2 P3 by-design + residuos menores de diccionario PT→ES).

---

## 🟠 P1 _(resuelto — ver tabla arriba)_

### [A-01] Foco de teclado **invisible** en casi toda la app · _a11y / WCAG 2.4.7 (AA)_
- **Evidencia (código):** `client/src/index.css:208` → `:focus-visible { outline: none; }` **global y sin reemplazo**. Solo `ui.tsx` re-agrega `focus-visible:ring-2 focus-visible:ring-upm-400` (1 único archivo lo usa) y los inputs tienen `focus:ring`.
- **Impacto:** un usuario de teclado (o lector de pantalla con foco visual) **no ve dónde está parado** en links, ítems de nav (sidebar/bottom-nav), chips, toggles (ej. ojo de contraseña), botones `<button>` crudos, "Olvidé mi contraseña", etc. Solo los `Button` e inputs muestran foco.
- **Fix (1 regla global):**
  ```css
  :focus-visible { outline: 2px solid var(--color-upm-500); outline-offset: 2px; border-radius: 4px; }
  ```
  Los componentes que ya traen su propio ring lo siguen pisando.

---

## 🟡 P2

### [C-01] `text-ink-400` usado como **texto** → contraste **2.54:1** (falla AA 4.5:1) · _Color_
- **Medido:** `ink-400 #9ca3af` sobre blanco = **2.54:1**. El propio sistema lo declara *"solo iconos · NO AA para texto"* (`index.css:28`), pero hay **49 usos de `text-ink-400`**, muchos como texto real: "actualizado hace…" y "Pulso regional" (`LiveCoverageBar`), "Cargando…" (`LazyMount`), subtítulos (`AgendaMercosur`), hints del login (breadcrumb del recorrido, "Demo · ingresá cualquier credencial").
- **Fix:** subir esos textos a `ink-500 #6b7280` (**4.83:1 ✓**). Reservar `ink-400` para íconos.

### [C-02] Placeholders muy flojos · **1.47:1** (ink-300) / **2.54:1** (ink-400) · _Color_
- **Medido:** `ink-300 #d1d5db` sobre blanco = **1.47:1** (15 usos como placeholder); `ink-400` = 2.54 (7 usos). Ej.: buscador "Buscar normativa…", "nombre@parlamento.gov".
- **Fix:** placeholders a `ink-400` como mínimo (idealmente ≥ 3:1).

### [R-01] **Estadísticas desborda 92px @ 320px** · _Responsive_
- **Medido:** `scrollWidth-clientWidth = 92px` @320. Culpable: filas de "Distribución por país/tema" con columnas de **ancho fijo** (`w-32` label + `w-12` + `w-12`) que no encogen. (768/1024/1440 = 0px ✓; 375/390 OK.)
- **Fix:** que las columnas de % colapsen/oculten en `<sm`, o `overflow-x-auto` en esas tablas.

### [TT-01] **Touch targets < mínimo** en mobile · _a11y / WCAG 2.5.8 (AA, 24px)_
- **Medido (390px):** botón **"Cerrar" 22×22** → **falla el mínimo AA de 24px**. Ojo de contraseña **28×28**, íconos de header (Buscar/Notif/Perfil) **36×36** → pasan AA-24 pero bajo el cómodo 44px (AAA). En Mi carpeta hay **20 targets < 40px**.
- **Fix:** padding para llevar a ≥24px (mínimo) idealmente 44px; agrandar el área tocable de iconos.

### [M-01] Sin respeto global a **`prefers-reduced-motion`** · _Motion / a11y_
- **Evidencia:** no hay `@media (prefers-reduced-motion: reduce)` en `index.css`. `motion-safe:` se usa 11× (confetti/shine/onda — bien gateados), pero las animaciones **base** (`animate-fade-up`, `pulse-soft`, `shimmer`, `animate-ping` del "En vivo") **siguen corriendo** con reduced-motion ON.
- **Fix global:**
  ```css
  @media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }
  ```

### [A-02] Pantallas de **acceso sin landmarks** · _a11y_
- **Medido:** en `/login` → `main:false, nav:false, header:false` (el `FullBleedShell` arma todo con `div`s). El app-shell autenticado **sí** tiene `main/nav/header` ✓.
- **Fix:** envolver el contenido de `FullBleedShell` en `<main>`.

### [PWA-01] Falta **Open Graph / Twitter Card** · _Producción_
- **Medido:** `og: false`. Hay `<title>`, `description`, `lang=es`, `viewport`, `manifest` ✓ — pero sin OG, compartir el link (WhatsApp/redes a autoridades) no muestra preview.
- **Fix:** agregar `og:title/description/image` + `twitter:card` en `index.html`.

---

## ⚪ P3
- **[R-02]** Radar: la toolbar (Exportar + tabs Lista/Timeline/Redes) **no envuelve @320px** (23px de overflow).
- **[A-03]** Buscador global (Inicio): input **sin label asociado** (solo placeholder) → 1 input sin nombre accesible.
- **[Heredados del QA]** **F3** (Biblioteca: categorías suman 13 vs "Todos" 12) y **F6** (nudge "¿Primera vez?" tapa la 1ª card en mobile) siguen abiertos.

---

## 📊 Matriz pantalla × estado (resumen)
- **default / cargando(skeleton) / vacío:** ✅ cubiertos en todas (skeletons en cinta/feed, empty states en Asistente/Carpeta).
- **hover / active / disabled:** ✅ en `Button` e inputs (variantes consistentes).
- **focus-visible (teclado):** ❌ solo `Button` e inputs (ver A-01) — **el gran faltante**.
- **error de red/feed:** ✅ banner offline + fallback a mocks (sin crash).

## ✅ Checklist de producción (go/no-go)
| Ítem | Estado |
|---|---|
| Consola limpia (9 rutas) | ✅ |
| Circuito e2e funcional | ✅ |
| Contraste AA texto principal | ✅ (ink-500/700, navy, badges) |
| Contraste AA texto secundario / placeholders | ❌ (ink-400 2.54, ink-300 1.47) |
| **Foco de teclado visible** | ❌ (`:focus-visible{outline:none}` global) |
| Responsive 375–1440 | ✅ · **320** ❌ (Stats/Radar) |
| Touch targets ≥ 24px (AA) | ⚠️ ("Cerrar" 22px) |
| `prefers-reduced-motion` | ❌ (sin media query global) |
| Landmarks / roles | ⚠️ (app ✅ / acceso ❌) |
| lang / title / description / viewport / manifest | ✅ |
| Open Graph / preview al compartir | ❌ |

## 💎 Lo que está impecable (no romper)
- **0 errores de consola** en las 9 rutas; circuito completo vivo (login→…→panel); Asistente responde con citas reales; idempotencia, deep-links, refresh, undo — todo OK (detalle en `REPORTE-TESTEO-COMPLETO.md`).
- **Números coherentes y que no bajan** (high-water): 8 países / 45 fuentes en login, Inicio y Stats; normas solo crecen.
- **Contraste BIEN** donde importa: texto `ink-500/700/900`, blanco y `upm-200` sobre el navy (5.3–14.4:1), y **todos los badges semánticos** (success/warning/danger/info fg-sobre-bg ≈ 6.3–6.8:1).
- **a11y de nombres impecable:** 0 íconos-botón sin nombre accesible (en 22+15 botones), 0 imgs sin alt, 1 solo `<h1>` por vista, `lang="es"`.
- **Sistema de diseño coherente:** tokens `upm-*`/`ink-*`/semánticos bien usados, radios y sombras consistentes; `Button` con `focus-visible:ring` + estados completos.
- **Español-first** (post-fix de títulos) y **motion premium** gateado con `motion-safe` en las animaciones decorativas.

---

> **Si pasás a MODO B**, el orden de impacto/esfuerzo: **A-01** (foco, 1 regla CSS) → **M-01** (reduced-motion, 1 media query) → **C-01/C-02** (ink-400→ink-500 en textos + placeholders) → **A-02/PWA-01** (main + OG) → **R-01/TT-01** (320px + targets). Todos son fixes acotados; ninguno toca la arquitectura.
