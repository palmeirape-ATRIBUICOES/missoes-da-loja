import { useState } from 'react'
import { formatCurrency } from '../utils/constants'
import {
  INFLOW_METHODS,
  OUTFLOW_CATEGORIES,
  formatDateBR,
  formatMonthLabel
} from '../utils/financeUtils'

export default function FinanceCharts({
  metrics,
  monthlyComparison = []
}) {
  const [activeMethodKey, setActiveMethodKey] = useState(null)
  const [selectedDayIdx, setSelectedDayIdx] = useState(null)

  if (!metrics) return null

  // 1. Donut Chart Data (Inflows by Payment Method)
  const methodItems = INFLOW_METHODS.map(m => {
    const value = Number(metrics.inflowByMethod?.[m.key] || 0)
    return { ...m, value }
  })
  if ((metrics.inflowByMethod?.extra || 0) > 0) {
    methodItems.push({
      key: 'extra',
      label: 'Outras Entradas',
      icon: '➕',
      color: '#14b8a6',
      value: Number(metrics.inflowByMethod.extra)
    })
  }
  const totalInflows = metrics.totalInflows || 0

  // SVG Donut geometry
  const radius = 62
  const circumference = 2 * Math.PI * radius
  let cumulativePct = 0
  const donutSegments = methodItems
    .filter(item => item.value > 0)
    .map(item => {
      const pct = totalInflows > 0 ? item.value / totalInflows : 0
      const strokeDasharray = `${pct * circumference} ${circumference}`
      const strokeDashoffset = -cumulativePct * circumference
      cumulativePct += pct
      return {
        ...item,
        pct: pct * 100,
        strokeDasharray,
        strokeDashoffset
      }
    })

  const highlightedMethod = donutSegments.find(s => s.key === activeMethodKey) || null

  // 2. Outflows Breakdown Data
  const outflowItems = [
    ...OUTFLOW_CATEGORIES.map(c => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      color: c.color,
      value: Number(metrics.outflowByCategory?.[c.key] || 0)
    })),
    {
      key: 'funcionarios',
      label: 'Folha / Funcionários',
      icon: '👷',
      color: '#ec4899',
      value: Number(metrics.outflowByCategory?.funcionarios || 0)
    }
  ].sort((a, b) => b.value - a.value)

  const totalOutflows = metrics.totalOutflows || 0
  const maxOutflowCat = Math.max(...outflowItems.map(o => o.value), 1)

  // 3. Daily Evolution Bars
  const ledger = metrics.dailyLedger || []
  const maxDayVal = Math.max(
    ...ledger.map(d => Math.max(d.dayIn || 0, d.dayTotalOut || 0)),
    1
  )
  const activeDay = selectedDayIdx !== null && ledger[selectedDayIdx] ? ledger[selectedDayIdx] : ledger[ledger.length - 1]

  // 4. Monthly Comparison Bars
  const maxMonthVal = Math.max(
    ...monthlyComparison.map(m => Math.max(m.totalInflows || 0, m.totalOutflows || 0)),
    1
  )

  return (
    <div className="space-y-5">
      {/* Row 1: Inflows Donut + Outflows Horizontal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart: Meios de Pagamento */}
        <div className="card p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                💳 Receitas por Meio de Pagamento
              </h4>
              <p className="text-xs text-slate-500">
                Participação de Crédito, Débito, Voucher, PIX e Dinheiro
              </p>
            </div>
          </div>

          {totalInflows <= 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Nenhuma entrada registrada neste período para gerar o gráfico.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="22"
                  />
                  {donutSegments.map(seg => (
                    <circle
                      key={seg.key}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={activeMethodKey === seg.key ? '26' : '22'}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setActiveMethodKey(seg.key)}
                      onMouseLeave={() => setActiveMethodKey(null)}
                      onClick={() => setActiveMethodKey(prev => prev === seg.key ? null : seg.key)}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {highlightedMethod ? highlightedMethod.label : 'Total Bruto'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                    {formatCurrency(highlightedMethod ? highlightedMethod.value : totalInflows)}
                  </span>
                  {highlightedMethod && (
                    <span className="text-[11px] font-bold text-indigo-600">
                      {highlightedMethod.pct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Legend & Progress Bars */}
              <div className="flex-1 w-full space-y-2.5">
                {methodItems.map(item => {
                  const pct = totalInflows > 0 ? (item.value / totalInflows) * 100 : 0
                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveMethodKey(prev => prev === item.key ? null : item.key)}
                      className={`p-2 rounded-xl transition cursor-pointer ${activeMethodKey === item.key ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.icon} {item.label}</span>
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {formatCurrency(item.value)}{' '}
                          <span className="text-slate-400 font-semibold">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Bars: Composição das Saídas */}
        <div className="card p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                📉 Distribuição de Saídas & Folha
              </h4>
              <p className="text-xs text-slate-500">
                Fornecedores, Boletos, Funcionários, Depósitos, Passagem e Outros
              </p>
            </div>
          </div>

          {totalOutflows <= 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Nenhuma saída ou pagamento registrado neste período.
            </div>
          ) : (
            <div className="space-y-3">
              {outflowItems.map(item => {
                const pctOfOut = totalOutflows > 0 ? (item.value / totalOutflows) * 100 : 0
                const pctOfRev = totalInflows > 0 ? (item.value / totalInflows) * 100 : 0
                const barWidth = maxOutflowCat > 0 ? (item.value / maxOutflowCat) * 100 : 0
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">{formatCurrency(item.value)}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          ({pctOfOut.toFixed(1)}% saídas{totalInflows > 0 ? ` • ${pctOfRev.toFixed(1)}% fat.` : ''})
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Daily Inflows vs Outflows Interactive Bar Chart */}
      <div className="card p-5 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base">
              📊 Evolução Diária (Entradas vs. Saídas)
            </h4>
            <p className="text-xs text-slate-500">
              Toque ou passe o mouse em qualquer dia para inspecionar os números exatos
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Entradas
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Saídas Totais
            </span>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Sem movimentações diárias no período selecionado.
          </div>
        ) : (
          <>
            {/* Selected Day Inspector Pill */}
            {activeDay && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-extrabold text-slate-800">
                  📅 {formatDateBR(activeDay.date, true)}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-emerald-700 font-bold">
                    + Entradas: {formatCurrency(activeDay.dayIn)}
                  </span>
                  <span className="text-rose-700 font-bold">
                    - Saídas: {formatCurrency(activeDay.dayTotalOut)}
                  </span>
                  <span className={`font-extrabold px-2 py-0.5 rounded-lg ${activeDay.dayNet >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    Dia: {activeDay.dayNet >= 0 ? '+' : ''}{formatCurrency(activeDay.dayNet)}
                  </span>
                  <span className="font-bold text-indigo-700">
                    Caixa Acumulado: {formatCurrency(activeDay.runningBalance)}
                  </span>
                </div>
              </div>
            )}

            {/* Scrollable Responsive Bar Chart */}
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div
                className="flex items-end gap-2 h-48 pt-4 px-1"
                style={{ minWidth: `${Math.max(ledger.length * 42, 280)}px` }}
              >
                {ledger.map((d, idx) => {
                  const inHeight = Math.max(d.dayIn > 0 ? 6 : 0, Math.round((d.dayIn / maxDayVal) * 145))
                  const outHeight = Math.max(d.dayTotalOut > 0 ? 6 : 0, Math.round((d.dayTotalOut / maxDayVal) * 145))
                  const isSelected = activeDay?.date === d.date
                  const dayNum = d.date.slice(8, 10) + '/' + d.date.slice(5, 7)

                  return (
                    <div
                      key={d.date}
                      onClick={() => setSelectedDayIdx(idx)}
                      onMouseEnter={() => setSelectedDayIdx(idx)}
                      className={`flex-1 min-w-[34px] flex flex-col items-center cursor-pointer rounded-xl p-1 transition ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-end gap-1 h-36 w-full justify-center">
                        <div
                          className="w-3 sm:w-3.5 rounded-t-md bg-emerald-500 transition-all duration-300"
                          style={{ height: `${inHeight}px` }}
                          title={`Entradas: ${formatCurrency(d.dayIn)}`}
                        />
                        <div
                          className="w-3 sm:w-3.5 rounded-t-md bg-rose-500 transition-all duration-300"
                          style={{ height: `${outHeight}px` }}
                          title={`Saídas: ${formatCurrency(d.dayTotalOut)}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 mt-1.5">
                        {dayNum}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Row 3: 6-Month Historical Comparison */}
      {monthlyComparison.length > 0 && (
        <div className="card p-5 bg-white">
          <div className="mb-4">
            <h4 className="font-extrabold text-slate-900 text-base">
              📈 Comparativo Histórico Mensal (Últimos 6 Meses)
            </h4>
            <p className="text-xs text-slate-500">
              Visão executiva de crescimento de vendas, controle de despesas e resultado líquido
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {monthlyComparison.map(m => {
              const inH = Math.max(m.totalInflows > 0 ? 8 : 2, Math.round((m.totalInflows / maxMonthVal) * 100))
              const outH = Math.max(m.totalOutflows > 0 ? 8 : 2, Math.round((m.totalOutflows / maxMonthVal) * 100))
              return (
                <div key={m.monthKey} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
                  <span className="text-xs font-extrabold text-slate-800 mb-2">
                    {formatMonthLabel(m.monthKey, true)}
                  </span>
                  <div className="h-28 flex items-end gap-2 justify-center w-full border-b border-slate-200 pb-1">
                    <div
                      className="w-5 rounded-t-md bg-emerald-500 transition-all"
                      style={{ height: `${inH}%` }}
                      title={`Entradas: ${formatCurrency(m.totalInflows)}`}
                    />
                    <div
                      className="w-5 rounded-t-md bg-rose-500 transition-all"
                      style={{ height: `${outH}%` }}
                      title={`Saídas: ${formatCurrency(m.totalOutflows)}`}
                    />
                  </div>
                  <div className="mt-2 space-y-0.5 w-full">
                    <div className="text-[10px] font-bold text-emerald-700 truncate">
                      +{formatCurrency(m.totalInflows)}
                    </div>
                    <div className="text-[10px] font-bold text-rose-600 truncate">
                      -{formatCurrency(m.totalOutflows)}
                    </div>
                    <div className={`text-[11px] font-extrabold pt-0.5 border-t border-slate-200 truncate ${m.operationalNet >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                      {m.operationalNet >= 0 ? '+' : ''}{formatCurrency(m.operationalNet)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
