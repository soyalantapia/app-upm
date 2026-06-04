# 🧪 Prompt: Testeo integral de app-upm (Asistente AI UPM)

> **Cómo usar:** pegá TODO el bloque de abajo (desde "ROL") en una sesión nueva de Claude Code parada en `~/dev/app-upm`. Elegí el **MODO** en la primera línea.

---

**MODO:** `A) SOLO REPORTE`  ·  (cambialo a `B) REPORTE + ARREGLAR` si querés que además corrija lo que encuentre)

---

ROL: Sos un **ingeniero de QA senior + revisor de producto**. Vas a testear EXHAUSTIVAMENTE la app **"Asistente AI UPM"** (app-upm) de punta a punta — funcional, datos/estado, UX/diseño, responsive, accesibilidad, contenido, performance y PWA. Tu trabajo es encontrar TODO lo que esté roto, confuso, inconsistente o por debajo del estándar premium, y dejar evidencia.

OBJETIVO: La app es una **demo para mostrar el potencial** de un asistente AI legislativo del Mercosur (radar normativo en vivo, biblioteca institucional, briefs). El listón es **premium**: números que "respiran" (count-up) y nunca bajan, español-first, estados seguros (skeletons, sin ceros, sin duplicados), micro-interacciones suaves. Encontrá lo que rompe esa promesa.

## Contexto del proyecto
- **Repo:** `~/dev/app-upm` (symlink en `~/Desktop/Programacion/app-upm`). El front vive en `client/`.
- **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + **HashRouter** + PWA (`vite-plugin-pwa`, service worker autoUpdate).
- **Deploy (NO lo toques al testear):** carpeta `docs/` en rama `main` → GitHub Pages, base `/app-upm/`. Online: https://soyalantapia.github.io/app-upm/
- **Datos:** feed "en vivo" de ~**45 fuentes oficiales** de **8 países** (AR, BR, UY, PY, CL, BO, PE, CO), con mocks de fallback. Español-first: traducción PT→ES (`client/src/lib/pt-es.ts`, función `cleanTitle`).

## Cómo levantar y navegar
- **Dev server:** `preview_start "app-upm"` → http://localhost:5188/app-upm/ . Alternativas: `cd client && npm run dev` (puerto 5188 strictPort), o build de prod estable: `cd client && npm run build && npx vite preview --port 8123 --strictPort` → http://localhost:8123/app-upm/
- **Es HashRouter:** las rutas llevan `#`, ej. `http://localhost:5188/app-upm/#/login`
- **Navegá con el binario gstack browse:** `~/.claude/skills/gstack/browse/dist/browse` (`goto`, `viewport WxH`, `click`, `fill`, `js`, `screenshot`). Para web general usá el skill `/browse`.
- **⚠️ Gotcha PWA:** el service worker cachea agresivo. Si ves un build viejo: limpiá caches + `unregister` del SW + hard reload (`browse js "..."`). **Confirmá siempre que estás viendo TU build** antes de reportar.
- **⚠️ Gotcha puertos:** el daemon de browse es singleton y a veces "deriva" a otra app (misanpedro:5191, etc.). Si una captura sale rara, hacé `goto` explícito a la URL de app-upm y revisá `url`.
- **Login:** cualquier credencial entra. CTAs: **"Vivir el recorrido completo"** (arranca el circuito de alta), **"o entrar directo a la demo"** (salta al panel como Dr. Martín Pereira), o el form institucional.

## Alcance — todas las pantallas
**Acceso / circuito:** `/login` · `/registro` · `/checkout` · `/cuenta-activada` · `/onboarding`
**App:** `/` (Inicio) · `/asistente` · `/radar` · `/radar/:id` (conversación de noticia) · `/leyes` · `/briefing` · `/biblioteca` · `/carpetas` · `/estadisticas` · `/perfil` · perfil de legislador.

## El circuito completo (recorrelo con clicks REALES, asertando cada paso)
```
login → [Vivir el recorrido completo] → /registro (completá datos) → [Continuar al pago]
      → /checkout ([Rellenar con datos demo] → [Empezar prueba gratis])
      → /cuenta-activada ([Continuar a tu Radar])
      → /onboarding (elegí países+temas, o "Saltar por ahora")
      → / (panel)
```
También probá el atajo: `[o entrar directo a la demo] → panel`.

## Dimensiones a testear (en CADA pantalla)
1. **Funcional:** cada botón/link/form hace lo que dice; navegación correcta; **consola sin errores**; sin pantallas en blanco.
2. **Datos/estado:** números coherentes y que **NO bajan** dentro de una sesión (high-water mark); el count-up llega al valor final; sin "0/0/0"; sin duplicados; **refresh (F5) y deep-link no rompen**; "volver atrás" funciona.
3. **UX/diseño premium:** jerarquía clara, espaciado/alineación, contraste; micro-interacciones suaves; nada que desentone.
4. **Responsive:** probá **390px (mobile)** y **1280px (desktop)** en cada pantalla. Bottom nav mobile (4 accesos + "Más"). Sin overflow ni texto cortado.
5. **Español-first:** títulos de normas en español (no portugués crudo tipo "Deliberação"); sin `undefined`/`null`/`NaN`; fechas y números en es-AR.
6. **Accesibilidad:** foco visible al tabular; `aria-label` en botones-ícono; contraste; **`prefers-reduced-motion` ON → animaciones calmas** (sin confetti/shine/onda).
7. **Estados:** vacío, cargando (skeletons), error/sin conexión, sin resultados.
8. **PWA/performance:** carga sin jank; el SW actualiza; offline no crashea.

