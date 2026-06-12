import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/constants'

export default function Paystubs({ onBack }) {
  const { store } = useAuth()
  const { activeEmployees, contrachequesAll, saveContrachequeDoc, deleteContrachequeDoc } = useStore()

  // Form states
  const [employee, setEmployee] = useState('')
  const [employeeManual, setEmployeeManual] = useState('')
  const [isManualEmployee, setIsManualEmployee] = useState(false)
  const [cpf, setCpf] = useState('')
  const [refMonth, setRefMonth] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [role, setRole] = useState('')
  const [type, setType] = useState('mensal')
  const [observation, setObservation] = useState('')

  // Numeric states
  const [salaryBase, setSalaryBase] = useState('')
  const [extraHours, setExtraHours] = useState('')
  const [commissions, setCommissions] = useState('')
  const [otherEarnings, setOtherEarnings] = useState('')
  
  const [inss, setInss] = useState('')
  const [advancePay, setAdvancePay] = useState('')
  const [absences, setAbsences] = useState('')
  const [otherDeductions, setOtherDeductions] = useState('')

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const [cadernoPhoto, setCadernoPhoto] = useState('')
  const [activePhotoUrl, setActivePhotoUrl] = useState(null)

  // Computed values for current form
  const num = (val) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : Math.max(0, n)
  }

  const currentSalary = num(salaryBase)
  const currentExtra = num(extraHours)
  const currentComm = num(commissions)
  const currentOtherE = num(otherEarnings)

  const currentInss = num(inss)
  const currentAdvance = num(advancePay)
  const currentAbsences = num(absences)
  const currentOtherD = num(otherDeductions)

  const totalEarnings = currentSalary + currentExtra + currentComm + currentOtherE
  const totalDeductions = currentInss + currentAdvance + currentAbsences + currentOtherD
  const netPay = totalEarnings - totalDeductions

  // Filtered contracheques list
  const filteredContracheques = (contrachequesAll || []).filter(cc => {
    if (filterEmployee && cc.employee !== filterEmployee) return false
    if (filterMonth && cc.referenceMonth !== filterMonth) return false
    return true
  })

  // List of unique employee names for filter
  const uniqueEmployeeNames = Array.from(new Set([
    ...activeEmployees.map(e => e.name),
    ...(contrachequesAll || []).map(c => c.employee)
  ])).sort((a, b) => a.localeCompare(b))

  function compressPhoto(file) {
    return new Promise((resolve) => {
      if (!file) { resolve(''); return; }
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxW = 1000
          let w = img.width
          let h = img.height
          if (w > maxW) {
            h = Math.round((h * maxW) / w)
            w = maxW
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  function applyAdiantamentoPreset() {
    if (!refMonth) {
      alert('Por favor, informe primeiro o mês de referência.')
      return
    }
    setPaymentDate(`${refMonth}-20`)
    setType('retroativo')
    setSalaryBase('')
    setExtraHours('')
    setCommissions('')
    setOtherEarnings('420.00')
    setInss('')
    setAdvancePay('')
    setAbsences('')
    setOtherDeductions('')
    setObservation('Adiantamento quinzenal de salário referente ao mês de referência.')
  }

  function applySalarioPreset() {
    if (!refMonth) {
      alert('Por favor, informe primeiro o mês de referência.')
      return
    }
    const [year, month] = refMonth.split('-').map(Number)
    let nextMonth = month + 1
    let nextYear = year
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    const nextMonthStr = String(nextMonth).padStart(2, '0')
    setPaymentDate(`${nextYear}-${nextMonthStr}-05`)
    
    setType('retroativo')
    setSalaryBase('1420.00')
    setExtraHours('')
    setCommissions('')
    setOtherEarnings('')
    setInss('')
    setAdvancePay('420.00')
    setAbsences('')
    setOtherDeductions('')
    setObservation('Pagamento de saldo de salário referente ao mês de referência, deduzido o adiantamento salarial.')
  }

  function clearForm() {
    setEmployee('')
    setEmployeeManual('')
    setIsManualEmployee(false)
    setCpf('')
    setRefMonth('')
    setPaymentDate('')
    setRole('')
    setType('mensal')
    setObservation('')
    setSalaryBase('')
    setExtraHours('')
    setCommissions('')
    setOtherEarnings('')
    setInss('')
    setAdvancePay('')
    setAbsences('')
    setOtherDeductions('')
    setCadernoPhoto('')
  }

  async function handleSave() {
    const finalName = isManualEmployee ? employeeManual.trim() : employee
    if (!finalName) {
      alert('Por favor, selecione ou digite o nome do funcionário.')
      return
    }
    if (!refMonth) {
      alert('Por favor, informe o mês de referência.')
      return
    }
    if (!paymentDate) {
      alert('Por favor, informe a data de pagamento.')
      return
    }
    if (currentSalary <= 0 && totalEarnings <= 0) {
      alert('O salário base ou os proventos devem ser maiores que zero.')
      return
    }

    try {
      const payload = {
        employee: finalName,
        cpf: cpf.trim(),
        referenceMonth: refMonth,
        paymentDate,
        type,
        role: role.trim(),
        salaryBase: currentSalary,
        extraHours: currentExtra,
        commissions: currentComm,
        otherEarnings: currentOtherE,
        inss: currentInss,
        advancePay: currentAdvance,
        absences: currentAbsences,
        otherDeductions: currentOtherD,
        totalEarnings,
        totalDeductions,
        netPay,
        observation: observation.trim(),
        status: 'pendente',
        cadernoPhoto,
        createdAt: new Date()
      }

      await saveContrachequeDoc(payload)
      alert('Contracheque gerado e salvo com sucesso!')
      clearForm()
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar o contracheque.')
    }
  }

  async function toggleSignatureStatus(cc) {
    const nextStatus = cc.status === 'assinado' ? 'pendente' : 'assinado'
    try {
      await saveContrachequeDoc({
        id: cc.id,
        status: nextStatus
      })
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar status.')
    }
  }

  async function handleDelete(cc) {
    if (!confirm(`Excluir o recibo de ${cc.employee} (Ref: ${formatRefMonth(cc.referenceMonth)})?`)) return
    try {
      await deleteContrachequeDoc(cc.id)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir.')
    }
  }

  function formatRefMonth(m) {
    if (!m) return '-'
    const p = m.split('-')
    if (p.length === 2) return `${p[1]}/${p[0]}`
    return m
  }

  function formatPaymentDate(d) {
    if (!d) return '-'
    const p = d.split('-')
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`
    return d
  }

  function handlePrint(cc) {
    const storeName = store?.name || store?.shortName || 'Padaria'
    
    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    
    const earnings = [
      { code: '001', name: 'Salário Base', val: cc.salaryBase },
      { code: '002', name: 'Horas Extras', val: cc.extraHours },
      { code: '003', name: 'Comissões / Prêmios', val: cc.commissions },
      { code: '004', name: 'Outros Proventos', val: cc.otherEarnings }
    ].filter(x => x.val > 0 || x.code === '001')
    
    const deductions = [
      { code: '101', name: 'INSS / Previdência', val: cc.inss },
      { code: '102', name: 'Adiantamento / Vale', val: cc.advancePay },
      { code: '103', name: 'Faltas / Atrasos', val: cc.absences },
      { code: '104', name: 'Outros Descontos', val: cc.otherDeductions }
    ].filter(x => x.val > 0)
    
    const rowHtml = [...earnings.map(e => `
      <tr>
        <td>${e.code}</td>
        <td>${e.name}</td>
        <td>-</td>
        <td class="text-right">R$ ${fmt(e.val)}</td>
        <td class="text-right">-</td>
      </tr>
    `), ...deductions.map(d => `
      <tr>
        <td>${d.code}</td>
        <td>${d.name}</td>
        <td>-</td>
        <td class="text-right">-</td>
        <td class="text-right">R$ ${fmt(d.val)}</td>
      </tr>
    `)].join('')

    const receiptContent = `
      <div class="receipt-card">
        <div class="header-box">
          <div class="company-info">
            <div class="company-name">${storeName}</div>
            <div class="company-sub">Recibo de Pagamento de Salário</div>
          </div>
          <div class="ref-info">
            <div class="ref-label">Mês de Referência</div>
            <div class="ref-value">${formatRefMonth(cc.referenceMonth)}</div>
          </div>
        </div>
        
        <div class="worker-box">
          <div class="w-row">
            <div class="w-col">
              <strong>Funcionário:</strong> ${cc.employee}
            </div>
            <div class="w-col text-right">
              <strong>CPF:</strong> ${cc.cpf || 'Não informado'}
            </div>
          </div>
          <div class="w-row mt-1">
            <div class="w-col">
              <strong>Cargo:</strong> ${cc.role || 'Funcionário'}
            </div>
            <div class="w-col text-right">
              <strong>Tipo:</strong> ${cc.type === 'retroativo' ? 'Retroativo' : 'Regular'}
            </div>
          </div>
        </div>
        
        <table class="receipt-table">
          <thead>
            <tr>
              <th width="8%">Cód.</th>
              <th width="52%">Descrição</th>
              <th width="10%">Ref.</th>
              <th width="15%" class="text-right">Proventos</th>
              <th width="15%" class="text-right">Descontos</th>
            </tr>
          </thead>
          <tbody>
            ${rowHtml}
            ${Array(Math.max(0, 6 - (earnings.length + deductions.length))).fill(0).map(() => `
              <tr class="empty-row">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals-box">
          <div class="tot-col">
            <div class="tot-label">Total de Proventos</div>
            <div class="tot-value">R$ ${fmt(cc.totalEarnings)}</div>
          </div>
          <div class="tot-col">
            <div class="tot-label">Total de Descontos</div>
            <div class="tot-value">R$ ${fmt(cc.totalDeductions)}</div>
          </div>
          <div class="tot-col net-col">
            <div class="tot-label">Valor Líquido</div>
            <div class="tot-value text-blue">R$ ${fmt(cc.netPay)}</div>
          </div>
        </div>
        
        ${cc.observation ? `
          <div class="obs-box">
            <strong>Observações:</strong> ${cc.observation}
          </div>
        ` : ''}
        
        <div class="declaration-box">
          <p>
            Declaro ter recebido a importância líquida discriminada neste recibo, da qual dou plena, geral e irrevogável quitação.
          </p>
          <div class="date-row">
            Data de Pagamento: <strong>${formatPaymentDate(cc.paymentDate)}</strong>
          </div>
          
          <div class="signature-row">
            <div class="sig-col">
              <div class="sig-line"></div>
              <div class="sig-label">Assinatura do Empregador</div>
            </div>
            <div class="sig-col">
              <div class="sig-line"></div>
              <div class="sig-label">Assinatura do Empregado</div>
            </div>
          </div>
        </div>
      </div>
    `

    const htmlContent = `
      <html>
      <head>
        <title>Recibo - ${cc.employee} - ${formatRefMonth(cc.referenceMonth)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            padding: 20px;
            font-size: 10pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            max-width: 800px;
            margin: 0 auto 20px;
            padding: 12px;
            text-align: center;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
          }
          .no-print button {
            padding: 8px 20px;
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s;
          }
          .no-print button:hover {
            background: #1d4ed8;
          }
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .receipt-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            page-break-inside: avoid;
            position: relative;
          }
          .via-tag {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 7pt;
            font-weight: bold;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #334155;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
          }
          .company-sub {
            font-size: 9pt;
            color: #64748b;
            font-weight: 600;
          }
          .ref-info {
            text-align: right;
          }
          .ref-label {
            font-size: 8pt;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
          }
          .ref-value {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
          }
          .worker-box {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 10px;
          }
          .w-row {
            display: flex;
            justify-content: space-between;
          }
          .w-col {
            flex: 1;
          }
          .mt-1 { margin-top: 4px; }
          .text-right { text-align: right; }
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .receipt-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            font-size: 8pt;
            text-transform: uppercase;
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          .receipt-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 9pt;
          }
          .receipt-table th.text-right, .receipt-table td.p-val {
            text-align: right;
          }
          .empty-row td {
            border-bottom: none;
            color: transparent;
          }
          .totals-box {
            display: flex;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 10px;
          }
          .tot-col {
            flex: 1;
            padding: 8px;
            text-align: center;
            border-right: 1px solid #cbd5e1;
            background: #f8fafc;
          }
          .tot-col:last-child {
            border-right: none;
          }
          .tot-col.net-col {
            background: #eff6ff;
          }
          .tot-label {
            font-size: 8pt;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .tot-value {
            font-size: 11pt;
            font-weight: 800;
            color: #1e293b;
          }
          .tot-value.text-blue {
            color: #1d4ed8;
            font-size: 13pt;
          }
          .obs-box {
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 8.5pt;
            color: #475569;
            margin-bottom: 10px;
            background: #fcfcfc;
          }
          .declaration-box {
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            margin-top: 10px;
          }
          .declaration-box p {
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.4;
            margin-bottom: 8px;
            text-align: justify;
          }
          .date-row {
            font-size: 9pt;
            margin-bottom: 20px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            gap: 40px;
          }
          .sig-col {
            flex: 1;
            text-align: center;
          }
          .sig-line {
            border-bottom: 1px solid #94a3b8;
            width: 100%;
            margin-bottom: 4px;
          }
          .sig-label {
            font-size: 8pt;
            color: #64748b;
            font-weight: 600;
          }
          .scissors-line {
            border-top: 1px dashed #94a3b8;
            text-align: center;
            margin: 15px 0;
            position: relative;
          }
          .scissors-label {
            background: #f8fafc;
            padding: 2px 10px;
            font-size: 8pt;
            color: #64748b;
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; padding: 0; }
            .receipt-card { border: 1px solid #000; box-shadow: none; }
            .scissors-label { background: #fff; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()">🖨️ Imprimir Recibo</button>
          <div style="margin-top: 8px; font-size: 12px; color: #475569;">
            <label>
              <input type="checkbox" id="chkTwoVias" onchange="toggleVias(this.checked)" checked> 
              Imprimir 2 vias na mesma folha (Empregador e Empregado)
            </label>
          </div>
        </div>
        
        <div class="print-container">
          <div id="viaEmpregador" class="receipt-card">
            <div class="via-tag">Via do Empregador</div>
            ${receiptContent}
          </div>
          
          <div id="scissorsSeparator" class="scissors-line">
            <span class="scissors-label">✂️ Cortar aqui</span>
          </div>
          
          <div id="viaEmpregado" class="receipt-card">
            <div class="via-tag">Via do Empregado</div>
            ${receiptContent}
          </div>
        </div>
        
        <script>
          function toggleVias(showBoth) {
            document.getElementById("scissorsSeparator").style.display = showBoth ? "block" : "none";
            document.getElementById("viaEmpregado").style.display = showBoth ? "block" : "none";
          }
        <\/script>
      </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
    } else {
      alert('Bloqueador de popup ativo. Permita a abertura de novas abas para imprimir.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90 flex items-center justify-center">←</button>
          <div>
            <div className="font-bold text-gray-900">💵 Contracheques & Recibos</div>
            <div className="text-xs text-gray-500">Gestão de salários e resguardo de assinaturas</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="card p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulário: Colunas 1 e 2 */}
          <div className="lg:col-span-2 space-y-4 lg:border-r lg:pr-6 border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 text-xs w-5 h-5 rounded-full flex items-center justify-center">1</span>
              Dados de Pagamento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Funcionário *</label>
                {!isManualEmployee ? (
                  <div className="flex gap-1.5">
                    <select className="select flex-1" value={employee} onChange={e => setEmployee(e.target.value)}>
                      <option value="">Selecione...</option>
                      {activeEmployees.map(e => (
                        <option key={e.name} value={e.name}>{e.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setIsManualEmployee(true); setEmployee('') }} className="btn btn-ghost text-xs whitespace-nowrap">➕ Digitar</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input className="input flex-1" placeholder="Nome completo" value={employeeManual} onChange={e => setEmployeeManual(e.target.value)} />
                    <button type="button" onClick={() => { setIsManualEmployee(false); setEmployeeManual('') }} className="btn btn-ghost text-xs whitespace-nowrap">❌ Lista</button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">CPF (Recomendado)</label>
                <input className="input" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Mês de Referência *</label>
                <input type="month" className="input" value={refMonth} onChange={e => setRefMonth(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Data de Pagamento *</label>
                <input type="date" className="input" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Cargo / Função</label>
                <input className="input" placeholder="Ex: Atendente, Caixa" value={role} onChange={e => setRole(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Recibo *</label>
                <select className="select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="mensal">Mensal (Futuro/Corrente)</option>
                  <option value="retroativo">Retroativo (Já pago, sem assinatura)</option>
                </select>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-blue-800">⚡ Preenchimento Rápido (Histórico desde 10/2022):</span>
              <div className="flex gap-2">
                <button type="button" onClick={applyAdiantamentoPreset} className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 rounded border border-blue-200 font-bold transition active:scale-95">
                  Adiantamento (Dia 20) — R$ 420
                </button>
                <button type="button" onClick={applySalarioPreset} className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 rounded border border-blue-200 font-bold transition active:scale-95">
                  Salário (Dia 05) — R$ 1.000
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Proventos */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">🟢 Proventos (Vencimentos)</h4>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Salário Base (R$) *</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={salaryBase} onChange={e => setSalaryBase(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Horas Extras (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={extraHours} onChange={e => setExtraHours(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Comissões (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={commissions} onChange={e => setCommissions(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Outros Proventos (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={otherEarnings} onChange={e => setOtherEarnings(e.target.value)} />
                </div>
              </div>

              {/* Descontos */}
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">🔴 Descontos</h4>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">INSS / Previdência (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={inss} onChange={e => setInss(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Adiantamento / Vale (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={advancePay} onChange={e => setAdvancePay(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Faltas / Atrasos (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={absences} onChange={e => setAbsences(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Outros Descontos (R$)</label>
                  <input type="number" step="0.01" className="input bg-white" placeholder="0.00" value={otherDeductions} onChange={e => setOtherDeductions(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Observações no Recibo</label>
              <textarea className="textarea bg-white" rows={2} placeholder="Ex: Pagamento referente a serviços de Diarista/Autônomo..." value={observation} onChange={e => setObservation(e.target.value)} />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-gray-600 block">📷 Anexar Foto do Caderno (Descontos/Anotações)</label>
              <input type="file" accept="image/*" className="file-input w-full max-w-xs text-xs" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const comp = await compressPhoto(file)
                  setCadernoPhoto(comp)
                }
              }} />
              {cadernoPhoto && (
                <div className="mt-2 relative inline-block">
                  <img src={cadernoPhoto} alt="Anotações do Caderno" className="h-28 rounded border shadow object-contain" />
                  <button type="button" onClick={() => setCadernoPhoto('')} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow transition-all active:scale-90">×</button>
                </div>
              )}
            </div>
          </div>

          {/* Resumo e Ação: Coluna 3 */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-brand-100 text-brand-700 text-xs w-5 h-5 rounded-full flex items-center justify-center">2</span>
                Resumo de Valores
              </h3>

              <div className="card bg-gray-50 border p-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total Proventos:</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(totalEarnings)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total Descontos:</span>
                  <span className="font-semibold text-red-700">{formatCurrency(totalDeductions)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Valor Líquido:</span>
                  <span className="text-xl font-extrabold text-blue-600">{formatCurrency(netPay)}</span>
                </div>
              </div>

              <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 text-xs leading-relaxed space-y-1">
                <div>💡 <b>Resguardo Jurídico:</b></div>
                <div>Para funcionários sem carteira assinada, recolher a <b>assinatura física</b> do recibo impresso é essencial para evitar processos trabalhistas futuros de vínculo informal.</div>
              </div>
            </div>

            <div className="space-y-2 mt-6 lg:mt-0">
              <button onClick={handleSave} className="w-full btn btn-primary py-2.5 font-bold flex items-center justify-center gap-1.5 shadow-md">
                💾 Salvar e Gerar Recibo
              </button>
              <button onClick={clearForm} className="w-full btn btn-ghost text-xs">
                Limpar Campos
              </button>
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4">
            <div>
              <h3 className="font-bold text-gray-900">📋 Histórico de Contracheques Gerados</h3>
              <p className="text-xs text-gray-500">Recibos e status de assinaturas arquivadas</p>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select className="select select-sm w-44" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                <option value="">Filtrar funcionário...</option>
                {uniqueEmployeeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <input type="month" className="input input-sm w-36" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
              {(filterEmployee || filterMonth) && (
                <button onClick={() => { setFilterEmployee(''); setFilterMonth('') }} className="btn btn-ghost text-xs">Limpar</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-3 text-left">Funcionário</th>
                  <th className="p-3 text-left">Ref.</th>
                  <th className="p-3 text-left">Pagamento</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-right">Líquido</th>
                  <th className="p-3 text-center">Assinatura</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContracheques.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      Nenhum contracheque localizado.
                    </td>
                  </tr>
                ) : (
                  filteredContracheques.map(cc => (
                    <tr key={cc.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-semibold text-gray-900">
                        <div>{cc.employee}</div>
                        {cc.cpf && <div className="text-[10px] text-gray-400 font-normal">CPF: {cc.cpf}</div>}
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatRefMonth(cc.referenceMonth)}</td>
                      <td className="p-3 whitespace-nowrap">{formatPaymentDate(cc.paymentDate)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${cc.type === 'retroativo' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {cc.type === 'retroativo' ? 'Retroativo' : 'Mensal'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(cc.netPay)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button onClick={() => toggleSignatureStatus(cc)}
                          className={`px-3 py-1 border rounded-full text-[10px] font-bold active:scale-95 transition-all
                            ${cc.status === 'assinado' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {cc.status === 'assinado' ? '✍️ Assinado' : '⏳ Pendente'}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {cc.cadernoPhoto && (
                          <button onClick={() => setActivePhotoUrl(cc.cadernoPhoto)} className="btn btn-ghost text-xs text-purple-600 font-bold">📷 Caderno</button>
                        )}
                        <button onClick={() => handlePrint(cc)} className="btn btn-ghost text-xs text-blue-600">🖨️ Imprimir</button>
                        <button onClick={() => handleDelete(cc)} className="btn btn-ghost text-xs text-red-600">Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Visualizador de Foto do Caderno */}
      {activePhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setActivePhotoUrl(null)}>
          <div className="relative bg-white p-2 rounded-2xl max-w-3xl max-h-[90vh] overflow-auto flex flex-col items-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActivePhotoUrl(null)} className="absolute top-3 right-3 bg-gray-950 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow hover:bg-black active:scale-95 transition-all">×</button>
            <div className="p-4 max-w-full">
              <img src={activePhotoUrl} alt="Anotações do Caderno" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
            <div className="mt-2 flex gap-4 w-full justify-between items-center px-4 pb-2 border-t pt-2 text-xs text-gray-500">
              <span>Anotações do Caderno (Descontos)</span>
              <a href={activePhotoUrl} download={`caderno_anotacoes_${Date.now()}.jpg`} className="bg-brand-50 text-brand-700 font-bold px-3 py-1.5 rounded-lg hover:bg-brand-100 transition">📥 Baixar Foto</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
