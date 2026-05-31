# 🕵️ Auditoría UX — "En la piel del usuario" · Ronda 4

**Plataforma:** Asistente AI UPM — copiloto normativo para legisladores del Mercosur
**Método:** Navegación real en el dev server (`/app-upm/`, viewport desktop 1280 y mobile 375) + lectura de código para los flujos detrás de auth-redirect.
**Usuario auditado:** sesión real cargada → **"Dr. Martin", país AR (Argentina), cargo Legislador**, prefs = 4 países (AR/BR/UY/CO) + 2 temas (Integración regional, Ambiente). Persona: usuario recurrente, impaciente, orientado a resultados.
**Fecha:** 2026-05-30 · **Idioma del producto:** español rioplatense
**Alcance:** experiencia de uso y calidad de producto. No es testing de seguridad.

> Nota de método: muchos hallazgos "Crítica/Alta" son de **contenido y confianza** (datos placeholder mostrados como reales), no de UI rota. Los incluyo porque el usuario no distingue "dato scrapeado mal" de "producto roto" — lo vive como lo segundo.

---

## 1. Resumen ejecutivo

### Las 5 fricciones que más sangran

1. **Leyes promete "texto íntegro" y muestra plantillas sin rellenar.** En `/leyes`, cada ficha repite el MISMO excerpt scrapeado ("*Leteral primer nivel Documentos y Leyes…*", con typo incluido), el "Resumen ejecutivo" de una ley de la OIT dice "*Discursos de Presidentes de la República*", y el "Articulado" es una plantilla con `[NOMBRE], Presidente. [MINISTERIO DE…]` x8. El header dice "**730 leyes con texto íntegro · listo para preguntar al Asistente**" → es la promesa central y hoy es falsa. *(LY1–LY3)*

2. **El Asistente no renderiza sus propias citas.** La respuesta muestra markdown crudo: asteriscos `*Organismos…*` a la vista y los enlaces a fuentes como texto pelado `[Boletín Oficial…](#/radar/ar-ley-27683)` — **sin `<a>`, no clickeables**. Justo el producto cuyo sello es "CON FUENTES UPM · fuentes verificables" muestra las fuentes como markup roto. *(A2)*

3. **"Mi carpeta" miente sobre lo que es tuyo.** Al entrar por primera vez se autollena con 5 ítems sembrados que el usuario nunca guardó ("Brief de reunión bilateral Argentina-Brasil", etc.), tapando el empty state real; y **3 de esos 5 ítems no se abren** (respuesta/brief/minuta → toast "Este ítem no tiene vista disponible aún"). Encima, borrar ítems o carpetas **no pide confirmación**. *(C01–C03)*

4. **En mobile la navegación se rompe.** `/leyes` desborda el viewport (**696px de contenido en una pantalla de 375px**: títulos y excerpts cortados, scroll horizontal) porque el layout de dos paneles no colapsa. Y no hay forma persistente de llegar a **Mi carpeta** ni **Biblioteca**: no están en la barra inferior, no hay menú hamburguesa, y el sidebar está oculto. El que guardó algo en el teléfono no puede volver a buscarlo. *(MOB1, MOB2)*

5. **Los números no cierran y se inflan solos.** En `/radar` los contadores suben en vivo mientras mirás (1690 → 1720 novedades en un minuto), y el "Pulso de hoy" no coincide con los chips de filtro (Cuestiones cruzadas **851** arriba vs **790** en el chip). En `/estadisticas` no hay guard de carga: en frío el tablero entero muestra ceros. Todo junto da sensación de datos poco confiables. *(R1, R2, S01)*

### Sensación general del recorrido

La plataforma **se siente cuidada, ambiciosa y visualmente premium**: sistema de diseño coherente, jerarquía clara, panel "¿Por qué importa?", estados de error con recuperación, atajos de teclado, OverflowActions, drawers pulidos. Pero la cáscara premium descansa sobre **relleno de demo**: contenido scrapeado/placeholder mostrado como real, estados iniciales que mienten (carpeta sembrada, stats en cero), y números que se contradicen entre sí. **Confiable en la forma, todavía no en el fondo.** En mobile, además, la prolijidad baja un escalón (overflow en Leyes, nav incompleta). Si esto es un demo para mostrar potencial, el potencial se ve clarísimo; para producción, el trabajo restante es de *datos y verdad*, no de diseño.

---

## 2. Diario del usuario (narrativa)

> *Soy el Dr. Martin, legislador argentino. Uso esto un par de veces por semana antes de comisión. Entro de noche, apurado.*

Abro la app y caigo en el Home: "**Buenas noches, Martin**" (sin tilde en mi nombre, pero bueno). Me gusta lo primero que veo: tres números grandes — 7 de alta relevancia, 4 por votar, 8 audiencias. Eso es justo lo que vengo a saber. El panel oscuro "**73 normas nuevas desde hace 5 días**" tiene autoridad, se ve serio. Hasta acá, bien.

Pero miro las tarjetas de "**En tu radar**" y frunzo el ceño: las tres son brasileñas, en portugués, y una es "*Celebração dos 112 anos do Comitê Olímpico do Brasil*" marcada como **alta relevancia** de mi tema "Integración". ¿La fiesta de los 112 años del Comité Olímpico es lo más relevante para mí hoy? Y hay un título que se repite a sí mismo: "*Homenagem aos 30 anos da Lei… Homenagem aos 30 anos da Lei…*". Parece un bug. Empiezo a desconfiar un poco de qué me está mostrando.

Voy al **Radar**, mi pantalla de batalla. Es densa y linda. Pero el de arriba dice "821 cuestiones cruzadas" y el chip de abajo dice "790" — ¿cuál es? Me quedo mirando y los números **suben solos**: 1690 novedades… 1720. ¿De verdad entraron 30 normas en un minuto, o esto es de mentira? El primer resultado, ordenado por "más recientes", es un "*Evento Técnico · Encontro da CAPADR na MEGALEITE 2026*" con **relevancia baja** y fecha futura. Lo abro igual. El detalle tiene un panel "**¿Por qué importa?**" que me encanta — me explica que sirve como referencia comparada para Argentina. Pero arriba dice "**RELEVANCIA BAJA**" y el panel dice "**Prioridad alta**". ¿En qué quedamos? El "Texto completo" es la misma línea en portugués repetida. Y cuando toco "ver" la fuente, me abre… **un JSON crudo de una API**. No, gracias.

