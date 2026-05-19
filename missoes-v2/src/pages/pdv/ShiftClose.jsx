import { useMemo, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency } from '../../utils/constants'

export default function ShiftClose({ onBack }) {
  const { currentUser, store } = useAuth()
  const { pdvSales } = useStore()
  const printRef = useRef(null)

  // Filter today's sales for this cashier
  const today = new Date().toLocaleDateString('pt-BR')

  const mySales = useMemo(() => {
    return pdvSales.filter(s => {
      const saleDate = s.createdAtHuman?.split(',')[0]?.trim() || ''
      return s.cashier === currentUser && saleDate === today
    })
  }, [pdvSales, currentUser, today])

  const totalSales = mySales.reduce((sum, s) => sum + (s.total || 0), 0)
  const totalItems = mySales.reduce((sum, s) => sum + (s.itemCount || 0), 0)

  const byMethod = useMemo(() => {
    const map = {}
    mySales.forEach(s => {
      const m = s.paymentMethod || 'outro'
      if (!map[m]) map[m] = { count: 0, total: 0 }
      map[m].count++
      map[m].total += (s.total || 0)
    })
    return map
  }, [mySales])

  const methodLabels = {
    dinheiro: { icon: '💵', label: 'Dinheiro' },
    pix: { icon: '📱', label: 'PIX' },
    credito: { icon: '💳', label: 'Crédito' },
    debito: { icon: '💳', label: 'Débito' },
    outro: { icon: '❓', label: 'Outro' }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 select-none overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="touch-target w-12 h-12 rounded-xl bg-gray-100 text-xl active:scale-90">
            ←
          </button>
          <div>
            <div className="font-bold text-gray-900">Fechamento de Turno</div>
            <div className="text-xs text-gray-500">Caixa: {currentUser} • {today}</div>
          </div>
        </div>
        <button onClick={handlePrint}
          className="btn btn-primary">
          🖨️ Imprimir Fechamento
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8" ref={printRef}>
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Summary Card */}
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Resumo do Turno</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{store.shortName}</div>
              <div className="text-sm text-gray-500">Operador: {currentUser} • {today}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-brand-50">
                <div className="text-3xl font-extrabold text-brand-700">{mySales.length}</div>
                <div className="text-xs font-semibold text-brand-600 mt-1">Vendas</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-emerald-50">
                <div className="text-3xl font-extrabold text-emerald-700">{totalItems}</div>
                <div className="text-xs font-semibold text-emerald-600 mt-1">Itens</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-50">
                <div className="text-xl font-extrabold text-blue-700">{formatCurrency(totalSales)}</div>
                <div className="text-xs font-semibold text-blue-600 mt-1">Total</div>
              </div>
            </div>

            {/* By Payment Method */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 mb-2">Por Forma de Pagamento</div>
              {Object.entries(byMethod).map(([key, val]) => {
                const m = methodLabels[key] || methodLabels.outro
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{m.label}</div>
                        <div className="text-xs text-gray-500">{val.count} {val.count === 1 ? 'venda' : 'vendas'}</div>
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">{formatCurrency(val.total)}</div>
                  </div>
                )
              })}

              {mySales.length === 0 && (
                <div className="text-center p-6 text-gray-400">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold">Nenhuma venda registrada</div>
                  <div className="text-sm mt-1">O turno ainda não possui vendas</div>
                </div>
              )}
            </div>
          </div>

          {/* Sales List */}
          {mySales.length > 0 && (
            <div className="card p-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">Detalhamento das Vendas</div>
              <div className="space-y-2 max-h-[50vh] overflow-auto scrollbar-thin">
                {mySales.map((sale, idx) => (
                  <div key={sale.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        Venda #{mySales.length - idx}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.createdAtHuman} • {sale.itemCount || 0} itens • {(methodLabels[sale.paymentMethod] || methodLabels.outro).label}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">{formatCurrency(sale.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print Footer (only visible on print) */}
          <div className="hidden print:block text-center text-xs text-gray-500 mt-8 border-t pt-4">
            <p>Missões da Loja — {store.name}</p>
            <p>Fechamento impresso em {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
