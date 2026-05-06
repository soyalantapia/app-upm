import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { AppShell } from '@/layouts/AppShell'
import { Toasts } from '@/components/Toasts'
import { LoginPage } from '@/pages/Login'
import { OnboardingPage } from '@/pages/Onboarding'
import { HomePage } from '@/pages/Home'
import { AssistantPage } from '@/pages/Assistant'
import { RadarPage } from '@/pages/Radar'
import { NewsConversationPage } from '@/pages/NewsConversation'
import { LawsPage } from '@/pages/Laws'
import { LibraryPage } from '@/pages/Library'
import { FoldersPage } from '@/pages/Folders'
import { DossierPage } from '@/pages/Dossier'
import { DossiersListPage } from '@/pages/DossiersList'
import { ComparePage } from '@/pages/Compare'
import { ProfilePage } from '@/pages/Profile'
import { AgendaPage } from '@/pages/Agenda'
import { ForumsPage } from '@/pages/Forums'
import { AdminPage } from '@/pages/Admin'

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const onboarded = useStore(s => s.onboarded)
  const { operator } = useAuth()
  if (!operator) return <>{children}</>
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Toasts />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <OnboardingGate>
                  <AppShell />
                </OnboardingGate>
              </RequireAuth>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="asistente" element={<AssistantPage />} />
            <Route path="radar" element={<RadarPage />} />
            <Route path="radar/:id" element={<NewsConversationPage />} />
            <Route path="leyes" element={<LawsPage />} />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route path="carpetas" element={<FoldersPage />} />
            <Route path="dossiers" element={<DossiersListPage />} />
            <Route path="dossiers/:id" element={<DossierPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="foros" element={<ForumsPage />} />
            <Route path="comparativa" element={<ComparePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="perfil" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