Pruebo el **Asistente**, que es lo que más promesa tiene. Le pregunto por "novedades de ambiente esta semana". Responde rápido y con onda, me lista 5 normas. Pero me trae "*Día y Semana Nacional del Árbol*" etiquetada como **Integración regional** con **37% de match** — yo pregunté por *ambiente*. Y las fuentes, que es lo que más me importa, aparecen como texto roto: `[Boletín Oficial…](#/radar/ar-ley-27683)`, con los corchetes a la vista y **sin poder clickearlas**. El producto me promete "fuentes verificables" y no puedo abrir ni una.

Entro a **Leyes** con esperanza: "730 leyes con texto íntegro". Y acá me caigo del todo: **todas las fichas tienen el mismo texto de relleno** ("*Leteral primer nivel Documentos y Leyes…*"), no puedo distinguir una ley de otra por el resumen. Abro una ley de la OIT y el "resumen ejecutivo" habla de "*Discursos de Presidentes*". Voy al articulado y es una **plantilla a medio llenar**: "[NOMBRE], Presidente. [MINISTERIO DE…]". Esto no es texto íntegro de nada.

Cierro con lo mío: el **Perfil** está impecable — ahora sí dice "Honorable Congreso de la Nación · Argentina", me reconoce. Edito preferencias en un drawer prolijo, guardo sin cambios y me avisa "Sin cambios · todo sigue igual". Eso está bueno. Pero en "Datos institucionales" me figura un tercer tema ("corredores bioceánicos") que yo no sigo. Detalle, pero lo noto.

Agarro el teléfono para terminar en el subte. Y ahí la cosa se pone fea: **Leyes se sale de la pantalla** — los títulos cortados, scroll para los costados. Quiero volver a **Mi carpeta** para releer un brief que guardé… y **no encuentro cómo**: la barra de abajo tiene Inicio/Asistente/Radar/Leyes/Briefing y nada más. No hay menú. Mi carpeta no existe en el teléfono. Me rindo y lo dejo para la oficina.

*Veredicto del Dr. Martin: "Se ve a un producto que alguien diseñó con muchísimo cuidado. Pero todavía no me puedo apoyar en lo que me muestra, y en el teléfono me deja a pie en la mitad."*

---

## 3. Tabla priorizada — Matriz Impacto × Esfuerzo

> **Quick win** = severidad Alta/Crítica + esfuerzo Bajo.

| ID | Problema | Severidad | Esfuerzo | ¿Quick win? |
|----|----------|-----------|----------|-------------|
| LY1 | Excerpt boilerplate idéntico en todas las leyes | Alta | Medio | — (dato) |
| LY2 | "Resumen ejecutivo" de ley equivocado/irrelevante | Alta | Medio | — (dato) |
| LY3 | "Articulado / texto íntegro" es plantilla sin rellenar | Alta | Medio | — (dato) |
| A2 | Asistente no renderiza citas (markdown crudo, links muertos) | Alta | Medio | — |
| C01 | Mi carpeta autollena con ítems ajenos (oculta empty state) | Alta | **Bajo** | ✅ |
| C03 | 3 de 5 ítems sembrados son clicks muertos | Alta | **Bajo** | ✅ |
| C02 | Borrar ítem/carpeta sin confirmación ni deshacer | Alta | Medio | — |
| S01 | Stats sin loading/empty → tablero de ceros en frío | Alta | Medio | — |
| MOB2 | Leyes desborda viewport mobile (696px en 375) | Alta | Medio | — |
| MOB1 | Mi carpeta/Biblioteca sin acceso persistente en mobile | Alta | **Bajo** | ✅ |
| P03 | Login re-manda a Onboarding aunque ya estés onboarded | Alta | **Bajo** | ✅ |
| P06 | Checkbox de Términos pre-tildado (consentimiento legal) | Alta | **Bajo** | ✅ |
| R3 | Sort "Más recientes" pone arriba ruido de baja relevancia | Alta | Medio | — |
| R4 | "ver" fuente abre JSON crudo de API | Media | Bajo | ✅ |
| R1 | Contadores que se inflan solos en vivo | Media | Bajo | ✅ |
| R2 | Pulso vs chips: mismos rótulos, números distintos | Media | Medio | — |
| R5 | Detalle: "RELEVANCIA BAJA" vs "Prioridad alta" se contradicen | Media | Bajo | ✅ |
| R6 | Metadata mal rotulada (Identificación/Tipo) | Media | Bajo | ✅ |
| R7/R8 | "Texto completo" = título repetido; título duplica subtítulo | Media | Bajo | ✅ |
| H1 | Título que se repite a sí mismo en Home | Media | Bajo | ✅ |
| H2/R9 | Portugués sin traducir en Home y Radar | Media | Medio | — |
| H3 | Items ceremoniales marcados "alta relevancia" en tu radar | Media | Medio | — |
| A1 | RAG flojo: "ambiente" → "Día del Árbol" / Integración 37% | Media | Alto | — |
| MOB3 | Burbuja onboarding tapa contenido en mobile | Media | Bajo | ✅ |
| B01 | Briefing ignora tus prefs (default AR/BR/UY fijo) | Media | Bajo | ✅ |
| B02 | "Guardar en Mi carpeta" duplica, sin estado "Guardado" | Media | Medio | — |
| B03 | Header promete "5+3+3" y entrega menos sin avisar | Media | Bajo | ✅ |
| L01 | Biblioteca vs Radar: el CTA grande te empuja a irte | Media | Medio | — |
| L02 | "Subir documento" (primario) → toast "no disponible" | Media | Bajo | ✅ |
| L03 | Skeleton falso 480ms en cada tecleo de Biblioteca | Media | Bajo | ✅ |
| S02 | "Backlinks en grafo" como métrica hero (jerga) | Media | Bajo | ✅ |
| S03 | "45 feeds" hardcodeado vs conteo real de fuentes | Media | Bajo | ✅ |
| PF1 | "Temas prioritarios" (3 fijos) vs "Temas seguidos" (2 reales) | Media | Bajo | ✅ |
| C04 | Targets de mover/borrar chicos y pegados (mobile) | Media | Bajo | ✅ |
| P01 | Login demo: la contraseña no valida nada | Media | Bajo | ✅ |
| P02 | "Olvidé mi contraseña" → toast sin salida real | Media | Bajo | ✅ |
| P05 | Signup: validación silenciosa, no dice qué falta | Media | Medio | — |
| P07 | Links de Términos/Privacidad = `#` muertos | Media | Bajo | ✅ |
| P09 | "Confirmar canje" en checkout de suscripción | Media | Bajo | ✅ |
| P10 | Tarjeta validada solo por largo (sin vencimiento/Luhn) | Media | Medio | — |
| P12 | Volver del checkout pierde la tarjeta cargada | Media | Medio | — |
| P13 | F5 en "cuenta activada" te expulsa a /registro | Media | Medio | — |
| H4 | Nombre sin tilde ("Martin"/"Dr. Martin") | Baja | Bajo | — |
| R10 | "Mi comisión" = ~58% del total (filtro poco selectivo) | Media | Alto | — |
| PF3 | Taxonomía de temas se superpone (4 "integración"-like) | Baja | Medio | — |
| AL1 | Badge "alertas 2" vs 3 alertas listadas | Baja | Bajo | — |
| AL2 | Alerta muteada sin rótulo "Pausada" | Baja | Bajo | — |
| S04 | Mapa coroplético duplicado de Home en Stats | Baja | Bajo | — |
| B04/B05 | Briefing sin .ics; "Imprimir/PDF" no aclara el diálogo | Baja | Bajo | — |
| E1 | "matchea" (spanglish) en estado de norma no indexada | Baja | Bajo | — |

