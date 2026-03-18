import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import RouteLoader from './components/common/RouteLoader'
import ToastContainer from './components/common/Toast'

// Layout (Estáticos para mayor estabilidad en el core)
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute, { SuperadminRoute, EmpresaRoute } from './components/layout/ProtectedRoute'
import SuperadminLayout from './components/layout/SuperadminLayout'

// Auth pages (Estáticos: El core de auth debe ser instantáneo)
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import RecoverPasswordPage from './pages/auth/RecoverPasswordPage'
import SelectStorePage from './pages/auth/SelectStorePage'

// Client pages (Lazy)
const DashboardPage = lazy(() => import('./pages/client/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/client/ProductsPage'))
const ProductFormPage = lazy(() => import('./pages/client/ProductFormPage'))
const CategoriesPage = lazy(() => import('./pages/client/CategoriesPage'))
const OrdersPage = lazy(() => import('./pages/client/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/client/OrderDetailPage'))
const CustomersPage = lazy(() => import('./pages/client/CustomersPage'))
const CrmIaPage = lazy(() => import('./pages/client/CrmIaPage'))
const CouponsPage = lazy(() => import('./pages/client/CouponsPage'))
const CouponFormPage = lazy(() => import('./pages/client/CouponFormPage'))
const SchedulePage = lazy(() => import('./pages/client/SchedulePage'))
const SubscriptionPage = lazy(() => import('./pages/client/SubscriptionPage'))
const SettingsPage = lazy(() => import('./pages/client/SettingsPage'))
const BotConfigPage = lazy(() => import('./pages/client/BotConfigPage'))
const LogisticsPage = lazy(() => import('./pages/client/LogisticsPage'))
const QRPage = lazy(() => import('./pages/client/QRPage'))
const SlidersPage = lazy(() => import('./pages/client/SlidersPage'))
const PopupsPage = lazy(() => import('./pages/client/PopupsPage'))
const HelpPage = lazy(() => import('./pages/client/HelpPage'))
const AIImporterPage = lazy(() => import('./pages/client/AIImporterPage'))
const StatsPage = lazy(() => import('./pages/client/StatsPage'))
const AIAssistantPage = lazy(() => import('./pages/client/AIAssistantPage'))
const StatsIAPage = lazy(() => import('./pages/client/StatsIAPage'))
const WhatsAppBotPage = lazy(() => import('./pages/client/WhatsAppBotPage'))
const BulkPriceEditorPage = lazy(() => import('./pages/client/BulkPriceEditorPage'))
const POSPage = lazy(() => import('./pages/client/POSPage'))
const LegalPage = lazy(() => import('./pages/legal/LegalPage'))

// Empresa portal
const EmpresaPage = lazy(() => import('./pages/empresa/EmpresaPage'))

// Superadmin pages (Lazy)
const SuperadminDashboard = lazy(() => import('./pages/superadmin/SuperadminDashboard'))
const TenantsPage = lazy(() => import('./pages/superadmin/TenantsPage'))
const UsersPage = lazy(() => import('./pages/superadmin/UsersPage'))

// New Superadmin pages (Lazy)
const SAOverviewPage = lazy(() => import('./pages/superadmin/SAOverviewPage'))
const SATenantsPage = lazy(() => import('./pages/superadmin/SATenantsPage'))
const SATenantDetailPage = lazy(() => import('./pages/superadmin/SATenantDetailPage'))
const SAPaymentsPage = lazy(() => import('./pages/superadmin/SAPaymentsPage'))
const SASubscriptionsPage = lazy(() => import('./pages/superadmin/SASubscriptionsPage'))
const SAPermissionsPage = lazy(() => import('./pages/superadmin/SAPermissionsPage'))
const SAStatsPage = lazy(() => import('./pages/superadmin/SAStatsPage'))
const SALiquidationsPage = lazy(() => import('./pages/superadmin/SALiquidationsPage'))
const SASettingsPage = lazy(() => import('./pages/superadmin/SASettingsPage'))

function RoleRedirect() {
  const { user, loading, isSuperadmin, isEmpresa, selectedStoreId } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (isEmpresa) return <Navigate to="/empresa" replace />

  if (isSuperadmin) {
    // Si el superadmin seleccionó una tienda para trabajar, ir al dashboard de esa cada
    if (selectedStoreId) return <Navigate to="/dashboard" replace />
    // Por defecto ir al SELECTOR para que pueda elegir o ir a su consola
    return <Navigate to="/select-store" replace />
  }

  // Si es cliente, verificar si ya seleccionó una tienda
  if (!selectedStoreId) {
    return <Navigate to="/select-store" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <ToastContainer />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            {/* Rutas públicas (Auth) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/recover-password" element={<RecoverPasswordPage />} />
            <Route path="/select-store" element={<SelectStorePage />} />
            <Route path="/legal/:type" element={<LegalPage />} />

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
              <Route path="/crm-ia" element={<CrmIaPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/coupons/new" element={<CouponFormPage />} />
              <Route path="/coupons/edit/:id" element={<CouponFormPage />} />
              <Route path="/horarios" element={<SchedulePage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/bot" element={<BotConfigPage />} />
              <Route path="/logistics" element={<LogisticsPage />} />
              <Route path="/qr" element={<QRPage />} />
              <Route path="/sliders" element={<SlidersPage />} />
              <Route path="/popups" element={<PopupsPage />} />
              <Route path="/ayuda" element={<HelpPage />} />
              <Route path="/ai-importer" element={<AIImporterPage />} />
              <Route path="/ai-intelligence" element={<AIAssistantPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/stats-ia" element={<StatsIAPage />} />
              <Route path="/whatsapp-bot" element={<WhatsAppBotPage />} />
              <Route path="/bulk-prices" element={<BulkPriceEditorPage />} />
              <Route path="/pos" element={<POSPage />} />

              {/* Redirigir root del merchant a dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
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
              <Route path="/sa/tenants/:id" element={<SATenantDetailPage />} />
              <Route path="/sa/subscriptions" element={<SASubscriptionsPage />} />
              <Route path="/sa/payments" element={<SAPaymentsPage />} />
              <Route path="/sa/permissions" element={<SAPermissionsPage />} />
              <Route path="/sa/stats" element={<SAStatsPage />} />
              <Route path="/sa/liquidations" element={<SALiquidationsPage />} />
              <Route path="/sa/settings" element={<SASettingsPage />} />

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

            {/* Portal empresa */}
            <Route
              path="/empresa"
              element={
                <EmpresaRoute>
                  <EmpresaPage />
                </EmpresaRoute>
              }
            />

            {/* Redirigir raíz al login o dashboard según rol */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
