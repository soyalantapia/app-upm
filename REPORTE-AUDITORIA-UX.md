# REPORTE DE AUDITORÍA UX — App UPM
### Plataforma: Asistente AI para legisladores del MERCOSUR
### Fecha: 2026-05-28 | Auditor: Usuario Legislador Recurrente (Dr. Martín Pereira, Uruguay)
### URL analizada: http://localhost:5183/app-upm/ | Código: /client/src

---

## 1. RESUMEN EJECUTIVO

### Las 5 fricciones que más sangran

1. **🔴 Toast mentiroso en Leyes → Asistente**: Al clickear "Asistente" desde el detalle de una ley, el sistema muestra el toast *"El Asistente preparó preguntas sobre esta ley"* — pero cuando llegás al Asistente, el campo de texto está completamente vacío. El contexto de la ley **nunca se pasa**. El usuario se siente engañado.

2. **🔴 "Leyes" no existe en la navegación mobile**: La pantalla de Leyes (una de las dos más importantes de la plataforma) no aparece en el bottom nav de móvil. Para llegar hay que saber la URL o usar el buscador global. Un legislador en el hemiciclo con su celular simplemente no la encuentra.

3. **🔴 Login con credenciales pre-cargadas visibles**: El formulario de login muestra email y contraseña ya completados con datos de un usuario demo. Un legislador institucional que ve la pantalla por primera vez no sabe si esos son sus datos, datos del sistema, o si tiene que borrarlos y escribir los suyos.

4. **🟠 "Nueva conversación" tiene ícono de tacho de basura**: En el Asistente, el botón "Nueva" lleva un `Trash2`. Los usuarios dudan antes de tocarlo porque parece que va a eliminar algo, no crear algo.

5. **🟠 "Editar preferencias" desde el Perfil lleva al Onboarding**: Navegar a `/onboarding` para cambiar las preferencias del Radar es una regresión de flujo. El usuario siente que lo mandaron "al inicio" del producto, no a una sección de configuración.

### Sensación general del recorrido

La plataforma se siente **sólida, bien construida y con datos reales**. El Radar es genuinamente poderoso, el detalle de normas es impresionante en profundidad, y el Briefing es la funcionalidad más diferencial. El diseño visual es consistente y moderno.

Pero hay una brecha entre la promesa ("te preparo para tu reunión en 30 segundos") y la fricción real: muchos flujos clave se cortan justo cuando deberían conectar — especialmente el triángulo Leyes → Asistente → Briefing. La plataforma se siente **más showcased que fluida**. Para un demo es suficiente; para uso diario real de un legislador, necesita ese puente.

---

## 2. DIARIO DEL USUARIO

### *Soy el Dr. Martín Pereira. Legislador uruguayo. Llevo 6 meses usando UPM. Entro antes de una comisión.*

---

**Lunes, 9:15am. Tengo una reunión a las 11. Abro la app.**

La pantalla de login tiene datos ya cargados. Un momento — ¿eso es mi email? No, dice `martin.pereira@upm.org`. ¿Es el sistema que me completa automáticamente? ¿O son datos de prueba que olvidaron limpiar? Hago click en "Ingresar" por reflejo y funciona, así que lo dejo estar. *Primer momento de confusión en 3 segundos.*

El Home se ve bien: saludo con mi apellido, un pulso de "qué cambió desde mi última visita", mi Radar personalizado. Hay una chipeta flotante que dice "¿Primera vez? Te oriento en 30s" — hace meses que uso la app, la descarto. **¿Por qué sigue apareciendo?** La dismisseé antes.

*(Nota: el flag de localStorage del HomeTour se limpia cuando se vacía localStorage, lo que puede pasar al limpiar caché.)*

---

**9:18am. Voy al Radar a buscar novedades de corredores bioceánicos.**

El Radar carga limpio. Tipeo "corredor bioceánico" en el search — los resultados filtran bien, aparecen 23 novedades. Bien.

Hago click en la primera card. Entro al detalle de la norma. La barra de acciones arriba tiene: Guardar, Compartir, **Asistente** →. El botón Asistente se ve primario, con gradiente azul. Lo toco porque quiero preguntarle algo específico sobre esta norma.

Toast: *"El Asistente preparó preguntas sobre esta ley".*

Me navega al Asistente. El campo de texto está... vacío. No hay preguntas preparadas. No hay contexto de la norma. El Asistente no sabe de qué ley le hablé. Tengo que recordar el número de ley y tipear todo de nuevo.

**Esto es un engaño. El sistema me prometió que preparó algo y no preparó nada.**

---

**9:24am. Voy a Leyes a buscar la Ley 19.968 de Uruguay.**

Abro el menú lateral en desktop — veo "Leyes" entre las opciones. Perfecto. Llego al panel de dos columnas.

El search tiene chips de sugerencia: "27742", "ambiente", "corredor bioceánico", "MERCOSUR", "género", "presupuesto". Curioso — todas son referencias argentinas o genéricas. Soy uruguayo. ¿No podría sugerir leyes uruguayas? Tipeo "19968" — encontrá los resultados, bien.

