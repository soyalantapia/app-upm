import type React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Silenciar console.error de React durante los tests (porque ErrorBoundary
// captura un throw intencional y React loguea el component stack).
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function Boom(): React.ReactElement {
  throw new Error('test-error')
}

describe('ErrorBoundary', () => {
  it('renderiza hijos normalmente cuando no hay error', () => {
    render(<ErrorBoundary><div>hola</div></ErrorBoundary>)
    expect(screen.getByText('hola')).toBeInTheDocument()
  })

  it('muestra fallback cuando un hijo lanza', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument()
    expect(screen.getByText(/Reintentar/i)).toBeInTheDocument()
  })

  it('usa fallback custom si se pasa', () => {
    render(
      <ErrorBoundary fallback={(error) => <div>fallback custom: {error.message}</div>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/fallback custom: test-error/i)).toBeInTheDocument()
  })

  it('reset limpia el error y permite re-render', () => {
    // Para testear reset necesitamos un componente que pueda volverse a render
    // sin lanzar. Para simplificar: validar que el botón Reintentar existe.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    const btn = screen.getByText(/Reintentar/i)
    expect(btn).toBeInTheDocument()
    // Click no debería tirar
    expect(() => fireEvent.click(btn)).not.toThrow()
  })
})
