import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, STORE_MAP } from '../../utils/constants'

export default function CustomerOrderDetails() {
  const { storeId, orderId } = useParams()
  const navigate = useNavigate()
  const { customerOrdersAll } = useStore()

  const order = customerOrdersAll.find(o => o.id === orderId)
  const storeEntry = Object.values(STORE_MAP).find(s => s.id === storeId) || STORE_MAP.loja_principal

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-gray-100 shadow-lg max-w-sm w-full">
          <span className="text-4xl">🔍</span>
          <h3 className="font-bold text-gray-900 mt-3">Pedido não encontrado</h3>
          <p className="text-xs text-gray-500 mt-1">Verifique o link ou tente novamente.</p>
          <button onClick={() => navigate(`/cliente/${storeId}/loja`)}
            className="btn btn-primary w-full mt-5">
            Voltar para a Loja
          </button>
        </div>
      </div>
    )
  }

  // Stepper calculations
  const steps = [
    { key: 'pending', label: 'Recebido', icon: '📝', desc: 'Aguardando preparo' },
    { key: 'preparing', label: 'Em Preparo', icon: '👨‍🍳', desc: 'Produzindo seus itens' },
    { key: 'dispatched', label: 'A Caminho', icon: '🛵', desc: 'Saiu para entrega' },
    { key: 'delivered', label: 'Entregue', icon: '✅', desc: 'Entregue no endereço' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.06), transparent 50%), #f8fafc' }}>
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(`/cliente/${storeId}/loja`)}
          className="text-xs font-bold text-brand-600 hover:underline">
          ← Voltar para a Loja
        </button>
        <span className="font-bold text-sm text-gray-800">Status do Pedido</span>
        <span className="text-xs font-extrabold text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Status Stepper */}
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-md">
          {isCancelled ? (
            <div className="text-center py-6">
              <span className="text-5xl">🚫</span>
              <h3 className="text-xl font-black text-red-600 mt-2">Pedido Cancelado</h3>
              <p className="text-sm text-gray-500 mt-1">Este pedido foi cancelado e estornado pela gerência.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h4 className="font-black text-gray-900 text-base border-b pb-2">Status de Entrega</h4>
              
              <div className="relative pl-8 space-y-6">
                {/* Visual Line */}
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200">
                  <div
                    className="w-full bg-brand-500 transition-all duration-500"
                    style={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                  ></div>
                </div>

                {steps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex
                  const isCurrent = idx === currentStepIndex

                  return (
                    <div key={step.key} className="relative flex gap-4 items-start">
                      {/* Step Indicator */}
                      <div className={`absolute -left-8 w-7.5 h-7.5 rounded-full flex items-center justify-center border-2 z-10 transition-all
                        ${isCompleted ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                        <span className="text-xs">{step.icon}</span>
                      </div>

                      <div className="pl-3">
                        <h5 className={`font-bold text-sm transition-colors ${isCompleted ? 'text-gray-950' : 'text-gray-400'}`}>
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase animate-pulse">Atual</span>
                          )}
                        </h5>
                        <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Delivery Details */}
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-md space-y-3">
          <h4 className="font-black text-gray-900 text-base border-b pb-2">Detalhes da Entrega</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-gray-500 font-semibold shrink-0">Horário Agendado:</span>
              <span className="font-bold text-gray-900 text-right">{order.slotLabel}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-500 font-semibold shrink-0">Endereço:</span>
              <span className="font-semibold text-gray-900 text-right max-w-[200px] break-words">{order.deliveryAddress}</span>
            </div>
            <div className="flex justify-between items-center border-t border-dashed pt-2 mt-2">
              <span className="text-gray-500 font-semibold">Pagamento:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md text-xs">
                💳 {order.paymentMethod?.toUpperCase()} • PAGO
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-md space-y-3">
          <h4 className="font-black text-gray-900 text-base border-b pb-2">Itens Comprados</h4>
          
          <div className="divide-y divide-gray-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-600 bg-gray-100 w-6 h-6 rounded flex items-center justify-center text-xs">{item.quantity}x</span>
                  <span className="font-bold text-gray-800">{item.name}</span>
                </div>
                <span className="font-bold text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
            <span className="font-extrabold text-gray-900">Total Pago</span>
            <span className="font-black text-emerald-600 text-lg">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Support Direct Chat */}
        <a href={`https://wa.me/${storeEntry.whatsapp || '5521964422488'}?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20meu%20pedido%20%23${order.id.slice(-6).toUpperCase()}`}
          target="_blank" rel="noreferrer"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 rounded-2xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
          <span>💬</span> Falar com a Padaria
        </a>
      </main>
    </div>
  )
}
