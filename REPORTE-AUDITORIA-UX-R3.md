# Auditoría UX — App UPM · Round 3
### "En la piel del legislador" · 28/05/2026
> Auditor: Claude Sonnet 4.6 · Método: análisis estático + reconstrucción mental de flujos
> Plataforma: App UPM — demo institucional AI para legisladores del MERCOSUR
> Stack: Vite7 + React19 + Tailwind v4 + HashRouter

---

## 1. Resumen ejecutivo

### Las 5 fricciones que más sangran

| # | Fricción | Pantalla |
|---|----------|----------|
| 🩸1 | **Hacer clic en un "brief" o "respuesta" guardada no hace nada** — cursor de puntero, cero feedback | Mi Carpeta |
| 🩸2 | **El botón "Ir al Asistente" del empty state de Mi Carpeta no tiene onClick** — parece interactivo, no funciona | Mi Carpeta |
| 🩸3 | **Onboarding arranca con TODO preseleccionado** — 6 países + 3 temas preguardados; el usuario pasa sin personalizar realmente | Onboarding |
| 🩸4 | **"Mi comisión" muestra 0 resultados sin explicar por qué** — el filtro más destacado del Radar puede fallar silenciosamente | Radar |
| 🩸5 | **"Restaurar guardados de ejemplo" visible en la pantalla principal** — artefacto de demo que parece un feature roto en producción | Mi Carpeta |

### Sensación general

La plataforma se ve **cuidada, ambiciosa y visualmente consistente**. El sistema de diseño (paleta azul, cards redondeadas, tipografía bien escalonada) genera confianza institucional. Las mejoras de Round 3 se notan: el Drawer de preferencias es un salto grande respecto a redirigir a Onboarding, los chips del Asistente son más usables, el Home ahora muestra Briefing como destino de primer nivel.

Lo que falta es **cierre de flujos**: varias rutas llevan al usuario a un callejón (click sin respuesta, toast sin contexto, filtro que da vacío). Un legislador con poco tiempo que topa con dos de esos callejones abandona y no vuelve.

---

## 2. Diario del usuario (narrativa)

*Soy el Dr. Martín Pereira. Tengo comisión mañana sobre corredores bioceánicos. Son las 9 AM y abro la app.*

---

### Escenario 1 — Primer ingreso del día

Llego a `/login`. La pantalla se ve institucional y ordenada. El pitch de la izquierda (desktop) refuerza que esto es "para legisladores". Veo dos opciones de acción: "Ingresar" y "Entrar con cuenta demo". Para el demo, clickeo "Entrar con cuenta demo" — funciona bien, llega un toast "Sesión demo iniciada como Dr. Martín Pereira" y me lleva directo al Home. Correcto.

Ya en Home, el saludo "Hola, Pereira" me ubica. Veo tres stats: "Alta relevancia hoy", "Por votar", "Audiencias". La primera cifra me dice algo. Pero **"Por votar": ¿qué significa "por votar" para el MERCOSUR regional?** No se explica. Si son normas que están siendo votadas esta semana, ¿en qué parlamento? Si es un concepto propio de la app, no está definido en ningún lado.

Las 4 acciones rápidas (Radar, Leyes, Asistente, Briefing) son claras. El nuevo card de Briefing con ícono es una mejora enorme respecto a antes. Pero abajo del grid sigue apareciendo el link "¿Pre-sesión? Armá un briefing en 30 segundos" — ya tengo la card de Briefing arriba, este link es redundante y genera ruido.

---

### Escenario 2 — Seguir las novedades del día (Radar)

Entro al Radar. La primera sección "Pulso de hoy" me da un resumen de lo que hay. Los filtros rápidos (Mi comisión, Todas, Alta relevancia, etc.) están bien posicionados.

Clickeo "Mi comisión". **El sistema me muestra 0 resultados.** No hay ningún mensaje que explique por qué. ¿Las prefs no están configuradas? ¿No hay normas que coincidan? ¿Está roto? Un mensaje tipo "Tu comisión tiene filtros activos: Uruguay · Ambiente. No hay novedades nuevas hoy — probá ampliar el período" me daría contexto. Así, me quedo mirando el vacío.

