# 🎨 Prompt: Auditoría integral UX/UI + funcional + production-ready — app-upm

> **Cómo usar:** pegá TODO el bloque (desde "ROL") en una sesión nueva de Claude Code parada en `~/dev/app-upm`. Elegí el **MODO** arriba.
> Es una auditoría de *gate de producción*: revisar **color, visual, UX, funcional y robustez** desde todos los ángulos, encontrar errores/bugs y **documentar TODO** con evidencia.

---

**MODO:** `A) SOLO AUDITAR Y DOCUMENTAR`  ·  (cambiá a `B) AUDITAR + ARREGLAR` para que además corrija)

**ACELERADORES gstack opcionales:** podés apoyarte en `/design-review` (ojo de diseñador: inconsistencia visual, spacing, jerarquía, AI-slop), `/cso` (seguridad OWASP+STRIDE) y `/qa`. Igual hacé el recorrido completo de abajo, no solo el skill.

---

ROL: Sos un **auditor senior de Producto + Diseño UX/UI + Accesibilidad**, con criterio de "esto sale a producción". Vas a revisar la app **"Asistente AI UPM"** desde **5 dimensiones** — Color, Visual/UI, UX/flujo, Funcional y Robustez/Producción — pantalla por pantalla, estado por estado, breakpoint por breakpoint. Tu objetivo: **encontrar todo** lo que esté roto, inconsistente, inaccesible, confuso o por debajo del estándar premium, y **documentarlo con evidencia** (screenshots + pasos). No maquilles: si algo está mal, va al reporte.

OBJETIVO DEL PRODUCTO: demo premium de un asistente AI legislativo del Mercosur (radar normativo en vivo, biblioteca, briefs, asistente con citas). El listón: **se siente premium y confiable, funciona de punta a punta, y es accesible**. Pensá como alguien que la va a mostrar a legisladores y autoridades.

## Contexto del proyecto
- **Repo:** `~/dev/app-upm` (symlink en `~/Desktop/Programacion/app-upm`). Front en `client/`.
- **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + **HashRouter** + PWA (`vite-plugin-pwa`, SW autoUpdate).
- **Deploy (NO tocar al auditar):** `docs/` en `main` → GitHub Pages, base `/app-upm/`. Online: https://soyalantapia.github.io/app-upm/
- **Datos:** feed en vivo de ~45 fuentes oficiales de 8 países (AR, BR, UY, PY, CL, BO, PE, CO), con mocks de fallback. Traducción PT→ES en `client/src/lib/pt-es.ts` (`cleanTitle`/`deShout`).

## Sistema de diseño (auditá CONTRA esto — está en `client/src/index.css`)
- **Marca (azules):** `upm-50…upm-900` (acentos: upm-200/400/500/600/700/800).
- **Neutrales:** `ink-50…ink-900` (texto: ink-900/700/500; sutil: ink-300/400; bordes: ink-100).
- **Semánticos:** `success`/`success-bg`/`success-fg`, `warning`/`-bg`/`-fg`, `danger`/`-bg`/`-fg`, `info-bg`/`info-fg`.
- **Sombras:** `shadow-card`, `shadow-card-hover`, `shadow-floating`, `shadow-toast`, `shadow-cta`.
- **Superficies:** `glass`, `glass-strong`, `bg-deep-mesh` (fondo oscuro de acceso), `bg-network-mesh`, `bg-dot-grid`, `skeleton`.
- **Radios:** `rounded-2xl` / `rounded-3xl` / `rounded-full` (consistencia esperada).
- **Motion:** `animate-fade-up/-fade-in/-toast-in/-pulse-soft/-badge-pop/-ring-expand/-confetti/-shine-sweep/-step-wave` (todas deben respetar `prefers-reduced-motion`).
> Una regla de oro de la auditoría: **¿se usa el token correcto?** Un gris hardcodeado, un azul que no es `upm-*`, un radio que rompe el ritmo, una sombra inventada → hallazgo.

## Cómo levantar y navegar
- **Server:** `preview_start "app-upm"` → http://localhost:5188/app-upm/ . O build estable: `cd client && npm run build && npx vite preview --port 8123 --strictPort` → http://localhost:8123/app-upm/
- **HashRouter:** rutas con `#`, ej `…/app-upm/#/login`.
- **Browse:** binario `~/.claude/skills/gstack/browse/dist/browse` (`goto`, `viewport WxH`, `click`, `fill`, `js`, `screenshot`, `snapshot`). Para web general, skill `/browse`.
- **⚠️ Gotchas:** (1) el **service worker** cachea — si ves build viejo, limpiá caches + unregister SW + hard reload, y confirmá que ves TU build. (2) El daemon de browse a veces deriva a otra app — hacé `goto` explícito y revisá `url`.
- **Acceso:** cualquier credencial entra. "Vivir el recorrido completo" arranca el circuito; "entrar directo a la demo" cae en el panel como Dr. Martín Pereira.

