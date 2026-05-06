import type { ChatMessage, Document } from './types'
import { DOCUMENTS } from './data'

const findDocs = (ids: string[]): { id: string; title: string; type: Document['type'] }[] =>
  ids
    .map(id => DOCUMENTS.find(d => d.id === id))
    .filter((d): d is Document => Boolean(d))
    .map(d => ({ id: d.id, title: d.title, type: d.type }))

const FALLBACK_BODY =
  '**Resumen ejecutivo**\n\n' +
  'Tomé tu consulta y la traduzco a un brief institucional. Te dejo los puntos centrales y los próximos pasos sugeridos.\n\n' +
  '1. Encuadre regional del tema y antecedentes UPM.\n' +
  '2. Marco normativo aplicable con foco comparado.\n' +
  '3. Riesgos y oportunidades para tu agenda.\n' +
  '4. Próximos pasos: pedir minuta, armar dossier o convocar foro.\n\n' +
  '**Sugerencia:** activá fuentes UPM para que la respuesta venga con respaldo institucional.'

type Pattern = {
  match: (q: string) => boolean
  body: string
  sources?: string[]
  isInstitutional?: boolean
}

const PATTERNS: Pattern[] = [
  {
    match: q => /corredor/i.test(q),
    isInstitutional: true,
    sources: ['d2', 'd12', 'd3', 'd4'],
    body:
      '**Resumen ejecutivo — Corredores bioceánicos**\n\n' +
      'Los principales puntos a considerar son:\n\n' +
      '1. Avances normativos recientes en infraestructura logística.\n' +
      '2. Temas más relevantes: financiamiento, aduanas y coordinación interjurisdiccional.\n' +
      '3. Antecedentes a revisar: Argentina, Brasil y Uruguay.\n' +
      '4. Preparar preguntas sobre plazos, organismos responsables y mecanismos de cooperación.\n\n' +
      '**Próximos pasos sugeridos**\n\n' +
      '- Convocar reunión técnica regional.\n' +
      '- Presentar dictamen comparado al Foro UPM.',
  },
  {
    match: q => /ambient|decreto|brasil/i.test(q) && /(explic|simple|cambi)/i.test(q),
    isInstitutional: true,
    sources: ['d8', 'd5', 'd1'],
    body:
      '**Explicación simple**\n\n' +
      'El decreto actualiza criterios de control ambiental para actividades productivas. Lo más relevante: incorpora nuevas obligaciones de reporte, seguimiento y coordinación con autoridades competentes.\n\n' +
      '**Puntos a revisar**\n\n' +
      '- Alcance territorial.\n' +
      '- Organismos responsables.\n' +
      '- Plazos de cumplimiento.\n' +
      '- Sanciones previstas.\n' +
      '- Impacto en provincias o estados fronterizos.',
  },
  {
    match: q => /ambient/i.test(q),
    isInstitutional: true,
    sources: ['d1', 'd5', 'd8'],
    body:
      '**Novedades de Ambiente — esta semana**\n\n' +
      '1. Brasil avanza con un decreto que actualiza criterios de control ambiental.\n' +
      '2. Uruguay mantiene su marco vigente de Protección Ambiental Regional.\n' +
      '3. Hay coincidencias técnicas entre los marcos normativos del cono sur.\n\n' +
      '**Recomendación:** abrir un dossier comparado y consultar al Foro de Medio Ambiente UPM.',
  },
  {
    match: q => /(brief|reuni[oó]n|preparar)/i.test(q),
    isInstitutional: true,
    sources: ['d2', 'd3', 'd4'],
    body:
      '**Brief de reunión**\n\n' +
      '- **Tema central:** integración regional y coordinación normativa.\n' +
      '- **Antecedentes:** documentos institucionales UPM y normativa comparada.\n' +
      '- **Preguntas para la mesa:** plazos, organismos responsables, financiamiento.\n' +
      '- **Posibles acuerdos:** minuta técnica, agenda de seguimiento, próxima reunión.\n\n' +
      '**Acciones disponibles:** guardar en carpeta, armar dossier, agregar a agenda.',
  },
  {
    match: q => /(1 página|una página|resumir|resumen)/i.test(q),
    isInstitutional: true,
    sources: ['d2', 'd5'],
    body:
      '**Resumen en 1 página**\n\n' +
      'El tema combina coordinación institucional, marco normativo y oportunidades de cooperación regional. Los actores principales son las comisiones legislativas, organismos técnicos y secretarías regionales. Los próximos hitos son la coordinación de criterios técnicos, la convocatoria al foro correspondiente y la generación de un dictamen comparado.\n\n' +
      'En términos prácticos, conviene preparar una minuta interna, identificar puntos de consenso y reservar tiempo para escuchar a contrapartes regionales antes de cerrar postura.',
  },
  {
    match: q => /(10 líneas|10 lineas|10líneas)/i.test(q),
    isInstitutional: true,
    sources: ['d2'],
    body:
      '**Resumen en 10 líneas**\n\n' +
      '1. Hay un tema regional con impacto cruzado entre países.\n' +
      '2. Existen marcos normativos heterogéneos.\n' +
      '3. La UPM tiene documentos institucionales relevantes.\n' +
      '4. Hay un foro temático activo con agenda concreta.\n' +
      '5. Las comisiones legislativas necesitan dictamen comparado.\n' +
      '6. Los riesgos principales son coordinación y plazos.\n' +
      '7. Las oportunidades son cooperación y reciprocidad técnica.\n' +
      '8. Los próximos hitos están definidos en agenda UPM.\n' +
      '9. Conviene preparar minuta y carpeta de trabajo.\n' +
      '10. Recomendación: trabajarlo dentro del Foro UPM correspondiente.',
  },
  {
    match: q => /(qué cambió|que cambio|cambios)/i.test(q),
    isInstitutional: true,
    sources: ['d8'],
    body:
      '**Qué cambió**\n\n' +
      '- Se ajustan criterios de control y reporte.\n' +
      '- Se incorporan obligaciones de coordinación con organismos.\n' +
      '- Se refuerzan plazos y responsabilidades.\n' +
      '- Se establece un marco común para zonas fronterizas.\n\n' +
      '**Impacto inmediato:** revisión de procedimientos internos y comunicación con contrapartes regionales.',
  },
  {
    match: q => /entrevista/i.test(q),
    isInstitutional: false,
    body:
      '**Puntos sugeridos para entrevista**\n\n' +
      '- La integración regional necesita herramientas prácticas, no solo declaraciones.\n' +
      '- La tecnología puede reducir tiempos y mejorar la calidad del trabajo legislativo.\n' +
      '- Una plataforma común permite conservar memoria institucional.\n' +
      '- El acceso a fuentes verificables fortalece la toma de decisiones.\n' +
      '- La UPM puede liderar una nueva etapa de cooperación legislativa digital.',
  },
  {
    match: q => /(fuente|biblioteca|documentos.*upm|qué tiene upm)/i.test(q),
    isInstitutional: true,
    sources: ['d1', 'd2', 'd3', 'd4'],
    body:
      '**Documentos encontrados en Biblioteca UPM**\n\n' +
      '1. Acta del Foro de Medio Ambiente.\n' +
      '2. Convenio de cooperación regional.\n' +
      '3. Informe técnico sobre integración logística.\n' +
      '4. Documento base sobre integración MERCOSUR.\n\n' +
      '**Resumen breve**\n\n' +
      'La documentación trabaja el tema desde una perspectiva de integración física, conectividad regional, comercio y coordinación institucional.',
  },
  {
    match: q => /(art[ií]culo|ley|qué dice)/i.test(q),
    isInstitutional: true,
    sources: ['d8'],
    body:
      '**Artículo relevante**\n\n' +
      'El documento establece obligaciones de reporte, coordinación institucional y evaluación periódica. El alcance abarca actividades productivas con impacto ambiental significativo y obliga a coordinación con organismos de control.\n\n' +
      '**Resumen ejecutivo**\n\n' +
      'La norma busca ordenar criterios ambientales, mejorar la trazabilidad de decisiones y fortalecer la coordinación entre organismos.',
  },
  {
    match: q => /(comisi[oó]n|comisión|preguntas)/i.test(q),
    isInstitutional: true,
    sources: ['d2', 'd3'],
    body:
      '**Preguntas para comisión**\n\n' +
      '- ¿Cuál es el alcance territorial del proyecto?\n' +
      '- ¿Qué organismos quedan a cargo de la implementación?\n' +
      '- ¿Cómo se coordina con países limítrofes?\n' +
      '- ¿Qué plazos están previstos?\n' +
      '- ¿Hay antecedentes regionales comparables?',
  },
  {
    match: q => /discurso/i.test(q),
    isInstitutional: false,
    body:
      '**Borrador de discurso**\n\n' +
      'Estimadas y estimados colegas. Hoy nos toca pensar la integración como un trabajo cotidiano. La región necesita decisiones con respaldo, herramientas con continuidad y diálogo permanente entre nuestros parlamentos.\n\n' +
      'Desde la UPM tenemos memoria institucional, marcos comunes y voluntad política. Sigamos construyendo cooperación efectiva, transparente y útil para nuestras sociedades.',
  },
]

export function generateAssistantResponse(question: string, options?: { force?: 'institucional' | 'general' }): ChatMessage {
  const trimmed = question.trim()
  const matched = PATTERNS.find(p => p.match(trimmed))
  const body = matched?.body ?? FALLBACK_BODY
  const isInstitutional = options?.force ? options.force === 'institucional' : Boolean(matched?.isInstitutional)
  const sources = matched?.sources ? findDocs(matched.sources) : undefined
  return {
    id: 'm' + Math.random().toString(36).slice(2, 9),
    role: 'assistant',
    content: body,
    sources: isInstitutional ? sources : undefined,
    isInstitutional,
    createdAt: new Date().toISOString(),
  }
}