---

## 4. Hallazgos detallados

### 🏠 Home (`/`)

```
[H1] [Microcopy/Datos] — Hay títulos que se repiten a sí mismos
📍 Home · tarjetas "Diff regulatorio" y "En tu radar"
👀 Qué vi: "Sessão Não Deliberativa Solene · Homenagem aos 30 anos da Lei da Propriedade Industrial \n Homenagem aos 30 anos da Lei da Propriedade Indust…" — la frase aparece DOS veces dentro del mismo título.
😖 Por qué molesta: Parece un bug de renderizado. En la primera pantalla del producto, mina la confianza de entrada.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Deduplicar título vs. subtítulo al armar el item (si subtítulo ⊆ título, no concatenar). Trim de `\r\n` repetidos.
```
```
[H2] [Microcopy] — Portugués sin traducir en las tarjetas
📍 Home · "En tu radar", "Diff regulatorio", "Agenda Mercosur"
👀 Qué vi: "Sessão Não Deliberativa Solene", "Reunião Deliberativa · Discussão e votação de propostas legislativas" tal cual, en portugués.
😖 Por qué molesta: El producto es en español rioplatense; existe `translatePtEs` pero no se aplica acá. El usuario AR/UY lee portugués crudo en su home.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Pasar títulos por el diccionario PT→ES también en las tarjetas de Home (no solo en Radar). Mantener original como tooltip.
```
```
[H3] [Datos/Confianza] — Ítems ceremoniales marcados "alta relevancia" en tu radar
📍 Home · "En tu radar · Integración · Ambiente"
👀 Qué vi: "Celebração dos 112 anos do Comitê Olímpico do Brasil" → 🔥 Tu tema "Integración" · alta relevancia.
😖 Por qué molesta: Erosiona la promesa "qué pasa que te afecta". Si un festejo del Comité Olímpico es "alta relevancia" para mi tema, dejo de creerle al sistema de relevancia.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Recalibrar el scoring para penalizar eventos protocolares/conmemorativos. Mínimo, no mostrarlos como "alta relevancia" personalizada.
```
```
[H4] [Microcopy] — El nombre va sin tilde
📍 Home (saludo) + sidebar ("Dr. Martin")
👀 Qué vi: "Buenas noches, Martin" / "Dr. Martin" — sin tilde en Martín.
😖 Por qué molesta: Cosmético, pero en un saludo personalizado se nota; baja un punto el "wow".
🔥 Severidad: Baja   🔧 Esfuerzo: Bajo
✅ Recomendación: Normalizar acentos en el seed/operador, o respetar el nombre cargado con tildes.
```

### 📡 Radar (`/radar`) y detalle de novedad (`/radar/:id`)

