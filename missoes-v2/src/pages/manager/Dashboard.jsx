import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, normalizeWeekKeyLoose } from '../../utils/constants'
import { useNavigate } from 'react-router-dom'

export default function ManagerDashboard() {
  const { currentUser, store, logout } = useAuth()
  const { currentWeekKey, globalsWeek, globalsOpen, tasksAll, activeEmployees, products, pdvSales, feedbackAll } = useStore()
  const navigate = useNavigate()

  const todaySales = pdvSales.filter(s => {
    const d = s.createdAtHuman?.split(',')[0]?.trim()
    return d === new Date().toLocaleDateString('pt-BR')
  })
  const todayRevenue = todaySales.reduce((s, v) => s + (v.total || 0), 0)

  const tabs = [
    { key: 'pdv', icon: '🖥️', label: 'Abrir PDV', color: 'from-emerald-500 to-emerald-600', action: () => navigate('/pdv') },
    { key: 'tarefas', icon: '📋', label: 'Tarefas', color: 'from-blue-500 to-blue-600', badge: tasksAll.length, action: () => navigate('/gerente/tarefas') },
    { key: 'globais', icon: '🎯', label: 'Globais', color: 'from-purple-500 to-purple-600', badge: globalsOpen.length, action: () => navigate('/gerente/globais') },
    { key: 'produtos', icon: '📦', label: 'Produtos', color: 'from-orange-500 to-orange-600', badge: products.length, action: () => navigate('/gerente/produtos') },
    { key: 'etiquetas', icon: '🏷️', label: 'Etiquetas', color: 'from-pink-500 to-pink-600', action: () => navigate('/gerente/etiquetas') },
    { key: 'equipe', icon: '👥', label: 'Equipe', color: 'from-cyan-500 to-cyan-600', badge: activeEmployees.length, action: () => navigate('/gerente/equipe') },
    { key: 'feedback', icon: '💬', label: 'Feedback', color: 'from-amber-500 to-amber-600', badge: feedbackAll.filter(f => f.status === 'new').length, action: () => navigate('/gerente/feedback') },
    { key: 'config', icon: '⚙️', label: 'Configurações', color: 'from-gray-500 to-gray-600', action: () => navigate('/gerente/config') },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
              🎯
            </div>
            <div>
              <div className="font-bold text-gray-900">Painel do Gerente</div>
              <div className="text-xs text-gray-500">{store.shortName} • Semana {currentWeekKey}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900">👑 {currentUser}</div>
              <div className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            <button onClick={logout} className="btn btn-ghost text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Vendas Hoje</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{todaySales.length}</div>
            <div className="text-sm font-semibold text-emerald-600">{formatCurrency(todayRevenue)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Globais Abertas</div>
            <div className="text-2xl font-extrabold text-brand-600 mt-1">{globalsOpen.length}</div>
            <div className="text-sm text-gray-500">{globalsWeek.length} publicadas</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Equipe Ativa</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{activeEmployees.length}</div>
            <div className="text-sm text-gray-500">funcionários</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Produtos</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{products.length}</div>
            <div className="text-sm text-gray-500">cadastrados</div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tabs.map(tab => (
              <button key={tab.key}
                onClick={tab.action || (() => {})}
                className="card p-5 flex flex-col items-center gap-3 hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tab.color} flex items-center justify-center text-2xl shadow-md`}>
                  {tab.icon}
                </div>
                <span className="font-semibold text-sm text-gray-900">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        {todaySales.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Últimas Vendas</h3>
            <div className="space-y-2">
              {todaySales.slice(0, 5).map((sale, idx) => (
                <div key={sale.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{sale.itemCount || 0} itens</div>
                    <div className="text-xs text-gray-500">{sale.cashier} • {sale.createdAtHuman}</div>
                  </div>
                  <div className="font-bold text-emerald-600">{formatCurrency(sale.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
