import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ToastContainer from './components/common/Toast'

// Layout
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute, { SuperadminRoute } from './components/layout/ProtectedRoute'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import RecoverPasswordPage from './pages/auth/RecoverPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Client pages
import DashboardPage from './pages/client/DashboardPage'
import ProductsPage from './pages/client/ProductsPage'
import ProductFormPage from './pages/client/ProductFormPage'
import CategoriesPage from './pages/client/CategoriesPage'
import OrdersPage from './pages/client/OrdersPage'
import OrderDetailPage from './pages/client/OrderDetailPage'
import CustomersPage from './pages/client/CustomersPage'
import CouponsPage from './pages/client/CouponsPage'
import SchedulePage from './pages/client/SchedulePage'
import PaymentsPage from './pages/client/PaymentsPage'
import SettingsPage from './pages/client/SettingsPage'

// Superadmin pages (Legacy)
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard'
import TenantsPage from './pages/superadmin/TenantsPage'
import UsersPage from './pages/superadmin/UsersPage'

// Superadmin pages (New /sa)
import SuperadminLayout from './components/layout/SuperadminLayout'
import SAOverviewPage from './pages/superadmin/SAOverviewPage'
import SATenantsPage from './pages/superadmin/SATenantsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          {/* Rutas públicas (Auth) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recover-password" element={<RecoverPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Rutas protegidas del cliente */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/edit/:id" element={<ProductFormPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/horarios" element={<SchedulePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Rutas protegidas del superadmin (NUEVA CONSOLA /sa) */}
          <Route
            element={
              <SuperadminRoute>
                <SuperadminLayout />
              </SuperadminRoute>
            }
          >
            <Route path="/sa/overview" element={<SAOverviewPage />} />
            <Route path="/sa/tenants" element={<SATenantsPage />} />
            <Route path="/sa/subscriptions" element={<div className="p-10 font-bold">Módulo de Suscripciones (Próximamente)</div>} />
            <Route path="/sa/payments" element={<div className="p-10 font-bold">Módulo de Pagos (Próximamente)</div>} />
            <Route path="/sa/permissions" element={<div className="p-10 font-bold">Gestión de Roles (Próximamente)</div>} />
            <Route path="/sa/stats" element={<div className="p-10 font-bold">KPIs & Stats (Próximamente)</div>} />
            <Route path="/sa/settings" element={<div className="p-10 font-bold">Configuración Global (Próximamente)</div>} />

            {/* Alias para el dashboard de entrada */}
            <Route path="/sa" element={<Navigate to="/sa/overview" replace />} />
          </Route>

          {/* Legacy Superadmin routes */}
          <Route
            element={
              <SuperadminRoute>
                <AppLayout />
              </SuperadminRoute>
            }
          >
            <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
            <Route path="/superadmin/tenants" element={<TenantsPage />} />
            <Route path="/superadmin/users" element={<UsersPage />} />
          </Route>

          {/* Redirigir raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
