import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { CountryCode, Operator } from './types'
import { DEMO_OPERATOR } from './data'

type AuthContextValue = {
  operator: Operator | null
  ready: boolean
  signIn: (email: string) => Operator
  signOut: () => void
  updateOperator: (patch: Partial<Operator>) => void
}

const AUTH_KEY = 'upm.app.operator'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readOperator(): Operator | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Operator
  } catch {
    return null
  }
}

function deriveName(email: string): { name: string; cargo: string; pais: CountryCode } {
  if (!email) return { name: DEMO_OPERATOR.name, cargo: DEMO_OPERATOR.cargo, pais: DEMO_OPERATOR.pais }
  if (email.toLowerCase().includes('martin') || email.toLowerCase().includes('pereira')) {
    return { name: DEMO_OPERATOR.name, cargo: DEMO_OPERATOR.cargo, pais: DEMO_OPERATOR.pais }
  }
  const handle = email.split('@')[0] ?? ''
  const parts = handle.split(/[.\-_]+/).filter(Boolean)
  const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Legislador'
  return { name: `Dr. ${name}`, cargo: 'Legislador', pais: 'UY' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setOperator(readOperator())
    setReady(true)
  }, [])

  const signIn = useCallback((email: string) => {
    const { name, cargo, pais } = deriveName(email)
    const op: Operator = {
      email: email || DEMO_OPERATOR.email,
      name,
      cargo,
      pais,
      loggedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(op))
    setOperator(op)
    return op
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(AUTH_KEY)
    setOperator(null)
  }, [])

  const updateOperator = useCallback((patch: Partial<Operator>) => {
    setOperator(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ operator, ready, signIn, signOut, updateOperator }),
    [operator, ready, signIn, signOut, updateOperator],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { operator, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!operator) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