## Recorrido (todas las superficies)
Acceso/circuito: `/login` · `/registro` · `/checkout` · `/cuenta-activada` · `/onboarding`
App: `/` · `/asistente` (+respuesta) · `/radar` · `/radar/:id` · `/leyes` (+detalle) · `/briefing` · `/biblioteca` · `/carpetas` · `/estadisticas` · `/perfil` · perfil de legislador.
Globales: sidebar (desktop) + bottom-nav (mobile, 4 + "Más") + búsqueda global (`⌘K` / `/`) + campana de notificaciones + toasts + banners (offline / update PWA).

---

## 🎨 Dimensión 1 · COLOR (foco explícito)
1. **Contraste WCAG AA** (texto normal ≥ 4.5:1, texto grande/UI ≥ 3:1). Medí los combos de riesgo:
   - Grises sutiles sobre blanco: `ink-300`, `ink-400` (placeholders, hints, "actualizado hace…", labels).
   - Texto blanco translúcido sobre el fondo oscuro/glass del acceso: `white/55`, `white/65`, `white/70`, `white/85`.
   - Texto sobre chips/badges semánticos (`success-fg` sobre `success-bg`, etc.) y sobre gradientes (`from-upm-700 to-upm-900`).
   - Texto sobre el sidebar y sobre imágenes/mesh.
   Usá un cálculo de ratio real (tomá los hex de `index.css`), no "se ve bien".
2. **Color como ÚNICO portador de info** (falla de a11y): relevancia "alta/media/baja" por color, estados, "En vivo", el heatmap — ¿hay además ícono/texto/forma? Si la info se pierde en escala de grises o para daltónicos (rojo/verde), es hallazgo.
3. **Consistencia de paleta:** ¿azules siempre `upm-*`? ¿grises siempre `ink-*`? ¿semánticos bien usados (rojo solo peligro, verde solo éxito/ahorro)? Buscá hex hardcodeados, azules/grises que no son del token, verdes/rojos decorativos que confundan con semántica.
4. **Foco / fondos oscuros:** en `bg-deep-mesh` (acceso) revisá que todo texto e ícono tenga contraste suficiente sobre el mesh + glows.
5. **Daltonismo:** simulá (o razoná) protanopía/deuteranopía — el rojo de "alta relevancia" vs el verde "En vivo" no deben volverse indistinguibles sin su ícono/label.

## 🖼️ Dimensión 2 · VISUAL / UI
6. **Tipografía:** escala y jerarquía coherentes (h1/h2/labels/body), line-height legible, `tabular-nums` en todos los números que cambian, sin viudas/huérfanas feas, sin texto cortado raro. Títulos de normas legibles (no MAYÚSCULAS gritando, no portugués crudo).
7. **Espaciado y ritmo:** paddings/márgenes consistentes (múltiplos del sistema), alineación de columnas/cards, gutters de grilla parejos, nada "apretado" ni "flotando".
8. **Componentes:** botones (variantes primary/secondary/ghost/soft/danger consistentes), inputs, cards, badges, chips, selects — mismos radios, sombras, rings y tamaños en toda la app. Detectá "dos formas de hacer lo mismo".
9. **Estados (CRÍTICO):** para cada componente interactivo verificá **default / hover / focus-visible / active / disabled / loading / vacío / error / skeleton**. El **focus-visible con teclado** es el que más se olvida — tabulá toda la pantalla y confirmá que el foco se ve siempre.
10. **Motion / microinteracciones:** suaves y con propósito; nada que loopee molesto; **`prefers-reduced-motion` ON debe calmar todo** (sin confetti/shine/onda/pulsos).
11. **Iconografía:** set consistente (lucide), tamaños coherentes, todo ícono-botón con `aria-label`.
12. **AI-slop / inconsistencias:** copy genérico, lorem, números inventados incoherentes, mezcla de estilos, gradientes de más, sombras dramáticas, emojis fuera de tono.

## 🧭 Dimensión 3 · UX / FLUJO
13. **Jerarquía y foco:** en cada pantalla, ¿se entiende en 5s qué es lo importante y la acción principal? ¿1 sola acción primaria clara?
14. **Navegación:** sidebar/bottom-nav marcan el activo; "volver" siempre disponible y correcto; breadcrumbs donde corresponda; nada deja al usuario sin salida.
15. **Copy/microcopy:** claro, en español rioplatense consistente, sin jerga; CTAs que dicen qué pasa; errores accionables.
16. **Vacíos y primeras veces:** empty states que orientan (no callejones), onboarding claro, "primera vez".
17. **El circuito completo** se puede *vivir*: login → registro → checkout → activación → onboarding → panel, sin fricción ni pasos confusos.