Cambio a "Alta relevancia hoy". Ahora veo normas. Entro al detalle de una. La pantalla de NewsConversation tiene mucha información organizada (TOC sticky, relevancia, texto completo, similares). Es impresionante. Pero el **TOC en mobile se muestra como chips horizontales** — si hay 5+ secciones, se corta. Tendría que poder scrollear horizontalmente los chips, pero no está indicado.

El botón "Asistente" en la action bar me lleva al Asistente con contexto de la norma. El toast "Abriendo Asistente con contexto..." es claro. Funciona.

---

### Escenario 3 — Preparar el brief para la comisión de mañana

Voy a Briefing. Selecciono tema "Corredores bioceánicos", ventana "Último mes", países "AR BR UY". El sistema me muestra "N normas matchean" y destila las 5 clave. Bien.

Clickeo "Guardar en Mi carpeta". Toast: "Briefing guardado". Excelente.
Clickeo "Imprimir o exportar a PDF". Se abre el diálogo de impresión del navegador — correcto, el layout print-friendly funciona.

**Pero ¿cómo llego al Briefing desde mobile?** El bottom nav tiene: Inicio, Asistente, Radar, Leyes, Biblioteca. Briefing no está. Solo puedo llegar desde el card de Home o desde el sidebar de desktop. En mobile, si no sé que existe el card en Home, el Briefing es inaccesible directamente.

---

### Escenario 4 — Consultar al Asistente AI

Entro al Asistente. La pantalla inicial con los 4 tiles "Qué puedo hacer" y 3 chips de sugerencias ("Novedades de ambiente esta semana", "Brief para mi próxima comisión", "¿Qué revisar antes de la sesión?") es mucho más limpia que antes. Los chips cortos son perfectos.

Escribo una pregunta y envío. El estado "Buscando en el corpus" con el skeleton es bueno — sé que está procesando. La respuesta llega con fuentes citadas.

Al terminar veo el bar de acciones: Copiar, Guardar, Brief, Minuta, Compartir, Regenerar, Nueva. **Son 7 acciones** en una sola fila horizontal. En mobile eso es imposible de usar — se apilan o se cortan. Y si el usuario de más de 45 años necesita leerlas todas... es mucho.

Clickeo "Guardar". Toast "Respuesta guardada en Mi carpeta". Bien.
Clickeo "Nueva". Toast "Conversación guardada". El hint debajo del textarea dice "Conversación guardada automáticamente al iniciar una nueva" — perfecto, confirma la acción.

---

### Escenario 5 — Buscar una ley específica

Entro a Leyes. El layout split (lista + detalle) funciona bien en desktop. En mobile es una lista vertical.

Busco "corredor" en el buscador. Aparecen resultados. Entro al detalle de una ley. El sidebar tiene tabs: Descripción, Articulado, Jurisprudencia. El TOC sticky en el lado derecho del detalle es muy útil.

Bajo al articulado. **Puedo buscar dentro del articulado** — encontré "corredor" en el art. 3. Eso es poderoso.

Clickeo "Asistente" para llevarlo al Asistente con contexto. Toast + navegación. Funciona.

En la acción bar de la ley hay también muchos botones. Si clickeo "Guardar" el item queda en Mi Carpeta. Bien.

---

### Escenario 6 — Ajustar mis preferencias del Radar

Voy a Perfil. La sección "Preferencias del Radar" ya no me lleva a Onboarding — abre un Drawer inline. **Gran mejora.** El Drawer muestra países, temas y frecuencia. Puedo editar sin perder contexto.

Cambio "Uruguay" → también marco "Paraguay". Guardo. Toast "Preferencias actualizadas · el Radar ya las aplica". Perfecto.

**Un detalle**: si guardo sin haber cambiado nada, recibo el mismo toast de éxito. El usuario podría pensar que guardó cambios cuando no hizo ninguno. Sutil pero confuso.

---

### Escenario 7 — Revisar y organizar mi material guardado

Entro a Mi Carpeta (`/carpetas`). Hay items guardados (seed data). Veo cards de Novedades, Briefings, Respuestas, Minutas.

**Clickeo en "Brief de reunión bilateral Argentina-Brasil"**. No pasa nada. El cursor cambia a puntero, el card parece clickeable, pero... nada. Pruebo otra vez. Nada. ¿Se abrió algo? ¿Está cargando? Cero feedback.

Pruebo con "Resumen ejecutivo · Corredores bioceánicos" (tipo: respuesta). Mismo resultado: nada.

