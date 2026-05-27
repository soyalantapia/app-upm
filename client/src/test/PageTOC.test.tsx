import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTOC } from '@/components/PageTOC'

describe('PageTOC', () => {
  it('no renderiza nada si hay < 3 secciones', () => {
    const { container } = render(
      <PageTOC sections={[
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]} />,
    )
    // Solo se renderiza si hay 3+ secciones
    expect(container.querySelector('button[aria-label="Tabla de contenidos"]')).toBeNull()
  })

  it('renderiza chip "Secciones" si hay 3+ secciones', () => {
    render(
      <PageTOC sections={[
        { id: 'a', label: 'Genealogía' },
        { id: 'b', label: 'Impacto' },
        { id: 'c', label: 'Articulado' },
      ]} />,
    )
    // Hay un chip mobile + un rail desktop · puede aparecer N veces, getAllByText
    const matches = screen.getAllByText(/Secciones/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
