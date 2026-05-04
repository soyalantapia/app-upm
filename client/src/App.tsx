import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { ScanPage } from '@/pages/ScanPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { ConfirmationPage } from '@/pages/ConfirmationPage'
import { OrdersListPage } from '@/pages/OrdersListPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ScanPage />} />
          <Route path="pedidos" element={<OrdersListPage />} />
          <Route path="pedidos/:token" element={<OrderDetailPage />} />
          <Route path="pedidos/:token/confirmacion" element={<ConfirmationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
