import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, parseCurrency } from '../../utils/constants'

export default function LabelsGenerator({ onBack }) {
  const { products } = useStore()
  const { store } = useAuth()

  // Selection states
  const [selectedIds, setSelectedIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Layout template & Typography
  const [layoutTemplate, setLayoutTemplate] = useState('centered') // centered | horizontal_split | price_focus
  const [fontFamily, setFontFamily] = useState('sans-serif') // sans-serif | monospace | serif | anton

  // Suffix settings
  const [priceSuffix, setPriceSuffix] = useState('auto') // auto | none | un | kg | custom
  const [customSuffixText, setCustomSuffixText] = useState('')

  // Control panel states - Dimensions
  const [widthMm, setWidthMm] = useState(50)
  const [heightMm, setHeightMm] = useState(30)
  const [columns, setColumns] = useState(3)
  const [gapMm, setGapMm] = useState(2)
  const [borderRadius, setBorderRadius] = useState(6) // border-radius in mm

  // Theme presets and customized colors
  const [labelTheme, setLabelTheme] = useState('custom')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [fontColor, setFontColor] = useState('#1e293b')
  const [priceColor, setPriceColor] = useState('#ef4444')
  const [borderColor, setBorderColor] = useState('#64748b')

  // Border Settings
  const [showBorder, setShowBorder] = useState(true)
  const [borderStyle, setBorderStyle] = useState('dashed')
  const [borderThickness, setBorderThickness] = useState(1)

  // Typography font sizes
  const [nameFontSize, setNameFontSize] = useState(12)
  const [priceFontSize, setPriceFontSize] = useState(20)
  const [codeFontSize, setCodeFontSize] = useState(8)

  // Content Toggle & Custom text
  const [showStoreName, setShowStoreName] = useState(true)
  const [customStoreName, setCustomStoreName] = useState(store?.shortName || 'Minha Loja')
  const [storeEmoji, setStoreEmoji] = useState('🍞')
  const [showPromoBadge, setShowPromoBadge] = useState(true)
  const [customPromoText, setCustomPromoText] = useState('OFERTA')
  const [showCode, setShowCode] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [showCategory, setShowCategory] = useState(true)
  const [showOldPrice, setShowOldPrice] = useState(true)
  const [showCropMarks, setShowCropMarks] = useState(true) // GUILLOTINE GUIDE TICKS!

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  // Select all / Deselect all handlers
  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p.id)
    setSelectedIds(prev => {
      const allSelected = allFilteredIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !allFilteredIds.includes(id))
      } else {
        return Array.from(new Set([...prev, ...allFilteredIds]))
      }
    })
  }

  const handleToggleProduct = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.includes(p.id))
  }, [products, selectedIds])

  // Split selected products into row-groups of length 'columns' with padding placeholders
  const previewRows = useMemo(() => {
    if (selectedProducts.length === 0) return []
    const padded = [...selectedProducts]
    const remainder = selectedProducts.length % columns
    if (remainder > 0) {
      const padCount = columns - remainder
      for (let i = 0; i < padCount; i++) {
        padded.push({ isPlaceholder: true, id: `pad-preview-${i}` })
      }
    }
    const chunked = []
    for (let i = 0; i < padded.length; i += columns) {
      chunked.push(padded.slice(i, i + columns))
    }
    return chunked
  }, [selectedProducts, columns])

  // Apply Theme presets
  const applyTheme = (themeName) => {
    setLabelTheme(themeName)
    if (themeName === 'promo_yellow') {
      setBackgroundColor('#fef08a') // Soft hot yellow
      setPriceColor('#dc2626') // Prominent red
      setFontColor('#000000')
      setBorderColor('#ca8a04')
      setBorderStyle('solid')
      setBorderThickness(2)
      setShowBorder(true)
      setBorderRadius(4)
      setCustomPromoText('OFERTA')
    } else if (themeName === 'rustic_bakery') {
      setBackgroundColor('#fdf6e2') // Warm rustic cream
      setPriceColor('#92400e') // Brown amber
      setFontColor('#451a03')
      setBorderColor('#d97706')
      setBorderStyle('solid')
      setBorderThickness(1)
      setShowBorder(true)
      setBorderRadius(8)
      setCustomPromoText('ARTESANAL')
    } else if (themeName === 'dark_elegant') {
      setBackgroundColor('#1e293b') // Deep dark
      setPriceColor('#fbbf24') // Golden yellow
      setFontColor('#ffffff')
      setBorderColor('#d97706')
      setBorderStyle('solid')
      setBorderThickness(2)
      setShowBorder(true)
      setBorderRadius(6)
      setCustomPromoText('PREMIUM')
    } else if (themeName === 'minimal') {
      setBackgroundColor('#ffffff')
      setPriceColor('#1e293b')
      setFontColor('#475569')
      setBorderColor('#cbd5e1')
      setBorderStyle('dashed')
      setBorderThickness(1)
      setShowBorder(true)
      setBorderRadius(0)
      setCustomPromoText('PROMO')
    }
  }

  // Get Suffix helper
  const getSuffix = (p) => {
    if (priceSuffix === 'none') return ''
    if (priceSuffix === 'un') return ' un'
    if (priceSuffix === 'kg') return ' kg'
    if (priceSuffix === 'custom') return customSuffixText ? ` ${customSuffixText}` : ''
    if (priceSuffix === 'auto') {
      return p.fractioned ? ' kg' : ' un'
    }
    return ''
  }

  // Get Font Family helper
  const getFontFamilyCSS = () => {
    if (fontFamily === 'monospace') return "monospace, 'Courier New'"
    if (fontFamily === 'serif') return "Georgia, serif"
    if (fontFamily === 'anton') return "'Impact', 'Anton', sans-serif"
    return "'Inter', -apple-system, sans-serif"
  }

  // Trigger print logic
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      alert('Por favor, selecione pelo menos um produto na lista antes de gerar as etiquetas!')
      return
    }

    // Pad products to make complete aligned rows
    const paddedForPrint = [...selectedProducts]
    const remainder = selectedProducts.length % columns
    if (remainder > 0) {
      const padCount = columns - remainder
      for (let i = 0; i < padCount; i++) {
        paddedForPrint.push({ isPlaceholder: true, id: `pad-print-${i}` })
      }
    }

    // Split into row arrays
    const rowsList = []
    for (let i = 0; i < paddedForPrint.length; i += columns) {
      rowsList.push(paddedForPrint.slice(i, i + columns))
    }

    // Build crop marks HTML rows
    const printableRowsHtml = rowsList.map(row => {
      const labelElements = row.map(p => {
        if (p.isPlaceholder) {
          // Empty dummy label to keep alignment intact
          return `<div class="label" style="width: ${widthMm}mm; height: ${heightMm}mm; visibility: hidden; border: none; background: transparent;"></div>`
        }

        const mainPrice = parseCurrency(p.promoPrice || p.price || p.oldPrice)
        const isPromo = p.promoPrice && p.oldPrice
        
        // Generate mock barcode bars
        const barsCount = 28
        const barElements = []
        for (let i = 0; i < barsCount; i++) {
          const isWide = (i * 7) % 3 === 0
          const isGap = (i * 11) % 4 === 0
          if (!isGap) {
            barElements.push(`<div class="barcode-bar" style="width: ${isWide ? '3.5px' : '1.5px'}; height: ${i % 2 === 0 ? '90%' : '100%'}"></div>`)
          } else {
            barElements.push(`<div class="barcode-bar" style="background: transparent; width: 2px"></div>`)
          }
        }

        // Build contents by Layout Template
        let contentHtml = ''
        if (layoutTemplate === 'centered') {
          contentHtml = `
            <div style="width:100%; flex: 1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
              ${showCategory && p.category ? `<div class="category">${p.category}</div>` : ''}
              <div class="name">${p.name}</div>
            </div>
            <div class="pricing-block">
              ${showOldPrice && isPromo ? `<div class="old-price">${formatCurrency(p.oldPrice)}</div>` : ''}
              <div class="price">${formatCurrency(mainPrice)}<span class="suffix">${getSuffix(p)}</span></div>
            </div>
          `
        } else if (layoutTemplate === 'horizontal_split') {
          contentHtml = `
            <div class="content-row">
              <div class="name-col">
                ${showCategory && p.category ? `<div class="category">${p.category}</div>` : ''}
                <div class="name">${p.name}</div>
              </div>
              <div class="price-col">
                ${showOldPrice && isPromo ? `<div class="old-price">${formatCurrency(p.oldPrice)}</div>` : ''}
                <div class="price">${formatCurrency(mainPrice)}<span class="suffix">${getSuffix(p)}</span></div>
              </div>
            </div>
          `
        } else if (layoutTemplate === 'price_focus') {
          contentHtml = `
            <div class="pricing-block price-focused-block">
              ${showOldPrice && isPromo ? `<div class="old-price">${formatCurrency(p.oldPrice)}</div>` : ''}
              <div class="price" style="font-size: ${priceFontSize * 1.3}px">${formatCurrency(mainPrice)}<span class="suffix">${getSuffix(p)}</span></div>
            </div>
            <div class="name-focused-row">
              ${showCategory && p.category ? `${p.category} • ` : ''}${p.name}
            </div>
          `
        }

        return `
          <div class="label layout-${layoutTemplate}">
            ${showPromoBadge && isPromo ? `<div class="promo-badge">${customPromoText}</div>` : ''}
            
            ${showStoreName ? `<div class="store-name">${storeEmoji ? storeEmoji + ' ' : ''}${customStoreName}</div>` : ''}
            
            ${contentHtml}
            
            ${showBarcode && p.code ? `
              <div class="barcode-container">
                <div class="barcode-mock">
                  ${barElements.join('')}
                </div>
                ${showCode ? `<div class="code-label">${p.code}</div>` : ''}
              </div>
            ` : (showCode && p.code ? `<div class="code-label" style="margin-top: 1.5mm;">Cód: ${p.code}</div>` : '')}
          </div>
        `
      }).join('')

      return `
        <div class="label-row">
          ${showCropMarks ? `<div class="crop-mark crop-mark-left"></div>` : ''}
          <div class="labels-container">
            ${labelElements}
          </div>
          ${showCropMarks ? `<div class="crop-mark crop-mark-right"></div>` : ''}
        </div>
      `
    }).join('')

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiquetas Personalizadas</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 8mm 4mm;
            font-family: ${getFontFamilyCSS()};
            background: #fff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .label-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            margin-bottom: ${gapMm}mm;
            page-break-inside: avoid;
          }
          .labels-container {
            display: flex;
            flex-direction: row;
            gap: ${gapMm}mm;
          }
          .label {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            box-sizing: border-box;
            padding: 3mm;
            border: ${showBorder ? `${borderThickness}px ${borderStyle} ${borderColor}` : 'none'};
            border-radius: ${showBorder ? `${borderRadius}mm` : '0'};
            background: ${backgroundColor};
            color: ${fontColor};
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .crop-mark {
            width: 8mm;
            height: ${heightMm}mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            flex-shrink: 0;
          }
          .crop-mark::before, .crop-mark::after {
            content: "";
            display: block;
            width: 100%;
            height: 1.5px;
            background: #22c55e; /* vibrant cutting green */
          }
          .crop-mark-left {
            margin-right: 4mm;
          }
          .crop-mark-right {
            margin-left: 4mm;
          }
          .store-name {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1mm;
            opacity: 0.85;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            text-align: center;
          }
          .category {
            font-size: 8px;
            opacity: 0.65;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
            font-weight: 700;
            text-align: center;
          }
          .name {
            font-weight: 800;
            font-size: ${nameFontSize}px;
            line-height: 1.15;
            text-transform: uppercase;
            width: 100%;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
          }
          .pricing-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin-top: 1mm;
          }
          .old-price {
            font-size: ${priceFontSize * 0.55}px;
            text-decoration: line-through;
            opacity: 0.6;
            margin-bottom: -0.5mm;
            line-height: 1;
          }
          .price {
            font-weight: 900;
            font-size: ${priceFontSize}px;
            color: ${priceColor};
            line-height: 1;
            white-space: nowrap;
          }
          .price .suffix {
            font-size: ${priceFontSize * 0.5}px;
            font-weight: 600;
            opacity: 0.75;
          }
          .promo-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: ${priceColor};
            color: ${backgroundColor === '#ffffff' || backgroundColor.startsWith('rgba') ? '#fff' : backgroundColor};
            font-size: 7px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 3px;
            text-transform: uppercase;
          }
          .barcode-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 1.5mm;
            width: 100%;
            opacity: 0.85;
          }
          .barcode-mock {
            height: 6mm;
            width: 80%;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            overflow: hidden;
          }
          .barcode-bar {
            background: ${fontColor};
            height: 100%;
            width: 2px;
            border-radius: 0.5px;
          }
          .code-label {
            font-size: ${codeFontSize}px;
            font-family: monospace;
            margin-top: 0.5mm;
            letter-spacing: 0.05em;
            opacity: 0.85;
            text-align: center;
          }

          /* Horizontal Split Layout styles */
          .layout-horizontal_split .content-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            flex: 1;
            width: 100%;
            gap: 2mm;
            margin: auto 0;
          }
          .layout-horizontal_split .name-col {
            flex: 1;
            text-align: left;
            min-width: 0;
          }
          .layout-horizontal_split .name-col .name {
            text-align: left;
          }
          .layout-horizontal_split .name-col .category {
            text-align: left;
          }
          .layout-horizontal_split .price-col {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            flex-shrink: 0;
          }

          /* Price Focus Layout styles */
          .layout-price_focus .price-focused-block {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
          }
          .layout-price_focus .name-focused-row {
            width: 100%;
            text-align: center;
            font-size: ${Math.max(6, nameFontSize * 0.75)}px;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-top: 0.5mm;
            opacity: 0.9;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${printableRowsHtml}
        
        <script>
          setTimeout(() => {
            window.print();
            setTimeout(() => window.close(), 500);
          }, 300);
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor, ative as janelas pop-up no seu navegador para poder imprimir as etiquetas!')
      return
    }
    printWindow.document.write(printHtml)
    printWindow.document.close()
  }

  // Pre-generate bar elements for preview
  const barsCount = 20
  const previewBars = useMemo(() => {
    const arr = []
    for (let i = 0; i < barsCount; i++) {
      const isWide = (i * 7) % 3 === 0
      const isGap = (i * 11) % 4 === 0
      arr.push({ isWide, isGap, height: i % 2 === 0 ? '90%' : '100%' })
    }
    return arr
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90 flex items-center justify-center">←</button>
          <div>
            <div className="font-bold text-gray-950 flex items-center gap-1.5 text-lg">🏷️ Gerador de Etiquetas</div>
            <div className="text-xs text-gray-500">Design de etiquetas de gôndolas e preços super customizáveis</div>
          </div>
        </div>
        <button onClick={handlePrint}
          disabled={selectedIds.length === 0}
          className={`btn text-sm font-bold flex items-center gap-2 h-11 px-5 shadow-md transition-all rounded-xl active:scale-95
            ${selectedIds.length > 0
              ? 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-pink-500/20'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 shadow-none'}`}>
          🖨️ Imprimir Etiquetas ({selectedIds.length})
        </button>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Dynamic Live Print Preview Canvas */}
        <div className="flex-1 bg-slate-900 overflow-auto p-8 flex flex-col items-center justify-center border-r border-slate-800 relative">
          <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700/50">
            👁️ Estúdio de Design e Visualização de Folha
          </div>

          {selectedProducts.length === 0 ? (
            <div className="text-center p-8 max-w-sm text-slate-400 animate-pulse">
              <div className="text-6xl mb-4">🏷️</div>
              <div className="font-extrabold text-white text-lg">Nenhum Produto Selecionado</div>
              <div className="text-sm mt-2 text-slate-400 leading-relaxed">
                Selecione produtos na lista lateral para criar e estilizar suas etiquetas em tempo real!
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="overflow-auto max-h-[75vh] p-6 bg-slate-950/40 rounded-3xl border-2 border-dashed border-slate-800 flex items-center justify-center scrollbar-thin shadow-2xl">
                <div
                  className="flex flex-col p-6 shadow-2xl rounded-2xl transition-all"
                  style={{
                    backgroundColor: '#ffffff',
                    gap: `${gapMm * 3}px`
                  }}
                >
                  {previewRows.map((row, rowIdx) => (
                    <div key={`row-${rowIdx}`} className="flex flex-row items-center justify-center">
                      {/* Left crop ticks in live preview */}
                      {showCropMarks && (
                        <div
                          className="flex flex-col justify-between shrink-0 mr-3 animate-pulse"
                          style={{ width: '24px', height: `${heightMm * 3}px` }}
                        >
                          <div className="h-[2px] bg-emerald-500 w-full" />
                          <div className="h-[2px] bg-emerald-500 w-full" />
                        </div>
                      )}

                      <div className="flex flex-row" style={{ gap: `${gapMm * 3}px` }}>
                        {row.map(p => {
                          if (p.isPlaceholder) {
                            return (
                              <div
                                key={p.id}
                                style={{
                                  width: `${widthMm * 3}px`,
                                  height: `${heightMm * 3}px`,
                                  visibility: 'hidden'
                                }}
                              />
                            )
                          }
                          const mainPrice = parseCurrency(p.promoPrice || p.price || p.oldPrice)
                          const isPromo = p.promoPrice && p.oldPrice
                          
                          return (
                            <div
                              key={`preview-${p.id}`}
                              className="transition-all relative select-none hover:shadow-lg flex flex-col justify-between"
                              style={{
                                width: `${widthMm * 3}px`,
                                height: `${heightMm * 3}px`,
                                padding: '6px',
                                border: showBorder ? `${borderThickness}px ${borderStyle} ${borderColor}` : 'none',
                                borderRadius: showBorder ? `${borderRadius * 3}px` : '0',
                                backgroundColor: backgroundColor,
                                color: fontColor,
                                fontFamily: getFontFamilyCSS(),
                                overflow: 'hidden'
                              }}
                            >
                              {/* Promo Badge */}
                              {showPromoBadge && isPromo && (
                                <div className="absolute top-0.5 right-0.5 bg-red-500 text-white font-bold text-[5px] px-1 py-0.5 rounded leading-none z-10"
                                  style={{ backgroundColor: priceColor, color: backgroundColor === '#ffffff' || backgroundColor.startsWith('rgba') ? '#fff' : backgroundColor }}>
                                  {customPromoText}
                                </div>
                              )}

                              {/* Store Name */}
                              {showStoreName && (
                                <div className="text-[6px] font-extrabold uppercase tracking-wider text-center w-full truncate opacity-75">
                                  {storeEmoji ? `${storeEmoji} ` : ''}{customStoreName}
                                </div>
                              )}

                              {/* Middle Content Blocks depending on Layout */}
                              {layoutTemplate === 'centered' && (
                                <>
                                  <div className="w-full flex-1 flex flex-col items-center justify-center text-center my-0.5">
                                    {showCategory && p.category && (
                                      <div className="text-[5px] uppercase font-bold tracking-tight opacity-50 truncate w-full">
                                        {p.category}
                                      </div>
                                    )}
                                    <div
                                      className="font-bold uppercase tracking-tight text-center leading-tight overflow-hidden break-words w-full"
                                      style={{
                                        fontSize: `${Math.max(6, nameFontSize * 0.7)}px`,
                                        maxHeight: '2.4em',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                      }}
                                    >
                                      {p.name}
                                    </div>
                                  </div>

                                  <div className="w-full flex flex-col items-center justify-center leading-none">
                                    {showOldPrice && isPromo && (
                                      <span className="text-[7px] opacity-60 line-through mb-0.5">
                                        {formatCurrency(p.oldPrice)}
                                      </span>
                                    )}
                                    <span className="font-black" style={{ fontSize: `${priceFontSize * 0.7}px`, color: priceColor }}>
                                      {formatCurrency(mainPrice)}
                                      <span className="text-[50%] font-semibold opacity-75">{getSuffix(p)}</span>
                                    </span>
                                  </div>
                                </>
                              )}

                              {layoutTemplate === 'horizontal_split' && (
                                <div className="flex flex-row justify-between items-center w-full flex-1 gap-1.5 my-1">
                                  <div className="flex-1 text-left min-w-0">
                                    {showCategory && p.category && (
                                      <div className="text-[5px] uppercase font-bold tracking-tight opacity-50 truncate w-full">
                                        {p.category}
                                      </div>
                                    )}
                                    <div
                                      className="font-bold uppercase tracking-tight leading-tight overflow-hidden break-words w-full text-left"
                                      style={{
                                        fontSize: `${Math.max(6, nameFontSize * 0.65)}px`,
                                        maxHeight: '2.4em',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                      }}
                                    >
                                      {p.name}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end justify-center leading-none shrink-0 text-right">
                                    {showOldPrice && isPromo && (
                                      <span className="text-[6.5px] opacity-60 line-through mb-0.5">
                                        {formatCurrency(p.oldPrice)}
                                      </span>
                                    )}
                                    <span className="font-black" style={{ fontSize: `${priceFontSize * 0.65}px`, color: priceColor }}>
                                      {formatCurrency(mainPrice)}
                                      <span className="text-[50%] font-semibold opacity-75">{getSuffix(p)}</span>
                                    </span>
                                  </div>
                                </div>
                              )}

                              {layoutTemplate === 'price_focus' && (
                                <>
                                  <div className="w-full flex-1 flex flex-col items-center justify-center leading-none my-0.5">
                                    {showOldPrice && isPromo && (
                                      <span className="text-[7px] opacity-60 line-through mb-0.5">
                                        {formatCurrency(p.oldPrice)}
                                      </span>
                                    )}
                                    <span className="font-black" style={{ fontSize: `${priceFontSize * 0.9}px`, color: priceColor }}>
                                      {formatCurrency(mainPrice)}
                                      <span className="text-[50%] font-semibold opacity-75">{getSuffix(p)}</span>
                                    </span>
                                  </div>
                                  <div className="w-full text-center truncate font-bold text-[5.5px] uppercase opacity-90 tracking-tight">
                                    {showCategory && p.category ? `${p.category} • ` : ''}{p.name}
                                  </div>
                                </>
                              )}

                              {/* Barcode Mock */}
                              {showBarcode && p.code ? (
                                <div className="w-full flex flex-col items-center mt-0.5 opacity-80 leading-none">
                                  <div className="w-4/5 h-[14px] flex items-end justify-between overflow-hidden">
                                    {previewBars.map((bar, i) => (
                                      !bar.isGap ? (
                                        <div
                                          key={i}
                                          style={{
                                            background: fontColor,
                                            width: bar.isWide ? '2px' : '0.8px',
                                            height: bar.height
                                          }}
                                        />
                                      ) : (
                                        <div key={i} className="bg-transparent w-[1px]" />
                                      )
                                    ))}
                                  </div>
                                  {showCode && (
                                    <span className="text-[5.5px] font-mono tracking-widest mt-0.5 uppercase">
                                      {p.code}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                showCode && p.code && (
                                  <div className="text-[5.5px] font-mono opacity-80 mt-0.5 truncate w-full text-center">
                                    Cód: {p.code}
                                  </div>
                                )
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Right crop ticks in live preview */}
                      {showCropMarks && (
                        <div
                          className="flex flex-col justify-between shrink-0 ml-3 animate-pulse"
                          style={{ width: '24px', height: `${heightMm * 3}px` }}
                        >
                          <div className="h-[2px] bg-emerald-500 w-full" />
                          <div className="h-[2px] bg-emerald-500 w-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Premium Sidebar Controls */}
        <div className="w-96 bg-white overflow-y-auto p-5 shrink-0 shadow-lg border-l border-gray-100 flex flex-col gap-6 scrollbar-thin">
          
          {/* Section: Product Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">📦 1. Produtos</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 font-bold rounded-full">
                {selectedIds.length} selecionados
              </span>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Nome, código, categoria..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9 text-xs h-10 min-h-0 py-2"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="btn btn-ghost text-xs shrink-0 px-3 h-10 min-h-0 font-bold active:scale-95 border-gray-300"
              >
                {filteredProducts.every(p => selectedIds.includes(p.id)) ? 'Limpar Todos' : 'Marcar Todos'}
              </button>
            </div>

            {/* List products for selection */}
            <div className="border border-gray-100 rounded-2xl max-h-40 overflow-y-auto scrollbar-thin bg-slate-50/50 p-2 space-y-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">Nenhum produto cadastrado</div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = selectedIds.includes(p.id)
                  const price = parseCurrency(p.promoPrice || p.price || p.oldPrice)
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggleProduct(p.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left group
                        ${isSelected
                          ? 'border-pink-300 bg-pink-50/40 text-pink-900 shadow-sm'
                          : 'border-transparent bg-white text-gray-700 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                          {isSelected && '✓'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {p.code && `Cód: ${p.code} • `}{formatCurrency(price)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Section: Themes */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">🎨 2. Temas de Cores Rápidos</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'custom', label: '🛠️ Customizado' },
                { key: 'promo_yellow', label: '🟡 Super Oferta' },
                { key: 'rustic_bakery', label: '🥖 Padaria Rústica' },
                { key: 'dark_elegant', label: '⚫ Preto Premium' },
                { key: 'minimal', label: '⚪ Minimalista' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => applyTheme(t.key)}
                  className={`btn h-10 min-h-0 text-[11px] font-bold rounded-xl active:scale-95 border transition-all
                    ${labelTheme === t.key
                      ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/10'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Dimension & Layout */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">📐 3. Modelo e Dimensões</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Modelo da Etiqueta</label>
                <select
                  value={layoutTemplate}
                  onChange={e => setLayoutTemplate(e.target.value)}
                  className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                >
                  <option value="centered">Modelo 1: Centralizado (Padrão)</option>
                  <option value="horizontal_split">Modelo 2: Divisão Lateral (Horizontal)</option>
                  <option value="price_focus">Modelo 3: Foco no Preço (Gigante)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                    <span>Largura (mm)</span>
                    <span className="font-bold text-pink-600">{widthMm}mm</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={80}
                    value={widthMm}
                    onChange={e => { setWidthMm(Number(e.target.value)); setLabelTheme('custom') }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                    <span>Altura (mm)</span>
                    <span className="font-bold text-pink-600">{heightMm}mm</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={60}
                    value={heightMm}
                    onChange={e => { setHeightMm(Number(e.target.value)); setLabelTheme('custom') }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                    <span>Canto Arredondado</span>
                    <span className="font-bold text-pink-600">{borderRadius}mm</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    value={borderRadius}
                    onChange={e => { setBorderRadius(Number(e.target.value)); setLabelTheme('custom') }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-0.5 block uppercase">Colunas por Folha</label>
                  <select
                    value={columns}
                    onChange={e => setColumns(Number(e.target.value))}
                    className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                  >
                    <option value={1}>1 coluna</option>
                    <option value={2}>2 colunas</option>
                    <option value={3}>3 colunas</option>
                    <option value={4}>4 colunas</option>
                    <option value={5}>5 colunas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Tipografia (Família da Fonte)</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                >
                  <option value="sans-serif">Inter (Moderna / Sans)</option>
                  <option value="monospace">Courier (Retro / Mono)</option>
                  <option value="serif">Georgia (Clássica / Elegante)</option>
                  <option value="anton">Anton / Impact (Comercial / Negrito)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Pricing Suffix */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">💰 4. Formato de Preço e Sufixo</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Sufixo de Medida</label>
                <select
                  value={priceSuffix}
                  onChange={e => setPriceSuffix(e.target.value)}
                  className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                >
                  <option value="auto">Automático (pelo cadastro / kg / un)</option>
                  <option value="none">Nenhum sufixo</option>
                  <option value="un">Fixo: / un</option>
                  <option value="kg">Fixo: / kg</option>
                  <option value="custom">Sufixo Personalizado...</option>
                </select>
              </div>
              {priceSuffix === 'custom' && (
                <div className="animate-slide-up">
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Texto do Sufixo</label>
                  <input
                    type="text"
                    placeholder="Ex: / caixa, / litro"
                    value={customSuffixText}
                    onChange={e => setCustomSuffixText(e.target.value)}
                    className="input text-xs h-10 min-h-0 py-1.5"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section: Typography Sizing */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">✍️ 5. Tamanho das Fontes</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-gray-500 mb-1 block uppercase text-center">Nome Prod.</label>
                <input
                  type="number"
                  min={6}
                  max={24}
                  value={nameFontSize}
                  onChange={e => setNameFontSize(Number(e.target.value))}
                  className="input text-xs py-1.5 h-10 min-h-0 text-center"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 mb-1 block uppercase text-center">Preço (px)</label>
                <input
                  type="number"
                  min={10}
                  max={48}
                  value={priceFontSize}
                  onChange={e => setPriceFontSize(Number(e.target.value))}
                  className="input text-xs py-1.5 h-10 min-h-0 text-center"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 mb-1 block uppercase text-center">Cód (px)</label>
                <input
                  type="number"
                  min={6}
                  max={14}
                  value={codeFontSize}
                  onChange={e => setCodeFontSize(Number(e.target.value))}
                  className="input text-xs py-1.5 h-10 min-h-0 text-center"
                />
              </div>
            </div>
          </div>

          {/* Section: Visual Styling */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">🎨 6. Paleta de Cores e Estilização</h3>
            
            <div className="space-y-3">
              {/* Color Pickers */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 mb-0.5 block uppercase text-center">Fundo</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-9 bg-white">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={e => { setBackgroundColor(e.target.value); setLabelTheme('custom') }}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 mb-0.5 block uppercase text-center">Textos</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-9 bg-white">
                    <input
                      type="color"
                      value={fontColor}
                      onChange={e => { setFontColor(e.target.value); setLabelTheme('custom') }}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 mb-0.5 block uppercase text-center">Preço</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-9 bg-white">
                    <input
                      type="color"
                      value={priceColor}
                      onChange={e => { setPriceColor(e.target.value); setLabelTheme('custom') }}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 mb-0.5 block uppercase text-center">Borda</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-9 bg-white">
                    <input
                      type="color"
                      value={borderColor}
                      disabled={!showBorder}
                      onChange={e => { setBorderColor(e.target.value); setLabelTheme('custom') }}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Border Toggle & Thickness */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-gray-700">Desenhar Borda</span>
                <button
                  onClick={() => { setShowBorder(!showBorder); setLabelTheme('custom') }}
                  className={`btn text-[11px] font-bold px-3 h-8 min-h-0 rounded-lg active:scale-95 transition-all
                    ${showBorder ? 'bg-pink-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}
                >
                  {showBorder ? 'Sim' : 'Não'}
                </button>
              </div>

              {showBorder && (
                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-0.5 block uppercase">Estilo da Borda</label>
                    <select
                      value={borderStyle}
                      onChange={e => { setBorderStyle(e.target.value); setLabelTheme('custom') }}
                      className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                    >
                      <option value="solid">Contínua</option>
                      <option value="dashed">Tracejada</option>
                      <option value="dotted">Pontilhada</option>
                      <option value="double">Dupla</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-0.5 block uppercase">Espessura (px)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={borderThickness}
                      onChange={e => { setBorderThickness(Number(e.target.value)); setLabelTheme('custom') }}
                      className="input text-xs py-1.5 h-10 min-h-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Content Options */}
          <div className="space-y-4 border-t border-gray-100 pt-4 pb-6">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">⚙️ 7. Informações e Textos</h3>
            
            <div className="space-y-3">
              {/* Store Name & Emoji */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Título / Loja no Topo</span>
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={e => setShowStoreName(e.target.checked)}
                    className="accent-pink-500 scale-110"
                  />
                </div>
                {showStoreName && (
                  <div className="flex gap-2 animate-slide-up">
                    <input
                      type="text"
                      placeholder="🍞"
                      title="Emoji/Ícone da Loja"
                      value={storeEmoji}
                      onChange={e => setStoreEmoji(e.target.value)}
                      className="input text-center text-xs h-9 w-12 min-h-0 p-0 bg-slate-50"
                    />
                    <input
                      type="text"
                      placeholder="Título no topo"
                      value={customStoreName}
                      onChange={e => setCustomStoreName(e.target.value)}
                      className="input text-xs h-9 min-h-0 py-1.5 bg-slate-50 flex-1"
                    />
                  </div>
                )}
              </div>

              {/* Promo Badge custom text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Tag de Oferta (PROMO)</span>
                  <input
                    type="checkbox"
                    checked={showPromoBadge}
                    onChange={e => setShowPromoBadge(e.target.checked)}
                    className="accent-pink-500 scale-110"
                  />
                </div>
                {showPromoBadge && (
                  <input
                    type="text"
                    placeholder="Texto do selo. Ex: OFERTA"
                    value={customPromoText}
                    onChange={e => setCustomPromoText(e.target.value.toUpperCase())}
                    className="input text-xs h-9 min-h-0 py-1.5 bg-slate-50 animate-slide-up"
                  />
                )}
              </div>

              {/* Checkboxes & Guillotine crop marks */}
              {[
                { label: 'Marcas de Corte (Guia de Guilhotina Verde)', state: showCropMarks, setState: setShowCropMarks },
                { label: 'Mostrar Categoria do Produto', state: showCategory, setState: setShowCategory },
                { label: 'Mostrar Código de Barras mockado', state: showBarcode, setState: setShowBarcode },
                { label: 'Mostrar Código numérico do produto', state: showCode, setState: setShowCode },
                { label: 'Mostrar Preço Anterior em Promoção', state: showOldPrice, setState: setShowOldPrice }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={e => item.setState(e.target.checked)}
                    className="accent-pink-500 scale-110"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