## ⚙️ Dimensión 4 · FUNCIONAL
18. Cada botón/link/form hace lo que dice; **consola sin errores**; sin pantallas en blanco; sin acciones muertas.
19. **Formularios:** validación (no avanza incompleto), mensajes de error claros, `Enter` envía, `Tab` ordenado, `autocomplete` correcto, mostrar/ocultar contraseña, no doble-submit (spamear el botón).
20. **Datos/estado:** números coherentes y que **no bajan** (high-water), `count-up` llega al valor, sin "0/0/0", sin duplicados, **guardar idempotente** (guardar 2× = 1 ítem), **deshacer** en borrados, persistencia tras refresh.
21. **Navegación profunda:** F5 en `#/leyes`, `#/radar/:id`, etc. no rompe; deep-link a ruta protegida sin sesión → `/login` y vuelve al destino; back/forward del browser coherente.

## 🛡️ Dimensión 5 · ROBUSTEZ / PRODUCCIÓN
22. **Accesibilidad (WCAG 2.1 AA):** orden de tabulación lógico, foco visible, sin trampas de foco, roles/landmarks (`main`, `nav`, `header`), `aria-label`/`alt` en íconos e imágenes, jerarquía de headings (un solo h1 por vista), modales que atrapan foco y cierran con `Esc`, **zoom al 200%** sin romper, formularios con labels asociados.
23. **Responsive real:** probá **320 / 375 / 390 / 768 / 1024 / 1280 / 1440 px**. Sin overflow horizontal (medí `scrollWidth-clientWidth`), sin solapamientos, **touch targets ≥ 44px** en mobile (ojo: ícono ojo de contraseña, mover/borrar en Mi carpeta, chips, bottom-nav).
24. **Performance:** carga sin jank, sin layout shift (CLS) molesto, imágenes/SVG optimizados, listas largas sin trabar, animaciones a 60fps. Revisá el peso del bundle.
25. **PWA / meta:** `<title>` y `<meta description>` correctos, `lang="es"`, favicon, manifest, OG/redes, el SW actualiza (no deja build viejo), **offline** muestra estado y no crashea.
26. **Errores/red:** error boundaries funcionando, estados de error de red/feed, datos faltantes (sin `undefined`/`null`/`NaN` en pantalla), timeouts.
27. **Seguridad básica (demo):** sin secrets en el bundle/console, links externos con `rel="noopener"`, sin XSS obvio en contenido scrapeado renderizado. (Para profundidad, `/cso`.)

---

## ❌ NO reportar (comportamiento de demo INTENCIONAL)
- Checkout no cobra ("Modo demo · sin cargo real"); login acepta "cualquier credencial".
- Datos de ejemplo marcados "Ejemplo".
- Números del feed que cambian **entre recargas** (es feed en vivo). Sí es bug que **bajen** en una misma sesión.

## 📄 Cómo documentar — `REPORTE-AUDITORIA-UX-UI.md`
1. **Veredicto de producción:** ✅ Listo / ⚠️ Listo con reservas / ❌ No listo + **tabla de conteo por severidad y por dimensión** (Color/Visual/UX/Funcional/Robustez).
2. **Hallazgos**, cada uno con: `[ID]` · **dimensión** · severidad · pantalla · breakpoint · pasos para reproducir · **esperado vs. actual** · (contraste: ratio medido) · evidencia (ruta del screenshot) · _(MODO B)_ fix aplicado.
3. **Matriz pantalla × estado** (default/hover/focus/vacío/cargando/error) marcando lo que falta.
4. **Checklist de producción** (go/no-go): contraste AA ✓/✗ · teclado ✓/✗ · responsive 320–1440 ✓/✗ · consola limpia ✓/✗ · PWA/meta ✓/✗ · reduced-motion ✓/✗.
5. **Lo que está impecable** (para no romper lo bueno).

**Severidades:** `P0` bloqueante (crash, datos rotos, inaccesible total) · `P1` funcional/UX grave o falla de contraste AA en texto principal · `P2` visual/UX menor · `P3` nit.
**Evidencia:** screenshot de cada hallazgo + de cada pantalla en mobile (390) y desktop (1280). Para contraste, indicá los hex y el ratio.

## Reglas
- **Auditá la app CORRIENDO**, no solo leyendo código. La evidencia es lo que se ve/mide en pantalla.
- **No toques el deploy** (no pushees, no edites `docs/`) salvo que se pida.
- Capturá evidencia ANTES de tocar nada.
- _(MODO B)_ Tras cada fix: re-verificá en runtime + `cd client && npm run build` + `npm test` (deben quedar **42/42 verdes**). Footer de commits: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

Arrancá levantando la app y confirmando que ves tu build. Recorré el circuito completo, después barré pantalla por pantalla con las 5 dimensiones y los breakpoints. Cerrá con el reporte + el checklist de producción y el veredicto go/no-go.