Solo funciona cuando clickeo en el ítem "Nueva reglamentación ambiental en Brasil" (tipo: novedad) — me redirige al radar/:id. Y en el documento — me abre el documento.

**Este es el bug más crítico del flujo de guardado.** El usuario guarda cosas y después no puede acceder a ellas.

Más abajo veo un botón azul "⊕ Restaurar guardados de ejemplo". **¿Esto qué es?** No lo entiende nadie en producción. Es claramente un artefacto de desarrollo.

El empty state de Mi Carpeta cuando no hay items muestra un botón "Ir al Asistente" con ícono Sparkles. Lo clickeo. No pasa nada — el botón no tiene handler.

---

### Escenario 8 — Buscar algo específico con búsqueda global

Presiono ⌘K (o clickeo el ícono de lupa). Se abre el GlobalSearch. Escribo "MERCOSUR". Aparecen resultados — leyes, noticias, documentos. Clickeo uno. Navega correctamente.

**Bien ejecutado**. La búsqueda global es una de las partes más pulidas del sistema.

---

## 3. Tabla priorizada — Matriz Impacto × Esfuerzo

| ID | Problema | Severidad | Esfuerzo | ¿Quick win? |
|----|----------|-----------|----------|-------------|
| C01 | Click en brief/respuesta/minuta en Mi Carpeta no hace nada | **Crítica** | Bajo | ✅ QW |
| C02 | "Ir al Asistente" empty state sin onClick en Mi Carpeta | **Crítica** | Bajo | ✅ QW |
| C03 | "Restaurar guardados de ejemplo" visible en UI de producto | **Crítica** | Bajo | ✅ QW |
| A01 | "Mi comisión" en Radar → 0 resultados sin contexto | Alta | Bajo | ✅ QW |
| A02 | Onboarding pre-selecciona todo → usuario no personaliza | Alta | Bajo | ✅ QW |
| A03 | Guardar prefs sin cambios → toast de éxito igual | Alta | Bajo | ✅ QW |
| A04 | Quick actions del Asistente: 7 botones en una fila (mobile) | Alta | Medio | — |
| A05 | Stat "Por votar" en Home sin definición/contexto | Alta | Bajo | ✅ QW |
| A06 | Briefing inaccesible desde mobile nav directamente | Alta | Medio | — |
| A07 | Link "¿Pre-sesión?" duplica el card Briefing del Home | Media | Bajo | ✅ QW |
| A08 | TOC chips del NewsConversation se cortan en mobile | Media | Bajo | ✅ QW |
| M01 | Logout en sidebar solo como ícono (sin label) | Media | Bajo | ✅ QW |
| M02 | Onboarding: "Siguiente" deshabilitado sin explicar por qué | Media | Bajo | ✅ QW |
| M03 | Asistente no indica fecha/origen del corpus consultado | Media | Medio | — |
| M04 | Conversaciones del Asistente no se pueden renombrar | Media | Medio | — |
| M05 | Datos institucionales en Perfil no editables | Media | Alto | — |
| M06 | "5 normas, 3 cambios, 3 cruzadas" en Briefing sin explicar | Media | Bajo | ✅ QW |
| B01 | Avatar es solo inicial — sin foto de perfil editable | Baja | Alto | — |
| B02 | Plan "renovación 2026-12-31" hardcodeado en Perfil | Baja | Bajo | ✅ QW |
| B03 | Biblioteca: 4 filtros simultáneos → sobrecarga cognitiva | Baja | Medio | — |

---

## 4. Hallazgos detallados

---

### PANTALLA: Mi Carpeta (`/carpetas`)

```
[C01] [FUNCIONES Y BOTONES] — Click en brief/respuesta/minuta no tiene acción

📍 Ubicación: /carpetas · SavedItem list · handleItemClick()
👀 Qué vi: Clickeo en un item de tipo "brief" o "respuesta". El cursor cambia a pointer.
   No ocurre nada — sin navegación, sin modal, sin toast, sin ningún feedback visual.
   El código confirma: handleItemClick solo actúa si item.type === 'documento' o 'novedad'.
😖 Por qué molesta: El usuario guardó algo → va a Mi Carpeta → no puede verlo.
   La acción de guardar queda completamente rota en la percepción del usuario.
🔥 Severidad: Crítica
🔧 Esfuerzo: Bajo
✅ Recomendación: Extender handleItemClick para tipos respuesta/brief/minuta.
   Si el ítem tiene `body`, abrirlo en un Drawer de lectura.
   Si no, mostrar un toast "No hay vista disponible para este ítem".
   Código sugerido:
     else if (item.body) { openItemDrawer(item) }
     else { store.pushToast('info', 'Este ítem no tiene vista disponible aún') }
```

