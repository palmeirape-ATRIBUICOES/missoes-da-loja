import { formatCurrency } from '../utils/constants'

/**
 * Gera e imprime um cupom de venda para impressora térmica de 80mm
 */
export function printReceipt({ storeName, cashier, items, total, paymentMethod, amountPaid, change, saleId }) {
  const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Crédito', debito: 'Débito' }
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const divider = '─'.repeat(48)

  let lines = []
  lines.push(`<div style="font-family:monospace;font-size:12px;width:72mm;margin:0 auto;padding:2mm;">`)

  // Header
  lines.push(`<div style="text-align:center;margin-bottom:8px;">`)
  lines.push(`<div style="font-size:16px;font-weight:bold;">${storeName}</div>`)
  lines.push(`<div style="font-size:10px;color:#666;">CUPOM NÃO FISCAL</div>`)
  lines.push(`<div style="font-size:10px;">${dateStr} ${timeStr}</div>`)
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:4px 0;"></div>`)

  // Items
  lines.push(`<table style="width:100%;font-size:11px;border-collapse:collapse;">`)
  lines.push(`<tr style="font-weight:bold;border-bottom:1px solid #ccc;"><td>Item</td><td style="text-align:center;">Qtd</td><td style="text-align:right;">Vlr</td><td style="text-align:right;">Total</td></tr>`)

  items.forEach(item => {
    const itemTotal = item.price * item.qty
    const nameShort = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name
    lines.push(`<tr><td>${nameShort}</td><td style="text-align:center;">${item.qty}</td><td style="text-align:right;">${formatCurrency(item.price)}</td><td style="text-align:right;">${formatCurrency(itemTotal)}</td></tr>`)
  })
  lines.push(`</table>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:4px 0;"></div>`)

  // Totals
  lines.push(`<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin:4px 0;">`)
  lines.push(`<span>TOTAL</span><span>${formatCurrency(total)}</span>`)
  lines.push(`</div>`)

  lines.push(`<div style="font-size:11px;margin:4px 0;">`)
  lines.push(`<div>Pagamento: ${methodLabels[paymentMethod] || paymentMethod}</div>`)
  if (paymentMethod === 'dinheiro') {
    lines.push(`<div>Recebido: ${formatCurrency(amountPaid)}</div>`)
    lines.push(`<div>Troco: ${formatCurrency(change)}</div>`)
  }
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:4px 0;"></div>`)

  // Footer
  lines.push(`<div style="text-align:center;font-size:10px;color:#666;margin-top:8px;">`)
  lines.push(`<div>Caixa: ${cashier}</div>`)
  if (saleId) lines.push(`<div>Venda: ${saleId}</div>`)
  lines.push(`<div style="margin-top:8px;">Obrigado pela preferência!</div>`)
  lines.push(`<div>Volte sempre 😊</div>`)
  lines.push(`</div>`)

  lines.push(`</div>`)

  // Open print window
  const printWindow = window.open('', '_blank', 'width=320,height=600')
  if (!printWindow) return false

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>Cupom</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; padding: 0; }
        @media print { body { width: 80mm; } }
      </style>
    </head><body>
      ${lines.join('\n')}
      <script>
        setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 300);
      </script>
    </body></html>
  `)
  printWindow.document.close()
  return true
}

/**
 * Imprime relatório de fechamento de turno para 80mm
 */
export function printShiftReport({ storeName, cashier, date, sales, byMethod, totalSales, totalItems }) {
  const methodLabels = { dinheiro: '💵 Dinheiro', pix: '📱 PIX', credito: '💳 Crédito', debito: '💳 Débito' }

  let lines = []
  lines.push(`<div style="font-family:monospace;font-size:12px;width:72mm;margin:0 auto;padding:2mm;">`)

  // Header
  lines.push(`<div style="text-align:center;margin-bottom:8px;">`)
  lines.push(`<div style="font-size:14px;font-weight:bold;">${storeName}</div>`)
  lines.push(`<div style="font-size:12px;font-weight:bold;">FECHAMENTO DE TURNO</div>`)
  lines.push(`<div style="font-size:10px;">Operador: ${cashier}</div>`)
  lines.push(`<div style="font-size:10px;">${date} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>`)
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:4px 0;"></div>`)

  // Summary
  lines.push(`<div style="font-size:11px;margin:4px 0;">`)
  lines.push(`<div style="display:flex;justify-content:space-between;"><span>Total de Vendas:</span><span style="font-weight:bold;">${sales.length}</span></div>`)
  lines.push(`<div style="display:flex;justify-content:space-between;"><span>Total de Itens:</span><span style="font-weight:bold;">${totalItems}</span></div>`)
  lines.push(`<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:4px;"><span>TOTAL</span><span>${formatCurrency(totalSales)}</span></div>`)
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:4px 0;"></div>`)

  // By Method
  lines.push(`<div style="font-size:11px;font-weight:bold;margin:4px 0;">POR FORMA DE PAGAMENTO</div>`)
  Object.entries(byMethod).forEach(([key, val]) => {
    const label = methodLabels[key] || key
    lines.push(`<div style="display:flex;justify-content:space-between;font-size:11px;"><span>${label} (${val.count}x)</span><span>${formatCurrency(val.total)}</span></div>`)
  })

  lines.push(`<div style="border-top:1px dashed #000;margin:8px 0;"></div>`)
  lines.push(`<div style="text-align:center;font-size:10px;color:#666;">Impresso em ${new Date().toLocaleString('pt-BR')}</div>`)
  lines.push(`</div>`)

  const printWindow = window.open('', '_blank', 'width=320,height=600')
  if (!printWindow) return false

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>Fechamento</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; padding: 0; }
        @media print { body { width: 80mm; } }
      </style>
    </head><body>
      ${lines.join('\n')}
      <script>
        setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 300);
      </script>
    </body></html>
  `)
  printWindow.document.close()
  return true
}
