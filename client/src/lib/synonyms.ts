// Q-expansion · diccionario de sinónimos legales/temáticos en ES y PT.
// Cuando un usuario busca "género" también queremos matchear "mujer", "femenina",
// "paridad", "violencia de género", etc. Esto mejora drásticamente recall.

const SYNONYM_GROUPS: string[][] = [
  // Energía
  ['energia', 'electrica', 'electricidad', 'gas', 'combustible', 'petroleo', 'renovable', 'hidrogeno', 'cammesa', 'enarsa', 'enargas', 'enre', 'edenor', 'edesur', 'ute', 'tarifa'],
  // Ambiente
  ['ambiente', 'ambiental', 'ecologico', 'sustentable', 'sostenible', 'cambio climatico', 'biodiversidad', 'bosque', 'humedal', 'residuo', 'contaminacion', 'pesca', 'mineria'],
  // Género
  ['genero', 'mujer', 'mujeres', 'femenina', 'feminismo', 'paridad', 'violencia de genero', 'micaela', 'trata', 'identidad de genero', 'lgbt', 'diversidad sexual'],
  // Educación
  ['educacion', 'educativo', 'docente', 'maestro', 'escolar', 'escuela', 'universitario', 'universidad', 'investigacion', 'cientifico', 'conicet', 'incentivo docente'],
  // Salud
  ['salud', 'sanitario', 'hospital', 'medico', 'enfermeria', 'medicamento', 'anmat', 'pandemia', 'epidemia', 'vacuna', 'farmaceutico', 'obra social'],
  // Trabajo
  ['trabajo', 'laboral', 'empleo', 'sindicato', 'paritaria', 'convenio colectivo', 'cct', 'jornada', 'teletrabajo', 'salario', 'jubilacion', 'previsional', 'movilidad jubilatoria', 'cuidados'],
  // Seguridad
  ['seguridad', 'policia', 'fuerzas armadas', 'defensa', 'delito', 'penal', 'narcotrafico', 'lavado de activos', 'orden publico', 'gendarmeria', 'prefectura'],
  // Economía
  ['economia', 'tributario', 'impuesto', 'fiscal', 'presupuesto', 'inflacion', 'monetario', 'cambiario', 'bcra', 'afip', 'arca', 'recaudacion', 'iva', 'ganancias', 'aduana'],
  // Justicia
  ['justicia', 'judicial', 'tribunal', 'fallo', 'sentencia', 'csjn', 'corte suprema', 'derecho', 'codigo penal', 'codigo civil', 'consejo de la magistratura'],
  // Vivienda
  ['vivienda', 'inmueble', 'inmobiliario', 'alquiler', 'procrear', 'habitacional', 'urbano'],
  // Transporte
  ['transporte', 'ferroviario', 'aerocomercial', 'vialidad', 'autopista', 'subte', 'colectivo', 'micros', 'taxis', 'remis', 'mercosur transporte', 'corredores bioceanicos'],
  // Internet / tecnología
  ['internet', 'telecomunicacion', 'banda ancha', 'fibra optica', '5g', 'tecnologia', 'digital', 'datos personales', 'gdpr', 'inteligencia artificial', 'algoritmo', 'enacom'],
  // Pueblos originarios
  ['indigena', 'pueblos originarios', 'comunidad ancestral', 'mapuche', 'wichi', 'quechua', 'guarani'],
  // Comercio exterior
  ['comercio exterior', 'aduana', 'arancel', 'mercosur', 'mercosul', 'exportacion', 'importacion', 'union aduanera'],
  // Hidrocarburos
  ['hidrocarburos', 'petroleo', 'gas natural', 'gnc', 'glp', 'vaca muerta', 'shale', 'ypf'],
  // Discapacidad
  ['discapacidad', 'inclusion', 'accesibilidad', 'derechos', 'andis', 'pension no contributiva'],
  // Drogas
  ['drogas', 'estupefacientes', 'narcotrafico', 'sedronar', 'consumo problematico'],
]

// Pre-compilar mapa palabra → grupo (lowercase, sin diacríticos)
const wordToGroup = new Map<string, number>()
SYNONYM_GROUPS.forEach((group, idx) => {
  for (const term of group) wordToGroup.set(term, idx)
})

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Dado un query del usuario, devolver el query original + términos sinónimos
// agregados. Útil para búsqueda full-text.
export function expandQuery(query: string): string[] {
  const norm = normalize(query.trim())
  if (norm.length < 3) return [query]
  const out = new Set<string>([norm])
  for (const [term, groupIdx] of wordToGroup) {
    if (norm.includes(term) || term.includes(norm)) {
      for (const synonym of SYNONYM_GROUPS[groupIdx]) {
        out.add(synonym)
      }
    }
  }
  return Array.from(out)
}

// Match con cualquier sinónimo del query expandido contra el haystack.
export function matchesQuery(haystack: string, query: string): boolean {
  const normHay = normalize(haystack)
  const terms = expandQuery(query)
  return terms.some(t => normHay.includes(t))
}