```
[R1] [Performance percibida/Confianza] — Los contadores se inflan solos mientras mirás
📍 Radar · header "novedades" + Pulso de hoy
👀 Qué vi: En ~1 min: novedades 1690→1720, "Cuestiones cruzadas" 821→851, "Mi comisión" 979→1003, fuentes 43/45→44/45.
😖 Por qué molesta: "30 normas en un minuto" se siente falso. Y hace que dos números cualquiera de la página nunca coincidan (muestrean un feed que crece).
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Bajar/parar el goteo en vivo a un ritmo creíble (o pausarlo tras la carga inicial). Mostrar "actualizado hace X" en vez de un número que trepa.
```
```
[R2] [UI/Confianza] — "Pulso de hoy" y los chips de filtro no coinciden
📍 Radar · cards Pulso vs chips
👀 Qué vi: Pulso "Cuestiones cruzadas 851" vs chip "Cuestiones cruzadas 790"; "Sancionadas esta semana 14" vs chip "Recién sancionadas 18" vs chip "Esta semana 43".
😖 Por qué molesta: Rótulos casi iguales con números distintos en la misma pantalla. El usuario no sabe cuál es el bueno.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Unificar la fuente de verdad y los criterios. Si miden cosas distintas, que los rótulos lo digan ("Cuestiones cruzadas (con cita)" vs "(mencionan país)").
```
```
[R3] [Fricción/Relevancia] — Lo primero de la lista es ruido de baja relevancia y fecha futura
📍 Radar · orden por defecto "Más recientes"
👀 Qué vi: Primer ítem: "Evento Técnico · Encontro da CAPADR na MEGALEITE 2026" — RELEVANCIA BAJA, fecha 04/06 (futura), en portugués.
😖 Por qué molesta: El usuario abre el Radar y lo recibe lo menos importante. Las convocatorias futuras se mezclan con "novedades recientes".
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Default híbrido (relevancia + recencia) o separar "Próximas convocatorias" de "Novedades publicadas". No arrancar con relevancia baja arriba.
```
```
[R4] [Botones/Fricción] — "ver" la fuente abre un JSON crudo de API
📍 Radar (lista) y detalle · link "ver"/"Ver fuente"
👀 Qué vi: Los "ver" apuntan a https://dadosabertos.camara.leg.br/api/v2/eventos/82356 → respuesta JSON, no una página legible.
😖 Por qué molesta: El legislador quiere LEER la fuente oficial y se encuentra JSON en portugués. Click frustrante en el momento de "verificar".
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Mapear a la URL human-readable de la fuente (página del evento/norma), no al endpoint de datos abiertos. Si no hay, ocultar el "ver".
```
```
[R5] [UI/Confianza] — El detalle se contradice: "RELEVANCIA BAJA" vs "Prioridad alta"
📍 /radar/:id · tag de relevancia vs panel "¿Por qué importa?"
👀 Qué vi: Tag "RELEVANCIA BAJA" y, debajo, "Prioridad alta: Este ítem pertenece a 'Integración regional'…".
😖 Por qué molesta: Dos afirmaciones opuestas a 2cm de distancia. El usuario no sabe si es importante o no.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Que "¿Por qué importa?" lea la relevancia real. Si es baja, el copy debe ser "Coincide con tu tema, pero es de baja relevancia".
```
```
[R6] [Microcopy] — Metadata mal rotulada en el detalle
📍 /radar/:id · fila Publicación/Identificación/Tipo
👀 Qué vi: "IDENTIFICACIÓN: Evento Técnico" (es un tipo, no un ID) y "TIPO: CAPADR" (CAPADR es una comisión brasileña, no un tipo de norma).
😖 Por qué molesta: Las etiquetas no corresponden a su contenido; a un usuario detallista le grita "datos mal mapeados".
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Revisar el mapeo de campos por fuente; si no hay ID real, ocultar "Identificación" en vez de rellenarla con el tipo.
```
```
[R7] [Microcopy] — "Texto completo" es el título repetido en una línea
📍 /radar/:id · sección "Texto completo"
👀 Qué vi: TEXTO COMPLETO = "Encontro da CAPADR na MEGALEITE 2026" (la misma línea del título, en portugués).
😖 Por qué molesta: La sección promete cuerpo y entrega una repetición. Suma scroll sin sumar info.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Si no hay cuerpo, ocultar "Texto completo" o mostrar "Esta convocatoria no tiene texto normativo; ver fuente para el detalle del evento."
```
```
[R8] [UI] — El título de la tarjeta duplica su propio subtítulo
📍 Radar (lista) · primera tarjeta
👀 Qué vi: Título "Evento Técnico · Encontro da CAPADR na MEGALEITE 2026" + subtítulo "Encontro da CAPADR na MEGALEITE 2026" (repite la segunda mitad).
😖 Por qué molesta: Redundancia visual; ocupa dos líneas para decir lo mismo.
🔥 Severidad: Baja   🔧 Esfuerzo: Bajo
✅ Recomendación: Si subtítulo ⊆ título, no renderizar subtítulo.
```
```
[R9] [Microcopy] — Portugués sin traducir en todo el Radar
📍 Radar lista + detalle
👀 Qué vi: "Sessão", "Reunião Deliberativa", "Discussão e votação", "Encontro" sin traducir.
😖 Por qué molesta: Igual que H2: producto en español, contenido en portugués crudo.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Aplicar translatePtEs consistentemente (lista + detalle + Pulso "ÚLTIMO").
```
```
[R10] [Fricción/Relevancia] — "Mi comisión" abarca ~58% de todo el corpus
📍 Radar · chip "Mi comisión 1003" sobre 1720 totales
👀 Qué vi: El filtro de comisión deja ~6 de cada 10 ítems. No "filtra" mucho.
😖 Por qué molesta: Un filtro que devuelve más de la mitad no ayuda a enfocar; pierde sentido como "lo mío".
🔥 Severidad: Media   🔧 Esfuerzo: Alto
✅ Recomendación: Endurecer el match (país Y tema, no país O tema) o sumar umbral de relevancia. Que "Mi comisión" sea curado, no casi-todo.
```

### 🤖 Asistente (`/asistente`)

