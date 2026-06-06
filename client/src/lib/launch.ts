// Alcance del lanzamiento · flags para ocultar features que no salen en esta
// versión, sin borrar el código (para reactivarlas después con un solo cambio).
//
// Las secciones Briefing / Biblioteca / Mi carpeta / Estadísticas se ocultan
// de la navegación en AppShell (sus rutas siguen existiendo para no romper
// deep-links). Acá quedan las features transversales que dependían de ellas.
export const LAUNCH = {
  // Botón "Guardar" del Asistente y del detalle de noticia: guardan a Mi
  // carpeta (oculta) → sin destino visible, por eso apagados.
  // OJO: Leyes tiene su PROPIO guardado + pestaña "Guardadas" dentro de la
  // página (siempre activo, no depende de este flag).
  // Poné en true para reactivar los de Asistente/Noticia.
  saveToFolder: false as boolean,
}
