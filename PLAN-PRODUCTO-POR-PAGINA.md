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

### Ejecutado · pasada 1
- ✅ #1 Cinta de cobertura en vivo · ✅ #2 Pulso regional (banderas) · ✅ #3 Count-up · ✅ #4 Stagger · ✅ #5 Microdetalles + reduced-motion

### Ejecutado · pasada 2 (profundización)
- ✅ **Fix del hero "HOY" en 0/0/0**: `computeStats` pedía `fecha ≥ hoy` (solo hoy-o-futuro) → siempre 0 porque las novedades recientes están fechadas días atrás. Ahora cuenta ventanas reales (alta relevancia últimos 7 días, en trámite 14 días, audiencias ±2 semanas) → 15 · 24 · 4 en vez de 0 · 0 · 0.
- ✅ **High-water mark unificado a nivel Home**: cobertura y stats usan el snapshot más completo visto → los números solo crecen, nunca caen aunque el feed fluctúe.
- ✅ **Skeleton** en los stats mientras el feed está vacío (sin 0/0/0 feo en arranque frío).
- Verificado desktop + mobile: stats nunca 0/0/0, banderas = nº países, sin overflow.

---

## 🤖 Asistente — `/asistente`

🎯 **Job-to-be-done:** hacerle una pregunta y que la resuelva (resumen, redacción, brief, consulta) **con fuentes verificables** — como tener un asesor que leyó todo el corpus.
👤 **Usuario + momento:** legislador que necesita preparar algo rápido (un discurso, un brief, entender una norma) sin leer 1.700 normas.
📍 **Rol en el producto:** **el corazón del value-prop.** Donde se demuestra la "inteligencia". Si esta página no se siente mágica, el producto no se diferencia de un buscador.

### Estado actual (honesto)
- **Funcional:** empty state con capacidades + sugerencias; respuesta con **citas clickeables**, etiqueta de fuerza de coincidencia (fuerte/media/parcial) y barra de acciones (Copiar/Guardar/Brief/Minuta/Más). Sólido (arreglado en la sesión de auditoría).
- **Diseño:** chat limpio, ordenado.
- **Veredicto:** **3.5/5.** Funciona y es honesto, pero la respuesta **aparecía de golpe** — no transmitía la sensación de "IA pensando/respondiendo" que vende inteligencia.

### Diagnóstico PM
- ✅ **Fortalezas:** citas verificables clickeables, etiquetas de coincidencia honestas, acciones útiles sobre cada respuesta, thinking state con skeleton.
- ⚠️ **Gaps funcionales:** el empty state no comunicaba el **poder/alcance** (qué corpus hay detrás).
- 🎨 **Gaps de diseño/UX:** respuesta sin **aparición progresiva** (el gesto premium por excelencia de un asistente AI); fuentes podrían tener más presencia (tarjetas con país/tipo).
- 💰 **Gaps de valor (demo/wow):** no se sentía "mágico". La diferencia entre "una app que busca" y "un copiloto que piensa" está justamente en cómo entrega la respuesta.

### Plan de la página (priorizado)
| # | Mejora | Tipo | Impacto | Esfuerzo | Cuándo |
|---|--------|------|---------|----------|--------|
| 1 | **Reveal de respuesta bloque por bloque** (efecto "IA escribiendo" + cursor) sin romper el markdown | Diseño+Valor | **Alto** | Medio | **Ahora** |
| 2 | **Empty state que vende el corpus**: "Busco en el corpus normativo del Mercosur… con fuentes verificables" | Valor | Medio | Bajo | **Ahora** |
| 3 | Fuentes como tarjetas más ricas (país + tipo + "oficial") | Diseño | Medio | Medio | Próximo |
| 4 | Sugerencias que muestren el rango de capacidades (redactar/comparar/brief) | Valor | Bajo | Bajo | Próximo |

### North Star de la página
> *"Le preguntás y ves a la IA **construir la respuesta en vivo**, citando fuentes oficiales que podés abrir — se siente como un asesor experto que leyó todo el Mercosur y te responde al instante."*