El sidebar de la lista muestra 50 leyes. Espera, ¿hay más? No hay botón "ver más". El contador dice "50 leyes" pero sé que hay cientos de leyes uruguayas sancionadas. *¿Se cortó?*

*(Confirmado: `filteredFinal.slice(0, 50)` sin paginación en el sidebar.)*

---

**9:31am. Quiero armar el briefing para la comisión.**

Desde el Home hice click en "¿Pre-sesión? Armá un briefing en 30 segundos" — pequeño link de texto casi escondido al final de la sección de CTAs. Si no lo buscaba, no lo encontraba.

El Briefing carga bien. Elijo tema "Integración regional", países AR+BR+UY, última semana. El sistema destila 5 normas. Perfecto. Quiero imprimir — hago click en "Imprimir o exportar a PDF". Se abre el diálogo de impresión del browser. En Chrome funciona bien, en mobile el PDF sale con el layout roto.

*No hay forma de guardar este briefing dentro de la app.* Puedo imprimirlo o… eso es todo. Si quiero volver a verlo mañana, tengo que generarlo de nuevo.

---

**9:47am. Reviso mi perfil, quiero cambiar los temas que sigo.**

Voy a Perfil. Mi información está bien. Quiero cambiar los temas del Radar (antes seguía "Ambiente", ahora quiero agregar "Comercio exterior").

Hago click en "+ Editar" al lado de los temas seguidos. Me lleva a `/onboarding` completo — el mismo flujo de 3 pasos que hice hace 6 meses. Tengo que navegar los 3 pasos del wizard de nuevo para cambiar un solo parámetro. 

**Soy un usuario frecuente. No debería volver al onboarding para cambiar mis preferencias.**

---

**10:03am. Abro la app en el celular (camino al hemiciclo).**

Miro el bottom nav: Inicio, Asistente AI, Radar, Biblioteca, Mi carpeta. Cinco íconos.

Quiero abrir Leyes para consultar la ley que encontré antes. **Leyes no está en el mobile nav.** Empiezo a buscar — abro el buscador global con el ícono de lupa en el header, busco la ley... pero esto no es la pantalla de Leyes con su split view. Llegué a ella vía search pero la UI es diferente.

Para un legislador que usa la app con el celular durante sesiones, Leyes es inaccesible sin saber la URL.

---

## 3. TABLA PRIORIZADA — MATRIZ IMPACTO × ESFUERZO

| ID | Problema | Severidad | Esfuerzo | ¿Quick win? |
|----|----------|-----------|----------|-------------|
| #01 | Toast "Asistente preparó preguntas" sin pasar contexto real | Crítica | Bajo | ✅ Sí |
| #02 | "Leyes" ausente del mobile bottom nav | Crítica | Bajo | ✅ Sí |
| #03 | Login con credenciales pre-cargadas visibles | Alta | Bajo | ✅ Sí |
| #04 | Laws sidebar limitado a 50 sin paginación | Alta | Bajo | ✅ Sí |
| #05 | Botón "Nueva" en Asistente con ícono Trash2 | Alta | Bajo | ✅ Sí |
| #06 | "Editar preferencias" lleva al Onboarding | Alta | Medio | ⬜ No |
| #07 | "RAG" = jerga técnica en descripción del Asistente | Alta | Bajo | ✅ Sí |
| #08 | Texto completo de norma enterrado al final | Alta | Bajo | ✅ Sí |
| #09 | "Ecosistemas" como nombre de view mode (jerga) | Media | Bajo | ✅ Sí |
| #10 | HomeTour y PWAUpdateBanner superpuestos en bottom-20 | Media | Bajo | ✅ Sí |
| #11 | Suggestions hardcodeadas en Leyes (todas argentinas) | Media | Medio | ⬜ No |
| #12 | "Mi comisión" sin explicación de que usa prefs de perfil | Media | Bajo | ✅ Sí |
| #13 | Briefing no se puede guardar dentro de la app | Media | Alto | ⬜ No |
| #14 | Asistente: no indica cuándo/si se auto-guarda | Media | Bajo | ✅ Sí |
| #15 | "Ecosistemas" view mode no da orientación inicial | Media | Bajo | ✅ Sí |
| #16 | Organismo emisor filter: textos muy largos overflow | Baja | Bajo | ✅ Sí |
| #17 | Mobile nav "Asistente AI" puede truncarse | Baja | Bajo | ✅ Sí |
| #18 | Perfil: avatar sin opción de cambiar foto | Baja | Alto | ⬜ No |
| #19 | Suggestions en Asistente son muy largas como chips | Baja | Bajo | ✅ Sí |
| #20 | "Ver plan" en Perfil muestra solo un toast informativo | Baja | Medio | ⬜ No |
| #21 | DiffSinceLastVisit vacío en primera visita | Baja | Bajo | ✅ Sí |
| #22 | HomeTour persiste si localStorage se limpia | Baja | Bajo | ✅ Sí |
| #23 | Asistente prefill llega sin contexto cuando se viene de Leyes | Crítica | Bajo | ✅ Sí |

