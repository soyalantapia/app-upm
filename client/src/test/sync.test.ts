import { describe, it, expect, beforeEach } from 'vitest'
import {
  sync,
  setSyncAdapter,
  getSyncAdapter,
  createMemoryAdapter,
} from '@/lib/sync'

describe('sync', () => {
  beforeEach(() => {
    // Reset to memory adapter para no contaminar localStorage entre tests
    setSyncAdapter(createMemoryAdapter())
  })

  it('read devuelve null para key inexistente', () => {
    expect(sync.read('inexistente')).toBeNull()
  })

  it('write + read roundtrip', () => {
    sync.write('k', { a: 1, b: 'dos' })
    expect(sync.read('k')).toEqual({ a: 1, b: 'dos' })
  })

  it('clear elimina la key', () => {
    sync.write('k', 'value')
    expect(sync.read('k')).toBe('value')
    sync.clear('k')
    expect(sync.read('k')).toBeNull()
  })

  it('setSyncAdapter intercambia el adapter', () => {
    const memA = createMemoryAdapter()
    const memB = createMemoryAdapter()

    setSyncAdapter(memA)
    sync.write('shared', 'in-a')

    setSyncAdapter(memB)
    expect(sync.read('shared')).toBeNull()  // B no tiene la key
  })

  // localStorageAdapter no se testea aquí porque jsdom desactiva
  // window.localStorage en algunos entornos · se valida implícitamente
  // en producción.

  it('getSyncAdapter devuelve el adapter activo', () => {
    const mem = createMemoryAdapter()
    setSyncAdapter(mem)
    expect(getSyncAdapter()).toBe(mem)
  })
})
