import { useState, useEffect, useMemo } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency } from '../../utils/constants'
import StoreWalletBanner from '../../components/StoreWalletBanner'
import FinanceCharts from '../../components/FinanceCharts'
import {
  INFLOW_METHODS,
  OUTFLOW_CATEGORIES,
  PAYROLL_TYPES,
  PAYMENT_CHANNELS,
  computeMonthSummary,
  computePeriodMetrics,
  formatDateBR,
  formatMonthLabel,
  getOutflowCatMeta,
  getPayrollTypeMeta,
  localDateISO,
  localMonthISO,
  parseMoneyInput,
  shiftDateISO,
  shiftMonthISO
} from '../../utils/financeUtils'

export default function AdminFinance({ onBack }) {
  const { store, storeId, isManager, logout } = useAuth()
  const {
    employees = [],
    contrachequeEmployees = [],
    contrachequesAll = [],
    financeMonthsAll = [],
    saveFinanceMonth,
    financeDaysAll = [],
    saveFinanceDay,
    deleteFinanceDay,
    financePayrollAll = [],
    saveFinancePayroll,
    deleteFinancePayroll,
    isForbiddenCrossStoreEmployee
  } = useStore()

  // Main workspace navigation
  const [activeTab, setActiveTab] = useState('diario') // 'diario' | 'funcionarios' | 'extrato' | 'relatorios'
  const [selectedMonth, setSelectedMonth] = useState(localMonthISO())
  const [selectedDate, setSelectedDate] = useState(localDateISO())

  // Sync selectedMonth when selectedDate changes on daily tab
  function handleDateChange(newDate) {
    if (!newDate) return
    setSelectedDate(newDate)
    const mk = newDate.slice(0, 7)
    if (mk && mk !== selectedMonth) {
      setSelectedMonth(mk)
    }
  }

  function handleMonthChange(newMonth) {
    if (!newMonth) return
    setSelectedMonth(newMonth)
    if (!selectedDate.startsWith(newMonth)) {
      const today = localDateISO()
      setSelectedDate(today.startsWith(newMonth) ? today : `${newMonth}-01`)
    }
  }

  // ===== TAB 1: DAILY ENTRY STATE =====
  const existingDayDoc = useMemo(
    () => (financeDaysAll || []).find(d => d.date === selectedDate) || null,
    [financeDaysAll, selectedDate]
  )

  const [inflowInputs, setInflowInputs] = useState({
    credito: '',
    debito: '',
    voucher: '',
    pix: '',
    dinheiro: ''
  })
  const [extraInflows, setExtraInflows] = useState([])
  const [showExtraInflowForm, setShowExtraInflowForm] = useState(false)
  const [extraInName, setExtraInName] = useState('')
  const [extraInVal, setExtraInVal] = useState('')

  const [outflows, setOutflows] = useState([])
  const [outCategory, setOutCategory] = useState('fornecedores')
  const [outName, setOutName] = useState('')
  const [outAmount, setOutAmount] = useState('')
  const [outChannel, setOutChannel] = useState('dinheiro')
  const [editingOutId, setEditingOutId] = useState(null)

  const [dayNotes, setDayNotes] = useState('')
  const [savingDay, setSavingDay] = useState(false)

  // Load selected day's data into form whenever selectedDate or existingDayDoc changes
  useEffect(() => {
    if (existingDayDoc) {
      const inf = existingDayDoc.inflows || {}
      setInflowInputs({
        credito: inf.credito ? String(inf.credito) : '',
        debito: inf.debito ? String(inf.debito) : '',
        voucher: inf.voucher ? String(inf.voucher) : '',
        pix: inf.pix ? String(inf.pix) : '',
        dinheiro: inf.dinheiro ? String(inf.dinheiro) : ''
      })
      setExtraInflows(existingDayDoc.extraInflows || [])
      setOutflows(existingDayDoc.outflows || [])
      setDayNotes(existingDayDoc.notes || '')
    } else {
      setInflowInputs({ credito: '', debito: '', voucher: '', pix: '', dinheiro: '' })
      setExtraInflows([])
      setOutflows([])
      setDayNotes('')
    }
    setOutName('')
    setOutAmount('')
    setEditingOutId(null)
  }, [selectedDate, existingDayDoc?.updatedAtMs])

  // Historical payment names for smart quick-fill chips
  const suggestedPaymentNames = useMemo(() => {
    const namesMap = new Map()
    ;(financeDaysAll || []).forEach(d => {
      ;(d.outflows || []).forEach(o => {
        if (o.category === outCategory && o.name) {
          const clean = o.name.trim()
          if (clean) namesMap.set(clean.toUpperCase(), clean)
        }
      })
    })
    return Array.from(namesMap.values()).slice(0, 8)
  }, [financeDaysAll, outCategory])

  // Live daily calculations
  const parsedInflows = useMemo(() => ({
    credito: parseMoneyInput(inflowInputs.credito),
    debito: parseMoneyInput(inflowInputs.debito),
    voucher: parseMoneyInput(inflowInputs.voucher),
    pix: parseMoneyInput(inflowInputs.pix),
    dinheiro: parseMoneyInput(inflowInputs.dinheiro)
  }), [inflowInputs])

  const dayExtraInSum = useMemo(
    () => extraInflows.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [extraInflows]
  )

  const dayTotalInflows =
    parsedInflows.credito +
    parsedInflows.debito +
    parsedInflows.voucher +
    parsedInflows.pix +
    parsedInflows.dinheiro +
    dayExtraInSum

  const dayTotalOutflows = useMemo(
    () => outflows.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [outflows]
  )

  const dayPayrollItems = useMemo(
    () => (financePayrollAll || []).filter(p => p.date === selectedDate),
    [financePayrollAll, selectedDate]
  )
  const dayPayrollSum = useMemo(
    () => dayPayrollItems.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [dayPayrollItems]
  )

  const dayNetResult = dayTotalInflows - dayTotalOutflows - dayPayrollSum

  function handleAddExtraInflow() {
    const amt = parseMoneyInput(extraInVal)
    if (amt <= 0) {
      toast.error('Informe um valor válido para a entrada avulsa.')
      return
    }
    setExtraInflows(prev => [
      ...prev,
      {
        id: 'in_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        name: extraInName.trim() || 'Entrada Avulsa / Suprimento',
        amount: amt
      }
    ])
    setExtraInName('')
    setExtraInVal('')
    setShowExtraInflowForm(false)
  }

  function handleAddOrUpdateOutflow() {
    const amt = parseMoneyInput(outAmount)
    if (amt <= 0) {
      toast.error('Informe o valor do pagamento/saída.')
      return
    }
    const catMeta = getOutflowCatMeta(outCategory)
    const finalName = outName.trim() || catMeta.defaultName

    if (editingOutId) {
      setOutflows(prev =>
        prev.map(o =>
          o.id === editingOutId
            ? { ...o, category: outCategory, name: finalName, amount: amt, paymentMethod: outChannel }
            : o
        )
      )
      setEditingOutId(null)
      toast.success('Pagamento atualizado na lista!')
    } else {
      setOutflows(prev => [
        ...prev,
        {
          id: 'out_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          category: outCategory,
          name: finalName,
          amount: amt,
          paymentMethod: outChannel
        }
      ])
      toast.success('Saída adicionada! Lembre-se de salvar o dia.')
    }
    setOutName('')
    setOutAmount('')
  }

  function startEditOutflow(item) {
    setEditingOutId(item.id)
    setOutCategory(item.category || 'outros')
    setOutName(item.name || '')
    setOutAmount(String(item.amount || ''))
    setOutChannel(item.paymentMethod || 'dinheiro')
  }

  function removeOutflow(id) {
    setOutflows(prev => prev.filter(o => o.id !== id))
    if (editingOutId === id) {
      setEditingOutId(null)
      setOutName('')
      setOutAmount('')
    }
  }

  async function handleSaveDailyRecord() {
    let finalOutflows = [...outflows]
    let finalExtraInflows = [...extraInflows]

    // Auto-include pending typed outflow if user typed an amount and clicked Save directly
    const pendingOutAmt = parseMoneyInput(outAmount)
    if (pendingOutAmt > 0) {
      const catMeta = getOutflowCatMeta(outCategory)
      const finalName = outName.trim() || catMeta.defaultName
      if (editingOutId) {
        finalOutflows = finalOutflows.map(o =>
          o.id === editingOutId
            ? { ...o, category: outCategory, name: finalName, amount: pendingOutAmt, paymentMethod: outChannel }
            : o
        )
      } else {
        finalOutflows.push({
          id: 'out_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          category: outCategory,
          name: finalName,
          amount: pendingOutAmt,
          paymentMethod: outChannel
        })
      }
      setOutflows(finalOutflows)
      setOutName('')
      setOutAmount('')
      setEditingOutId(null)
    }

    // Auto-include pending extra inflow
    const pendingExtraAmt = parseMoneyInput(extraInVal)
    if (pendingExtraAmt > 0) {
      finalExtraInflows.push({
        id: 'in_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        name: extraInName.trim() || 'Entrada Avulsa / Suprimento',
        amount: pendingExtraAmt
      })
      setExtraInflows(finalExtraInflows)
      setExtraInName('')
      setExtraInVal('')
    }

    setSavingDay(true)
    try {
      await saveFinanceDay({
        date: selectedDate,
        inflows: parsedInflows,
        extraInflows: finalExtraInflows,
        outflows: finalOutflows,
        notes: dayNotes
      })
      toast.success(`Movimento de ${formatDateBR(selectedDate)} salvo no caixa!`)
    } catch (err) {
      console.error('Erro ao salvar lançamento diário:', err)
      toast.error('Erro ao salvar dia: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSavingDay(false)
    }
  }

  // ===== TAB 2: EMPLOYEE PAYROLL STATE =====
  const allEmployeeOptions = useMemo(() => {
    const map = new Map()
    ;(contrachequeEmployees || []).forEach(e => {
      if (e.name) map.set(e.name.trim().toUpperCase(), e.name.trim())
    })
    ;(employees || []).forEach(e => {
      if (e.name) {
        const upper = e.name.trim().toUpperCase()
        // Avoid adding short name if full name starting with it already exists, or keep both clearly
        const hasFullName = Array.from(map.keys()).some(k => k === upper || k.startsWith(upper + ' '))
        if (!hasFullName) map.set(upper, e.name.trim())
      }
    })
    ;(financePayrollAll || []).forEach(p => {
      if (p.employeeName) map.set(p.employeeName.trim().toUpperCase(), p.employeeName.trim())
    })
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b))
  }, [employees, contrachequeEmployees, financePayrollAll])

  const [payEmpSelect, setPayEmpSelect] = useState('')
  const [payEmpManual, setPayEmpManual] = useState('')
  const [isManualPayEmp, setIsManualPayEmp] = useState(false)
  const [payType, setPayType] = useState('salario')
  const [payDate, setPayDate] = useState(localDateISO())
  const [payRefMonth, setPayRefMonth] = useState(localMonthISO())
  const [payAmount, setPayAmount] = useState('')
  const [payChannel, setPayChannel] = useState('dinheiro')
  const [payNotes, setPayNotes] = useState('')
  const [editingPayId, setEditingPayId] = useState(null)
  const [savingPay, setSavingPay] = useState(false)
  const [payrollFilterEmp, setPayrollFilterEmp] = useState('')

  const monthPayrollList = useMemo(() => {
    return (financePayrollAll || []).filter(p => {
      const inMonth = (p.monthKey || String(p.date || '').slice(0, 7)) === selectedMonth
      if (!inMonth) return false
      if (payrollFilterEmp && p.employeeName !== payrollFilterEmp) return false
      return true
    })
  }, [financePayrollAll, selectedMonth, payrollFilterEmp])

  // Contracheques matching selectedMonth or previous month that can be imported with 1 click
  const importablePaystubs = useMemo(() => {
    const prevMk = shiftMonthISO(selectedMonth, -1)
    return (contrachequesAll || []).filter(cc =>
      cc.referenceMonth === selectedMonth || cc.referenceMonth === prevMk
    ).slice(0, 12)
  }, [contrachequesAll, selectedMonth])

  function resetPayrollForm() {
    setPayEmpSelect('')
    setPayEmpManual('')
    setIsManualPayEmp(false)
    setPayType('salario')
    setPayDate(localDateISO().startsWith(selectedMonth) ? localDateISO() : `${selectedMonth}-05`)
    setPayRefMonth(selectedMonth)
    setPayAmount('')
    setPayChannel('dinheiro')
    setPayNotes('')
    setEditingPayId(null)
  }

  async function handleSavePayroll(e) {
    e?.preventDefault?.()
    const empName = (isManualPayEmp ? payEmpManual : payEmpSelect).trim()
    if (!empName) {
      toast.error('Selecione ou digite o nome do funcionário.')
      return
    }
    if (isForbiddenCrossStoreEmployee?.(empName)) {
      toast.error(`Bloqueado: "${empName}" pertence a outra loja e não pode aparecer ou ser lançado em ${store?.shortName || 'outra unidade'}.`)
      return
    }
    const amt = parseMoneyInput(payAmount)
    if (amt <= 0) {
      toast.error('Informe o valor pago ao funcionário.')
      return
    }
    if (!payDate) {
      toast.error('Informe a data da saída no caixa.')
      return
    }

    setSavingPay(true)
    try {
      await saveFinancePayroll({
        ...(editingPayId ? { id: editingPayId } : {}),
        employeeName: empName,
        paymentType: payType,
        date: payDate,
        referenceMonth: payRefMonth || payDate.slice(0, 7),
        amount: amt,
        paymentMethod: payChannel,
        notes: payNotes
      })
      toast.success(editingPayId ? 'Pagamento atualizado!' : `Pagamento de ${empName} lançado no caixa!`)
      resetPayrollForm()
    } catch (err) {
      console.error('Erro ao salvar pagamento de funcionário:', err)
      toast.error('Erro ao registrar pagamento: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSavingPay(false)
    }
  }

  function startEditPayroll(p) {
    const existsInOptions = allEmployeeOptions.includes(p.employeeName)
    if (existsInOptions) {
      setIsManualPayEmp(false)
      setPayEmpSelect(p.employeeName)
      setPayEmpManual('')
    } else {
      setIsManualPayEmp(true)
      setPayEmpManual(p.employeeName || '')
      setPayEmpSelect('')
    }
    setPayType(p.paymentType || 'salario')
    setPayDate(p.date || localDateISO())
    setPayRefMonth(p.referenceMonth || selectedMonth)
    setPayAmount(String(p.amount || ''))
    setPayChannel(p.paymentMethod || 'dinheiro')
    setPayNotes(p.notes || '')
    setEditingPayId(p.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function quickLaunchFromPaystub(cc, kind) {
    const amt = kind === 'adiantamento' ? Number(cc.advancePay || 0) : Number(cc.netPay || 0)
    if (amt <= 0) {
      toast.error('Valor zerado neste contracheque.')
      return
    }
    const payDt = cc.paymentDate && cc.paymentDate.startsWith(selectedMonth)
      ? cc.paymentDate
      : (localDateISO().startsWith(selectedMonth) ? localDateISO() : `${selectedMonth}-05`)

    const label = kind === 'adiantamento' ? 'Adiantamento Salarial' : 'Saldo de Salário (Contracheque)'
    if (!confirm(`Lançar ${label} de ${cc.employee} no valor de ${formatCurrency(amt)} na data ${formatDateBR(payDt)}?`)) {
      return
    }

    try {
      await saveFinancePayroll({
        employeeName: cc.employee,
        paymentType: kind === 'adiantamento' ? 'adiantamento' : (cc.type === '13_salario' ? 'decimo_terceiro' : 'salario'),
        date: payDt,
        referenceMonth: cc.referenceMonth || selectedMonth,
        amount: amt,
        paymentMethod: 'dinheiro',
        notes: `Importado do contracheque ref. ${cc.referenceMonth}`,
        contrachequeId: cc.id
      })
      toast.success(`${label} lançado e descontado do saldo da loja!`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao importar pagamento.')
    }
  }

  // ===== TAB 3 & 4: SUMMARY, LEDGER & REPORTS =====
  const monthSummary = useMemo(
    () => computeMonthSummary(selectedMonth, financeMonthsAll, financeDaysAll, financePayrollAll),
    [selectedMonth, financeMonthsAll, financeDaysAll, financePayrollAll]
  )

  const [expandedLedgerDate, setExpandedLedgerDate] = useState(null)
  const [, setWalletVisTick] = useState(0)

  useEffect(() => {
    const onVis = () => setWalletVisTick(t => t + 1)
    window.addEventListener('mdl_wallet_vis_change', onVis)
    return () => window.removeEventListener('mdl_wallet_vis_change', onVis)
  }, [])

  // List of all known months (opened or with movements)
  const allKnownMonths = useMemo(() => {
    const set = new Set([localMonthISO(), selectedMonth])
    ;(financeMonthsAll || []).forEach(m => m.monthKey && set.add(m.monthKey))
    ;(financeDaysAll || []).forEach(d => d.monthKey && set.add(d.monthKey))
    ;(financePayrollAll || []).forEach(p => p.monthKey && set.add(p.monthKey))
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12)
      .map(mk => computeMonthSummary(mk, financeMonthsAll, financeDaysAll, financePayrollAll))
  }, [selectedMonth, financeMonthsAll, financeDaysAll, financePayrollAll])

  // Reports State
  const [reportMode, setReportMode] = useState('month') // 'month' | 'custom'
  const [customStart, setCustomStart] = useState(`${selectedMonth}-01`)
  const [customEnd, setCustomEnd] = useState(localDateISO())
  const [showCharts, setShowCharts] = useState(true)
  const [reportCategoryFilter, setReportCategoryFilter] = useState('all')

  useEffect(() => {
    setCustomStart(`${selectedMonth}-01`)
  }, [selectedMonth])

  const reportMetrics = useMemo(() => {
    if (reportMode === 'month') {
      return monthSummary
    }
    const sDate = customStart || '2000-01-01'
    const eDate = customEnd || '2099-12-31'
    const filteredDays = (financeDaysAll || []).filter(d => d.date >= sDate && d.date <= eDate)
    const filteredPayroll = (financePayrollAll || []).filter(p => p.date >= sDate && p.date <= eDate)
    const startMonthDoc = (financeMonthsAll || []).find(m => m.monthKey === sDate.slice(0, 7))
    return computePeriodMetrics({
      days: filteredDays,
      payroll: filteredPayroll,
      openingBalance: startMonthDoc?.openingBalance || 0,
      revenueGoal: 0
    })
  }, [reportMode, monthSummary, customStart, customEnd, financeDaysAll, financePayrollAll, financeMonthsAll])

  // 6-Month comparison for charts
  const monthlyComparison = useMemo(() => {
    const arr = []
    for (let i = 5; i >= 0; i--) {
      const mk = shiftMonthISO(selectedMonth, -i)
      const s = computeMonthSummary(mk, financeMonthsAll, financeDaysAll, financePayrollAll)
      arr.push(s)
    }
    return arr
  }, [selectedMonth, financeMonthsAll, financeDaysAll, financePayrollAll])

  const filteredNamedOutflows = useMemo(() => {
    const list = reportMetrics.allNamedOutflows || []
    if (reportCategoryFilter === 'all') return list
    return list.filter(x => x.category === reportCategoryFilter)
  }, [reportMetrics, reportCategoryFilter])

  const reportPeriodTitle = reportMode === 'month'
    ? formatMonthLabel(selectedMonth)
    : `${formatDateBR(customStart)} até ${formatDateBR(customEnd)}`

  // Export: WhatsApp Executive Summary
  function handleShareWhatsApp() {
    const m = reportMetrics
    let txt = `🏦 *CAIXA INDIVIDUAL — ${(store?.name || 'LOJA').toUpperCase()}*\n`
    txt += `🔒 *Unidade Independente:* ${store?.shortName || storeId}\n`
    txt += `📅 *Período:* ${reportPeriodTitle}\n\n`
    txt += `💰 *RESUMO DO CAIXA / CARTEIRA*\n`
    txt += `• Abertura do Caixa: ${formatCurrency(m.openingBalance)}\n`
    txt += `• (+) Entradas Totais: ${formatCurrency(m.totalInflows)}\n`
    txt += `• (-) Saídas Operacionais: ${formatCurrency(m.totalOperationalOutflows)}\n`
    txt += `• (-) Folha / Funcionários: ${formatCurrency(m.totalPayroll)}\n`
    txt += `• (=) Resultado do Período: *${formatCurrency(m.operationalNet)}*\n`
    txt += `• 🏦 *SALDO EM CAIXA:* *${formatCurrency(m.walletBalance)}*\n\n`

    txt += `💳 *ENTRADAS POR MEIO DE PAGAMENTO*\n`
    INFLOW_METHODS.forEach(method => {
      txt += `• ${method.label}: ${formatCurrency(m.inflowByMethod[method.key] || 0)}\n`
    })
    if ((m.inflowByMethod.extra || 0) > 0) {
      txt += `• Outras Entradas: ${formatCurrency(m.inflowByMethod.extra)}\n`
    }

    txt += `\n📉 *SAÍDAS POR CATEGORIA*\n`
    OUTFLOW_CATEGORIES.forEach(cat => {
      txt += `• ${cat.label}: ${formatCurrency(m.outflowByCategory[cat.key] || 0)}\n`
    })
    txt += `• Funcionários: ${formatCurrency(m.outflowByCategory.funcionarios || 0)}\n`

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`
    window.open(url, '_blank')
  }

  // Export: CSV (Excel)
  function handleExportCSV() {
    const m = reportMetrics
    const rows = [
      ['Data', 'Crédito', 'Débito', 'Voucher', 'PIX', 'Dinheiro', 'Outras Entradas', 'Total Entradas', 'Saídas Operacionais', 'Pagto Funcionários', 'Resultado do Dia', 'Saldo Acumulado Caixa', 'Detalhes das Saídas']
    ]

    ;(m.dailyLedger || []).forEach(d => {
      const extraSum = (d.extraInflows || []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
      const details = [
        ...(d.outflows || []).map(o => `${o.name}: R$ ${Number(o.amount).toFixed(2)}`),
        ...(d.payrollItems || []).map(p => `[FUNC] ${p.employeeName}: R$ ${Number(p.amount).toFixed(2)}`)
      ].join(' | ')

      rows.push([
        formatDateBR(d.date),
        Number(d.inflows.credito || 0).toFixed(2).replace('.', ','),
        Number(d.inflows.debito || 0).toFixed(2).replace('.', ','),
        Number(d.inflows.voucher || 0).toFixed(2).replace('.', ','),
        Number(d.inflows.pix || 0).toFixed(2).replace('.', ','),
        Number(d.inflows.dinheiro || 0).toFixed(2).replace('.', ','),
        extraSum.toFixed(2).replace('.', ','),
        Number(d.dayIn || 0).toFixed(2).replace('.', ','),
        Number(d.dayOpOut || 0).toFixed(2).replace('.', ','),
        Number(d.dayPayOut || 0).toFixed(2).replace('.', ','),
        Number(d.dayNet || 0).toFixed(2).replace('.', ','),
        Number(d.runningBalance || 0).toFixed(2).replace('.', ','),
        `"${details.replace(/"/g, '""')}"`
      ])
    })

    const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio_financeiro_${store?.id || 'loja'}_${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Planilha CSV gerada com sucesso!')
  }

  // Export: Printable A4 Executive PDF Report
  function handlePrintReport() {
    const m = reportMetrics
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Permita pop-ups para imprimir o relatório.')
      return
    }

    const inflowsHtml = INFLOW_METHODS.map(method => {
      const val = m.inflowByMethod[method.key] || 0
      const pct = m.totalInflows > 0 ? ((val / m.totalInflows) * 100).toFixed(1) : '0.0'
      return `<tr><td>${method.label}</td><td style="text-align:right">${formatCurrency(val)}</td><td style="text-align:right">${pct}%</td></tr>`
    }).join('')

    const outflowsHtml = [
      ...OUTFLOW_CATEGORIES.map(c => ({ label: c.label, val: m.outflowByCategory[c.key] || 0 })),
      { label: 'Folha / Pagamento de Funcionários', val: m.outflowByCategory.funcionarios || 0 }
    ].map(item => {
      const pct = m.totalOutflows > 0 ? ((item.val / m.totalOutflows) * 100).toFixed(1) : '0.0'
      return `<tr><td>${item.label}</td><td style="text-align:right">${formatCurrency(item.val)}</td><td style="text-align:right">${pct}%</td></tr>`
    }).join('')

    const ledgerHtml = (m.dailyLedger || []).map(d => `
      <tr>
        <td>${formatDateBR(d.date, true)}</td>
        <td style="text-align:right;color:#047857">${formatCurrency(d.dayIn)}</td>
        <td style="text-align:right;color:#be123c">${formatCurrency(d.dayOpOut)}</td>
        <td style="text-align:right;color:#b45309">${formatCurrency(d.dayPayOut)}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(d.dayNet)}</td>
        <td style="text-align:right;font-weight:700;color:#1e1b4b">${formatCurrency(d.runningBalance)}</td>
      </tr>
    `).join('')

    const paymentsHtml = filteredNamedOutflows.map(o => `
      <tr>
        <td>${formatDateBR(o.date)}</td>
        <td>${o.isPayroll ? 'Funcionários' : getOutflowCatMeta(o.category).label}</td>
        <td>${o.name}</td>
        <td style="text-align:right;font-weight:600">${formatCurrency(o.amount)}</td>
      </tr>
    `).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Administrativo - ${store?.name || 'Loja'} - ${reportPeriodTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
          .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
          .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 14px; font-weight: 800; margin-top: 3px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
          h3 { font-size: 12px; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 12px 0 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; font-size: 10.5px; }
          th { background: #f1f5f9; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${store?.name || 'Unidade'} — Caixa Individual (${store?.shortName || storeId})</h1>
            <div class="sub">Período: <strong>${reportPeriodTitle}</strong> • Caixa exclusivo desta loja (sem mistura entre filiais)</div>
          </div>
          <div style="text-align:right">
            <div class="sub">Emitido em: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <div class="kpi-label">Abertura Caixa</div>
            <div class="kpi-val">${formatCurrency(m.openingBalance)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">(+) Entradas</div>
            <div class="kpi-val" style="color:#047857">${formatCurrency(m.totalInflows)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">(-) Despesas</div>
            <div class="kpi-val" style="color:#be123c">${formatCurrency(m.totalOperationalOutflows)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">(-) Funcionários</div>
            <div class="kpi-val" style="color:#b45309">${formatCurrency(m.totalPayroll)}</div>
          </div>
          <div class="kpi" style="background:#0f172a;color:#fff;border-color:#0f172a">
            <div class="kpi-label" style="color:#94a3b8">Saldo Final Caixa</div>
            <div class="kpi-val" style="color:#34d399">${formatCurrency(m.walletBalance)}</div>
          </div>
        </div>

        <div class="grid2">
          <div>
            <h3>Entradas por Modalidade</h3>
            <table>
              <thead><tr><th>Modalidade</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
              <tbody>${inflowsHtml}</tbody>
            </table>
          </div>
          <div>
            <h3>Saídas por Categoria</h3>
            <table>
              <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
              <tbody>${outflowsHtml}</tbody>
            </table>
          </div>
        </div>

        <h3>Evolução Diária do Caixa</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th style="text-align:right">Entradas</th>
              <th style="text-align:right">Saídas Dia</th>
              <th style="text-align:right">Funcionários</th>
              <th style="text-align:right">Saldo Dia</th>
              <th style="text-align:right">Caixa Acumulado</th>
            </tr>
          </thead>
          <tbody>${ledgerHtml || '<tr><td colspan="6">Sem registros no período.</td></tr>'}</tbody>
        </table>

        <h3>Detalhamento de Todos os Pagamentos & Saídas (${filteredNamedOutflows.length})</h3>
        <table>
          <thead>
            <tr><th>Data</th><th>Categoria</th><th>Descrição / Favorecido</th><th style="text-align:right">Valor</th></tr>
          </thead>
          <tbody>${paymentsHtml || '<tr><td colspan="4">Nenhum pagamento registrado.</td></tr>'}</tbody>
        </table>

        <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (!isManager) return null

  const navItems = [
    { key: 'diario', icon: '📝', label: 'Lançar Dia', sub: 'Entradas & Saídas' },
    { key: 'funcionarios', icon: '👷', label: 'Funcionários', sub: 'Salários & Vales' },
    { key: 'extrato', icon: '📒', label: 'Extrato & Caixa', sub: 'Livro Diário' },
    { key: 'relatorios', icon: '📊', label: 'Relatórios & Gráficos', sub: 'Métricas & PDF' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" />

      {/* Top Sticky Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="touch-target w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-lg font-bold flex items-center justify-center shrink-0"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-900 text-base sm:text-lg truncate flex items-center gap-2">
                <span>🏛️ Administração & Caixa — {store?.shortName}</span>
                <span
                  className="hidden md:inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: store?.theme?.accent || '#4f46e5' }}
                >
                  🔒 Caixa Individual: {store?.shortName}
                </span>
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {store?.name} • Caixa 100% individual e isolado desta loja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title={`Caixa Individual de ${store?.shortName}`}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🏦</span>
              <span className="hidden sm:inline text-slate-300 font-semibold">{store?.shortName}:</span>
              <span className={monthSummary.walletBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {(() => {
                  try {
                    if (localStorage.getItem(`mdl_wallet_collapse_${storeId}`) === '1') return 'Oculta'
                    if (localStorage.getItem(`mdl_wallet_mask_${storeId}`) === '1') return 'R$ •••••'
                  } catch {}
                  return formatCurrency(monthSummary.walletBalance)
                })()}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Deseja sair de ${store?.shortName} para acessar o caixa individual de outra loja?`)) {
                  logout()
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
              title="Trocar de loja"
            >
              ⇄ Loja
            </button>
            <button
              type="button"
              onClick={() => {
                handleDateChange(localDateISO())
                setActiveTab('diario')
              }}
              className="hidden sm:inline-flex btn btn-ghost text-xs py-2 px-3 min-h-0"
            >
              📅 Hoje
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
        {/* Always-Visible Store Wallet across all tabs (with Mask & Hide options) */}
        <StoreWalletBanner
          selectedMonth={selectedMonth}
          onSelectMonth={handleMonthChange}
        />

        {/* Workspace Navigation Tabs (Mobile Scrollable + Desktop 4-Col Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {navItems.map(item => {
            const active = activeTab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20 scale-[1.01]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm truncate">{item.label}</div>
                  <div className={`text-[11px] truncate ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {item.sub}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* =========================================================
            TAB 1: LANÇAMENTO DIÁRIO (ENTRADAS + SAÍDAS NOMEADAS)
           ========================================================= */}
        {activeTab === 'diario' && (
          <div className="space-y-5 animate-fade-in">
            {/* Date Picker Bar */}
            <div className="card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDateChange(shiftDateISO(selectedDate, -1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  title="Dia anterior"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="input font-extrabold text-sm sm:text-base w-auto py-2 px-3 min-h-[42px]"
                />
                <button
                  type="button"
                  onClick={() => handleDateChange(shiftDateISO(selectedDate, 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  title="Próximo dia"
                >
                  ▶
                </button>

                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleDateChange(localDateISO())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      selectedDate === localDateISO()
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateChange(shiftDateISO(localDateISO(), -1))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      selectedDate === shiftDateISO(localDateISO(), -1)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Ontem
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {existingDayDoc ? (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✅ Dia Preenchido • Editando {formatDateBR(selectedDate, true)}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ✨ Novo Fechamento • {formatDateBR(selectedDate, true)}
                  </span>
                )}
              </div>
            </div>

            {/* Two-Column Responsive Split: Entradas (Left) & Saídas (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT: ENTRADAS DO DIA */}
              <div className="lg:col-span-5 card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">🟢</span>
                      <span>Entradas do Dia</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vendas por modalidade recebidas em {formatDateBR(selectedDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Subtotal Entradas</div>
                    <div className="text-lg font-black text-emerald-600">
                      {formatCurrency(dayTotalInflows)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {INFLOW_METHODS.map(method => {
                    const numVal = parsedInflows[method.key] || 0
                    const pct = dayTotalInflows > 0 ? ((numVal / dayTotalInflows) * 100).toFixed(0) : null
                    return (
                      <div
                        key={method.key}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 focus-within:bg-white focus-within:border-indigo-400 transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                            <span className="text-base">{method.icon}</span>
                            <span>{method.label}</span>
                          </label>
                          {numVal > 0 && pct !== null && (
                            <span className="text-[11px] font-bold text-slate-400">
                              {pct}% do dia
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-sm font-bold text-slate-400">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={inflowInputs[method.key]}
                            onChange={e =>
                              setInflowInputs(prev => ({ ...prev, [method.key]: e.target.value }))
                            }
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-extrabold text-slate-900 text-base focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Extra Inflows (Optional Suprimento / Outras Entradas) */}
                <div className="pt-2 border-t border-slate-100">
                  {extraInflows.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <div className="text-[11px] font-bold uppercase text-slate-400">
                        Outras Entradas / Suprimentos
                      </div>
                      {extraInflows.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/70 px-3 py-2 rounded-xl text-xs">
                          <span className="font-bold text-emerald-900">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-700">{formatCurrency(item.amount)}</span>
                            <button
                              type="button"
                              onClick={() => setExtraInflows(prev => prev.filter(x => x.id !== item.id))}
                              className="text-rose-500 font-bold hover:text-rose-700 cursor-pointer px-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!showExtraInflowForm ? (
                    <button
                      type="button"
                      onClick={() => setShowExtraInflowForm(true)}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      ➕ Adicionar suprimento ou outra entrada avulsa
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <div className="text-xs font-bold text-emerald-900">Nova Entrada Avulsa</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Encomenda, Troco)"
                          value={extraInName}
                          onChange={e => setExtraInName(e.target.value)}
                          className="input text-xs py-2 min-h-[38px]"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Valor R$"
                          value={extraInVal}
                          onChange={e => setExtraInVal(e.target.value)}
                          className="input text-xs font-bold py-2 min-h-[38px]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowExtraInflowForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddExtraInflow}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 cursor-pointer"
                        >
                          + Incluir Entrada
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: SAÍDAS E PAGAMENTOS DO DIA */}
              <div className="lg:col-span-7 card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm">🔴</span>
                      <span>Saídas & Pagamentos do Dia</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Passagem, boletos, depósitos, fornecedores e qualquer despesa com nome
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Subtotal Saídas</div>
                    <div className="text-lg font-black text-rose-600">
                      {formatCurrency(dayTotalOutflows)}
                    </div>
                  </div>
                </div>

                {/* Add / Edit Named Payment Builder */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      {editingOutId ? '✏️ Editando Pagamento' : '➕ Adicionar Pagamento / Saída'}
                    </span>
                    {editingOutId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOutId(null)
                          setOutName('')
                          setOutAmount('')
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>

                  {/* Category Selector Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {OUTFLOW_CATEGORIES.map(cat => {
                      const selected = outCategory === cat.key
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setOutCategory(cat.key)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                            selected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Quick Autocomplete Chips from History */}
                  {suggestedPaymentNames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Recentes:</span>
                      {suggestedPaymentNames.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setOutName(name)}
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-700 cursor-pointer transition"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Payment Name + Value + Channel Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Nome / Descrição do Pagamento
                      </label>
                      <input
                        type="text"
                        placeholder={getOutflowCatMeta(outCategory).placeholder}
                        value={outName}
                        onChange={e => setOutName(e.target.value)}
                        className="input text-sm font-semibold py-2.5 min-h-[44px]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={outAmount}
                        onChange={e => setOutAmount(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddOrUpdateOutflow()
                          }
                        }}
                        className="input text-sm font-extrabold py-2.5 min-h-[44px]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Meio
                      </label>
                      <select
                        value={outChannel}
                        onChange={e => setOutChannel(e.target.value)}
                        className="input text-xs font-bold py-2.5 min-h-[44px]"
                      >
                        {PAYMENT_CHANNELS.map(ch => (
                          <option key={ch.key} value={ch.key}>{ch.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOrUpdateOutflow}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm shadow-sm cursor-pointer transition flex items-center justify-center gap-2"
                  >
                    <span>{editingOutId ? '✅ Salvar Alteração no Pagamento' : '➕ Incluir Pagamento na Lista do Dia'}</span>
                  </button>
                </div>

                {/* List of Added Outflows for the Day */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pagamentos Lançados em {formatDateBR(selectedDate)} ({outflows.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPayDate(selectedDate)
                        setActiveTab('funcionarios')
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      👷 Lançar pagamento de funcionário →
                    </button>
                  </div>

                  {outflows.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Nenhuma saída operacional lançada neste dia ainda.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                      {outflows.map(item => {
                        const catMeta = getOutflowCatMeta(item.category)
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shrink-0">
                                {catMeta.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900 truncate">
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catMeta.badgeClass}`}>
                                    {catMeta.label}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    • {PAYMENT_CHANNELS.find(c => c.key === item.paymentMethod)?.label || 'Caixa'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-extrabold text-sm text-rose-600">
                                -{formatCurrency(item.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditOutflow(item)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs flex items-center justify-center cursor-pointer"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => removeOutflow(item.id)}
                                className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Also display Employee Payments recorded on this same date */}
                  {dayPayrollItems.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                        <span>👷 Pagamentos de Funcionários nesta data ({dayPayrollItems.length})</span>
                        <span>-{formatCurrency(dayPayrollSum)}</span>
                      </div>
                      {dayPayrollItems.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-amber-800">
                          <span>• {p.employeeName} ({getPayrollTypeMeta(p.paymentType).label})</span>
                          <span className="font-bold">-{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Day Summary & Save Bar */}
            <div className="card p-4 sm:p-5 bg-white border-2 border-indigo-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Observações do Fechamento Diário (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dia chuvoso, movimento forte à tarde, conferido por..."
                    value={dayNotes}
                    onChange={e => setDayNotes(e.target.value)}
                    className="input text-sm py-2.5 min-h-[44px]"
                  />
                </div>

                <div className="md:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Resultado Líquido do Dia
                    </div>
                    <div className={`text-lg font-black ${dayNetResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {dayNetResult >= 0 ? '+' : ''}{formatCurrency(dayNetResult)}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={savingDay}
                    onClick={handleSaveDailyRecord}
                    className="btn btn-primary py-3.5 px-6 text-sm sm:text-base font-extrabold shadow-lg cursor-pointer"
                  >
                    {savingDay ? 'Salvando...' : `💾 Salvar Dia (${formatDateBR(selectedDate).slice(0, 5)})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: PAGAMENTO DOS FUNCIONÁRIOS (FOLHA & VALES NO CAIXA)
           ========================================================= */}
        {activeTab === 'funcionarios' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Form: Launch Employee Payment */}
              <div className="lg:col-span-5 card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base">
                      {editingPayId ? '✏️ Editar Pagamento Salarial' : '👷 Lançar Pagamento de Funcionário'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      O valor lançado é descontado automaticamente do saldo da carteira da loja
                    </p>
                  </div>
                  {editingPayId && (
                    <button
                      type="button"
                      onClick={resetPayrollForm}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <form onSubmit={handleSavePayroll} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Funcionário *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsManualPayEmp(prev => !prev)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {isManualPayEmp ? 'Selecionar da lista' : '➕ Digitar outro nome'}
                      </button>
                    </div>
                    {isManualPayEmp ? (
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder={`Funcionário exclusivo de ${store?.shortName || 'desta loja'}`}
                        value={payEmpManual}
                        onChange={e => setPayEmpManual(e.target.value)}
                        className="input text-sm font-semibold"
                      />
                    ) : (
                      <select
                        value={payEmpSelect}
                        onChange={e => setPayEmpSelect(e.target.value)}
                        className="input text-sm font-semibold"
                      >
                        <option value="">Selecione o funcionário...</option>
                        {allEmployeeOptions.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                        Tipo de Pagamento
                      </label>
                      <select
                        value={payType}
                        onChange={e => setPayType(e.target.value)}
                        className="input text-sm font-semibold"
                      >
                        {PAYROLL_TYPES.map(t => (
                          <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                        Valor Pago (R$) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 650,00"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="input text-base font-extrabold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                        Data da Saída *
                      </label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                        Mês Competência
                      </label>
                      <input
                        type="month"
                        value={payRefMonth}
                        onChange={e => setPayRefMonth(e.target.value)}
                        className="input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                        Meio Pagto.
                      </label>
                      <select
                        value={payChannel}
                        onChange={e => setPayChannel(e.target.value)}
                        className="input text-xs font-bold"
                      >
                        {PAYMENT_CHANNELS.map(ch => (
                          <option key={ch.key} value={ch.key}>{ch.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                      Observação (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Vale quinzenal dia 20, saldo salário, etc."
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                      className="input text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPay}
                    className="btn btn-primary w-full py-3 font-extrabold"
                  >
                    {savingPay ? 'Registrando...' : (editingPayId ? '💾 Salvar Alteração' : '💸 Lançar Pagamento no Caixa')}
                  </button>
                </form>

                {/* Smart 1-Click Import from Contracheques */}
                {importablePaystubs.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-extrabold text-slate-700">
                      ⚡ Atalho: Importar dos Contracheques Recentes
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                      {importablePaystubs.map(cc => {
                        const alreadyLaunched = (financePayrollAll || []).some(p => p.contrachequeId === cc.id)
                        return (
                          <div key={cc.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{cc.employee}</div>
                              <div className="text-[11px] text-slate-500">
                                Ref: {cc.referenceMonth} • Líq: <b>{formatCurrency(cc.netPay)}</b>
                                {Number(cc.advancePay) > 0 ? ` • Vale: ${formatCurrency(cc.advancePay)}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {alreadyLaunched ? (
                                <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">
                                  ✓ Lançado
                                </span>
                              ) : (
                                <>
                                  {Number(cc.advancePay) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => quickLaunchFromPaystub(cc, 'adiantamento')}
                                      className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] cursor-pointer"
                                    >
                                      + Vale
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => quickLaunchFromPaystub(cc, 'liquido')}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                                  >
                                    + Líquido
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* List: Employee Payments in Selected Month */}
              <div className="lg:col-span-7 card p-5 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      📋 Pagamentos da Equipe em {formatMonthLabel(selectedMonth)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total na folha do mês:{' '}
                      <strong className="text-amber-700">{formatCurrency(monthSummary.totalPayroll)}</strong>
                      {monthSummary.totalInflows > 0 && (
                        <span> ({((monthSummary.totalPayroll / monthSummary.totalInflows) * 100).toFixed(1)}% do faturamento)</span>
                      )}
                    </p>
                  </div>

                  <select
                    value={payrollFilterEmp}
                    onChange={e => setPayrollFilterEmp(e.target.value)}
                    className="input text-xs font-bold w-full sm:w-52 py-2 min-h-[38px]"
                  >
                    <option value="">Todos os funcionários</option>
                    {allEmployeeOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {monthPayrollList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    Nenhum pagamento de funcionário registrado no caixa em {formatMonthLabel(selectedMonth)}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {monthPayrollList.map(p => {
                      const tMeta = getPayrollTypeMeta(p.paymentType)
                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                              {(p.employeeName || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-sm text-slate-900 truncate">
                                {p.employeeName}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tMeta.badgeClass}`}>
                                  {tMeta.icon} {tMeta.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                  📅 {formatDateBR(p.date)}
                                </span>
                                {p.referenceMonth && (
                                  <span className="text-[11px] text-slate-400">
                                    (Comp: {p.referenceMonth})
                                  </span>
                                )}
                              </div>
                              {p.notes && (
                                <div className="text-xs text-slate-500 mt-1">{p.notes}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            <span className="font-black text-base text-rose-600">
                              -{formatCurrency(p.amount)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditPayroll(p)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs flex items-center justify-center cursor-pointer"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Excluir o lançamento de ${formatCurrency(p.amount)} de ${p.employeeName}? O valor voltará ao saldo da loja.`)) {
                                    await deleteFinancePayroll(p.id)
                                    toast.success('Pagamento removido do caixa.')
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                                title="Excluir"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: EXTRATO CRONOLÓGICO & LIVRO-CAIXA DO MÊS
           ========================================================= */}
        {activeTab === 'extrato' && (
          <div className="space-y-5 animate-fade-in">
            {/* Overview of Monthly Cashboxes */}
            <div className="card p-5 bg-white space-y-3">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">
                  🏦 Histórico de Caixas Mensais da Loja
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione qualquer mês para consultar ou gerenciar o saldo daquela competência
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {allKnownMonths.map(ms => {
                  const isCurrent = ms.monthKey === selectedMonth
                  return (
                    <button
                      key={ms.monthKey}
                      type="button"
                      onClick={() => handleMonthChange(ms.monthKey)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {formatMonthLabel(ms.monthKey)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ms.isOpened
                            ? (ms.status === 'closed' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {ms.isOpened ? (ms.status === 'closed' ? 'Fechado' : 'Aberto') : 'Não aberto'}
                        </span>
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1.5">
                        Saldo: <span className={ms.walletBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(ms.walletBalance)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>+{formatCurrency(ms.totalInflows)}</span>
                        <span>-{formatCurrency(ms.totalOutflows)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card p-5 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">
                    📒 Livro-Caixa Diário — {formatMonthLabel(selectedMonth)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Acompanhe dia a dia como o saldo da loja evoluiu desde a abertura do mês ({formatCurrency(monthSummary.openingBalance)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('diario')}
                  className="btn btn-primary text-xs py-2 px-4 min-h-0"
                >
                  ➕ Lançar Novo Dia
                </button>
              </div>

              {(monthSummary.dailyLedger || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  Nenhuma movimentação registrada em {formatMonthLabel(selectedMonth)} ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {[...monthSummary.dailyLedger].reverse().map(entry => {
                    const isExpanded = expandedLedgerDate === entry.date
                    return (
                      <div
                        key={entry.date}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
                      >
                        <div
                          onClick={() => setExpandedLedgerDate(isExpanded ? null : entry.date)}
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                              <span className="text-sm font-black leading-none">{entry.date.slice(8, 10)}</span>
                              <span className="text-[9px] uppercase text-slate-300 mt-0.5">{entry.date.slice(5, 7)}</span>
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-slate-900">
                                {formatDateBR(entry.date, true)}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap text-xs mt-0.5">
                                <span className="text-emerald-600 font-bold">
                                  + {formatCurrency(entry.dayIn)}
                                </span>
                                <span className="text-rose-600 font-bold">
                                  - {formatCurrency(entry.dayTotalOut)}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  ({(entry.outflows?.length || 0) + (entry.payrollItems?.length || 0)} saídas)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Resultado Dia</div>
                              <div className={`text-sm font-extrabold ${entry.dayNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {entry.dayNet >= 0 ? '+' : ''}{formatCurrency(entry.dayNet)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Saldo Caixa</div>
                              <div className="text-sm font-black text-indigo-700">
                                {formatCurrency(entry.runningBalance)}
                              </div>
                            </div>
                            <span className="text-slate-400 font-bold text-xs">
                              {isExpanded ? '▴' : '▾'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
                            {/* Inflows Breakdown */}
                            <div>
                              <div className="font-bold text-slate-600 uppercase text-[10px] mb-1.5">
                                Entradas por Modalidade
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {INFLOW_METHODS.map(m => (
                                  <div key={m.key} className="bg-white p-2 rounded-xl border border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-semibold">{m.icon} {m.label}</div>
                                    <div className="font-extrabold text-slate-900 mt-0.5">
                                      {formatCurrency(entry.inflows?.[m.key] || 0)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Outflows & Payroll Breakdown */}
                            {((entry.outflows?.length || 0) > 0 || (entry.payrollItems?.length || 0) > 0) && (
                              <div>
                                <div className="font-bold text-slate-600 uppercase text-[10px] mb-1.5">
                                  Pagamentos & Saídas Realizadas
                                </div>
                                <div className="space-y-1.5">
                                  {(entry.outflows || []).map(o => {
                                    const cat = getOutflowCatMeta(o.category)
                                    return (
                                      <div key={o.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                                        <span>{cat.icon} <b>{o.name}</b> <span className="text-slate-400">({cat.label})</span></span>
                                        <span className="font-bold text-rose-600">-{formatCurrency(o.amount)}</span>
                                      </div>
                                    )
                                  })}
                                  {(entry.payrollItems || []).map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                                      <span>👷 <b>{p.employeeName}</b> <span className="text-amber-700">({getPayrollTypeMeta(p.paymentType).label})</span></span>
                                      <span className="font-bold text-rose-600">-{formatCurrency(p.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.dayDoc?.notes && (
                              <div className="text-slate-600 italic">
                                📝 Obs: {entry.dayDoc.notes}
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  handleDateChange(entry.date)
                                  setActiveTab('diario')
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                              >
                                ✏️ Editar Dia
                              </button>
                              {entry.dayDoc && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Excluir o fechamento diário de ${formatDateBR(entry.date)}?`)) {
                                      await deleteFinanceDay(entry.date)
                                      toast.success('Fechamento diário excluído.')
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
                                >
                                  🗑️ Excluir Dia
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: RELATÓRIOS, MÉTRICAS & GRÁFICOS INTERATIVOS
           ========================================================= */}
        {activeTab === 'relatorios' && (
          <div className="space-y-5 animate-fade-in">
            {/* Filter & Export Controls Card */}
            <div className="card p-4 sm:p-5 bg-white space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReportMode('month')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                      reportMode === 'month'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📅 Mês ({formatMonthLabel(selectedMonth, true)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportMode('custom')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                      reportMode === 'custom'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🗓️ Período Personalizado
                  </button>

                  {reportMode === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                        className="input text-xs font-bold py-1.5 px-2.5 min-h-[38px] w-auto"
                      />
                      <span className="text-xs text-slate-400 font-bold">até</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        className="input text-xs font-bold py-1.5 px-2.5 min-h-[38px] w-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle Charts + Export Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowCharts(prev => !prev)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition flex items-center gap-1.5 ${
                      showCharts
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>📊</span>
                    <span>{showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
                  >
                    🖨️ Imprimir / PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
                  >
                    📲 WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
                  >
                    📥 Excel (.CSV)
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Executive KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Faturamento Bruto</div>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
                  {formatCurrency(reportMetrics.totalInflows)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {reportMetrics.activeInflowDays} dias com venda
                </div>
              </div>

              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Saídas Operacionais</div>
                <div className="text-base sm:text-lg font-black text-rose-600 mt-1">
                  {formatCurrency(reportMetrics.totalOperationalOutflows)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Fornec., boletos, etc.
                </div>
              </div>

              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Folha / Equipe</div>
                <div className="text-base sm:text-lg font-black text-amber-600 mt-1">
                  {formatCurrency(reportMetrics.totalPayroll)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {reportMetrics.totalInflows > 0
                    ? `${((reportMetrics.totalPayroll / reportMetrics.totalInflows) * 100).toFixed(1)}% da receita`
                    : 'Salários & vales'}
                </div>
              </div>

              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Resultado Líquido</div>
                <div className={`text-base sm:text-lg font-black mt-1 ${reportMetrics.operationalNet >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {formatCurrency(reportMetrics.operationalNet)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Margem: {reportMetrics.netMarginPct.toFixed(1)}%
                </div>
              </div>

              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Média / Dia</div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {formatCurrency(reportMetrics.averageDailyRevenue)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {reportMetrics.bestDay
                    ? `Pico: ${formatDateBR(reportMetrics.bestDay.date).slice(0, 5)}`
                    : 'Sem pico'}
                </div>
              </div>

              <div className="card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-slate-400">Digital vs Espécie</div>
                <div className="text-base sm:text-lg font-black text-sky-600 mt-1">
                  {reportMetrics.totalInflows > 0
                    ? `${((reportMetrics.digitalRevenue / reportMetrics.totalInflows) * 100).toFixed(0)}% Digital`
                    : '0%'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Dinheiro: {formatCurrency(reportMetrics.cashRevenue)}
                </div>
              </div>
            </div>

            {/* Interactive Visual Charts (Toggleable) */}
            {showCharts && (
              <FinanceCharts
                metrics={reportMetrics}
                monthlyComparison={monthlyComparison}
              />
            )}

            {/* Top Named Suppliers/Expenses & Detailed Outflows Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Top Favorecidos / Nomes */}
              <div className="lg:col-span-5 card p-5 bg-white space-y-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    🏆 Maiores Pagamentos por Nome
                  </h4>
                  <p className="text-xs text-slate-500">
                    Fornecedores, boletos e favorecidos que mais consumiram caixa no período
                  </p>
                </div>

                {(reportMetrics.topNamedExpenses || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Nenhuma despesa registrada no período.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reportMetrics.topNamedExpenses.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-[11px] shrink-0">
                            {idx + 1}º
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{item.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.count} {item.count === 1 ? 'lançamento' : 'lançamentos'}
                            </div>
                          </div>
                        </div>
                        <span className="font-extrabold text-rose-600 shrink-0">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filterable Detailed Payments List */}
              <div className="lg:col-span-7 card p-5 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">
                      📑 Relatório Detalhado de Pagamentos ({filteredNamedOutflows.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Filtre por tipo de saída para auditar cada pagamento efetuado
                    </p>
                  </div>
                  <select
                    value={reportCategoryFilter}
                    onChange={e => setReportCategoryFilter(e.target.value)}
                    className="input text-xs font-bold w-full sm:w-48 py-1.5 min-h-[36px]"
                  >
                    <option value="all">Todas as Categorias</option>
                    {OUTFLOW_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                    ))}
                    <option value="funcionarios">👷 Funcionários</option>
                  </select>
                </div>

                {filteredNamedOutflows.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Nenhum pagamento encontrado para este filtro.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
                    {[...filteredNamedOutflows]
                      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                      .map((item, idx) => {
                        const catLabel = item.isPayroll ? '👷 Funcionários' : `${getOutflowCatMeta(item.category).icon} ${getOutflowCatMeta(item.category).label}`
                        return (
                          <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-xs gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{item.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {formatDateBR(item.date)} • {catLabel}
                              </div>
                            </div>
                            <span className="font-extrabold text-rose-600 shrink-0">
                              -{formatCurrency(item.amount)}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
