// permissions · Mapeo de cargo (texto libre) a Role + permisos.
// Hoy el operator.cargo es free-text ("Legislador", "Senador", etc).
// Derivamos un Role discreto y un set de permisos para usar en guards.

export type Role = 'legislator' | 'staff' | 'admin'

export type Permission =
  | 'library:read'     // ver Biblioteca
  | 'library:write'    // subir/curar documentos institucionales
  | 'briefing:share'   // compartir briefings con equipo
  | 'alerts:create'    // crear alertas
  | 'profile:edit'     // editar perfil propio

const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  legislator: ['library:read', 'briefing:share', 'alerts:create', 'profile:edit'],
  staff: ['library:read', 'library:write', 'briefing:share', 'alerts:create', 'profile:edit'],
  admin: ['library:read', 'library:write', 'briefing:share', 'alerts:create', 'profile:edit'],
}

/**
 * Deriva un Role discreto del cargo (texto libre del Operator).
 * Default: legislator.
 */
export function roleOf(cargo: string | undefined | null): Role {
  if (!cargo) return 'legislator'
  const c = cargo.toLowerCase()
  if (c.includes('secretar')) return 'staff'
  if (c.includes('asesor')) return 'staff'
  if (c.includes('coordinador')) return 'staff'
  if (c.includes('admin')) return 'admin'
  return 'legislator'
}

/**
 * Devuelve si el cargo tiene un permiso dado.
 */
export function can(cargo: string | undefined | null, permission: Permission): boolean {
  const role = roleOf(cargo)
  return PERMISSIONS_BY_ROLE[role].includes(permission)
}

/**
 * Label legible del role.
 */
export function roleLabel(role: Role): string {
  switch (role) {
    case 'legislator': return 'Legislador'
    case 'staff': return 'Secretaría UPM'
    case 'admin': return 'Admin UPM'
  }
}