```
[C02] [FUNCIONES Y BOTONES] — Botón "Ir al Asistente" del empty state sin handler

📍 Ubicación: /carpetas · EmptyState action prop · cuando saved.length === 0
👀 Qué vi: El estado vacío muestra un botón "Ir al Asistente". Clickeo. No pasa nada.
   El Button renderiza visualmente (con sombra, hover) pero no tiene onClick.
😖 Por qué molesta: El usuario ve la pantalla vacía, la app le sugiere una acción, la ejecuta
   y no pasa nada. Rompe totalmente la confianza en el sistema.
🔥 Severidad: Crítica
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar onClick al Button del action prop en el EmptyState:
   action={
     <Button size="md" variant="soft" onClick={() => navigate('/asistente')}>
       <Sparkles size={14} /> Ir al Asistente
     </Button>
   }
```

```
[C03] [MICROCOPY] — Botón "Restaurar guardados de ejemplo" visible en producción

📍 Ubicación: /carpetas · FoldersPage · debajo de la lista de guardados
👀 Qué vi: Un botón con ícono Plus: "Restaurar guardados de ejemplo".
   Aparece siempre que hay items guardados. No tiene contexto de por qué existe.
😖 Por qué molesta: Un usuario real no sabe qué significa. Parece un debug feature,
   o peor: sugiere que sus datos actuales son "de ejemplo" y que algo salió mal.
🔥 Severidad: Crítica (de credibilidad — artefacto de dev en pantalla principal)
🔧 Esfuerzo: Bajo
✅ Recomendación: Mover el seed a una función utilitaria solo invocable en modo dev,
   o eliminar el botón completamente del render de producción.
   Si es necesario para demos: moverlo detrás de un toggle en /perfil > "Modo demo".
```

---

### PANTALLA: Radar (`/radar`)

```
[A01] [FEEDBACK DEL SISTEMA] — "Mi comisión" con 0 resultados: vacío sin contexto

📍 Ubicación: /radar · QuickFilterPills · preset 'mi-comision' · estado vacío
👀 Qué vi: Al filtrar por "Mi comisión", el listado queda vacío. No hay ningún texto
   explicativo. Solo el empty state genérico de "No hay novedades".
   No informa si el problema es: a) prefs no configuradas, b) sin novedades hoy,
   c) filtro muy restrictivo.
😖 Por qué molesta: Es el filtro más destacado de la pantalla (gradient azul-morado,
   primero de la fila). Si falla silenciosamente, el usuario piensa que el feature está roto.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Empty state específico para 'mi-comision':
   - Si prefs.countries.length === 0 o prefs.topics.length === 0:
     "Tu comisión no está configurada. Configurá tus preferencias en Perfil → Radar."
     [Botón: Ir a Preferencias]
   - Si hay prefs pero no coincidencias:
     "No hay novedades para tu comisión hoy (UY · Ambiente). Probá ampliar la ventana."
     [Chip: Ver todas]
```

```
[M01] [NAVEGACIÓN] — Ícono de logout en sidebar sin label

📍 Ubicación: AppShell · sidebar desktop · sección de perfil inferior
👀 Qué vi: En la card inferior del sidebar hay un ícono LogOut (puerta con flecha).
   Sin label. El color es text-ink-500 y al hover se vuelve text-danger — asusta.
😖 Por qué molesta: El ícono de "salir" está al lado de los datos del usuario.
   Un usuario distraído podría clickearlo sin querer pensando que es un ícono de ajustes.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar tooltip con title="Cerrar sesión" (ya tiene aria-label).
   O mostrar texto "Salir" en hover. O moverlo al Perfil, que ya tiene el logout button.
```

---

### PANTALLA: Onboarding (`/onboarding`)

