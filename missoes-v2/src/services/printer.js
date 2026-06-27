import { formatCurrency } from '../utils/constants'

/**
 * Helper para imprimir HTML de forma segura usando um iframe oculto.
 * Evita o uso de window.open que redireciona a tela principal e trava o WebView no Android.
 */
function printHtmlSafely(htmlContent) {
  // 1. Tenta usar a ponte de impressão nativa do Android (se disponível no wrapper nativo)
  if (window.AndroidPrinter && typeof window.AndroidPrinter.printHtml === 'function') {
    try {
      window.AndroidPrinter.printHtml(htmlContent)
      return
    } catch (e) {
      console.warn('Falha ao usar a ponte AndroidPrinter nativa, tentando fallback de iframe:', e)
    }
  }

  // 2. Fallback de Iframe oculto para navegadores web tradicionais (Desktop, iOS/iPads)
  const oldIframe = document.getElementById('print-iframe')
  if (oldIframe) {
    oldIframe.parentNode.removeChild(oldIframe)
  }

  // Cria um iframe invisível
  const iframe = document.createElement('iframe')
  iframe.id = 'print-iframe'
  iframe.style.position = 'absolute'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  iframe.style.border = 'none'
  iframe.style.visibility = 'hidden'

  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document || iframe.contentDocument
  doc.open()
  doc.write(htmlContent)
  doc.close()

  // Dispara a impressão de forma assíncrona para garantir o carregamento do conteúdo
  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.warn('Impressão direta não suportada no ambiente atual:', e)
    }
    // Remove o iframe do DOM após a conclusão/fechamento da impressão
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    }, 1500)
  }, 500)
}

/**
 * Gera e imprime um cupom de venda para impressora térmica de 80mm
 */
export function printReceipt({ storeName, cashier, items, total, paymentMethod, amountPaid, change, saleId }) {
  const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Crédito', debito: 'Débito', voucher: 'Voucher' }
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

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

  const htmlContent = `
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
    </body></html>
  `

  printHtmlSafely(htmlContent)
  return true
}

/**
 * Imprime relatório de fechamento de turno para 80mm
 */
export function printShiftReport({ storeName, cashier, date, sales, byMethod, totalSales, totalItems }) {
  const methodLabels = { dinheiro: '💵 Dinheiro', pix: '📱 PIX', credito: '💳 Crédito', debito: '💳 Débito', voucher: '🎫 Voucher' }

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

  const htmlContent = `
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
    </body></html>
  `

  printHtmlSafely(htmlContent)
  return true
}

/**
 * Imprime etiquetas de preço personalizadas
 */
export function printLabels(products, widthMm, heightMm, fontSizePx) {
  let html = `
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>Etiquetas</title>
      <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; font-family: sans-serif; display: flex; flex-wrap: wrap; }
        .label {
          width: ${widthMm}mm;
          height: ${heightMm}mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px dashed #ccc;
          box-sizing: border-box;
          padding: 2mm;
          page-break-inside: avoid;
        }
        .name { font-weight: bold; font-size: ${Math.max(10, fontSizePx - 6)}px; margin-bottom: 2mm; line-height: 1.1; max-height: 2.2em; overflow: hidden; text-transform: uppercase; }
        .price { font-weight: 900; font-size: ${fontSizePx}px; }
        .code { font-size: 8px; color: #666; margin-top: 1mm; }
        @media print {
          .label { border: none; }
        }
      </style>
    </head><body>
      ${products.map(p => `
        <div class="label">
          <div class="name">${p.name}</div>
          <div class="price">${formatCurrency(p.promoPrice || p.price || p.oldPrice || 0)}</div>
          ${p.code ? `<div class="code">${p.code}</div>` : ''}
        </div>
      `).join('')}
    </body></html>
  `

  printHtmlSafely(html)
  return true
}

/**
 * Imprime um recibo de pedido de cliente para impressora térmica de 80mm
 */
