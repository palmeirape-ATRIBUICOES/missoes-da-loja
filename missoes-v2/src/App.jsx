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

function ProductsPage() { const n = useNavigate(); return <Products onBack={() => n('/gerente')} /> }
function TeamPage() { const n = useNavigate(); return <Team onBack={() => n('/gerente')} /> }
function GlobalsPage() { const n = useNavigate(); return <Globals onBack={() => n('/gerente')} /> }
function TasksPage() { const n = useNavigate(); return <Tasks onBack={() => n('/gerente')} /> }

function AppRoutes() {
  const { currentUser, isManager, loading, firebaseUser } = useAuth()
  const location = useLocation()

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
      <Routes>
        <Route path="/pdv" element={<PDV />} />
        <Route path="/gerente" element={isManager ? <ManagerDashboard /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/produtos" element={isManager ? <ProductsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/equipe" element={isManager ? <TeamPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/globais" element={isManager ? <GlobalsPage /> : <Navigate to="/funcionario" />} />
        <Route path="/gerente/tarefas" element={isManager ? <TasksPage /> : <Navigate to="/funcionario" />} />
        <Route path="/funcionario" element={!isManager ? <EmployeeDashboard /> : <Navigate to="/gerente" />} />
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
