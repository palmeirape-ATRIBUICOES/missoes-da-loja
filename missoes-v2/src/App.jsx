import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { StoreProvider } from './hooks/useStore'
import Login from './pages/Login'
import ManagerDashboard from './pages/manager/Dashboard'
import EmployeeDashboard from './pages/employee/Dashboard'
import PDV from './pages/pdv/PDV'
import Products from './pages/manager/Products'
import Team from './pages/manager/Team'
import Globals from './pages/manager/Globals'
import Tasks from './pages/manager/Tasks'
import Config from './pages/manager/Config'
import Feedback from './pages/manager/Feedback'
import Paystubs from './pages/manager/Paystubs'
import PublicStore from './pages/PublicStore'
import PermissionsRequest from './components/PermissionsRequest'
import LabelsGenerator from './pages/manager/LabelsGenerator'
import CustomerRegister from './pages/customer/CustomerRegister'
import CustomerLogin from './pages/customer/CustomerLogin'
import CustomerStore from './pages/customer/CustomerStore'
import CustomerOrderDetails from './pages/customer/CustomerOrderDetails'
import Customers from './pages/manager/Customers'
import DeliverySlots from './pages/manager/DeliverySlots'
import CustomerOrders from './pages/manager/CustomerOrders'

import { useStore } from './hooks/useStore'

function ProductsPage() { const n = useNavigate(); return <Products onBack={() => n('/gerente')} /> }
function CustomersPage() { const n = useNavigate(); return <Customers onBack={() => n('/gerente')} /> }
function DeliverySlotsPage() { const n = useNavigate(); return <DeliverySlots onBack={() => n('/gerente')} /> }
function CustomerOrdersPage() { const n = useNavigate(); return <CustomerOrders onBack={() => n('/gerente')} /> }
function ProductsPageFunc() {
  const n = useNavigate()
  const { currentUser, isManager } = useAuth()
  const { employees } = useStore()
  const currentEmp = employees.find(e => e.name === currentUser)
  const hasAccess = isManager || currentEmp?.canEditPrices

  if (!hasAccess) {
    return <Navigate to="/funcionario" replace />
  }
  return <Products onBack={() => n('/funcionario')} />
}
function PDVRoute() {
  const { currentUser, isManager } = useAuth()
  const { employees } = useStore()
  const currentEmp = employees.find(e => e.name === currentUser)
  const hasAccess = isManager || currentEmp?.canAccessPdv

  if (!hasAccess) {
    return <Navigate to="/funcionario" replace />
  }
  return <PDV />
}
function LabelsPage() { const n = useNavigate(); return <LabelsGenerator onBack={() => n('/gerente')} /> }
function TeamPage() { const n = useNavigate(); return <Team onBack={() => n('/gerente')} /> }
function GlobalsPage() { const n = useNavigate(); return <Globals onBack={() => n('/gerente')} /> }
function TasksPage() { const n = useNavigate(); return <Tasks onBack={() => n('/gerente')} /> }
function ConfigPage() { const n = useNavigate(); return <Config onBack={() => n('/gerente')} /> }
function FeedbackPage() { const n = useNavigate(); return <Feedback onBack={() => n('/gerente')} /> }
function PaystubsPage() { const n = useNavigate(); return <Paystubs onBack={() => n('/gerente')} /> }

function AppRoutes() {
  const { currentUser, isManager, loading, firebaseUser } = useAuth()
  const location = useLocation()

  if (location.pathname.startsWith('/cliente/')) {
    return (
      <StoreProvider>
        <Routes>
          <Route path="/cliente/:storeId" element={<PublicStore />} />
          <Route path="/cliente/:storeId/cadastro" element={<CustomerRegister />} />
          <Route path="/cliente/:storeId/login" element={<CustomerLogin />} />
          <Route path="/cliente/:storeId/loja" element={<CustomerStore />} />
          <Route path="/cliente/:storeId/pedido/:orderId" element={<CustomerOrderDetails />} />
        </Routes>
      </StoreProvider>
    )
  }

  if (loading || !firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.08), transparent 70%), #f8fafc' }}>
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', animation: 'pulse-brand 2s infinite' }}>
            <span className="text-3xl">🎯</span>
          </div>
          <div className="font-bold text-gray-900 text-lg">Missões da Loja</div>
          <div className="text-sm text-gray-500 mt-1">Carregando...</div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login mode={location.pathname.startsWith('/pdv') ? 'pdv' : 'app'} />
  }

  return (
    <StoreProvider>
      <PermissionsRequest />
      <Routes>
        <Route path="/pdv" element={<PDVRoute />} />
        <Route path="/gerente" element={isManager ? <ManagerDashboard /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/produtos" element={isManager ? <ProductsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/etiquetas" element={isManager ? <LabelsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/equipe" element={isManager ? <TeamPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/globais" element={isManager ? <GlobalsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/tarefas" element={isManager ? <TasksPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/config" element={isManager ? <ConfigPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/feedback" element={isManager ? <FeedbackPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/contracheques" element={isManager ? <PaystubsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/clientes" element={isManager ? <CustomersPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/entregas" element={isManager ? <DeliverySlotsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/pedidos-clientes" element={isManager ? <CustomerOrdersPage /> : <Navigate to="/funcionario" />} />
        <Route path="/funcionario" element={!isManager ? <EmployeeDashboard /> : <Navigate to="/gerente" />} />
        <Route path="/funcionario/produtos" element={!isManager ? <ProductsPageFunc /> : <Navigate to="/gerente" />} />
        <Route path="*" element={<Navigate to={location.pathname.startsWith('/pdv') ? '/pdv' : (isManager ? '/gerente' : '/funcionario')} />} />
      </Routes>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