export function printCustomerOrderReceipt({ storeName, order, customer }) {
  const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Crédito', debito: 'Débito', voucher: 'Voucher' }
  const condoLabels = {
    dom_pedro_1: 'Condomínio Dom Pedro 1',
    dom_pedro_2: 'Condomínio Dom Pedro 2',
    none: 'Morador Externo'
  }
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  let lines = []
  lines.push(`<div style="font-family:monospace;font-size:11px;width:72mm;margin:0 auto;padding:1mm;color:#000;">`)

  // Header
  lines.push(`<div style="text-align:center;margin-bottom:6px;">`)
  lines.push(`<div style="font-size:15px;font-weight:bold;">${storeName}</div>`)
  lines.push(`<div style="font-size:11px;font-weight:bold;margin-top:2px;background:#000;color:#fff;padding:2px 0;">PEDIDO DELIVERY</div>`)
  lines.push(`<div style="font-size:9px;margin-top:3px;">ID: ${order.id?.substring(0, 18)}</div>`)
  lines.push(`<div style="font-size:9px;">Data: ${order.createdAtHuman || (dateStr + ' ' + timeStr)}</div>`)
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:3px 0;"></div>`)

  // Customer Details
  lines.push(`<div style="font-size:10px;margin-bottom:6px;line-height:1.3;">`)
  lines.push(`<div><strong>Cliente:</strong> ${order.customerName || customer?.name || '-'}</div>`)
  lines.push(`<div><strong>Fone/Zap:</strong> ${order.customerPhone || customer?.phone || '-'}</div>`)
  
  const c = order.condo || customer?.condo
  if (c) {
    lines.push(`<div><strong>Condomínio:</strong> ${condoLabels[c] || c}</div>`)
  }
  lines.push(`<div><strong>Endereço:</strong> ${order.deliveryAddress || customer?.address || '-'}</div>`)
  if (order.deliverySlot) {
    lines.push(`<div><strong>Horário:</strong> ${order.deliverySlot}</div>`)
  }
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:3px 0;"></div>`)

  // Items
  lines.push(`<table style="width:100%;font-size:10px;border-collapse:collapse;line-height:1.3;">`)
  lines.push(`<tr style="font-weight:bold;border-bottom:1px solid #000;"><td>Item</td><td style="text-align:center;">Qtd</td><td style="text-align:right;">Vlr</td><td style="text-align:right;">Total</td></tr>`)

  const items = order.items || []
  items.forEach(item => {
    const itemTotal = (item.price || 0) * (item.quantity || 1)
    const nameShort = item.name.length > 18 ? item.name.substring(0, 18) + '..' : item.name
    lines.push(`<tr><td>${nameShort}</td><td style="text-align:center;">${item.quantity || 1}</td><td style="text-align:right;">${formatCurrency(item.price || 0)}</td><td style="text-align:right;">${formatCurrency(itemTotal)}</td></tr>`)
  })
  lines.push(`</table>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:3px 0;"></div>`)

  // Totals
  lines.push(`<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin:3px 0;">`)
  lines.push(`<span>TOTAL</span><span>${formatCurrency(order.total || 0)}</span>`)
  lines.push(`</div>`)

  // Payment
  lines.push(`<div style="font-size:10px;margin:3px 0;line-height:1.3;">`)
  lines.push(`<div>Forma de Pagamento: <strong>${methodLabels[order.paymentMethod] || order.paymentMethod}</strong></div>`)
  if (order.changeNeeded && order.changeNeeded > 0) {
    lines.push(`<div>Troco Para: ${formatCurrency(order.changeNeeded + order.total)}</div>`)
    lines.push(`<div>Troco a Devolver: <strong>${formatCurrency(order.changeNeeded)}</strong></div>`)
  }
  if (order.notes) {
    lines.push(`<div style="margin-top:3px;font-style:italic;background:#eee;padding:2px 4px;border-radius:3px;">Obs: ${order.notes}</div>`)
  }
  lines.push(`</div>`)

  lines.push(`<div style="border-top:1px dashed #000;margin:3px 0;"></div>`)

  // Footer
  lines.push(`<div style="text-align:center;font-size:9px;color:#333;margin-top:6px;">`)
  lines.push(`<div>Pedido recebido e confirmado via PDV</div>`)
  lines.push(`<div style="margin-top:3px;font-weight:bold;font-size:11px;">DOM PEDRO DELIVERY</div>`)
  lines.push(`</div>`)

  lines.push(`</div>`)

  const htmlContent = `
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>Pedido Delivery</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print { body { width: 80mm; } }
      </style>
    </head><body>
      ${lines.join('\n')}
    </body></html>
  `

  printHtmlSafely(htmlContent)
  return true
}