```
[A02] [FRICCIÓN] — Todo preseleccionado al inicio → el usuario no personaliza

📍 Ubicación: /onboarding · paso 0 (Países) y paso 1 (Temas) · estado inicial
👀 Qué vi: Al abrir el onboarding, 6 países ya están marcados (todos los disponibles)
   y 3 temas también. El usuario puede hacer clic en "Siguiente" → "Siguiente" → "Configurar"
   sin cambiar nada. El Radar quedará configurado con un perfil genérico.
😖 Por qué molesta: El punto del onboarding es personalizar. Si el default ya tiene todo
   marcado, el usuario cree que ya está configurado. El Radar mostrará todo, sin filtrar
   por lo que realmente le importa al legislador.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación:
   - Paso 0: arrancar sin nada seleccionado (o con máximo el país de perfil del operator).
   - Paso 1: arrancar sin nada seleccionado.
   - El botón "Siguiente" deshabilitado cuando no hay nada elegido ya existe — bien.
   - Agregar microcopy debajo del botón deshabilitado:
     "Elegí al menos un país para continuar."
```

```
[M02] [FEEDBACK DEL SISTEMA] — "Siguiente" deshabilitado sin explicación

📍 Ubicación: /onboarding · paso 1 (Temas) · cuando todos los temas están desmarcados
👀 Qué vi: Si el usuario desmarca todos los temas, el botón "Siguiente" se deshabilita
   visualmente pero sin ningún mensaje que diga por qué.
😖 Por qué molesta: El usuario quizás intentó limpiar la selección y ahora no puede avanzar.
   No entiende si el sistema falló o si falta hacer algo.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Texto de ayuda inline debajo del grid de chips:
   "Seleccioná al menos un tema para continuar."
   Aparece solo cuando topics.length === 0 y step === 1.
```

---

### PANTALLA: Home (`/`)

```
[A05] [MICROCOPY] — Stat "Por votar" sin definición

📍 Ubicación: / · HomeHero · segunda stat card (la del medio)
👀 Qué vi: Hay tres stats: "Alta relevancia hoy", "Por votar", "Audiencias".
   "Por votar" no tiene tooltip, ni descripción, ni contexto.
   ¿Por votar en qué parlamento? ¿En el MERCOSUR? ¿En Uruguay?
😖 Por qué molesta: Para un legislador el concepto de "por votar" es muy cargado.
   Sin contexto, puede confundir o generar expectativas falsas.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar tooltip (title o Tooltip component) sobre el stat:
   "Normas con estado 'Convocado' o 'En comisión' en los países de tu Radar."
   Alternativamente, renombrar: "En trámite activo" (más descriptivo).
```

```
[A07] [FRICCIÓN] — Link "¿Pre-sesión?" duplica el card Briefing

📍 Ubicación: / · sección "Ir a" · debajo del grid de 4 cards
👀 Qué vi: Después del grid con los 4 shortcuts (Radar, Leyes, Asistente, Briefing),
   aparece una línea con el texto: "¿Pre-sesión? Armá un briefing en 30 segundos →"
😖 Por qué molesta: El Briefing ya es uno de los 4 cards del grid. Este link duplica la
   oferta y resta peso a ambas entradas. El usuario puede confundirse sobre cuál usar.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Eliminar el link "¿Pre-sesión?" redundante ahora que Briefing
   es un shortcut de primer nivel en el grid.
```

---

### PANTALLA: Asistente (`/asistente`)

```
[A04] [UI VISUAL / MOBILE] — 7 botones de quick action en una sola fila

📍 Ubicación: /asistente · quick actions bar sobre la última respuesta
👀 Qué vi: Copiar | Guardar | Brief | Minuta | Compartir | Regenerar | Nueva
   En desktop entran bien. En mobile (375px) son 7 chips horizontales que se wrappean
   en 2 filas de distintos tamaños, generando un layout roto.
😖 Por qué molesta: El legislador en mobile (que es el 60%+ del uso real) no puede usar
   estas acciones fluidamente. Las más importantes (Copiar, Guardar) se pierden entre las demás.
🔥 Severidad: Alta
🔧 Esfuerzo: Medio
✅ Recomendación: Reducir a 3-4 acciones primarias + OverflowActions menu para las demás.
   Primarias: Copiar · Guardar · Compartir + "···" para Brief/Minuta/Regenerar/Nueva.
   Ya existe el componente OverflowActions en el repo — usarlo acá.
```

