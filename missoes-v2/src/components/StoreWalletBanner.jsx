import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../hooks/useStore'
import {
  computeMonthSummary,
  displayCurrency,
  formatMonthLabel,
  localMonthISO,
  parseMoneyInput,
  shiftMonthISO
} from '../utils/financeUtils'
import { formatCurrency } from '../utils/constants'

export default function StoreWalletBanner({
  selectedMonth,
  onSelectMonth,
  compactDashboard = false,
  onOpenAdmin
}) {
  const { storeId, store, isManager } = useAuth()
  const {
    financeMonthsAll = [],
    financeDaysAll = [],
    financePayrollAll = [],
    saveFinanceMonth
  } = useStore()

  const activeMonth = selectedMonth || localMonthISO()

  // Persistent privacy & visibility states per store
  const maskStorageKey = `mdl_wallet_mask_${storeId}`
  const collapseStorageKey = `mdl_wallet_collapse_${storeId}`

  const [valuesHidden, setValuesHidden] = useState(() => {
    try { return localStorage.getItem(maskStorageKey) === '1' } catch { return false }
  })
  const [walletHidden, setWalletHidden] = useState(() => {
    try { return localStorage.getItem(collapseStorageKey) === '1' } catch { return false }
  })

  useEffect(() => {
    try { setValuesHidden(localStorage.getItem(maskStorageKey) === '1') } catch {}
    try { setWalletHidden(localStorage.getItem(collapseStorageKey) === '1') } catch {}
  }, [maskStorageKey, collapseStorageKey])

  function toggleMaskValues() {
    setValuesHidden(prev => {
      const next = !prev
      try {
        localStorage.setItem(maskStorageKey, next ? '1' : '0')
        window.dispatchEvent(new Event('mdl_wallet_vis_change'))
      } catch {}
      return next
    })
  }

  function toggleHideWallet() {
    setWalletHidden(prev => {
      const next = !prev
      try {
        localStorage.setItem(collapseStorageKey, next ? '1' : '0')
        window.dispatchEvent(new Event('mdl_wallet_vis_change'))
      } catch {}
      return next
    })
  }

  const summary = useMemo(
    () => computeMonthSummary(activeMonth, financeMonthsAll, financeDaysAll, financePayrollAll),
    [activeMonth, financeMonthsAll, financeDaysAll, financePayrollAll]
  )

  const prevMonthKey = useMemo(() => shiftMonthISO(activeMonth, -1), [activeMonth])
  const prevSummary = useMemo(
    () => computeMonthSummary(prevMonthKey, financeMonthsAll, financeDaysAll, financePayrollAll),
    [prevMonthKey, financeMonthsAll, financeDaysAll, financePayrollAll]
  )

  // Modal state for Opening / Editing Month Cashbox
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [openingInput, setOpeningInput] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [statusInput, setStatusInput] = useState('open')
  const [savingMonth, setSavingMonth] = useState(false)

  if (!isManager) return null

  function openConfigModal() {
    setOpeningInput(summary.isOpened ? String(summary.openingBalance || 0) : '')
    setGoalInput(summary.revenueGoal > 0 ? String(summary.revenueGoal) : '')
    setNotesInput(summary.monthDoc?.notes || '')
    setStatusInput(summary.monthDoc?.status || 'open')
    setShowOpenModal(true)
  }

  async function handleSaveMonthConfig(e) {
    e?.preventDefault?.()
    setSavingMonth(true)
    try {
      await saveFinanceMonth({
        monthKey: activeMonth,
        openingBalance: parseMoneyInput(openingInput),
        revenueGoal: parseMoneyInput(goalInput),
        status: statusInput,
        notes: notesInput,
        openedAtHuman: summary.monthDoc?.openedAtHuman
      })
      setShowOpenModal(false)
    } catch (err) {
      console.error('Erro ao salvar caixa do mês:', err)
      alert('Erro ao salvar abertura de caixa: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSavingMonth(false)
    }
  }

  const isNegative = summary.walletBalance < 0

  // Minimized / Hidden pill state ("opção de esconder ela também")
  if (walletHidden) {
    return (
      <div className="flex items-center justify-between gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-md border border-slate-700/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base">💼</span>
          <span className="text-xs sm:text-sm font-bold truncate">
            Carteira {store?.shortName || 'da Loja'} ({formatMonthLabel(activeMonth, true)})
          </span>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${isNegative ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {valuesHidden ? 'R$ ••••••' : formatCurrency(summary.walletBalance)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMaskValues}
            title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition"
          >
            {valuesHidden ? '🙈' : '👁️'}
          </button>
          <button
            type="button"
            onClick={toggleHideWallet}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition"
          >
            Mostrar Carteira ▾
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-slate-700/60 transition-all"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)'
        }}
      >
        {/* Top Row: Title + Month Selector + Visibility Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-lg shadow-md shrink-0">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Carteira da Empresa
                </span>
                {summary.isOpened ? (
                  summary.status === 'closed' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      🔒 Caixa Fechado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      🟢 Caixa Aberto
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    ⚡ Abertura Pendente
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {store?.name || 'Loja'} • Saldo em tempo real
              </div>
            </div>
          </div>

          {/* Month Switcher + Privacy Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onSelectMonth ? (
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => onSelectMonth(shiftMonthISO(activeMonth, -1))}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-xs font-bold cursor-pointer"
                  title="Mês anterior"
                >
                  ◀
                </button>
                <input
                  type="month"
                  value={activeMonth}
                  onChange={e => e.target.value && onSelectMonth(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold px-1.5 py-1 focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onSelectMonth(shiftMonthISO(activeMonth, 1))}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-xs font-bold cursor-pointer"
                  title="Próximo mês"
                >
                  ▶
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/10 text-slate-200">
                📅 {formatMonthLabel(activeMonth)}
              </span>
            )}

            <button
              type="button"
              onClick={toggleMaskValues}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              title={valuesHidden ? 'Mostrar valores financeiros' : 'Ocultar valores (Modo Privacidade)'}
            >
              <span>{valuesHidden ? '🙈' : '👁️'}</span>
              <span className="hidden sm:inline">{valuesHidden ? 'Mostrar' : 'Ocultar'}</span>
            </button>

            <button
              type="button"
              onClick={toggleHideWallet}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 cursor-pointer transition"
              title="Minimizar / esconder carteira"
            >
              Esconder ▴
            </button>
          </div>
        </div>

        {/* Main Wallet Balance & Quick Actions */}
        <div className="mt-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saldo Disponível em Caixa ({formatMonthLabel(activeMonth)})
            </div>
            <div className={`text-2xl sm:text-4xl font-black tracking-tight mt-0.5 ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
              {displayCurrency(summary.walletBalance, valuesHidden)}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span>
                Resultado operacional do mês:{' '}
                <strong className={summary.operationalNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {summary.operationalNet >= 0 && !valuesHidden ? '+' : ''}
                  {displayCurrency(summary.operationalNet, valuesHidden)}
                </strong>
              </span>
              {summary.totalInflows > 0 && !valuesHidden && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-semibold">
                  Margem: {summary.netMarginPct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Breakdown Mini Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 lg:max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Abertura Mês</div>
              <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5 truncate">
                {displayCurrency(summary.openingBalance, valuesHidden)}
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-2.5">
              <div className="text-[10px] text-emerald-300 font-semibold uppercase">+ Entradas</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5 truncate">
                {displayCurrency(summary.totalInflows, valuesHidden)}
              </div>
            </div>
            <div className="bg-rose-500/10 border border-rose-400/20 rounded-xl p-2.5">
              <div className="text-[10px] text-rose-300 font-semibold uppercase">- Despesas Dia</div>
              <div className="text-xs sm:text-sm font-bold text-rose-300 mt-0.5 truncate">
                {displayCurrency(summary.totalOperationalOutflows, valuesHidden)}
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-2.5">
              <div className="text-[10px] text-amber-300 font-semibold uppercase">- Funcionários</div>
              <div className="text-xs sm:text-sm font-bold text-amber-200 mt-0.5 truncate">
                {displayCurrency(summary.totalPayroll, valuesHidden)}
              </div>
            </div>
          </div>
        </div>

        {/* Optional Monthly Revenue Goal Progress */}
        {summary.revenueGoal > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>🎯 Meta de Faturamento Mensal: {displayCurrency(summary.revenueGoal, valuesHidden)}</span>
              <span className="font-bold text-emerald-300">{summary.goalProgressPct.toFixed(1)}% atingida</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, summary.goalProgressPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openConfigModal}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>{summary.isOpened ? '⚙️ Ajustar Caixa do Mês' : '🔓 Abrir Caixa de ' + formatMonthLabel(activeMonth, true)}</span>
            </button>
            {summary.activeInflowDays > 0 && (
              <span className="text-[11px] text-slate-400">
                {summary.activeInflowDays} {summary.activeInflowDays === 1 ? 'dia lançado' : 'dias lançados'}
              </span>
            )}
          </div>

          {compactDashboard && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white text-xs font-extrabold shadow-md cursor-pointer transition flex items-center gap-1.5"
            >
              <span>📊 Abrir Administração & Lançar Dia</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal: Abrir / Ajustar Caixa do Mês */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  💼 Caixa de {formatMonthLabel(activeMonth)}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina o saldo inicial da empresa ao iniciar o mês.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMonthConfig} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">
                    Saldo Inicial de Abertura (R$)
                  </label>
                  {(prevSummary.isOpened || prevSummary.totalInflows > 0 || prevSummary.totalOutflows > 0) && (
                    <button
                      type="button"
                      onClick={() => setOpeningInput(String(Math.max(0, Math.round(prevSummary.walletBalance * 100) / 100)))}
                      className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Usar final de {formatMonthLabel(prevMonthKey, true)} ({formatCurrency(prevSummary.walletBalance)})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 2500,00"
                  className="input font-bold text-lg"
                  value={openingInput}
                  onChange={e => setOpeningInput(e.target.value)}
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Conforme os dias forem alimentados, as entradas somam e as saídas/salários descontam deste saldo automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Meta Mensal (Opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 60000,00"
                    className="input font-semibold text-sm"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Status do Caixa
                  </label>
                  <select
                    className="input font-semibold text-sm"
                    value={statusInput}
                    onChange={e => setStatusInput(e.target.value)}
                  >
                    <option value="open">🟢 Caixa Aberto</option>
                    <option value="closed">🔒 Caixa Fechado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Observações do Mês (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de troco + saldo conta PJ"
                  className="input text-sm"
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMonth}
                  className="btn btn-primary flex-1"
                >
                  {savingMonth ? 'Salvando...' : '💾 Salvar Caixa do Mês'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