```
[A2] [Sistema/Confianza] — El Asistente no renderiza sus citas: markdown crudo y links muertos
📍 /asistente · cuerpo de la respuesta
👀 Qué vi: A la vista aparecen "*Organismos: …*" (asteriscos crudos) y "Fuente · [Boletín Oficial · HONORABLE CONGRESO…](#/radar/ar-ley-27683)". Verificado: 0 elementos <a> en la respuesta; el renderer hace **bold** y listas pero NO `*itálica*` ni `[texto](enlace)`.
😖 Por qué molesta: El sello del producto es "fuentes verificables". Las fuentes salen como texto roto y no se pueden abrir. Es el peor lugar para que falle.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Extender el componente Markdown para soportar enlaces (incl. hash-links internos `#/radar/...` clickeables) e itálica de un asterisco; o pasar las citas por un render de links dedicado. Que cada "Fuente" sea un link que abre la norma.
```
```
[A1] [Sistema/Relevancia] — Recuperación floja: pregunto por "ambiente", me trae "Día del Árbol" como Integración 37%
📍 /asistente · respuesta a "Novedades de ambiente esta semana"
👀 Qué vi: "1. Ley 27683 · DÍA Y SEMANA NACIONAL DEL ARBOL · Tema: Integración regional · Match: 37%". Scores bajos y tema que no coincide con la consulta.
😖 Por qué molesta: Si pregunto por ambiente y me clasifica "Día del Árbol" como Integración al 37%, dudo de la inteligencia del asistente.
🔥 Severidad: Media   🔧 Esfuerzo: Alto
✅ Recomendación: Subir el umbral mínimo de match (no mostrar <50% como "relevante"), y mostrar el tema real de la norma, no forzar el del filtro. Si el match es bajo, decir "coincidencias parciales".
```
```
[A3] [Microcopy] — Los excerpts se cortan a mitad de frase
📍 /asistente · cuerpo de la respuesta
👀 Qué vi: "…reunidos en Congreso, etc. sancionan con fuerza de" (corta en "de").
😖 Por qué molesta: Menor, pero se lee como recorte tosco.
🔥 Severidad: Baja   🔧 Esfuerzo: Bajo
✅ Recomendación: Cortar por palabra/oración con elipsis, no por cantidad de caracteres cruda.
```
> ✅ **Positivo:** la barra de acciones rápidas (Copiar · Guardar · Brief · Minuta · ··· Más) funciona perfecto con OverflowActions — 4 visibles + overflow, sin romper en mobile.

### 📜 Leyes (`/leyes`)

```
[LY1] [Datos/Confianza] — Todas las leyes muestran el MISMO excerpt de relleno scrapeado
📍 /leyes · excerpt de cada ficha
👀 Qué vi (verificado: 7 fichas visibles, 1 solo excerpt distinto): "Leteral primer nivel Documentos y Leyes Búsqueda de Documentos y Leyes Constitución de la República Leyes Documentos Diarios de…" — chrome de navegación scrapeado, con typo ("Leteral" por "Lateral"), idéntico en todas.
😖 Por qué molesta: No puedo distinguir una ley de otra por el resumen. La lista se vuelve inútil para escanear.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Generar un excerpt real desde el texto/sumario de cada ley; si no hay, usar el título + tipo + sector, nunca el menú de la web fuente.
```
```
[LY2] [Datos/Confianza] — El "Resumen ejecutivo" no corresponde a la ley
📍 /leyes · detalle, Ley 20484 (OIT · enmienda constitución 1986)
👀 Qué vi: RESUMEN EJECUTIVO = "Discursos de Presidentes de la República y Presidentes del Consejo Nacional de Gobierno". Nada que ver con la OIT.
😖 Por qué molesta: Un resumen equivocado es peor que no tener resumen: desinforma a quien confía en él para preparar comisión.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Atar el resumen al cuerpo real de la norma; validar que el resumen mencione el objeto de la ley. Si no hay, no inventar.
```
```
[LY3] [Datos/Confianza] — "Texto íntegro" es en realidad una plantilla sin rellenar
📍 /leyes · sección Articulado · header "730 leyes con texto íntegro"
👀 Qué vi: "ARTICULADO Sala de Sesiones de la Cámara de [cuerpo], en Montevideo, [fecha]. [NOMBRE], Presidente. [NOMBRE], Secretario. [MINISTERIO DE…] [MINISTERIO DE…] …" — placeholders literales con corchetes.
😖 Por qué molesta: El header promete "texto íntegro · listo para preguntar al Asistente". Si el Asistente lee esto, responde sobre plantillas vacías. Es la promesa central y está incumplida.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: O traer el articulado real, o bajar la promesa del header ("fichas con metadata oficial; texto íntegro en expansión") y marcar las leyes sin cuerpo como "Texto no disponible aún".
```
> ✅ **Positivo:** la arquitectura del detalle es excelente — 11 secciones (Genealogía, Equivalente regional, Articulado, Tramitación, Impacto fiscal, Jurisprudencia, Quién la cita, Mis notas…), filtros por estado con color, comparador y "hablar con la ley" vía Asistente. El esqueleto es de producto serio; le falta el contenido.

### 🗂️ Mi carpeta (`/carpetas`)

```
[C01] [Estado vacío/Confianza] — El espacio "privado" se autollena con ítems que no guardaste
📍 Folders.tsx:54-59 (SEED on mount) · EmptyState (línea ~168) inalcanzable
👀 Qué vi (verificado en código): si `saved.length===0`, al montar se inyectan 5 ítems demo (novedad, documento, respuesta, brief, minuta). El usuario nuevo nunca ve "Aún no guardaste nada": ve 5 cosas ajenas ("Brief de reunión bilateral Argentina-Brasil").
😖 Por qué molesta: Confunde qué es "mi espacio privado"; encontrar guardados que nunca hiciste mina la confianza en que es tuyo.
🔥 Severidad: Alta   🔧 Esfuerzo: Bajo
✅ Recomendación: Mostrar el empty real al usuario nuevo, o marcar los seed como "Ejemplos · borralos cuando quieras". No simular guardados propios.
```
```
[C03] [Fricción/Dead-end] — 3 de los 5 ítems sembrados no se pueden abrir
📍 Folders.tsx · SEED respuesta/brief/minuta sin `body` ni `ref`; handleItemClick:74-84
👀 Qué vi (verificado): documento y novedad abren bien; respuesta ("Resumen ejecutivo · Corredores bioceánicos"), brief y minuta → toast "Este ítem no tiene vista disponible aún".
😖 Por qué molesta: Rompe la promesa central de "guardá y volvé a leerlo". Toco mi brief guardado y me dicen que no hay vista.
🔥 Severidad: Alta   🔧 Esfuerzo: Bajo
✅ Recomendación: Que los seed de respuesta/brief/minuta traigan `body` (markdown de ejemplo) para que el drawer de lectura funcione. Ningún guardado debería ser dead-end.
```
```
[C02] [Acciones destructivas] — Borrar ítem y borrar carpeta no piden confirmación ni deshacer
📍 Folders.tsx:217-223 (Trash ítem) y 293-306 (Eliminar carpeta)
👀 Qué vi: Un toque en el tacho borra al instante (solo toast). "Eliminar carpeta" borra la carpeta entera sin confirmar.
😖 Por qué molesta: Irreversible a un click, en targets chicos (fácil de errar en mobile). Borrar una carpeta con 12 ítems organizados no tiene vuelta.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Confirmar destructivos; mínimo, "Deshacer" en el toast (5s). Carpeta: modal "¿Eliminar 'X'? Sus N ítems vuelven a Guardados."
```
```
[C04] [Accesibilidad/Mobile] — Botones de mover/borrar chicos y pegados
📍 Folders.tsx:208-224 (íconos 13px, p-2, apilados)
👀 Qué vi: Mover y Borrar son dos íconos ~28px, uno encima del otro, pegados.
😖 Por qué molesta: Riesgo de borrar queriendo mover (y borrar no confirma). Bajo el mínimo de 44px de touch.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Targets ≥40px, separar mover de borrar, mandar "borrar" a un overflow "···".
```

### 📚 Biblioteca (`/biblioteca`)

```
[L01] [Navegación/Primera impresión] — No queda claro en qué difiere de Radar; el CTA grande te invita a irte
📍 Library.tsx:150-166 (banner "Feed normativo en vivo → Ir al Radar")
👀 Qué vi: Biblioteca abre con un banner grande cuyo botón prominente es "Ir al Radar". La distinción (Biblioteca = memoria curada UPM vs Radar = feed en vivo) está en letra de 12px.
😖 Por qué molesta: El primer CTA de Biblioteca empuja FUERA de Biblioteca. Refuerza la sensación de redundancia entre las dos.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Bajar el peso del banner a un link discreto y subir la explicación ("Acá viven documentos institucionales UPM: convenios, actas, informes. Proyectos en vivo → Radar").
```
```
[L02] [Botones/Fricción] — "Subir documento" es primario pero solo tira un toast de "no disponible"
📍 Library.tsx:134-142
👀 Qué vi: Botón primario "Subir documento" → toast "disponible para Secretaría UPM en versión completa".
😖 Por qué molesta: Un primario que promete y devuelve excusa = click muerto, frustra a quien tiene permisos.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Atenuarlo con candado + "Próximamente", o esconderlo en demo. Un primario no debería ser dead-end.
```
```
[L03] [Performance percibida] — Skeleton falso de 480ms en cada tecleo y cada filtro
📍 Library.tsx:82-86
👀 Qué vi: Cada letra/chip dispara "Buscando fuentes UPM…" + skeleton ~0,5s, aunque los datos son locales e instantáneos.
😖 Por qué molesta: Lentitud artificial; tipear "ambiente" = ~8 ciclos de skeleton. El copy además miente (filtra local, no "busca fuentes").
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Quitar el delay en filtros (instantáneo). Si se quiere efecto, solo en la primera carga.
```

### 📊 Estadísticas (`/estadisticas`)

```
[S01] [Estado de carga/vacío] — Sin loading ni empty: en frío, tablero de ceros
📍 Stats.tsx:19-21,51-56 (items = feed?.items ?? [], sin guard)
👀 Qué vi: No hay skeleton ni empty state. En primer arranque sin cache: "Items en corpus 0", "Alta relevancia 0", "Backlinks 0", barras planas, gráfico por año vacío.
😖 Por qué molesta: La primera impresión de "El estado del Mercosur regulatorio" es un tablero de ceros — parece roto.
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: Consumir `loading` de useLiveFeed → skeletons; si vacío real, empty state ("Todavía no trajimos normas. Probá actualizar en un rato.").
```
```
[S02] [Microcopy] — "Backlinks en grafo" como métrica hero es jerga
📍 Stats.tsx:55 (BigStat)
👀 Qué vi: Una de las 4 tarjetas grandes dice "Backlinks en grafo", al mismo peso que "Items en corpus".
😖 Por qué molesta: Es lenguaje del que construyó el grafo, no del legislador; no es accionable.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: "Conexiones entre normas" o reemplazar por algo accionable ("Alta relevancia esta semana").
```
```
[S03] [Microcopy/Confianza] — "45 feeds" hardcodeado vs conteo real de fuentes
📍 Stats.tsx:46 ("45 feeds") vs panel "Fuentes del corpus · {sources.length}"
👀 Qué vi: El subtítulo afirma "45 feeds oficiales", pero más abajo el conteo real puede ser otro (y marca cuántas con error).
😖 Por qué molesta: Inconsistencia en la misma página; "45" con orgullo aunque haya fuentes caídas.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Derivar del feed: "Métricas sobre {sources.length} fuentes oficiales". Un solo número, vivo.
```
```
[S04] [Fricción] — El mapa coroplético está duplicado del Home
📍 Stats.tsx:61-62 (comentario propio "ya está en Home pero también acá")
👀 Qué vi: El mismo mapa del Home embebido en Stats.
😖 Por qué molesta: Para un usuario recurrente, repetir el mapa alarga el scroll sin aportar dato nuevo.
🔥 Severidad: Baja   🔧 Esfuerzo: Bajo
✅ Recomendación: Quitarlo de Stats o diferenciarlo (variante con % en vez del mapa).
```

### 📋 Briefing (`/briefing`)

```
[B01] [Primera impresión] — El briefing arranca con países/tema que no elegiste
📍 Briefing.tsx:54-62 (default countries=['AR','BR','UY'], topic='integracion-regional')
👀 Qué vi: Entro a "Armá tu 1-pager" y ya hay 3 países + un tema preseleccionados que ignoran mis prefs (yo sigo AR/BR/UY/CO + Ambiente/Integración).
😖 Por qué molesta: El default parece "de otro" y obliga a re-filtrar.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Inicializar desde las prefs del store (como hace Library). Mi país siempre primero.
```
```
[B02] [Botones] — "Guardar en Mi carpeta" duplica y no muestra estado guardado
📍 Briefing.tsx:182-191 (id: 'brf-'+Date.now())
👀 Qué vi: Cada click crea un ítem nuevo; apretándolo 4 veces tengo 4 briefs idénticos. El botón no cambia a "Guardado".
😖 Por qué molesta: No sé si ya guardé; ensucio mi carpeta con copias.
🔥 Severidad: Media   🔧 Esfuerzo: Medio
✅ Recomendación: Id determinístico por filtros y estado "Guardado en Mi carpeta" + check, como Biblioteca.
```
```
[B03] [Microcopy] — Promete "5 normas + 3 cambios + 3 cuestiones" y a veces entrega menos sin avisar
📍 Briefing.tsx:211 (copy fijo) vs secciones condicionales 303/362/390
👀 Qué vi: El subtítulo promete "5+3+3" pero con pocos filtros desaparecen secciones enteras y el conteo baja, sin explicación.
😖 Por qué molesta: Leo la promesa, imprimo, y faltan secciones. Parece bug.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Promesa dinámica ("hasta 5 normas clave…") y secciones vacías con microcopy ("Sin tramitaciones nuevas en esta ventana") en vez de ocultarlas.
```
> B04/B05 (Baja): no hay "agregar a calendario" (.ics) en Briefing, solo `window.print()`; y "Imprimir o exportar a PDF" no aclara que abre el diálogo de impresión ("elegí 'Guardar como PDF'").

### 🔐 Funnel de acceso (Login / Signup / Checkout / Activación / Onboarding) — auditado por código

```
[P03] [Navegación/Fricción] — Login te re-manda a Onboarding aunque ya estés configurado
📍 Login.tsx:44 navigate(onboarded && from ? from : '/onboarding')
👀 Qué vi: Si no venís de un deep-link, te lleva a /onboarding aunque `onboarded` sea true (ignora el postAuthTarget ya calculado).
😖 Por qué molesta: El usuario recurrente que ya configuró su Radar repite el onboarding cada vez que entra desde cero. Fricción pura.
🔥 Severidad: Alta   🔧 Esfuerzo: Bajo
✅ Recomendación: Usar `postAuthTarget` → onboarded va al Home/deep-link; solo el nuevo va a onboarding.
```
```
[P06] [Formularios/Legal] — Checkbox de Términos pre-tildado por defecto
📍 Signup.tsx:46 useState(true)
👀 Qué vi: El consentimiento legal arranca CHECKED; el usuario nunca acepta conscientemente.
😖 Por qué molesta: Además de UX, el opt-in pre-marcado es problemático legalmente — y el público parlamentario es el que más lo mira.
🔥 Severidad: Alta   🔧 Esfuerzo: Bajo
✅ Recomendación: `accepted=false` y exigir tilde explícito; botón disabled hasta marcarlo.
```
```
[P01/P02] [Sistema] — La contraseña no valida nada y "Olvidé mi contraseña" es un callejón
📍 Login.tsx:37-46 (password sin uso) y :148-154 (toast)
👀 Qué vi: Cualquier password entra. "Olvidé mi contraseña" solo muestra un toast efímero "escribí a soporte@upm.org" (no mailto, no copia, no reset).
😖 Por qué molesta: En el momento de máxima frustración (no puedo entrar), la respuesta es un cartelito que se autodestruye.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Microcopy "Demo institucional · ingresá cualquier credencial". Convertir el aviso en `mailto:soporte@upm.org?subject=Recuperar acceso` persistente.
```
```
[P09] [Microcopy] — "Confirmar canje" en un checkout de suscripción mensual
📍 Checkout.tsx:237
👀 Qué vi: El CTA del pago dice "Confirmar canje · USD 100/mes". "Canje" implica cupón/puntos, no suscripción.
😖 Por qué molesta: En el paso más sensible (poner la tarjeta), el verbo confunde qué estoy aceptando.
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: "Confirmar y empezar prueba gratis" (hoy paga USD 0) o "Activar suscripción · USD 100/mes tras 7 días".
```
> Otros del funnel (Media): P05 validación silenciosa de Signup (no dice qué falta); P07 links de Términos/Privacidad = `#` muertos; P10 tarjeta validada solo por largo (acepta vencidas); P12 volver del checkout pierde la tarjeta cargada; P13 F5 en "cuenta activada" expulsa a /registro; P08 "Continuar al pago" choca con "7 días gratis". (Baja): P14 saludo de género fijo masculino; P15 "te enviamos un email" que no se envía; P16 "Saltar" del onboarding poco visible.

