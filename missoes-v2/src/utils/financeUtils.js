import { formatCurrency } from './constants.js'

export const INFLOW_METHODS = [
  { key: 'credito', label: 'Crédito', icon: '💳', color: '#6366f1', lightBg: '#eef2ff', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'debito', label: 'Débito', icon: '🏧', color: '#0ea5e9', lightBg: '#f0f9ff', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'voucher', label: 'Voucher', icon: '🎟️', color: '#f59e0b', lightBg: '#fffbeb', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'pix', label: 'PIX', icon: '💠', color: '#10b981', lightBg: '#ecfdf5', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'dinheiro', label: 'Dinheiro', icon: '💵', color: '#22c55e', lightBg: '#f0fdf4', badgeClass: 'bg-green-50 text-green-700 border-green-200' }
]

export const OUTFLOW_CATEGORIES = [
  { key: 'fornecedores', label: 'Fornecedores', icon: '🚚', color: '#ef4444', badgeClass: 'bg-red-50 text-red-700 border-red-200', placeholder: 'Ex: Moinho / Farinha, Coca-Cola, Laticínios...', defaultName: 'Fornecedor' },
  { key: 'boletos', label: 'Boletos', icon: '📄', color: '#f97316', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', placeholder: 'Ex: Boleto Luz, Água, Aluguel, Contador...', defaultName: 'Boleto' },
  { key: 'depositos', label: 'Depósitos', icon: '🏦', color: '#8b5cf6', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200', placeholder: 'Ex: Depósito Banco, Sangria Cofre...', defaultName: 'Depósito' },
  { key: 'passagem', label: 'Passagem', icon: '🚌', color: '#06b6d4', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', placeholder: 'Ex: Passagem Equipe, Transporte...', defaultName: 'Passagem' },
  { key: 'outros', label: 'Outras Saídas', icon: '📌', color: '#64748b', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', placeholder: 'Ex: Gás, Manutenção, Embalagens, Gelo...', defaultName: 'Despesa Diversa' }
]

export const PAYROLL_TYPES = [
  { key: 'salario', label: 'Salário Mensal (Saldo)', icon: '💰', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'adiantamento', label: 'Adiantamento / Vale', icon: '💸', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'diaria', label: 'Diária / Hora Extra', icon: '⏱️', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'passagem_func', label: 'Passagem / Vale-Transporte', icon: '🚌', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'decimo_terceiro', label: '13º Salário', icon: '🎄', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'ferias_bonus', label: 'Férias / Bônus / Rescisão', icon: '⭐', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' }
]

export const PAYMENT_CHANNELS = [
  { key: 'dinheiro', label: 'Dinheiro (Caixa)' },
  { key: 'pix', label: 'PIX / Conta' },
  { key: 'transferencia', label: 'Transferência / Banco' },
  { key: 'cartao', label: 'Cartão Corporativo' }
]

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function localDateISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function localMonthISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function shiftDateISO(dateStr, deltaDays) {
  if (!dateStr) return localDateISO()
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  return localDateISO(dt)
}

export function shiftMonthISO(monthStr, deltaMonths) {
  if (!monthStr) return localMonthISO()
  const [y, m] = monthStr.split('-').map(Number)
  const dt = new Date(y, m - 1 + deltaMonths, 1)
  return localMonthISO(dt)
}

export function formatMonthLabel(monthStr, short = false) {
  if (!monthStr || !monthStr.includes('-')) return monthStr || ''
  const [y, m] = monthStr.split('-').map(Number)
  const name = MONTH_NAMES_PT[(m || 1) - 1] || ''
  if (short) return `${name.slice(0, 3)}/${String(y).slice(2)}`
  return `${name} de ${y}`
}

export function formatDateBR(dateStr, withWeekday = false) {
  if (!dateStr || !dateStr.includes('-')) return dateStr || ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  if (!withWeekday) return base
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return `${base} (${WEEKDAYS_SHORT_PT[dt.getDay()]})`
}

export function parseMoneyInput(val) {
  if (val === '' || val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val)
  const cleaned = String(val).trim().replace(/\s/g, '')
  if (!cleaned) return 0
  // Handle both "1.250,50" and "1250.50" or "1250,50"
  let normalized = cleaned
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.')
  }
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : Math.max(0, Math.round(n * 100) / 100)
}

export function displayCurrency(val, hidden = false) {
  if (hidden) return 'R$ ••••••'
  return formatCurrency(Number(val) || 0)
}

export function getOutflowCatMeta(catKey) {
  return OUTFLOW_CATEGORIES.find(c => c.key === catKey) || OUTFLOW_CATEGORIES[OUTFLOW_CATEGORIES.length - 1]
}

export function getPayrollTypeMeta(typeKey) {
  return PAYROLL_TYPES.find(t => t.key === typeKey) || PAYROLL_TYPES[0]
}

/**
 * Computes full financial metrics for a given period (either a monthKey or [startDate, endDate])
 */
export function computePeriodMetrics({
  days = [],
  payroll = [],
  openingBalance = 0,
  revenueGoal = 0
}) {
  const inflowByMethod = {
    credito: 0,
    debito: 0,
    voucher: 0,
    pix: 0,
    dinheiro: 0,
    extra: 0
  }

  const outflowByCategory = {
    fornecedores: 0,
    boletos: 0,
    depositos: 0,
    passagem: 0,
    outros: 0,
    funcionarios: 0
  }

  const allNamedOutflows = []
  let bestDay = null

  const sortedDays = [...days].sort((a, b) => String(a.date).localeCompare(String(b.date)))

  sortedDays.forEach(d => {
    const inf = d.inflows || {}
    const c = Number(inf.credito) || 0
    const db = Number(inf.debito) || 0
    const v = Number(inf.voucher) || 0
    const p = Number(inf.pix) || 0
    const dn = Number(inf.dinheiro) || 0
    const ex = (d.extraInflows || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0)

    inflowByMethod.credito += c
    inflowByMethod.debito += db
    inflowByMethod.voucher += v
    inflowByMethod.pix += p
    inflowByMethod.dinheiro += dn
    inflowByMethod.extra += ex

    const dayIn = c + db + v + p + dn + ex
    if (dayIn > 0 && (!bestDay || dayIn > bestDay.amount)) {
      bestDay = { date: d.date, amount: dayIn }
    }

    ;(d.outflows || []).forEach(o => {
      const amt = Number(o.amount) || 0
      const cat = outflowByCategory[o.category] !== undefined ? o.category : 'outros'
      outflowByCategory[cat] += amt
      if (amt > 0) {
        allNamedOutflows.push({
          ...o,
          date: d.date,
          category: cat,
          amount: amt
        })
      }
    })
  })

  payroll.forEach(p => {
    const amt = Number(p.amount) || 0
    outflowByCategory.funcionarios += amt
    if (amt > 0) {
      allNamedOutflows.push({
        id: p.id,
        date: p.date,
        category: 'funcionarios',
        name: `${p.employeeName} (${getPayrollTypeMeta(p.paymentType).label})`,
        amount: amt,
        paymentMethod: p.paymentMethod || 'dinheiro',
        isPayroll: true
      })
    }
  })

  const totalInflows =
    inflowByMethod.credito +
    inflowByMethod.debito +
    inflowByMethod.voucher +
    inflowByMethod.pix +
    inflowByMethod.dinheiro +
    inflowByMethod.extra

  const totalOperationalOutflows =
    outflowByCategory.fornecedores +
    outflowByCategory.boletos +
    outflowByCategory.depositos +
    outflowByCategory.passagem +
    outflowByCategory.outros

  const totalPayroll = outflowByCategory.funcionarios
  const totalOutflows = totalOperationalOutflows + totalPayroll
  const operationalNet = totalInflows - totalOutflows
  const walletBalance = (Number(openingBalance) || 0) + totalInflows - totalOutflows

  const activeInflowDays = sortedDays.filter(d => (Number(d.totalInflows) || 0) > 0).length
  const averageDailyRevenue = activeInflowDays > 0 ? totalInflows / activeInflowDays : 0
  const digitalRevenue = inflowByMethod.credito + inflowByMethod.debito + inflowByMethod.voucher + inflowByMethod.pix
  const cashRevenue = inflowByMethod.dinheiro
  const netMarginPct = totalInflows > 0 ? (operationalNet / totalInflows) * 100 : 0
  const goalProgressPct = revenueGoal > 0 ? Math.min(100, (totalInflows / revenueGoal) * 100) : 0

  // Build daily ledger with running wallet balance
  const payrollByDate = {}
  payroll.forEach(p => {
    if (!payrollByDate[p.date]) payrollByDate[p.date] = []
    payrollByDate[p.date].push(p)
  })

  const allDatesSet = new Set([
    ...sortedDays.map(d => d.date),
    ...Object.keys(payrollByDate)
  ])
  const allDatesAsc = Array.from(allDatesSet).filter(Boolean).sort((a, b) => a.localeCompare(b))
  const dayMap = new Map(sortedDays.map(d => [d.date, d]))

  let runningBalance = Number(openingBalance) || 0
  const dailyLedger = allDatesAsc.map(date => {
    const dDoc = dayMap.get(date) || null
    const dayPay = payrollByDate[date] || []
    const dayIn = Number(dDoc?.totalInflows || 0)
    const dayOpOut = Number(dDoc?.totalOutflows || 0)
    const dayPayOut = dayPay.reduce((s, x) => s + (Number(x.amount) || 0), 0)
    const dayTotalOut = dayOpOut + dayPayOut
    const dayNet = dayIn - dayTotalOut
    runningBalance += dayNet

    return {
      date,
      dayDoc: dDoc,
      payrollItems: dayPay,
      inflows: dDoc?.inflows || { credito: 0, debito: 0, voucher: 0, pix: 0, dinheiro: 0 },
      extraInflows: dDoc?.extraInflows || [],
      outflows: dDoc?.outflows || [],
      dayIn,
      dayOpOut,
      dayPayOut,
      dayTotalOut,
      dayNet,
      runningBalance
    }
  })

  // Top named expenses grouped by normalized name
  const groupedExpensesMap = new Map()
  allNamedOutflows.forEach(item => {
    const normKey = `${item.category}::${String(item.name || '').trim().toUpperCase()}`
    const prev = groupedExpensesMap.get(normKey) || {
      name: item.name,
      category: item.category,
      total: 0,
      count: 0
    }
    prev.total += item.amount
    prev.count += 1
    groupedExpensesMap.set(normKey, prev)
  })
  const topNamedExpenses = Array.from(groupedExpensesMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  return {
    openingBalance: Number(openingBalance) || 0,
    revenueGoal: Number(revenueGoal) || 0,
    inflowByMethod,
    outflowByCategory,
    totalInflows,
    totalOperationalOutflows,
    totalPayroll,
    totalOutflows,
    operationalNet,
    walletBalance,
    activeInflowDays,
    averageDailyRevenue,
    digitalRevenue,
    cashRevenue,
    netMarginPct,
    goalProgressPct,
    bestDay,
    dailyLedger,
    topNamedExpenses,
    allNamedOutflows
  }
}

export function computeMonthSummary(monthKeyStr, financeMonthsAll = [], financeDaysAll = [], financePayrollAll = []) {
  const monthDoc = (financeMonthsAll || []).find(m => (m.monthKey || m.id) === monthKeyStr) || null
  const days = (financeDaysAll || []).filter(d => d.monthKey === monthKeyStr || String(d.date || '').startsWith(monthKeyStr))
  const payroll = (financePayrollAll || []).filter(p => p.monthKey === monthKeyStr || String(p.date || '').startsWith(monthKeyStr))

  const metrics = computePeriodMetrics({
    days,
    payroll,
    openingBalance: monthDoc?.openingBalance || 0,
    revenueGoal: monthDoc?.revenueGoal || 0
  })

  return {
    monthKey: monthKeyStr,
    monthDoc,
    isOpened: !!monthDoc,
    status: monthDoc?.status || 'unopened',
    ...metrics
  }
}