## Checklist por pantalla (mínimos)
- **Login:** 3 CTAs con jerarquía clara; mostrar/ocultar contraseña (👁); cinta de cobertura **8 países / 45 fuentes / En vivo**; shine del hero y onda del breadcrumb (motion-safe).
- **Registro:** validación (no avanza sin nombre/email/institución/checkbox de términos); stepper en "Datos"; pricing visible.
- **Checkout:** formateo de tarjeta; botón "Rellenar con datos demo"; resumen + trial 7 días / "Hoy pagás USD 0"; stepper en "Pago".
- **Cuenta activada:** stepper en "Listo"; badge con pop + **confetti** (motion-safe); "Continuar a tu Radar" → **/onboarding**.
- **Onboarding:** barra de progreso de 3 pasos; gating (≥1 país, ≥1 tema para avanzar); "Saltar por ahora"; resumen vivo.
- **Inicio:** cinta de cobertura en vivo; hero "HOY" **sin 0/0/0**; feed de novedades; búsqueda; secciones "En tu radar".
- **Asistente:** reveal tipo "IA escribiendo"; empty state potente; citas/fuentes verificables; preguntas sugeridas.
- **Radar:** lista en español; "Pulso de hoy" (count-up + high-water); filtros país/tema/tipo; detalle de noticia.
- **Leyes:** contador con count-up; títulos en español; tabs; hero del detalle.
- **Briefing:** defaults desde tus prefs; **guardar idempotente** (guardar el mismo brief 2 veces = 1 solo ítem en Mi carpeta); count-up.
- **Estadísticas / Biblioteca / Mi carpeta / Perfil:** count-up; español; **deshacer** en borrados; estados vacíos.

## ❌ NO reportes como bug (comportamiento de demo INTENCIONAL)
- El checkout **no cobra de verdad** ("Modo demo · sin cargo real"); el login dice "ingresá cualquier credencial".
- Datos de ejemplo marcados como **"Ejemplo"**.
- Que los números del feed **cambien entre recargas** (es feed en vivo). Lo que SÍ es bug: que **bajen** dentro de una misma sesión (rompe el high-water).

## Casos borde / adversariales (probá al menos estos)
- **Refrescar (F5)** en cada ruta profunda (`#/leyes`, `#/radar/:id`, `#/briefing`…) → no debe romper.
- **`prefers-reduced-motion` ON** → sin confetti/shine/onda; todo legible.
- **Mobile:** teclado abierto; targets táctiles ≥40px; bottom nav siempre alcanzable.
- **Spamear botones** (doble click en "Ingresar", "Continuar al pago") → sin doble navegación ni duplicados.
- **Offline** (cortá la red) → banner/estado, no crash.
- **Deep-link a ruta protegida sin sesión** → te manda a `/login` y, tras entrar, te devuelve al destino.
- **Guardar el MISMO briefing dos veces** → 1 solo ítem en Mi carpeta.

## Cómo reportar
Generá **`REPORTE-TESTEO-COMPLETO.md`** con:
1. **Resumen ejecutivo:** veredicto (¿apto para demo? sí/no) + tabla de conteo por severidad.
2. **Hallazgos**, cada uno con: `[ID]` · severidad · pantalla · pasos para reproducir · **esperado vs. actual** · evidencia (ruta del screenshot) · _(MODO B)_ fix aplicado.
3. **Lo que SÍ está impecable** (para no perder lo bueno de vista).

**Severidades:** `P0` bloqueante (crash, datos rotos, no se puede usar) · `P1` funcional roto / UX grave · `P2` UX/visual menor · `P3` nitpick.
Sacá **screenshots** de cada hallazgo y de cada pantalla en mobile + desktop (`browse screenshot --viewport <ruta>`).

## Reglas
- **Verificá en la app CORRIENDO, no leyendo código.** La evidencia es lo que se ve en pantalla (screenshots / consola / network).
- **No toques el deploy** (no pushees, no edites `docs/`) salvo que se pida explícitamente.
- Si encontrás un problema, **capturá la evidencia ANTES** de tocar nada.
- _(MODO B — arreglar)_ Después de cada fix: re-verificá en runtime + `cd client && npm run build` + `npm test` (deben quedar **42/42 en verde**) antes de dar el hallazgo por cerrado. Footer de commits: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

Arrancá levantando la app, confirmando que ves tu build, y recorriendo el circuito completo. Después barré pantalla por pantalla con las 8 dimensiones. Al final, entregá el reporte.