### 📱 Mobile y estados de error (375px)

```
[MOB1] [Navegación] — Mi carpeta y Biblioteca son inalcanzables en mobile
📍 AppShell · bottom nav (5 ítems) + header (Buscar/Notif/Perfil)
👀 Qué vi (verificado): bottom nav = Inicio/Asistente/Radar/Leyes/Briefing. No hay hamburguesa (hasHamburger:false). Los links a /biblioteca y /carpetas existen SOLO en el sidebar desktop, que está `hidden` en mobile.
😖 Por qué molesta: El que guardó algo en Mi carpeta desde el teléfono no tiene cómo volver. Una sección entera (lo "mío") desaparece en mobile.
🔥 Severidad: Alta   🔧 Esfuerzo: Bajo
✅ Recomendación: Agregar un 6º ítem "Más" (overflow) en la bottom nav con Biblioteca/Mi carpeta/Estadísticas, o un menú desde el avatar. Toda sección debe ser alcanzable en mobile.
```
```
[MOB2] [Responsive] — Leyes desborda el viewport en mobile (696px en 375)
📍 /leyes en 375px · grid de dos paneles
👀 Qué vi (verificado): documentElement.scrollWidth=696 vs clientWidth=375. El layout list+detalle no colapsa: títulos/excerpts cortados a la derecha, scroll horizontal, "Guardadas" tapado.
😖 Por qué molesta: La pantalla más densa del producto se vuelve ilegible en teléfono. Scroll lateral = señal universal de "roto".
🔥 Severidad: Alta   🔧 Esfuerzo: Medio
✅ Recomendación: En mobile, una sola columna: lista a pantalla completa; al tocar una ley, navegar a una vista de detalle dedicada (o full-screen drawer). El detalle no debe convivir con la lista <768px.
```
```
[MOB3] [Responsive] — La burbuja "¿Primera vez?" tapa contenido en mobile
📍 Home mobile · toast onboarding flotante
👀 Qué vi: "¿Primera vez? Te oriento en 30s" flota sobre las tarjetas, cubriendo una ("Projeto d… 4 ·"), justo encima de la bottom nav.
😖 Por qué molesta: Obstruye contenido real y aparece para un usuario recurrente (que ya conoce la app).
🔥 Severidad: Media   🔧 Esfuerzo: Bajo
✅ Recomendación: Recordar "No mostrar más" de verdad (persistir), no superponer a contenido en mobile, y no ofrecer "¿Primera vez?" a quien ya tiene historial/prefs.
```
> ✅ **Positivo:** deep-link a una norma inexistente (`/radar/zzz…`) muestra un estado de error excelente — "NORMA NO INDEXADA · Esta norma no está disponible en el corpus… Volver al Radar". Recuperación clara. (Nit Baja: "El identificador no **matchea**" → "no coincide con".)