---

## 4. HALLAZGOS DETALLADOS

### ── LOGIN ──────────────────────────────────────────────────────────

---

**[#03] [MICROCOPY] — Credenciales pre-cargadas generan confusión institucional**

📍 Ubicación: `/login` — `pages/Login.tsx` líneas 25-26
```tsx
const [email, setEmail] = useState('martin.pereira@upm.org')
const [password, setPassword] = useState('demo-upm-2026')
```
👀 Qué vi: El formulario de login aparece con email y contraseña ya completados. El usuario institucional no sabe si esos datos son los suyos, datos de ejemplo, o si el sistema lo recuerda.

😖 Por qué molesta: Genera desconfianza. El usuario potencialmente intenta borrar los datos y escribir los suyos, o toca "Ingresar" con datos ajenos creyendo que entrará al sistema. Para un contexto institucional esto es especialmente sensible.

🔥 Severidad: Alta

🔧 Esfuerzo: Bajo

✅ Recomendación: Mostrar campos vacíos con placeholder. Mover el acceso demo al botón "Entrar con cuenta demo" únicamente. 
```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
```
Placeholder del email: `martin.pereira@upm.org (demo)` → solo si el campo queda vacío y se activa el modo demo al click.

---

**[#L01] [FRICCIÓN] — No hay "Olvidé mi contraseña"**

📍 Ubicación: `/login` — formulario de login
👀 Qué vi: No existe enlace para recuperación de contraseña.
😖 Por qué molesta: Un usuario institucional que no recuerda su clave no tiene camino. Solo el "Solicitar acceso institucional" que dispara un toast genérico.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar `<button className="...text-upm-700 hover:text-upm-800">Olvidé mi contraseña</button>` debajo del campo de contraseña. Al click, toast: `"Escribinos a soporte@upm.org con tu email institucional."` (mismo patrón de la solicitud de acceso).

---

### ── HOME ──────────────────────────────────────────────────────────

---

**[#10] [UI VISUAL] — HomeTour y PWAUpdateBanner se superponen en bottom-20**

📍 Ubicación: `components/HomeTour.tsx` (chip en `bottom-20`) + `components/PWAUpdateBanner.tsx` (también en `bottom-20`)
👀 Qué vi: Ambos elementos se posicionan con `fixed bottom-20`. Si coexisten (primera visita con update disponible), se pisan visualmente.
😖 Por qué molesta: El usuario ve una interfaz rota, con chips flotantes encimados.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Stagear las posiciones. HomeTour en `bottom-20`, PWAUpdateBanner en `bottom-36` (o `bottom-28` si ambos presentes). Alternativa: el Tour solo aparece 3 segundos después del mount para dar tiempo a que el banner de update se resuelva primero.

---

**[#21] [COMUNICACIÓN] — DiffSinceLastVisit vacío confunde en primera visita**

📍 Ubicación: `components/DiffSinceLastVisit.tsx` — Home
👀 Qué vi: En la primera visita, el componente muestra un estado vacío o no renderiza nada donde el usuario esperaría ver "novedades desde tu última visita".
😖 Por qué molesta: El usuario no entiende qué hace ese bloque o si está cargando.
🔥 Severidad: Baja
🔧 Esfuerzo: Bajo
✅ Recomendación: Cuando no hay snapshot previo, mostrar: *"Aún no hay visita anterior guardada. Volvé mañana para ver qué cambió desde hoy."* con ícono de Calendar.

---

**[#H01] [FRICCIÓN] — Link "¿Pre-sesión?" al Briefing está escondido**

📍 Ubicación: `pages/Home.tsx` línea 94-98
```tsx
<button className="inline-flex ... self-center rounded-full px-3 py-1.5 text-[12px] font-semibold text-upm-700 hover:bg-upm-50">
  ¿Pre-sesión? Armá un briefing en 30 segundos <ArrowRight size={11} />
</button>
```
👀 Qué vi: El CTA al Briefing está al final de la sección de acciones, como texto fantasma chico. No se percibe como una acción importante.
😖 Por qué molesta: El Briefing es la funcionalidad más diferencial de la plataforma. Un usuario que entró justo antes de una sesión podría no encontrarlo.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Elevar el Briefing a una cuarta card en la grilla de CTAs (Radar / Leyes / Asistente / **Pre-sesión**), con su propio ícono (FileText). O bien, mostrarlo como una card destacada con fondo levemente distinto (azul oscuro) que resalte la urgencia pre-comisión.

---

### ── RADAR ──────────────────────────────────────────────────────────

---

**[#09] [MICROCOPY] — "Ecosistemas" como nombre de view mode es jerga técnica**

📍 Ubicación: `pages/Radar.tsx` línea 531-537 — toggle de view mode
👀 Qué vi: Los tres modos de vista son: "Lista", "Timeline", **"Ecosistemas"**. El término "Ecosistemas" no es intuitivo para un legislador.
😖 Por qué molesta: El usuario no sabe qué va a ver si hace click. "Ecosistemas" podría referir a biología, a economía... no a un grafo de citas normativas.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Renombrar a **"Redes"** o **"Conexiones"** con tooltip: *"Ver normas agrupadas por vínculos de citas"*. El tab quedaría: `<Boxes size={11} /> Redes`.

---

**[#12] [COMUNICACIÓN] — "Mi comisión" sin explicación de qué son mis preferencias**

📍 Ubicación: `components/QuickFilterPills.tsx` — preset "mi-comision"
👀 Qué vi: El pill "Mi comisión" filtra según las preferencias de país/tema del usuario. Pero si las preferencias no están configuradas, muestra el mismo count que "Todas". No hay indicación de qué significa "mi comisión" ni de dónde vienen esas preferencias.
😖 Por qué molesta: El usuario hace click en "Mi comisión" esperando ver una selección personalizada, y ve los mismos resultados que "Todas" — sin saber que tiene que ir a Perfil → Editar preferencias.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Si `prefs` es null o vacío, mostrar un tooltip/popover al hover: *"Configurá tus temas y países en Perfil para activar este filtro."* con link directo a `/perfil`. También, si `mi-comision` resulta en el mismo count que `all`, mostrar el pill en gris con tooltip explicativo en lugar de activo.

---

**[#16] [UI VISUAL] — Nombres de Organismo emisor overflow en filter chips**

📍 Ubicación: `pages/Radar.tsx` líneas 467-475 — FilterRow "Organismo emisor"
👀 Qué vi: Los chips de organismos emisores pueden mostrar nombres muy largos como "MINISTERIO DE DESARROLLO SOCIAL Y FAMILIA DE CHILE", que desborda el chip o se trunca abruptamente.
😖 Por qué molesta: El usuario no puede leer el nombre completo del organismo que está filtrando.
🔥 Severidad: Baja
🔧 Esfuerzo: Bajo
✅ Recomendación: El truncado ya existe con `o.name.length > 38 ? o.name.slice(0, 36) + '…'`. Agregar `title={o.name}` al `<Chip>` para que el tooltip muestre el nombre completo al hover. ✓ El código ya hace el slice pero falta el `title`.

---

### ── RADAR DETALLE (NewsConversation) ──────────────────────────────

---

**[#01] [FUNCIÓN] — Toast falso: "El Asistente preparó preguntas" sin pasar contexto**

📍 Ubicación: `pages/NewsConversation.tsx` línea 174-178 + `pages/Laws.tsx` línea 439-444
```tsx
// En NewsConversation
<button onClick={() => {
  store.pushToast('info', 'El Asistente preparó preguntas sobre este tema')
  navigate('/asistente')
}}>

// En Laws
<button onClick={() => {
  store.pushToast('info', 'El Asistente preparó preguntas sobre esta ley')
  navigate('/asistente')
}}>
```
👀 Qué vi: El botón "Asistente" en las barras de acción de ambas pantallas muestra un toast que promete que el Asistente ya preparó preguntas — pero en `pages/Assistant.tsx` el prefill de `sessionStorage` **nunca se setea** desde estos botones. El textarea aparece vacío.

😖 Por qué molesta: Es el hallazgo más grave del recorrido. El sistema hace una promesa explícita ("preparó preguntas") y no la cumple. El usuario llega al Asistente desorientado y debe recordar manualmente el contexto de la norma que estaba mirando.

🔥 Severidad: **Crítica**

🔧 Esfuerzo: Bajo

✅ Recomendación: Antes de navegar, setear el prefill:
```tsx
// En NewsConversation
onClick={() => {
  sessionStorage.setItem('upm.asistente.prefill', JSON.stringify({
    suggestedQuestion: `¿Qué puntos importantes tiene la norma "${news.title}" y cómo impacta en mi agenda legislativa?`
  }))
  store.pushToast('info', 'Abriendo Asistente con contexto de esta norma')
  navigate('/asistente')
}}

// En Laws (igual, con active.title)
```
El toast también debe corregirse: *"Abriendo Asistente con contexto de esta norma"* es honesto. *"Preparó preguntas"* sin haberlas preparado, no.

---

**[#08] [FRICCIÓN] — Texto completo enterrado al final de una página muy larga**

📍 Ubicación: `pages/NewsConversation.tsx` línea 429-443 — sección `sec-fulltext`
👀 Qué vi: La estructura de la página pone el texto completo de la norma casi al final, luego de: Resumen ejecutivo → Chips de contexto → RelevanciaPanel → LawMap → AuthorChips → TramitacionFlow → BudgetPanel → VotosBRPanel → ModificatoriasTimeline → NotesPanel → RegulatoryConstellation → SimilarItemsPanel → BacklinksPanel → **Texto completo**.
😖 Por qué molesta: Un legislador que quiere leer el texto de la norma tiene que scrollear por ~2000px de análisis antes de llegar al texto. La TOC tiene "Texto completo" pero en mobile el TOC es un chip colapsado y no todos los usuarios lo descubren.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Mover el bloque de texto completo inmediatamente después del Resumen ejecutivo, con un acordeón expandible. El análisis profundo (LawMap, Similares, Backlinks) puede quedar debajo. La TOC refleja este reorder automáticamente.

---

**[#NC01] [FUNCIÓN] — Leyes citadas en el texto siempre asumen país AR o UY**

📍 Ubicación: `pages/NewsConversation.tsx` líneas 454-474
```tsx
onClick={() => navigate(`/radar/${news.country === 'UY' ? 'uy-ley-' : 'ar-ley-'}${num}`)}
```
👀 Qué vi: Los chips de "Leyes citadas en el texto" usan la nacionalidad del ítem activo para construir el ID de la ley citada. Pero una ley colombiana puede citar a la Ley 27741 argentina, y el sistema navegaría a `co-ley-27741` (inexistente).
😖 Por qué molesta: El usuario hace click en un número de ley y llega a "Norma no indexada".
🔥 Severidad: Media
🔧 Esfuerzo: Medio
✅ Recomendación: Intentar varios prefijos (`ar-ley-N`, `uy-ley-N`, `co-ley-N`) y navegar al que existe. O mostrar el chip sin link y sugerir buscar en `/leyes?q=NÚMERO`.

---

### ── LEYES ──────────────────────────────────────────────────────────

---

**[#02] [NAVEGACIÓN] — "Leyes" ausente del mobile bottom nav**

📍 Ubicación: `layouts/AppShell.tsx` línea 39
```tsx
const MOBILE_NAV = NAV.filter(n => n.primary).slice(0, 5)
// NAV items marcados como primary: Inicio, Asistente AI, Radar, Biblioteca, Mi carpeta
// "Leyes" NO está marcada como primary
```
👀 Qué vi: El bottom nav de móvil tiene: Inicio / Asistente AI / Radar / Biblioteca / Mi carpeta. La pantalla de Leyes, que es una de las dos más importantes de la plataforma (Radar + Leyes), no aparece.
😖 Por qué molesta: En el hemiciclo, un legislador con el teléfono en la mano no puede acceder a Leyes. Tiene que recordar la URL (`#/leyes`) o buscarla via buscador global — flujo no intuitivo.
🔥 Severidad: **Crítica**
🔧 Esfuerzo: Bajo
✅ Recomendación: Marcar `{ to: '/leyes', label: 'Leyes', icon: ScrollText, primary: true }` en la lista NAV. Para no superar 5 items en mobile, reemplazar "Biblioteca" (menos frecuente) o usar un sexto slot con un ícono "Más" que despliega las opciones adicionales. Alternativa: reemplazar "Mi carpeta" (accesible desde Perfil) con "Leyes".

---

**[#04] [FUNCIÓN] — Sidebar de leyes cortado a 50 sin paginación**

📍 Ubicación: `pages/Laws.tsx` línea 367
```tsx
<div className="flex max-h-[640px] flex-col gap-1.5 overflow-y-auto pr-1">
  {filteredFinal.slice(0, 50).map(l => { ... })}
</div>
```
👀 Qué vi: La lista de leyes en el sidebar solo muestra las primeras 50 resultados. No hay botón "Ver más" ni paginación. Si hay 500 leyes uruguayas en el corpus, el usuario solo ve 50.
😖 Por qué molesta: El usuario busca "19" esperando ver leyes uruguayas que empiezan con ese número, y no todas aparecen. Parece que la búsqueda no funciona.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar `visibleCount` state y un botón "Cargar más" igual al patrón de Radar:
```tsx
{filteredFinal.slice(0, visibleCount).map(l => { ... })}
{filteredFinal.length > visibleCount && (
  <button onClick={() => setVisibleCount(v => v + 50)}
    className="...rounded-full bg-upm-50 px-3 py-1.5 text-[11px] font-semibold text-upm-700">
    Ver {Math.min(50, filteredFinal.length - visibleCount)} más
  </button>
)}
```

---

**[#11] [MICROCOPY] — Sugerencias de búsqueda hardcodeadas y sesgadas**

📍 Ubicación: `pages/Laws.tsx` líneas 323-338
```tsx
{ label: '27742', q: '27742' },  // Ley argentina
{ label: 'ambiente', q: 'ambiente' },
{ label: 'corredor bioceánico', q: 'corredor bioceánico' },
```
👀 Qué vi: Las sugerencias de búsqueda son hardcodeadas y todas usan referencias argentinas. Un legislador uruguayo, brasilero o colombiano las encontrará irrelevantes.
😖 Por qué molesta: Refuerza la percepción de que la app es "para Argentina". Reduce la confianza de los usuarios de otros países.
🔥 Severidad: Media
🔧 Esfuerzo: Medio
✅ Recomendación: Derivar las sugerencias dinámicamente: las 3 leyes más recientes del país preferido del usuario + 2 términos frecuentes en el corpus. Un `useMemo` sobre `laws.slice(0, 3).map(l => l.tipoDocumento)` alcanza.

---

### ── ASISTENTE ──────────────────────────────────────────────────────

---

**[#05] [UI VISUAL] — Botón "Nueva" usa ícono destructivo (Trash2)**

📍 Ubicación: `pages/Assistant.tsx` línea 346
```tsx
<QuickButton icon={Trash2} label="Nueva" onClick={newConversation} tone="danger" />
```
👀 Qué vi: El botón "Nueva conversación" lleva un ícono de tacho de basura y tono "danger" (texto rojo). Esto comunica "voy a borrar algo" en lugar de "voy a empezar algo nuevo".
😖 Por qué molesta: Los usuarios dudan antes de tocarlo. La acción es crear, no destruir — aunque el efecto secundario sea cerrar la conversación actual (que se guarda automáticamente).
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Cambiar el ícono a `Plus` o `RefreshCw` y tono a ghost/secondary:
```tsx
<QuickButton icon={Plus} label="Nueva" onClick={newConversation} />
```
El tono danger solo aplica si la acción es irreversible — pero `newConversation()` guarda la conversación antes de limpiarla.

---

**[#07] [MICROCOPY] — "RAG" es jerga técnica inapropiada para legisladores**

📍 Ubicación: `pages/Home.tsx` línea 90
```tsx
<span className="text-[10.5px] text-ink-500">Brief, resumen, RAG</span>
```
👀 Qué vi: La card de "Asistente" en el Home describe la funcionalidad como "Brief, resumen, RAG". RAG (Retrieval-Augmented Generation) es un término de ML/IA completamente desconocido para un legislador.
😖 Por qué molesta: Transmite que la plataforma está hecha para técnicos, no para el usuario legislador. Disminuye la confianza.
🔥 Severidad: Alta
🔧 Esfuerzo: Bajo
✅ Recomendación: Reemplazar con: `"Brief, resumen, Biblioteca UPM"` o `"Prepará, resumí, consultá la Biblioteca"`.

---

**[#14] [COMUNICACIÓN] — Asistente no indica si/cuándo se guarda la conversación**

📍 Ubicación: `pages/Assistant.tsx` — flujo de `newConversation()`
👀 Qué vi: La conversación se guarda en `store.conversations` cuando el usuario hace click en "Nueva". Pero el usuario no sabe esto. Ve el botón "Nueva" con ícono de basura y teme perder todo.
😖 Por qué molesta: El usuario potencialmente evita tocar "Nueva" por miedo a perder la conversación, o copia manualmente el texto.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: 
1. Cambiar el ícono a `Plus` (resuelve percepción destructiva).
2. Mostrar texto de ayuda debajo del input: `"Conversación guardada automáticamente al iniciar una nueva."` en texto [10px] text-ink-400.

---

**[#19] [UI VISUAL] — Sugerencias en Asistente son demasiado largas para chips**

📍 Ubicación: `pages/Assistant.tsx` líneas 29-33
```tsx
const SUGGESTIONS = [
  'Explicame las novedades de ambiente de esta semana.',
  'Preparame un brief para una reunión sobre corredores bioceánicos.',
  '¿Qué puntos debería revisar antes de la comisión?',
]
```
👀 Qué vi: Las sugerencias tienen 40-60 caracteres cada una. Como chips en el UI quedan largas y apretadas en mobile.
😖 Por qué molesta: En pantallas pequeñas, los chips se van de línea y el área de sugerencias ocupa demasiado espacio antes del input.
🔥 Severidad: Baja
🔧 Esfuerzo: Bajo
✅ Recomendación: Acortar las sugerencias a 25-30 caracteres y expandir el texto en el input al hacer click:
```tsx
const SUGGESTIONS = [
  { short: 'Novedades de ambiente', full: 'Explicame las novedades de ambiente de esta semana.' },
  { short: 'Brief para reunión', full: 'Preparame un brief para la próxima reunión de comisión.' },
  { short: 'Antes de la comisión', full: '¿Qué puntos debería revisar antes de la comisión?' },
]
```

---

### ── BRIEFING ──────────────────────────────────────────────────────

---

**[#13] [FUNCIÓN] — El briefing no se puede guardar dentro de la app**

📍 Ubicación: `pages/Briefing.tsx` — toda la página
👀 Qué vi: El único CTA del documento generado es "Imprimir o exportar a PDF" (`window.print()`). No hay opción de guardar en "Mi Carpeta" ni de reutilizar el documento.
😖 Por qué molesta: Si el legislador genera el brief hoy y mañana quiere repasarlo, tiene que rehacerlo. Si está en una tablet, `window.print()` puede abrir un diálogo extraño. No hay continuidad entre el Briefing y el Asistente.
🔥 Severidad: Media
🔧 Esfuerzo: Alto
✅ Recomendación (quick): Agregar un botón "Guardar en Mi carpeta" junto al de imprimir:
```tsx
<button onClick={() => {
  store.saveItem({ id: 'brf-' + Date.now(), type: 'brief', title: `Briefing · ${topicMeta?.label ?? 'Panorama'} · ${fechaHoy}`, body: /* texto del brief */ })
  store.pushToast('success', 'Briefing guardado en Mi carpeta')
}}>
  <Bookmark size={15} /> Guardar
</button>
```

---

**[#B01] [UI VISUAL] — Print en mobile produce layout roto**

📍 Ubicación: `pages/Briefing.tsx` — CSS print `@media print`
👀 Qué vi: El CSS de print oculta correctamente la UI (`print:hidden`), pero el `article.briefing-output` con `rounded-3xl` y `shadow-card` no siempre se elimina correctamente en todos los browsers mobile.
😖 Por qué molesta: El PDF generado desde Safari iOS o Chrome Android puede mostrar bordes y sombras del diseño web.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar a los estilos de print:
```css
@media print {
  .briefing-output { 
    border-radius: 0 !important;
    box-shadow: none !important;
    ring: none !important;
  }
}
```
El `print:rounded-none print:shadow-none print:ring-0` ya existe en la clase del article pero podría no aplicarse en algunos browsers; agregar el CSS explícito como fallback.

---

### ── PERFIL ──────────────────────────────────────────────────────────

---

**[#06] [FRICCIÓN] — "Editar preferencias" lleva al Onboarding (regresión de flujo)**

📍 Ubicación: `pages/Profile.tsx` líneas 128-129 y 171-173
```tsx
<Chip size="sm" onClick={() => navigate('/onboarding')}>+ Editar</Chip>
<Button onClick={() => navigate('/onboarding')}>Editar preferencias</Button>
```
👀 Qué vi: Tanto los chips de países/temas como el botón "Editar preferencias" navegan a `/onboarding`. El wizard de onboarding está diseñado para la primera configuración, no para ajustes posteriores.
😖 Por qué molesta: El usuario siente que fue mandado al inicio. Tiene que recorrer los 3 pasos del wizard (nombre, países, temas) para cambiar solo un parámetro. No hay "Guardar cambios" parcial.
🔥 Severidad: Alta
🔧 Esfuerzo: Medio
✅ Recomendación: Crear un `PreferencesDrawer` que abra directamente los selectores de países y temas, sin los pasos de nombre ni el wizard completo. Mientras tanto (quick fix): en `/onboarding`, detectar si el usuario ya está onboarded y mostrar un back button prominente: *"Modificando preferencias · volver al Perfil"*.

---

**[#20] [FUNCIÓN] — "Ver plan" muestra un toast genérico**

📍 Ubicación: `pages/Profile.tsx` línea 209
```tsx
onClick={() => store.pushToast('info', 'Plan 2026 · Renovación automática')}
```
👀 Qué vi: El botón "Ver plan" en la card de Membresía muestra solo un toast con "Plan 2026 · Renovación automática". No muestra detalles del plan, opciones de upgrade, ni facturación.
😖 Por qué molesta: Para un demo institucional esto quita credibilidad — si el usuario quiere entender qué incluye su plan, el botón no le da información útil.
🔥 Severidad: Baja
🔧 Esfuerzo: Medio
✅ Recomendación: Navegar a `/checkout` (con estado pre-cargado del plan actual) o abrir un Drawer con los beneficios detallados del plan.

---

### ── NAVEGACIÓN GENERAL ──────────────────────────────────────────

---

**[#17] [UI VISUAL] — "Asistente AI" puede truncarse en mobile nav**

📍 Ubicación: `layouts/AppShell.tsx` línea 178
```tsx
<span>{item.label}</span>  // label = "Asistente AI"
```
👀 Qué vi: En pantallas de 320px, el texto "Asistente AI" bajo el ícono puede truncarse a "Asistente A" o saltar de línea, rompiendo el alineado del bottom nav.
😖 Por qué molesta: El nav se ve desbalanceado.
🔥 Severidad: Baja
🔧 Esfuerzo: Bajo
✅ Recomendación: Cambiar el label mobile a "Asistente" (sin "AI") o "IA". El sidebar desktop puede mantener "Asistente AI".

---

**[#NAV01] [NAVEGACIÓN] — Búsqueda global: atajos no visibles al usuario**

📍 Ubicación: `layouts/AppShell.tsx` — keyboard shortcut `⌘K`
👀 Qué vi: El shortcut `⌘K` para buscar existe y funciona, pero en mobile el badge `⌘K` solo se muestra en el sidebar de desktop. Un usuario de mobile nunca descubre el shortcut.
😖 Por qué molesta: La búsqueda global es poderosa pero descubrible solo por los usuarios más avanzados.
🔥 Severidad: Media
🔧 Esfuerzo: Bajo
✅ Recomendación: El ícono de búsqueda en el mobile header (`Search size={15}`) ya existe. Agregar un tooltip/hint en el primer uso: *"Tocás la lupa o escribís "/" para buscar en toda la plataforma."*

---

## 5. RECOMENDACIONES

### ── QUICK WINS (hacer esta semana) ──────────────────────────────

**QW-1: Fix crítico — Pasar contexto de norma al Asistente** `[#01] [#23]`
```tsx
// En NewsConversation.tsx y Laws.tsx, antes de navigate('/asistente'):
sessionStorage.setItem('upm.asistente.prefill', JSON.stringify({
  suggestedQuestion: `¿Qué puntos importantes tiene "${title}" y cómo impacta en mi agenda?`
}))
// Cambiar el toast a: 'Abriendo Asistente con contexto de esta norma'
```

**QW-2: Leyes en mobile nav** `[#02]`
```tsx
// En AppShell.tsx, marcar Leyes como primary:
{ to: '/leyes', label: 'Leyes', icon: ScrollText, primary: true },
// Y quitar primary de Biblioteca (menos core) para mantener 5 items.
```

**QW-3: Limpiar credenciales del formulario Login** `[#03]`
```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
```

**QW-4: Paginación en sidebar de Leyes** `[#04]`
```tsx
const [lawsVisible, setLawsVisible] = useState(50)
// Luego: filteredFinal.slice(0, lawsVisible)
// + botón "Ver 50 más" al final del scroll
```

**QW-5: Icono "Nueva" en Asistente** `[#05]`
```tsx
// Cambiar de Trash2 → Plus, quitar tone="danger"
<QuickButton icon={Plus} label="Nueva" onClick={newConversation} />
```

**QW-6: "RAG" → "Biblioteca UPM" en card de Home** `[#07]`
```tsx
<span className="text-[10.5px] text-ink-500">Brief, resumen, Biblioteca UPM</span>
```

**QW-7: Texto completo arriba en NewsConversation** `[#08]`
Mover el bloque `sec-fulltext` antes de LawMap — queda después del Resumen ejecutivo y el contexto grid, pero antes del análisis profundo.

**QW-8: "Ecosistemas" → "Redes"** `[#09]`
```tsx
<Boxes size={11} /> Redes
// title="Ver normas agrupadas por vínculos de citas"
```

**QW-9: Fix posición PWAUpdateBanner para evitar overlap con HomeTour** `[#10]`
```tsx
// PWAUpdateBanner: cambiar bottom-20 → bottom-28
className="fixed bottom-28 left-1/2 z-30 ..."
```

---

### ── MEJORAS ESTRATÉGICAS (rediseños de fondo) ──────────────────

**ESTRATÉGICO-1: PreferencesDrawer en Perfil** `[#06]`
Crear un `PreferencesDrawer` component que permita editar países/temas/idioma/frecuencia sin salir del Perfil. El Onboarding sería solo para el primer setup.

**ESTRATÉGICO-2: Briefing guardable + link desde Asistente** `[#13]`
Integrar el output del Briefing con el store (guardar en Mi Carpeta). Desde el Asistente, el botón "Brief" debería poder pre-cargar el contexto del Briefing más reciente.

**ESTRATÉGICO-3: Leyes → Asistente con contexto enriquecido** `[#01]`
No solo pasar el título al sessionStorage — pasar `{ lawId, title, excerpt, articles: ctx.articulos.slice(0,3) }` para que el Asistente construya una pregunta más rica. Mostrar en el Asistente un "chip" de contexto con la ley que viene de Leyes.

**ESTRATÉGICO-4: Search suggestions dinámicas en Leyes** `[#11]`
Derivar las sugerencias del corpus real del usuario: top 3 leyes de su país, top 3 términos frecuentes en sus preferencias de tema.

**ESTRATÉGICO-5: Mobile UX de Leyes** `[#02]`
En mobile, la vista de lista/detalle de Leyes necesita adaptación específica: el split layout desktop no funciona bien en pantalla chica. Implementar una vista mobile donde la lista es la pantalla principal y el detalle es un modal/drawer de pantalla completa.

---

## APÉNDICE: Inventario de estados vacíos

| Pantalla | Estado vacío | Actual | Recomendación |
|----------|-------------|--------|---------------|
| Home > DiffSinceLastVisit | Sin snapshot previo | No renderiza / vacío | Mostrar: "Volvé mañana para ver qué cambió" |
| Leyes > Guardadas | 0 guardadas | Muestra tab "(0)" | Empty state: "Guardá leyes con el botón Guardar" |
| Asistente > Historial | Sin conversaciones | Card con texto explicativo | ✅ Ya tiene empty state correcto |
| Perfil > Alertas | Sin alertas | "No tenés alertas activas" | ✅ Correcto |
| Briefing > top5 vacío | Sin resultados en filtros | Texto italic | ✅ Correcto |
| Radar > Ecosistemas/Redes | Grafo en build | Spinner pulsante | ✅ Correcto |

---

*Reporte generado por auditoría UX desde perspectiva de usuario legislador recurrente.*
*Stack analizado: Vite 7 + React 19 + Tailwind v4. Fecha: 2026-05-28.*
