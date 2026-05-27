import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OverflowActions } from '@/components/OverflowActions'

describe('OverflowActions', () => {
  it('renderiza solo los primeros N children inline', () => {
    render(
      <OverflowActions visibleCount={2}>
        <button>Uno</button>
        <button>Dos</button>
        <button>Tres</button>
        <button>Cuatro</button>
      </OverflowActions>,
    )
    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.getByText('Dos')).toBeInTheDocument()
    // Tres y Cuatro están en el menu cerrado
    expect(screen.queryByText('Tres')).not.toBeInTheDocument()
    expect(screen.queryByText('Cuatro')).not.toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  it('al hacer click en "Más" muestra el overflow', () => {
    render(
      <OverflowActions visibleCount={1}>
        <button>Uno</button>
        <button>Dos</button>
        <button>Tres</button>
      </OverflowActions>,
    )
    expect(screen.queryByText('Dos')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Más'))
    expect(screen.getByText('Dos')).toBeInTheDocument()
    expect(screen.getByText('Tres')).toBeInTheDocument()
  })

  it('no renderiza botón "Más" si hay <= visibleCount children', () => {
    render(
      <OverflowActions visibleCount={3}>
        <button>Uno</button>
        <button>Dos</button>
      </OverflowActions>,
    )
    expect(screen.queryByText('Más')).not.toBeInTheDocument()
  })
})
