import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, nowHuman } from '../../utils/constants'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'

export default function CashOps({ onBack }) {
  const { currentUser, store, storeId } = useAuth()
  const { pdvSales } = useStore()
  const [type, setType] = useState('') // 'suprimento' or 'sangria'
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState('')

  const numAmount = Number(amount) || 0

  async function handleSave() {
    if (!type || numAmount <= 0) return
    setProcessing(true)
    try {
      const id = `cashop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      await setDoc(doc(db, 'stores', storeId, 'pdv_cash_ops', id), {
        type,
        amount: numAmount,
        reason: reason.trim() || (type === 'suprimento' ? 'Suprimento' : 'Sangria'),
        cashier: currentUser,
        createdAt: serverTimestamp(),
        createdAtHuman: nowHuman()
      })
      setSuccess(`${type === 'suprimento' ? '💰 Suprimento' : '📤 Sangria'} de ${formatCurrency(numAmount)} registrada!`)
      setAmount('')
      setReason('')
      setType('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      console.error(e)
    }
    setProcessing(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 select-none overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onBack}
          className="touch-target w-12 h-12 rounded-xl bg-gray-100 text-xl active:scale-90">
          ←
        </button>
        <div>
          <div className="font-bold text-gray-900">Suprimento / Sangria</div>
          <div className="text-xs text-gray-500">Caixa: {currentUser}</div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-700 font-semibold animate-slide-up">
              {success}
            </div>
          )}

          {/* Type Selection */}
          {!type && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm font-semibold text-gray-700 text-center">Selecione a operação:</p>
              <button onClick={() => setType('suprimento')}
                className="w-full p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-400 flex items-center gap-4 transition-all active:scale-[0.97]"
                style={{ minHeight: 80 }}>
                <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">💰</div>
                <div className="text-left">
                  <div className="font-bold text-gray-900 text-lg">Suprimento</div>
                  <div className="text-sm text-gray-500">Adicionar dinheiro ao caixa</div>
                </div>
              </button>
              <button onClick={() => setType('sangria')}
                className="w-full p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-red-400 flex items-center gap-4 transition-all active:scale-[0.97]"
                style={{ minHeight: 80 }}>
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center text-2xl">📤</div>
                <div className="text-left">
                  <div className="font-bold text-gray-900 text-lg">Sangria</div>
                  <div className="text-sm text-gray-500">Retirar dinheiro do caixa</div>
                </div>
              </button>
            </div>
          )}

          {/* Amount Entry */}
          {type && (
            <div className="space-y-4 animate-slide-up">
              <button onClick={() => setType('')} className="text-sm text-brand-600 font-semibold flex items-center gap-1">
                ← Voltar
              </button>

              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-3
                  ${type === 'suprimento' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {type === 'suprimento' ? '💰' : '📤'}
                </div>
                <div className="font-bold text-lg text-gray-900">
                  {type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa'}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Valor</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input text-center text-3xl font-extrabold h-16"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Motivo (opcional)</label>
                <input
                  type="text"
                  placeholder={type === 'suprimento' ? 'Ex: Troco inicial' : 'Ex: Pagamento fornecedor'}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="input"
                />
              </div>

              <button onClick={handleSave}
                disabled={numAmount <= 0 || processing}
                className={`w-full h-14 rounded-2xl font-extrabold text-lg transition-all active:scale-[0.97]
                  ${numAmount > 0 && !processing
                    ? `text-white shadow-lg ${type === 'suprimento' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {processing ? '⏳ Registrando...' : `✅ Confirmar ${type === 'suprimento' ? 'Suprimento' : 'Sangria'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
