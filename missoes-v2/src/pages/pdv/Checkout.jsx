import { useState } from 'react'
import { formatCurrency } from '../../utils/constants'

export default function Checkout({ cart, total, onFinalize, onBack }) {
  const [method, setMethod] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [processing, setProcessing] = useState(false)

  const numPaid = Number(amountPaid) || 0
  const change = method === 'dinheiro' ? Math.max(0, numPaid - total) : 0
  const canFinalize = method && (method !== 'dinheiro' || numPaid >= total)

  async function handleFinalize() {
    if (!canFinalize || processing) return
    setProcessing(true)
    try {
      await onFinalize(method, method === 'dinheiro' ? numPaid : total, change)
    } catch (e) {
      console.error(e)
    }
    setProcessing(false)
  }

  const methods = [
    { key: 'dinheiro', icon: '💵', label: 'Dinheiro', color: 'from-emerald-500 to-emerald-600' },
    { key: 'pix', icon: '📱', label: 'PIX', color: 'from-cyan-500 to-cyan-600' },
    { key: 'credito', icon: '💳', label: 'Crédito', color: 'from-blue-500 to-blue-600' },
    { key: 'debito', icon: '💳', label: 'Débito', color: 'from-purple-500 to-purple-600' },
  ]

  const quickValues = [5, 10, 20, 50, 100, 200]

  return (
    <div className="h-screen flex flex-col bg-gray-100 select-none overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onBack}
          className="touch-target w-12 h-12 rounded-xl bg-gray-100 text-xl active:scale-90">
          ←
        </button>
        <div>
          <div className="font-bold text-gray-900">Finalizar Venda</div>
          <div className="text-xs text-gray-500">{cart.length} itens</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Payment Methods */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Total Display */}
          <div className="text-center mb-8">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total a pagar</div>
            <div className="text-5xl font-extrabold text-gray-900 mt-2">{formatCurrency(total)}</div>
          </div>

          {/* Payment Method Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6 max-w-lg mx-auto">
            {methods.map(m => (
              <button key={m.key}
                onClick={() => setMethod(m.key)}
                className={`p-5 rounded-2xl border-3 transition-all active:scale-95 flex flex-col items-center gap-2
                  ${method === m.key
                    ? `border-brand-500 bg-gradient-to-br ${m.color} text-white shadow-lg`
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                style={{ minHeight: 100 }}>
                <span className="text-3xl">{m.icon}</span>
                <span className="font-bold text-sm">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Cash input */}
          {method === 'dinheiro' && (
            <div className="max-w-lg mx-auto animate-slide-up">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Valor recebido</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0,00"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                className="input text-center text-3xl font-extrabold h-16"
                autoFocus
              />
              {/* Quick amount buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {quickValues.map(v => (
                  <button key={v}
                    onClick={() => setAmountPaid(String(v))}
                    className="py-3 rounded-xl bg-gray-100 border border-gray-200 font-bold text-gray-700 active:scale-95 transition-all">
                    R$ {v}
                  </button>
                ))}
                <button onClick={() => setAmountPaid(String(Math.ceil(total)))}
                  className="py-3 rounded-xl bg-brand-50 border border-brand-200 font-bold text-brand-700 active:scale-95 transition-all col-span-3">
                  Valor exato: {formatCurrency(total)}
                </button>
              </div>

              {numPaid >= total && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-slide-up">
                  <div className="text-sm font-semibold text-emerald-600">TROCO</div>
                  <div className="text-3xl font-extrabold text-emerald-700">{formatCurrency(change)}</div>
                </div>
              )}
            </div>
          )}

          {/* PIX / Card confirmation */}
          {(method === 'pix' || method === 'credito' || method === 'debito') && (
            <div className="max-w-lg mx-auto text-center animate-slide-up">
              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-4xl mb-3">{method === 'pix' ? '📱' : '💳'}</div>
                <div className="text-sm font-semibold text-blue-700">
                  {method === 'pix' ? 'Aguardando confirmação do PIX' : `Passar no ${method === 'credito' ? 'Crédito' : 'Débito'}`}
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-2">{formatCurrency(total)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="font-bold text-sm text-gray-900">Resumo</div>
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin">
            {cart.map((item, idx) => (
              <div key={idx} className="px-4 py-2 border-b border-gray-50 flex justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.qty}x {item.name}</div>
                </div>
                <div className="font-semibold text-gray-900 shrink-0 ml-2">
                  {formatCurrency(item.price * item.qty)}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-4 shrink-0">
            <div className="flex justify-between mb-4">
              <span className="font-semibold text-gray-600">TOTAL</span>
              <span className="text-xl font-extrabold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <button onClick={handleFinalize}
              disabled={!canFinalize || processing}
              className={`w-full h-14 rounded-2xl font-extrabold text-lg transition-all active:scale-[0.97]
                ${canFinalize && !processing
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {processing ? '⏳ Processando...' : '✅ CONFIRMAR VENDA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
