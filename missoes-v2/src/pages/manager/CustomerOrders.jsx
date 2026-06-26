import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { formatCurrency } from '../../utils/constants'

export default function CustomerOrders({ onBack }) {
  const { customerOrdersAll, saveCustomerOrder } = useStore()
  const [statusFilter, setStatusFilter] = useState('pending') // 'pending' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled' | 'all'

  const filteredOrders = useMemo(() => {
    return customerOrdersAll.filter(o => statusFilter === 'all' || o.status === statusFilter)
  }, [customerOrdersAll, statusFilter])

  const stats = useMemo(() => {
    const pending = customerOrdersAll.filter(o => o.status === 'pending').length
    const preparing = customerOrdersAll.filter(o => o.status === 'preparing').length
    const dispatched = customerOrdersAll.filter(o => o.status === 'dispatched').length
    const delivered = customerOrdersAll.filter(o => o.status === 'delivered').length
    const cancelled = customerOrdersAll.filter(o => o.status === 'cancelled').length
    return { pending, preparing, dispatched, delivered, cancelled }
  }, [customerOrdersAll])

  async function advanceStatus(order) {
    let nextStatus = 'pending'
    if (order.status === 'pending') nextStatus = 'preparing'
    else if (order.status === 'preparing') nextStatus = 'dispatched'
    else if (order.status === 'dispatched') nextStatus = 'delivered'

    await saveCustomerOrder({
      ...order,
      status: nextStatus
    })
  }

  async function handleCancel(order) {
    if (!confirm('Deseja realmente CANCELAR este pedido?')) return
    await saveCustomerOrder({
      ...order,
      status: 'cancelled'
    })
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'pending': return 'Pendente (Aguardando Preparo)'
      case 'preparing': return 'Em Preparo'
      case 'dispatched': return 'Despachado / A Caminho'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  function getStatusButtonText(status) {
    switch (status) {
      case 'pending': return '👨‍🍳 Iniciar Preparo'
      case 'preparing': return '🛵 Despachar Pedido'
      case 'dispatched': return '✅ Entregar Pedido'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
        <div>
          <div className="font-bold text-gray-900">📦 Pedidos dos Clientes</div>
          <div className="text-xs text-gray-500">{stats.pending} pendentes • {stats.preparing} em preparo</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Status Tabs Navigation */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
          {[
            { key: 'pending', label: 'Pendentes', count: stats.pending, color: 'bg-amber-100 text-amber-800' },
            { key: 'preparing', label: 'Em Preparo', count: stats.preparing, color: 'bg-blue-100 text-blue-800' },
            { key: 'dispatched', label: 'A Caminho', count: stats.dispatched, color: 'bg-purple-100 text-purple-800' },
            { key: 'delivered', label: 'Entregues', count: stats.delivered, color: 'bg-emerald-100 text-emerald-800' },
            { key: 'cancelled', label: 'Cancelados', count: stats.cancelled, color: 'bg-gray-100 text-gray-800' },
            { key: 'all', label: 'Todos', count: customerOrdersAll.length, color: 'bg-slate-100 text-slate-800' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all active:scale-95 flex items-center gap-2 border-2
                ${statusFilter === tab.key ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-transparent bg-white text-gray-600'}`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Orders Listing */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">
              <span className="text-5xl">📦</span>
              <p className="mt-2 font-bold text-gray-500">Nenhum pedido encontrado nesta categoria</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="card p-5 space-y-4">
                {/* Header of Order */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-bold">#{order.id.slice(-6).toUpperCase()}</span>
                      <h4 className="font-extrabold text-gray-900 text-lg">{order.customerName}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Criado em: {order.createdAtHuman}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-bold uppercase">
                      💳 {order.paymentMethod?.toUpperCase()} • {order.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase
                      ${order.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                      ${order.status === 'preparing' ? 'bg-blue-100 text-blue-800' : ''}
                      ${order.status === 'dispatched' ? 'bg-purple-100 text-purple-800' : ''}
                      ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : ''}
                      ${order.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📅 Horário Agendado para Entrega</div>
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>🚚 {order.slotLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📍 Endereço de Entrega</div>
                    <div className="text-slate-800 font-semibold">{order.deliveryAddress}</div>
                  </div>
                </div>

                {/* Items details */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🛒 Itens do Pedido</div>
                  <div className="divide-y divide-gray-100">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-700 bg-gray-100 w-6 h-6 rounded flex items-center justify-center text-xs">{item.quantity}x</span>
                          <span className="font-semibold text-gray-900">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="font-extrabold text-gray-900 text-base">Valor Total</span>
                    <span className="font-black text-emerald-600 text-xl">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={() => advanceStatus(order)}
                      className="btn btn-primary flex-1 h-12 text-sm font-bold rounded-2xl shadow-sm"
                    >
                      {getStatusButtonText(order.status)}
                    </button>
                    
                    <button
                      onClick={() => handleCancel(order)}
                      className="btn btn-ghost text-red-600 bg-red-50 hover:bg-red-100 h-12 text-sm font-bold rounded-2xl px-5"
                    >
                      Cancelou / Estornar
                    </button>

                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/[^\d]/g, '')}?text=Olá%20${encodeURIComponent(order.customerName)},%20seu%20pedido%20de%20entrega%20está%20${order.status === 'pending' ? 'sendo%20analisado' : order.status === 'preparing' ? 'em%20preparo' : 'a%20caminho'}.`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn bg-green-50 hover:bg-green-100 text-green-700 h-12 text-sm font-bold rounded-2xl flex items-center justify-center gap-1 px-5 border border-green-200"
                    >
                      💬 Falar no WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
