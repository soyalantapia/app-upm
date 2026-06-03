# 🧭 Plan de Producto por Página — Asistente AI UPM

> **Objetivo del proyecto:** demo que muestre el **máximo potencial** — front-end, "wow", diseño caro.
> Backend/datos reales = fase posterior (se anota como *nota para producción*).
> **Foco de cada página (wow):** cobertura / dato vivo + diseño premium.
> **Modo de trabajo:** diagnóstico PM → plan priorizado → **ejecución** de los wins de alto impacto, página por página.

---

## 🏠 Inicio (Home) — `/`

🎯 **Job-to-be-done:** al abrir, en 5 segundos el legislador sabe *qué pasó que le importa* **y** siente que un sistema serio vigila **toda** la normativa del Mercosur por él.
👤 **Usuario + momento:** legislador/asesor, primer ingreso del día (o varias veces/semana), apurado, antes de comisión o entre reuniones.
📍 **Rol en el producto:** **puerta de entrada y primera impresión.** Define si el producto se percibe "serio/premium" o "demo". Es la pantalla que más vende.

### Estado actual (honesto)
- **Funcional:** saludo + search prominente + 3 stats "HOY" (alta relevancia / por votar / audiencias) → diff desde última visita → "En tu Radar" personalizado → Agenda Mercosur → "Ir a" (4 atajos). Buen contenido **decisional**, arquitectura sólida.
- **Diseño:** limpio, jerarquía decente, el panel oscuro "Diff regulatorio" tiene peso. Sistema de diseño coherente y prolijo.
- **Veredicto:** **4/5.** Cuidado y claro, pero **no grita "wow"**: no transmite la **escala de cobertura** (el gran diferenciador) ni remata con el pulido premium (animación, profundidad) que haría sentir "esto es un producto top".

### Diagnóstico PM
- ✅ **Fortalezas (conservar):** foco decisional ("tus 3 cosas de hoy"), search arriba, diff personalizado, jerarquía limpia, ya está en español.
- ⚠️ **Gaps funcionales:** la **cobertura no se ve** — el usuario no percibe "8 países · 45 fuentes oficiales · 1.700+ normas · en tiempo real". El dato más impresionante del producto está **escondido**. No hay un "en vivo / actualizado hace X" prominente.
- 🎨 **Gaps de diseño/UX:** todo aparece **estático** (sin count-up ni entrada escalonada); falta profundidad/microinteracción que se sienta "cara"; el saludo es plano; la cobertura regional (países) no se muestra visualmente.
- 💰 **Gaps de valor (lente demo/wow):** la primera pantalla no comunica **el diferencial** (cobertura masiva + IA + tiempo real) en los primeros 5 segundos. Se ve "una app prolija" en vez de "un sistema que lo sabe todo del Mercosur".

### Plan de la página (priorizado)
| # | Mejora | Tipo | Impacto | Esfuerzo | Cuándo |
|---|--------|------|---------|----------|--------|
| 1 | **Cinta "cobertura en vivo"**: 🟢 en vivo · N países · N fuentes oficiales · N normas en el corpus · actualizado hace X | Valor+Diseño | **Alto** | Bajo-Medio | **Ahora** |
| 2 | **Pulso regional**: fila de banderas por país con su contador (vende cobertura) | Valor | Alto | Bajo | **Ahora** |
| 3 | **Count-up** animado en todos los números (cinta + 3 stats HOY) | Diseño | Medio | Bajo | **Ahora** |
| 4 | **Entrada escalonada** (stagger fade-up) de las secciones | Diseño | Medio | Bajo | **Ahora** |
| 5 | Microdetalles premium: gradientes/sombras sutiles, hover más rico, respeta `prefers-reduced-motion` | Diseño | Bajo | Bajo | **Ahora** |
| 6 | Hero con más contexto ("en vivo" pulse + fecha/hora mejor jerarquizadas) | Diseño | Bajo | Bajo | Próximo |
| 7 | Skeleton premium mientras carga el feed | Diseño | Bajo | Medio | Próximo |

> **Nota para producción:** los números de cobertura salen del feed real agregado (`feed.sources`, `feed.byCountry`, `feed.fetchedAt`). Hoy en hosting estático el live falla por CORS y cae a mock con gracia → en prod, con proxy/backend, la cinta muestra datos reales en vivo.

### North Star de la página
> *"Abrís Inicio y en 5 segundos sentís que un sistema serio está vigilando toda la normativa del Mercosur por vos — en vivo, 8 países, miles de normas — y ya tenés tus 3 cosas de hoy. Una pantalla que se siente de producto premium."*

### Ejecutado en esta pasada
- ✅ #1 Cinta de cobertura en vivo · ✅ #2 Pulso regional (banderas) · ✅ #3 Count-up · ✅ #4 Stagger · ✅ #5 Microdetalles + reduced-motion
- (#6/#7 quedan anotados para la próxima pasada de Inicio)

---

> _Próximas páginas (mismo molde): Asistente · Radar · Leyes · Briefing · Estadísticas · Biblioteca · Mi carpeta · Perfil · (acceso/onboarding)._