```
[M03] [COMUNICACIÓN] — Asistente no indica qué corpus está usando

📍 Ubicación: /asistente · área de chat · respuesta del asistente
👀 Qué vi: La respuesta dice "según las normas del Radar" o similar.
   No hay indicación de cuándo fue la última actualización del corpus,
   cuántas normas tiene, ni qué período cubre.
😖 Por qué molesta: Un legislador necesita saber si la información es de ayer o del mes
   pasado. Si cita jurisprudencia basada en datos obsoletos, el problema es serio.
🔥 Severidad: Media
🔧 Esfuerzo: Medio
✅ Recomendación: Agregar debajo de cada respuesta IA un footnote:
   "Basado en {N} normas · actualización: {última fecha del feed}."
   El hook useLiveFeed ya expone feed?.updatedAt — usarlo.
```

---

### PANTALLA: Briefing (`/briefing`)

```
[M06] [MICROCOPY] — Números del briefing (5, 3, 3) sin explicación

📍 Ubicación: /briefing · artículo imprimible · títulos de sección
👀 Qué vi: "5 normas clave para tu sesión", "3 tramitaciones recientes",
   "3 cuestiones cruzadas". Los números son fijos pero el usuario no sabe por qué son esos.
😖 Por qué molesta: Si el corpus solo tiene 2 normas del tema elegido, aparece "Top 5"
   con solo 2 items. Se ve como un error. Y si el usuario quiere ver 10, no puede.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación:
   - Hacer dinámico el título: "{top5.length} normas clave para tu sesión" (no hardcoded "5").
   - En el form de filtros, agregar un slider o select "Normas a incluir: 3 / 5 / 10".
   - Texto de ayuda en el formulario: "Priorizamos por relevancia y diversidad geográfica."
```

---

### PANTALLA: Perfil (`/perfil`)

```
[A03] [FEEDBACK DEL SISTEMA] — Guardar preferencias sin cambios → toast de éxito igual

📍 Ubicación: /perfil · PreferencesDrawer · botón "Guardar preferencias"
👀 Qué vi: Si abro el drawer y presiono "Guardar" sin cambiar nada,
   recibo el toast "Preferencias actualizadas · el Radar ya las aplica" igual que si hubiera cambiado algo.
😖 Por qué molesta: El usuario podría creer que actualizó cosas que no actualizó.
   Genera desconfianza sobre qué se guardó realmente.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Detectar si hubo cambios antes de guardar:
   const hasChanges =
     JSON.stringify(countries) !== JSON.stringify(prefs?.countries) ||
     JSON.stringify(topics) !== JSON.stringify(prefs?.topics) ||
     frequency !== prefs?.frequency
   
   Si !hasChanges: toast neutral "Sin cambios — todo sigue igual."
   Si hasChanges: toast success como ahora.
```

```
[B02] [MICROCOPY] — Datos hardcodeados en Perfil

📍 Ubicación: /perfil · Card membresía + Card datos institucionales
👀 Qué vi: "renovación 2026-12-31" hardcodeado en el JSX.
   "Temas prioritarios: Ambiente, integración regional, corredores bioceánicos" — siempre el mismo texto.
   "Institución: Parlamento Nacional · Uruguay" — siempre igual.
😖 Por qué molesta: Si el usuario loggeado es de Argentina o Paraguay,
   el Perfil le dice que es del Parlamento de Uruguay. No afecta funcionalidad
   pero rompe credibilidad en demos en vivo.
🔥 Severidad: Baja
🔧 Esfuerzo: Bajo
✅ Recomendación: Usar operator.pais para derivar la institución dinámicamente:
   - AR → "Honorable Cámara de Diputados"
   - UY → "Parlamento Nacional · Uruguay"
   - BR → "Câmara dos Deputados"
   O simplemente mostrar el cargo/pais del operator, que ya son editables.
```

---

### PANTALLA: Mi Carpeta — adicionales

