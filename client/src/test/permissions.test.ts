import { describe, it, expect } from 'vitest'
import { roleOf, can, roleLabel } from '@/lib/permissions'

describe('permissions', () => {
  describe('roleOf', () => {
    it('default a legislator si no hay cargo', () => {
      expect(roleOf(undefined)).toBe('legislator')
      expect(roleOf(null)).toBe('legislator')
      expect(roleOf('')).toBe('legislator')
    })

    it('detecta Secretaría UPM', () => {
      expect(roleOf('Secretaría UPM')).toBe('staff')
      expect(roleOf('secretaria upm')).toBe('staff')
    })

    it('detecta Asesor parlamentario como staff', () => {
      expect(roleOf('Asesor parlamentario')).toBe('staff')
    })

    it('detecta Coordinador como staff', () => {
      expect(roleOf('Coordinador de foro')).toBe('staff')
    })

    it('Legislador / Senador / Diputado → legislator', () => {
      expect(roleOf('Legislador')).toBe('legislator')
      expect(roleOf('Senador')).toBe('legislator')
      expect(roleOf('Diputado')).toBe('legislator')
    })
  })

  describe('can', () => {
    it('legislator no puede escribir biblioteca', () => {
      expect(can('Legislador', 'library:write')).toBe(false)
    })
    it('staff puede escribir biblioteca', () => {
      expect(can('Secretaría UPM', 'library:write')).toBe(true)
      expect(can('Asesor parlamentario', 'library:write')).toBe(true)
    })
    it('todos pueden leer biblioteca', () => {
      expect(can('Legislador', 'library:read')).toBe(true)
      expect(can('Secretaría UPM', 'library:read')).toBe(true)
    })
  })

  describe('roleLabel', () => {
    it('devuelve label legible', () => {
      expect(roleLabel('legislator')).toBe('Legislador')
      expect(roleLabel('staff')).toBe('Secretaría UPM')
      expect(roleLabel('admin')).toBe('Admin UPM')
    })
  })
})