---

## 5. Recomendaciones

### 🟢 Quick wins (Alta/Crítica + esfuerzo Bajo — esta semana)

1. **MOB1** · Agregar acceso a Mi carpeta/Biblioteca en mobile (ítem "Más" en bottom nav o menú del avatar).
2. **C01** · Dejar de sembrar Mi carpeta como si fueran guardados propios (o marcarlos "Ejemplos").
3. **C03** · Darles `body` a los seed de respuesta/brief/minuta para que abran (cero dead-ends en guardados).
4. **P03** · Login: respetar `postAuthTarget` y no re-mandar a Onboarding a quien ya está configurado.
5. **P06** · Destildar por defecto el checkbox de Términos (consentimiento explícito).
6. **R5 / R6 / R7 / R8 / H1** · Limpiezas de coherencia: que "¿Por qué importa?" no contradiga la relevancia; rotular bien la metadata; ocultar "Texto completo" vacío; deduplicar título⊆subtítulo.
7. **R4** · "ver" fuente → URL legible, no endpoint JSON.
8. **R1** · Frenar/creibilizar el goteo de contadores en vivo.
9. **PF1 / S02 / S03 / L02 / L03 / B03** · Microcopy y honestidad de números: temas que coincidan con prefs, "45 feeds" → conteo real, primario "Subir documento" no dead-end, sacar skeleton falso por tecleo, promesa de Briefing dinámica.
10. **P01/P02 / P07 / P09** · Funnel: contraseña con aviso de demo, recupero con mailto real, links legales reales, "Confirmar canje" → copy de suscripción.