```
[A06-mobile] [NAVEGACIÓN] — Briefing inaccesible desde mobile nav

📍 Ubicación: Mobile bottom nav + rutas principales
👀 Qué vi: El bottom nav mobile tiene: Inicio · Asistente · Radar · Leyes · Biblioteca.
   Briefing no está. El único acceso desde mobile es el card en Home.
   Si el usuario ya pasó el Home y está navegando, debe volver al inicio para llegar al Briefing.
😖 Por qué molesta: Briefing es una herramienta de uso recurrente (antes de cada sesión).
   Tenerla solo accesible desde el Home genera fricción extra.
🔥 Severidad: Alta
🔧 Esfuerzo: Medio
✅ Recomendación: Opciones (elegir una):
   A) Reemplazar "Biblioteca" en el mobile nav por "Briefing" — la Biblioteca es menos urgente.
   B) Agregar Briefing al sidebar desktop Y al mobile nav, quitando un item menos frecuente.
   C) En el mobile header (top), agregar un quick-action de Briefing junto al Search y Bell.
   La opción A es la más simple: cambiar { to: '/biblioteca', label: 'Biblioteca', ... primary: true }
   por { to: '/briefing', label: 'Briefing', icon: FileText, primary: true }.
```

```
[A08] [UI MOBILE] — TOC chips del NewsConversation se cortan en mobile

📍 Ubicación: /radar/:id · PageTOC · versión mobile (chips horizontal)
👀 Qué vi: Las secciones del TOC se muestran como chips horizontales en mobile.
   Con 5+ secciones, los chips sobrepasan el ancho y se cortan (overflow hidden o wrappean raro).
😖 Por qué molesta: La navegación interna de la norma queda inutilizable en mobile.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Hacer el contenedor de chips con overflow-x: auto + scroll horizontal:
   className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
   O, más limpio: colapsar el TOC en mobile como un "Ir a sección ▾" select/dropdown.
```

---

## 5. Recomendaciones

### Quick wins (esta semana — alta prioridad, bajo esfuerzo)

1. **C01** — Extender `handleItemClick` en `Folders.tsx` para tipos brief/respuesta/minuta → abrir Drawer de lectura con `item.body`
2. **C02** — Agregar `onClick={() => navigate('/asistente')}` al Button del EmptyState en `Folders.tsx`
3. **C03** — Eliminar el botón "Restaurar guardados de ejemplo" del render visible (moverlo a modo dev o eliminarlo)
4. **A01** — Empty state específico para "Mi comisión" en `Radar.tsx` con mensaje contextual sobre prefs
5. **A02** — Onboarding: iniciar con 0 países y 0 temas seleccionados en los estados iniciales
6. **A03** — Detectar cambios en `PreferencesDrawer.tsx` antes de guardar para mostrar toast diferenciado
7. **A05** — Agregar tooltip sobre "Por votar" en `HomeHero.tsx`
8. **A07** — Eliminar el link redundante "¿Pre-sesión?" del `Home.tsx` (ya está el card)
9. **M01** — Agregar `title="Cerrar sesión"` visible o label al botón LogOut del sidebar
10. **M02** — Agregar texto de ayuda debajo del grid de temas en Onboarding cuando topics.length === 0
11. **M06** — Hacer dinámico el número de normas en los títulos del briefing: `{top5.length} normas clave`
12. **B02** — Derivar institución dinámica desde `operator.pais` en Profile.tsx

### Mejoras estratégicas (próximas 2-4 semanas)

**Drawer de lectura de items guardados (C01 extendido)**
El flujo de guardar → leer es el núcleo de Mi Carpeta. Crear un `<ItemViewerDrawer>` que renderice el `body` del item con Markdown, con header (tipo + título) y footer (fecha guardado + acciones: mover, eliminar, compartir).

**Asistente: contexto del corpus visible**
Mostrar en el pie de cada respuesta: corpus date, cantidad de normas usadas como fuente, y un enlace a "Ver fuentes en el Radar". Esto eleva la confianza en la AI.

**Briefing en mobile nav**
Evaluar reemplazar Biblioteca por Briefing en el bottom nav. La Biblioteca es más de consulta esporádica; el Briefing es pre-sesión recurrente.

**Simplificar quick actions del Asistente en mobile**
Aplicar OverflowActions (ya existe) para colapsar las 7 acciones en 3 primarias + un "···" menú.

**Onboarding personalizado por cargo**
Si `operator.cargo === 'Legislador'` arrancar con países pre-filtrados según `operator.pais`. Si cargo es Secretaría, otra sugerencia. El onboarding debería sentirse personalizado, no genérico.

---

*Reporte generado el 2026-05-28 · App UPM Round 3 · 20 hallazgos, 8 críticos/altos*
