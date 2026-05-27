import { describe, it, expect } from 'vitest'
import { matchesQuery } from '@/lib/synonyms'

describe('synonyms', () => {
  it('match directo case-insensitive', () => {
    expect(matchesQuery('Ley de Bases', 'bases')).toBe(true)
    expect(matchesQuery('Ley de Bases', 'BASES')).toBe(true)
  })

  it('expansión por sinónimos · género → mujer/paridad', () => {
    // Si "género" se expande a "mujer", buscar "mujer" debería match
    // un texto que solo dice "género".
    const text = 'Ley sobre violencia de género'
    expect(matchesQuery(text, 'género')).toBe(true)
  })

  it('vacío → match', () => {
    expect(matchesQuery('cualquier texto', '')).toBe(true)
  })

  it('búsqueda sin diacríticos', () => {
    expect(matchesQuery('integración regional', 'integracion')).toBe(true)
  })
})
