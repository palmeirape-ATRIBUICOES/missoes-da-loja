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

  // Control panel states - Dimensions
  const [widthMm, setWidthMm] = useState(50)
  const [heightMm, setHeightMm] = useState(30)
  const [columns, setColumns] = useState(3)
  const [gapMm, setGapMm] = useState(2)

  // Control panel states - Styling
  const [showBorder, setShowBorder] = useState(true)
  const [borderStyle, setBorderStyle] = useState('dashed')
  const [borderThickness, setBorderThickness] = useState(1)
  const [borderColor, setBorderColor] = useState('#64748b')
  const [fontColor, setFontColor] = useState('#1e293b')
  const [priceColor, setPriceColor] = useState('#ef4444') // Hot promotional price option
  const [showPromoBadge, setShowPromoBadge] = useState(true)

  // Control panel states - Font sizes
  const [nameFontSize, setNameFontSize] = useState(12)
  const [priceFontSize, setPriceFontSize] = useState(20)
  const [codeFontSize, setCodeFontSize] = useState(8)

  // Control panel states - Content Toggle
  const [showStoreName, setShowStoreName] = useState(true)
  const [customStoreName, setCustomStoreName] = useState(store?.shortName || 'Minha Loja')
  const [showCode, setShowCode] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [showCategory, setShowCategory] = useState(true)
  const [showOldPrice, setShowOldPrice] = useState(true)

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
      // Find out if all filtered items are already selected
      const allSelected = allFilteredIds.every(id => prev.includes(id))
      if (allSelected) {
        // Remove all filtered ids
        return prev.filter(id => !allFilteredIds.includes(id))
      } else {
        // Add all filtered ids without duplicates
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

  // Trigger print logic
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      alert('Por favor, selecione pelo menos um produto na lista antes de gerar as etiquetas!')
      return
    }

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
            padding: 5mm;
            font-family: 'Inter', -apple-system, sans-serif;
            background: #fff;
            display: grid;
            grid-template-columns: repeat(${columns}, ${widthMm}mm);
            gap: ${gapMm}mm;
            box-sizing: border-box;
          }
          .label {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 3mm;
            text-align: center;
            border: ${showBorder ? `${borderThickness}px ${borderStyle} ${borderColor}` : 'none'};
            border-radius: ${showBorder ? '2mm' : '0'};
            page-break-inside: avoid;
            background: #ffffff;
            color: ${fontColor};
            overflow: hidden;
            position: relative;
          }
          .store-name {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1mm;
            opacity: 0.75;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .name {
            font-weight: 700;
            font-size: ${nameFontSize}px;
            line-height: 1.15;
            text-transform: uppercase;
            margin: auto 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .category {
            font-size: 8px;
            opacity: 0.6;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
            font-weight: 600;
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
            color: #64748b;
            margin-bottom: -0.5mm;
            line-height: 1;
          }
          .price {
            font-weight: 900;
            font-size: ${priceFontSize}px;
            color: ${priceColor};
            line-height: 1;
          }
          .promo-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: ${priceColor};
            color: white;
            font-size: 7px;
            font-weight: bold;
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
            background: #000;
            height: 100%;
            width: 2px;
            border-radius: 0.5px;
          }
          .code-label {
            font-size: ${codeFontSize}px;
            font-family: monospace;
            margin-top: 0.5mm;
            letter-spacing: 0.05em;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        ${selectedProducts.map(p => {
          const mainPrice = parseCurrency(p.promoPrice || p.price || p.oldPrice)
          const isPromo = p.promoPrice && p.oldPrice
          
          // Generate mock bar codes with random thicknesses for realistic aesthetic
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

          return `
            <div class="label">
              ${showPromoBadge && isPromo ? `<div class="promo-badge">PROMO</div>` : ''}
              
              ${showStoreName ? `<div class="store-name">${customStoreName}</div>` : ''}
              
              <div style="width:100%; flex: 1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                ${showCategory && p.category ? `<div class="category">${p.category}</div>` : ''}
                <div class="name">${p.name}</div>
              </div>
              
              <div class="pricing-block">
                ${showOldPrice && isPromo ? `<div class="old-price">${formatCurrency(p.oldPrice)}</div>` : ''}
                <div class="price">${formatCurrency(mainPrice)}</div>
              </div>
              
              ${showBarcode && p.code ? `
                <div class="barcode-container">
                  <div class="barcode-mock">
                    ${barElements.join('')}
                  </div>
                  ${showCode ? `<div class="code-label">${p.code}</div>` : ''}
                </div>
              ` : (showCode && p.code ? `<div class="code-label" style="margin-top: 1mm;">Cód: ${p.code}</div>` : '')}
            </div>
          `
        }).join('')}
        
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
            <div className="text-xs text-gray-500">Crie e imprima etiquetas altamente personalizadas</div>
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
            👁️ Visualização em Tempo Real (Sheet Preview)
          </div>

          {selectedProducts.length === 0 ? (
            <div className="text-center p-8 max-w-sm text-slate-400 animate-pulse">
              <div className="text-6xl mb-4">🏷️</div>
              <div className="font-extrabold text-white text-lg">Nenhum Produto Selecionado</div>
              <div className="text-sm mt-2 text-slate-400 leading-relaxed">
                Marque as caixinhas dos produtos no painel lateral direito para visualizá-los e imprimi-los aqui.
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="overflow-auto max-h-[75vh] p-6 bg-slate-950/40 rounded-3xl border-2 border-dashed border-slate-800 flex items-center justify-center scrollbar-thin shadow-2xl">
                <div
                  className="grid bg-white p-6 shadow-2xl rounded-2xl transition-all"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, ${widthMm * 3}px)`,
                    gap: `${gapMm * 3}px`,
                  }}
                >
                  {selectedProducts.map(p => {
                    const mainPrice = parseCurrency(p.promoPrice || p.price || p.oldPrice)
                    const isPromo = p.promoPrice && p.oldPrice
                    
                    return (
                      <div
                        key={`preview-${p.id}`}
                        className="transition-all relative bg-white select-none hover:shadow-lg flex flex-col items-center justify-between"
                        style={{
                          width: `${widthMm * 3}px`,
                          height: `${heightMm * 3}px`,
                          padding: '6px',
                          border: showBorder ? `${borderThickness}px ${borderStyle} ${borderColor}` : 'none',
                          borderRadius: showBorder ? '6px' : '0',
                          color: fontColor,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Promo Badge */}
                        {showPromoBadge && isPromo && (
                          <div className="absolute top-0.5 right-0.5 bg-red-500 text-white font-bold text-[5px] px-1 py-0.5 rounded leading-none">
                            PROMO
                          </div>
                        )}

                        {/* Store Name */}
                        {showStoreName && (
                          <div className="text-[6px] font-bold uppercase tracking-wider text-center w-full truncate opacity-70">
                            {customStoreName}
                          </div>
                        )}

                        {/* Name and Category */}
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

                        {/* Pricing */}
                        <div className="w-full flex flex-col items-center justify-center leading-none">
                          {showOldPrice && isPromo && (
                            <span className="text-[7px] text-gray-400 line-through mb-0.5">
                              {formatCurrency(p.oldPrice)}
                            </span>
                          )}
                          <span className="font-black" style={{ fontSize: `${priceFontSize * 0.7}px`, color: priceColor }}>
                            {formatCurrency(mainPrice)}
                          </span>
                        </div>

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
              </div>
            </div>
          )}
        </div>

        {/* Right: Premium Sidebar Controls */}
        <div className="w-96 bg-white overflow-y-auto p-5 shrink-0 shadow-lg border-l border-gray-100 flex flex-col gap-6 scrollbar-thin">
          
          {/* Section: Product Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">📦 1. Escolha os Produtos</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 font-bold rounded-full">
                {selectedIds.length} selecionados
              </span>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9 text-xs h-10 min-h-0 py-2"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="btn btn-ghost text-xs shrink-0 px-3 h-10 min-h-0 font-bold active:scale-95 border-gray-300"
              >
                {filteredProducts.every(p => selectedIds.includes(p.id)) ? 'Deselecionar' : 'Marcar Todos'}
              </button>
            </div>

            {/* List products for selection */}
            <div className="border border-gray-100 rounded-2xl max-h-48 overflow-y-auto scrollbar-thin bg-slate-50/50 p-2 space-y-1">
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
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group
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
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">
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

          {/* Section: Dimensions */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">📐 2. Dimensões e Layout</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                  <span>Largura da etiqueta</span>
                  <span className="font-bold text-brand-600">{widthMm} mm</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={80}
                  value={widthMm}
                  onChange={e => setWidthMm(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                  <span>Altura da etiqueta</span>
                  <span className="font-bold text-brand-600">{heightMm} mm</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={60}
                  value={heightMm}
                  onChange={e => setHeightMm(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase">Colunas por Folha</label>
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
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase">Espaçamento (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={gapMm}
                    onChange={e => setGapMm(Number(e.target.value))}
                    className="input text-xs py-1.5 h-10 min-h-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Typography */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">✍️ 3. Tamanho das Fontes</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Nome Prod.</label>
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
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Preço</label>
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
                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">Código</label>
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

          {/* Section: Aesthetics */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">🎨 4. Design e Estilização</h3>
            
            <div className="space-y-3">
              {/* Border Toggle & Thickness */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-gray-700">Adicionar Borda</span>
                <button
                  onClick={() => setShowBorder(!showBorder)}
                  className={`btn text-xs font-bold px-4 h-8 min-h-0 rounded-lg active:scale-95 transition-all
                    ${showBorder ? 'bg-pink-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}
                >
                  {showBorder ? 'Sim' : 'Não'}
                </button>
              </div>

              {showBorder && (
                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase">Estilo da Borda</label>
                    <select
                      value={borderStyle}
                      onChange={e => setBorderStyle(e.target.value)}
                      className="input text-xs py-1.5 h-10 min-h-0 bg-white"
                    >
                      <option value="solid">Contínua</option>
                      <option value="dashed">Tracejada</option>
                      <option value="dotted">Pontilhada</option>
                      <option value="double">Dupla</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase">Espessura (px)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={borderThickness}
                      onChange={e => setBorderThickness(Number(e.target.value))}
                      className="input text-xs py-1.5 h-10 min-h-0"
                    />
                  </div>
                </div>
              )}

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase text-center">Borda</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-10 bg-white">
                    <input
                      type="color"
                      value={borderColor}
                      disabled={!showBorder}
                      onChange={e => setBorderColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase text-center">Textos</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-10 bg-white">
                    <input
                      type="color"
                      value={fontColor}
                      onChange={e => setFontColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase text-center">Preço</label>
                  <div className="flex items-center justify-center p-1 border rounded-lg h-10 bg-white">
                    <input
                      type="color"
                      value={priceColor}
                      onChange={e => setPriceColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Content Toggles */}
          <div className="space-y-4 border-t border-gray-100 pt-4 pb-6">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">⚙️ 5. Informações Exibidas</h3>
            
            <div className="space-y-2.5">
              {/* Store Name Customization */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Nome da Loja</span>
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={e => setShowStoreName(e.target.checked)}
                    className="accent-pink-500 scale-110"
                  />
                </div>
                {showStoreName && (
                  <input
                    type="text"
                    placeholder="Título no topo da etiqueta"
                    value={customStoreName}
                    onChange={e => setCustomStoreName(e.target.value)}
                    className="input text-xs h-9 min-h-0 py-1.5 bg-slate-50"
                  />
                )}
              </div>

              {/* Toggles */}
              {[
                { label: 'Mostrar Categoria do Produto', state: showCategory, setState: setShowCategory },
                { label: 'Mostrar Código de Barras (Mock)', state: showBarcode, setState: setShowBarcode },
                { label: 'Mostrar Código numérico do produto', state: showCode, setState: setShowCode },
                { label: 'Mostrar Preço Anterior (se houver Promo)', state: showOldPrice, setState: setShowOldPrice },
                { label: 'Mostrar tag decorativa de Promoção', state: showPromoBadge, setState: setShowPromoBadge }
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