### Ejecutado en esta pasada
- ✅ #1 StreamingMarkdown (reveal bloque por bloque + cursor, respeta reduced-motion, no rompe citas) · ✅ #2 Empty state reforzado
- (#3/#4 anotados para la próxima pasada)

---

## 📡 Radar — `/radar`

🎯 **Job-to-be-done:** ver de un vistazo qué se movió en la normativa que me importa, filtrar a lo relevante y abrir lo que necesito — sin ahogarme en 1.700 normas.
👤 **Usuario + momento:** legislador escaneando novedades, varias veces/semana, buscando lo de su comisión/tema.
📍 **Rol en el producto:** la **pantalla de trabajo central** — donde pasa más tiempo. Densa.

### Estado actual (honesto)
- **Funcional:** Pulso de hoy (3 cards), filtros con contadores, búsqueda, vistas (lista/timeline/redes), export, cards ricas. Muy completo.
- **Diseño:** denso pero ordenado.
- **Veredicto:** **4/5.** Potente, pero (a) el "Pulso de hoy" tenía un contador en 0 y los mismos problemas de robustez que Inicio, y (b) **la lista era un muro de portugués** — pésimo para un producto en español.

### Diagnóstico PM
- ✅ **Fortalezas:** densidad útil, filtros con contadores, Pulso accionable, cards con relevancia + fuente + excerpt real.
- ⚠️ **Gaps funcionales:** "Recién sancionadas" en 0 (ventana de 7 días, casi siempre vacía) e inconsistente con el preset que linkea (30 días).
- 🎨 **Gaps de diseño/UX:** títulos de la lista en **portugués crudo**; números del Pulso estáticos y volátiles (caían a 0 al refrescar).
- 💰 **Gaps de valor (demo/wow):** un legislador hispanohablante ve una pared de PT y números que parpadean → no se siente premium ni confiable.

### Plan de la página (priorizado)
| # | Mejora | Tipo | Impacto | Esfuerzo | Cuándo |
|---|--------|------|---------|----------|--------|
| 1 | **Lista en español** (Spanish-first): título traducido como principal, original en el hover | Valor+Diseño | **Alto** | Medio | **Ahora** |
| 2 | **Pulso robusto**: count-up + high-water (nunca cae/0) + ventana de 30 días alineada con el preset | Valor+Diseño | **Alto** | Bajo | **Ahora** |
| 3 | **Diccionario PT→ES ampliado** (Deliberação, Discussão, Aprovada, Redação, Parecer…) → mejora Pulso, Home y Asistente | Valor | Medio | Bajo | **Ahora** |
| 4 | Reconciliar Pulso vs chips (mismos rótulos, números distintos) | Confianza | Medio | Medio | Próximo |
| 5 | Densidad: modo "compacto" más accesible / agrupar por relevancia | Diseño | Medio | Medio | Visión |

### North Star de la página
> *"Abrís el Radar y en español, de un vistazo, ves el pulso del día (qué se sancionó, qué se vota, qué cruza fronteras) y una lista limpia y escaneables de lo que te importa — sin una palabra de portugués crudo ni un número que parpadee."*

### Ejecutado en esta pasada
- ✅ #1 Lista Spanish-first (RadarSmartCard: `cleanTitle` traducido como título, original en hover; sin PT crudo en 50/50 cards)
- ✅ #2 Pulso con count-up + high-water + ventana 30 días → **27 · 44 · 855** (antes 0 · 44 · 855)
- ✅ #3 Diccionario PT→ES ampliado (20+ términos) · previews del Pulso 100% en español
- (#4/#5 anotados)

---

## 📜 Leyes — `/leyes`

🎯 **Job-to-be-done:** encontrar una ley, entenderla rápido (qué hace, en qué estado está, qué la cita, jurisprudencia) y poder "hablar" con ella vía el Asistente.
👤 **Usuario + momento:** legislador/asesor investigando una norma puntual o el ecosistema alrededor.
📍 **Rol en el producto:** la **pantalla de contenido profundo** — el "expediente" de cada ley.

### Estado actual (honesto)
- **Funcional:** lista dos-paneles con tabs/búsqueda/filtros de estado; detalle riquísimo (Genealogía, Equivalente regional, Articulado, Tramitación, Impacto fiscal, Modificatorias, Quién la cita, Jurisprudencia, Mis notas) + "hablar con la ley".
- **Diseño:** denso, dos paneles, con TOC sticky.
- **Veredicto:** **4/5.** Ya saneada en la ronda de auditoría (oculta boilerplate scrapeado, articulado placeholder y "resumen ejecutivo" equivocado; header honesto; responsive mobile arreglado). Faltaba el pulido premium + consistencia con Radar.

### Diagnóstico PM
- ✅ **Fortalezas:** profundidad enorme (11 secciones), filtros por estado con color, comparador, "hablar con la ley" (diferenciador), corpus mayormente en español (UY/AR/CO).
- ⚠️ **Gaps:** el contador "730 leyes" estático; títulos de leyes BR (las pocas que hay) en portugués → inconsistente con la lista del Radar ya en español.
- 💰 **Demo/wow:** la profundidad ya impresiona; faltaba que el número "respire" y que todo lea en español.

### Plan de la página (priorizado)
| # | Mejora | Tipo | Impacto | Esfuerzo | Cuándo |
|---|--------|------|---------|----------|--------|
| 1 | **Spanish-first** en títulos de lista y detalle (cleanTitle) — consistencia con Radar | Valor+Diseño | Medio | Bajo | **Ahora** |
| 2 | **Count-up** en el contador de leyes (header + tab "Todas") | Diseño | Bajo | Bajo | **Ahora** |
| 3 | Hero del detalle más premium (vigencia + genealogía con más jerarquía) | Diseño | Medio | Medio | Próximo |
| 4 | "Ley · LEY No. …" → limpiar prefijo redundante en títulos COL | Microcopy | Bajo | Bajo | Próximo |
| 5 | Articulado/contenido real (texto íntegro) | Datos | Alto | Alto | Producción |

### North Star de la página
> *"Buscás una ley y en un panel se te abre su expediente completo en español — qué hace, en qué estado está, quién la cita, qué jurisprudencia la aplica — y podés preguntarle lo que quieras al Asistente."*

### Ejecutado en esta pasada
- ✅ #1 Spanish-first (cleanTitle en título de card + detalle) · ✅ #2 Count-up en "730 leyes" + tab
- (#3/#4 anotados · #5 = producción)

---

> _Próximas páginas (mismo molde): Briefing · Estadísticas · Biblioteca · Mi carpeta · Perfil · (acceso/onboarding)._
