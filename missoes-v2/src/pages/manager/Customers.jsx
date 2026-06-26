import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'

export default function Customers({ onBack }) {
  const { customersAll, saveCustomer, deleteCustomer } = useStore()
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'active' | 'inactive'
  const [search, setSearch] = useState('')

  const filteredCustomers = useMemo(() => {
    return customersAll.filter(c => {
      const matchesFilter = filter === 'all' || c.status === filter
      const matchesSearch = 
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [customersAll, filter, search])

  const stats = useMemo(() => {
    const total = customersAll.length
    const pending = customersAll.filter(c => c.status === 'pending').length
    const active = customersAll.filter(c => c.status === 'active').length
    const inactive = customersAll.filter(c => c.status === 'inactive').length
    return { total, pending, active, inactive }
  }, [customersAll])

  async function handleStatusChange(customer, newStatus) {
    await saveCustomer({
      ...customer,
      status: newStatus
    })
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remover definitivamente o cliente ${name}?`)) return
    await deleteCustomer(id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
        <div>
          <div className="font-bold text-gray-900">👥 Clientes</div>
          <div className="text-xs text-gray-500">{stats.active} ativos • {stats.pending} aguardando aprovação</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2.5">
          <button onClick={() => setFilter('all')} 
            className={`card p-3 text-center border-2 transition-all ${filter === 'all' ? 'border-brand-500 bg-brand-50/50' : 'border-transparent'}`}>
            <div className="text-[10px] font-bold text-gray-500 uppercase">Todos</div>
            <div className="text-xl font-black text-gray-900 mt-1">{stats.total}</div>
          </button>
          <button onClick={() => setFilter('pending')} 
            className={`card p-3 text-center border-2 transition-all ${filter === 'pending' ? 'border-amber-500 bg-amber-50/50' : 'border-transparent'}`}>
            <div className="text-[10px] font-bold text-amber-600 uppercase">Pendentes</div>
            <div className="text-xl font-black text-amber-700 mt-1">{stats.pending}</div>
          </button>
          <button onClick={() => setFilter('active')} 
            className={`card p-3 text-center border-2 transition-all ${filter === 'active' ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent'}`}>
            <div className="text-[10px] font-bold text-emerald-600 uppercase font-semibold">Ativos</div>
            <div className="text-xl font-black text-emerald-700 mt-1">{stats.active}</div>
          </button>
          <button onClick={() => setFilter('inactive')} 
            className={`card p-3 text-center border-2 transition-all ${filter === 'inactive' ? 'border-red-500 bg-red-50/50' : 'border-transparent'}`}>
            <div className="text-[10px] font-bold text-red-600 uppercase">Inativos</div>
            <div className="text-xl font-black text-red-700 mt-1">{stats.inactive}</div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Client List */}
        <div className="space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400">
              <span className="text-4xl">👥</span>
              <p className="mt-2 font-semibold">Nenhum cliente cadastrado nesta categoria</p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">{customer.name}</span>
                    {customer.status === 'pending' && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Aguardando Aprovação</span>
                    )}
                    {customer.status === 'active' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Ativo</span>
                    )}
                    {customer.status === 'inactive' && (
                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Bloqueado / Inativo</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-semibold">WhatsApp:</span> {customer.phone}
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="font-semibold">E-mail:</span> {customer.email}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    <span className="font-semibold text-gray-500">Endereço de entrega:</span> {customer.address}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                  {customer.status !== 'active' && (
                    <button onClick={() => handleStatusChange(customer, 'active')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all active:scale-95">
                      ✓ Ativar / Aprovar
                    </button>
                  )}
                  {customer.status === 'active' && (
                    <button onClick={() => handleStatusChange(customer, 'inactive')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-100 hover:bg-red-200 text-red-800 transition-all active:scale-95">
                      🚫 Bloquear
                    </button>
                  )}
                  {customer.status === 'inactive' && (
                    <button onClick={() => handleStatusChange(customer, 'pending')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-all active:scale-95">
                      ⏳ Tornar Pendente
                    </button>
                  )}
                  <a href={`https://wa.me/${customer.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center text-lg transition-all active:scale-90"
                    title="Enviar WhatsApp">
                    💬
                  </a>
                  <button onClick={() => handleDelete(customer.id, customer.name)}
                    className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-lg transition-all active:scale-90"
                    title="Excluir cliente">
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