### 🔵 Mejoras estratégicas (cambios de fondo)

1. **Verdad del contenido (la madre de todas).** LY1–LY3, R7, H2/R9, A1: el mayor riesgo del producto no es el diseño, es que **muestra datos placeholder/scrapeados como si fueran reales**. Plan: (a) pipeline que genere excerpts y resúmenes desde el cuerpo real; (b) marcar explícitamente "Texto no disponible aún" donde no lo haya, en vez de plantillas con `[corchetes]`; (c) aplicar PT→ES de forma consistente; (d) bajar la promesa del header de Leyes hasta que el corpus la sostenga. Sin esto, cada feature nueva amplifica la desconfianza.

2. **A2 — Render de citas del Asistente.** Es el corazón del value-prop ("fuentes verificables"). Las citas deben ser links clickeables que abren la norma. Extender el Markdown (links + itálica) o un componente de citaciones dedicado.

3. **MOB2 — Responsive de Leyes (y revisión mobile general).** Rediseñar el detalle de Leyes para mobile (navegación a vista dedicada, no dos paneles). Auditar el resto de pantallas densas a 375px como parte del Definition of Done.

4. **Sistema de relevancia y "Mi comisión".** R3, R10, H3, A1: la personalización promete mucho y hoy mete ruido (eventos protocolares como "alta", filtros que devuelven 58% del total). Endurecer scoring y match para que "lo mío" sea curado y creíble.

5. **Estados iniciales honestos.** S01 (Stats en cero), C01 (carpeta sembrada), B01 (Briefing con defaults ajenos): unificar un principio de producto — *el primer arranque nunca debe mentir*. Loading skeletons donde falte, empty states reales, defaults derivados de las prefs del usuario.

6. **Acciones destructivas seguras.** C02/C04: confirmación + "Deshacer" en todo lo que borra (ítems, carpetas, alertas), con targets de toque ≥44px.

---

### Apéndice · Cobertura del recorrido

| Escenario | Método | Estado |
|-----------|--------|--------|
| 1 · Primer ingreso (Login→Home) | Navegación live + código | ✅ |
| 2 · Radar (buscar/filtrar/leer + detalle) | Navegación live | ✅ |
| 3 · Asistente (consulta + acciones) | Navegación live | ✅ |
| 4 · Leyes (lista + detalle + articulado) | Navegación live | ✅ |
| 5 · Briefing pre-sesión | Código | ✅ |
| 6 · Configuración (Perfil/Prefs/Alertas) | Navegación live | ✅ |
| 7 · Recuperar info (Carpeta/Biblioteca/Stats) | Código + verificación live | ✅ |
| 8 · Error + mobile responsive | Navegación live (375px) | ✅ |

**Positivos confirmados en vivo:** B02 (institución dinámica por país ✓), PreferencesDrawer + detección de cambios ✓, OverflowActions en Asistente ✓, estado de error de norma no indexada ✓, sistema de diseño y jerarquía visual en desktop ✓.
