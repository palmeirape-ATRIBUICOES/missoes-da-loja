import { useState, useMemo, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, parseCurrency, nowHuman } from '../../utils/constants'
import { printReceipt } from '../../services/printer'
import Checkout from './Checkout'
import ShiftClose from './ShiftClose'
import CashOps from './CashOps'

export default function PDV() {
  const { currentUser, store, logout, isManager } = useAuth()
  const { products, savePdvSale, pdvSales, employees, saveProduct } = useStore()

  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryPath, setCategoryPath] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showShift, setShowShift] = useState(false)
  const [showCashOps, setShowCashOps] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const searchRef = useRef(null)

  // Printer Enable State (Persisted)
  const [printReceiptEnabled, setPrintReceiptEnabled] = useState(() => {
    try {
      const val = localStorage.getItem('mdl_v2_print_enabled')
      return val !== 'false'
    } catch { return true }
  })

  // Quick Product Modal States
  const [showQuickProduct, setShowQuickProduct] = useState(false)
  const [qpName, setQpName] = useState('')
  const [qpPrice, setQpPrice] = useState('')
  const [qpCode, setQpCode] = useState('')
  const [qpParentCategory, setQpParentCategory] = useState('')
  const [qpSubCategory, setQpSubCategory] = useState('')
  const [qpIsNewParent, setQpIsNewParent] = useState(false)
  const [qpIsNewSub, setQpIsNewSub] = useState(false)
  const [qpLoading, setQpLoading] = useState(false)
  const [qpPhoto, setQpPhoto] = useState('')
  const [searchingImages, setSearchingImages] = useState(false)
  const [imageResults, setImageResults] = useState([])
  const [showImageSearchModal, setShowImageSearchModal] = useState(false)
  const [imageSearchQuery, setImageSearchQuery] = useState('')

  async function handleSearchProductImage(query) {
    if (!query || !query.trim()) return
    setImageSearchQuery(query.trim())
    setShowImageSearchModal(true)
    await searchGoogleImages(query.trim())
  }

  async function searchGoogleImages(queryText) {
    const fullQuery = encodeURIComponent(queryText + " png fundo branco")
    const searchUrl = `https://duckduckgo.com/?q=${fullQuery}`
    
    const proxies = [
      url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ]

    setSearchingImages(true)
    setImageResults([])

    for (let proxyFn of proxies) {
      try {
        const htmlRes = await fetch(proxyFn(searchUrl))
        if (!htmlRes.ok) continue
        const html = await htmlRes.text()

        const vqdRegex = /vqd=['"]([^'"]+)['"]/
        const match = html.match(vqdRegex)
        if (!match) continue
        const vqd = match[1]

        const apiUrl = `https://duckduckgo.com/i.js?q=${fullQuery}&vqd=${vqd}&o=json`
        const apiRes = await fetch(proxyFn(apiUrl))
        if (!apiRes.ok) continue
        const data = await apiRes.json()

        if (data.results && data.results.length > 0) {
          const results = data.results.slice(0, 15).map(item => ({
            url: item.image,
            thumbnail: item.thumbnail,
            title: item.title
          }))
          setImageResults(results)
          setSearchingImages(false)
          return
        }
      } catch (e) {
        console.error("Proxy error, trying next...", e)
      }
    }

    setSearchingImages(false)
  }

  // Extract unique parent categories
  const parentCategories = useMemo(() => {
    const set = new Set()
    products.forEach(p => {
      const parts = (p.category || '').split('>').map(s => s.trim()).filter(Boolean)
      if (parts[0]) set.add(parts[0])
    })
    return Array.from(set).sort()
  }, [products])

  // Get subcategories for a given parent
  const subcategoriesForParent = (parentName) => {
    if (!parentName) return []
    const set = new Set()
    products.forEach(p => {
      const parts = (p.category || '').split('>').map(s => s.trim()).filter(Boolean)
      if (parts[0]?.toUpperCase() === parentName.toUpperCase() && parts[1]) {
        set.add(parts[1])
      }
    })
    return Array.from(set).sort()
  }

  // Pre-fill categories when opening
  const handleOpenQuickProduct = () => {
    setQpName('')
    setQpPrice('')
    setQpCode('')
    setQpPhoto('')
    
    if (categoryPath[0]) {
      const matchedParent = parentCategories.find(p => p.toUpperCase() === categoryPath[0].toUpperCase()) || categoryPath[0]
      setQpParentCategory(matchedParent)
      setQpIsNewParent(false)
      
      if (categoryPath[1]) {
        const subs = subcategoriesForParent(matchedParent)
        const matchedSub = subs.find(s => s.toUpperCase() === categoryPath[1].toUpperCase()) || categoryPath[1]
        setQpSubCategory(matchedSub)
        setQpIsNewSub(false)
      } else {
        setQpSubCategory('')
        setQpIsNewSub(false)
      }
    } else {
      setQpParentCategory('')
      setQpSubCategory('')
      setQpIsNewParent(false)
      setQpIsNewSub(false)
    }
    setShowQuickProduct(true)
  }

  const currentEmp = employees.find(e => e.name === currentUser)
  const canCreateProduct = isManager || currentEmp?.canEditPrices

  function togglePrintReceipt() {
    setPrintReceiptEnabled(prev => {
      const next = !prev
      try {
        localStorage.setItem('mdl_v2_print_enabled', String(next))
      } catch (e) { console.error(e) }
      return next
    })
  }

  async function handleQuickProductSubmit(e) {
    e.preventDefault()
    if (!qpName.trim() || !qpPrice.trim()) {
      alert('Nome e Preço são obrigatórios!')
      return
    }

    const priceNum = parseCurrency(qpPrice)
    const finalCategory = [qpParentCategory.trim(), qpSubCategory.trim()].filter(Boolean).join(' > ')

    const newProduct = {
      name: qpName.trim(),
      price: priceNum,
      code: qpCode.trim(),
      category: finalCategory || 'Geral',
      photo: qpPhoto || ''
    }

    try {
      setQpLoading(true)
      await saveProduct(newProduct)
      
      // Clear form
      setQpName('')
      setQpPrice('')
      setQpCode('')
      setQpPhoto('')
      setQpParentCategory('')
      setQpSubCategory('')
      setQpIsNewParent(false)
      setQpIsNewSub(false)
      setShowQuickProduct(false)
      
      alert('Produto cadastrado com sucesso!')
    } catch (err) {
      console.error(err)
      alert('Erro ao cadastrar produto.')
    } finally {
      setQpLoading(false)
    }
  }

  const getParts = (cat) => (cat || '').toUpperCase().split('>').map(s => s.trim()).filter(Boolean)

  const subcategories = useMemo(() => {
    const cats = new Set()
    products.forEach(p => {
      const parts = getParts(p.category)
      const matchesPath = categoryPath.every((pathPart, idx) => parts[idx] === pathPart)
      if (matchesPath) {
        const nextLevelCat = parts[categoryPath.length]
        if (nextLevelCat) cats.add(nextLevelCat)
      }
    })
    return Array.from(cats).sort()
  }, [products, categoryPath])

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.name && (p.price || p.oldPrice))
    
    if (categoryPath.length > 0) {
      list = list.filter(p => {
        const parts = getParts(p.category)
        return categoryPath.every((pathPart, idx) => parts[idx] === pathPart)
      })
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    }
    return list.slice(0, 60)
  }, [products, categoryPath, searchQuery])

  // Cart helpers
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  function addToCart(product) {
    const price = parseCurrency(product.promoPrice || product.price || product.oldPrice)
    if (!price) return

    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price,
        qty: 1,
        unit: product.fractioned ? 'kg' : 'un',
        photo: product.photo || ''
      }]
    })
  }

  function updateCartQty(idx, delta) {
    setCart(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], qty: Math.max(0, next[idx].qty + delta) }
      return next.filter(i => i.qty > 0)
    })
  }

  function removeCartItem(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  function clearCart() {
    setCart([])
  }

  async function finalizeSale(paymentMethod, amountPaid, change) {
    const saleData = {
      items: [...cart],
      total: cartTotal,
      paymentMethod,
      amountPaid,
      change,
      cashier: currentUser,
      itemCount: cartCount
    }
    await savePdvSale(saleData)
    setLastSale(saleData)

    // Auto-print receipt
    if (printReceiptEnabled) {
      try {
        printReceipt({
          storeName: store.name,
          cashier: currentUser,
          items: saleData.items,
          total: saleData.total,
          paymentMethod,
          amountPaid: saleData.amountPaid,
          change: saleData.change
        })
      } catch (e) { console.error('Print error:', e) }
    }

    clearCart()
    setShowCheckout(false)
  }

  function reprintLastReceipt() {
    if (!lastSale) return
    printReceipt({
      storeName: store.name,
      cashier: lastSale.cashier,
      items: lastSale.items,
      total: lastSale.total,
      paymentMethod: lastSale.paymentMethod,
      amountPaid: lastSale.amountPaid,
      change: lastSale.change
    })
  }

  if (showCheckout) {
    return <Checkout cart={cart} total={cartTotal} onFinalize={finalizeSale} onBack={() => setShowCheckout(false)} />
  }

  if (showShift) {
    return <ShiftClose onBack={() => setShowShift(false)} />
  }

  if (showCashOps) {
    return <CashOps onBack={() => setShowCashOps(false)} />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 select-none overflow-hidden">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0 no-print"
        style={{ minHeight: 56 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            🎯
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">PDV — {store.shortName}</div>
            <div className="text-xs text-gray-500">Caixa: {currentUser}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</div>
            <div className="text-xs font-semibold text-brand-600">{pdvSales.length} vendas hoje</div>
          </div>

          <button onClick={() => setShowMenu(!showMenu)}
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg">
            ☰
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-4 top-14 z-50 bg-white rounded-2xl shadow-elevated border border-gray-200 p-2 w-56 animate-slide-up">
              <button onClick={() => { setShowMenu(false); setShowShift(true) }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-semibold flex items-center gap-3 active:scale-95 transition-all">
                📊 Fechamento de Turno
              </button>
              <button onClick={() => { setShowMenu(false); reprintLastReceipt() }}
                disabled={!lastSale}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 active:scale-95 transition-all
                  ${lastSale ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}>
                🧾 Reimprimir Último Cupom
              </button>
              <button onClick={() => { setShowMenu(false); setShowCashOps(true) }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-semibold flex items-center gap-3 active:scale-95 transition-all">
                💰 Suprimento / Sangria
              </button>
              <div className="border-t my-1" />
              <div className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 text-sm font-semibold cursor-pointer active:scale-98 transition-all"
                onClick={togglePrintReceipt}>
                <span className="flex items-center gap-3">🖨️ Impressora Ativa</span>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${printReceiptEnabled ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300" />
                </div>
              </div>
              <div className="border-t my-1" />
              <button onClick={logout}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-sm font-semibold flex items-center gap-3 text-red-600 active:scale-95 transition-all">
                🚪 Sair do Caixa
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 bg-white border-b border-gray-200 shrink-0 flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar produto por nome ou código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-10 text-base"
                style={{ minHeight: 52 }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
                  className="absolute right-[12px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm active:scale-90">
                  ✕
                </button>
              )}
            </div>
            
            {canCreateProduct && (
              <button onClick={handleOpenQuickProduct}
                className="btn btn-primary h-[52px] px-4 font-bold text-sm shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md active:scale-95 transition-all">
                📦 <span className="hidden sm:inline">+ Novo</span>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-thin bg-gray-50 border-b border-gray-200 shrink-0 items-center">
            <button onClick={() => setCategoryPath([])} 
              className={`pdv-cat-tab ${categoryPath.length === 0 ? 'active' : ''}`}>
              TODOS
            </button>
            
            {categoryPath.map((pathPart, idx) => (
              <div key={`path-${idx}`} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-bold">›</span>
                <button 
                  onClick={() => setCategoryPath(categoryPath.slice(0, idx + 1))}
                  className={`pdv-cat-tab ${idx === categoryPath.length - 1 && subcategories.length === 0 ? 'active' : 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                  {pathPart}
                </button>
              </div>
            ))}

            {subcategories.length > 0 && categoryPath.length > 0 && (
               <span className="text-gray-400 text-sm font-bold ml-1 mr-1">›</span>
            )}

            {subcategories.map(cat => (
              <button key={`sub-${cat}`}
                onClick={() => setCategoryPath(prev => [...prev, cat])}
                className="pdv-cat-tab">
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="font-semibold">Nenhum produto encontrado</div>
                  <div className="text-sm mt-1">Cadastre produtos no painel de gestão</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {filteredProducts.map(p => {
                  const price = parseCurrency(p.promoPrice || p.price || p.oldPrice)
                  return (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="pdv-product-btn" style={{ minHeight: p.photo ? '120px' : '80px', justifyContent: p.photo ? 'space-between' : 'center' }}>
                      {p.photo && (
                        <div className="w-full h-14 flex items-center justify-center shrink-0 mb-1">
                          <img src={p.photo} alt={p.name} className="max-h-full max-w-full object-contain rounded-md" />
                        </div>
                      )}
                      <div className="flex flex-col items-center w-full min-w-0 mt-auto">
                        <span className="text-[11px] font-bold truncate w-full">{p.name}</span>
                        <span className="text-brand-700 font-extrabold text-sm leading-none mt-1">
                          {formatCurrency(price)}
                        </span>
                        {p.promoPrice && p.oldPrice && (
                          <span className="text-[10px] text-red-400 line-through mt-0.5">
                            {formatCurrency(p.oldPrice)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart Panel */}
        <div className="w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm">Carrinho</div>
              <div className="text-xs text-gray-500">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</div>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart}
                className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-lg bg-red-50 active:scale-95 transition-all">
                Limpar
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">🛒</div>
                  <div className="text-sm font-medium">Carrinho vazio</div>
                  <div className="text-xs mt-1">Toque nos produtos para adicionar</div>
                </div>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="cart-item animate-fade-in gap-3">
                  {item.photo ? (
                    <img src={item.photo} alt="" className="w-10 h-10 object-contain rounded-md bg-white border border-gray-100 shrink-0 p-0.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-xl shrink-0">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(item.price)} / {item.unit}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateCartQty(idx, -1)}
                      className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-lg active:scale-90 transition-all">
                      −
                    </button>
                    <span className="w-8 text-center font-bold text-gray-900">{item.qty}</span>
                    <button onClick={() => updateCartQty(idx, 1)}
                      className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg active:scale-90 transition-all">
                      +
                    </button>
                    <span className="font-bold text-sm text-gray-900 w-20 text-right">
                      {formatCurrency(item.price * item.qty)}
                    </span>
                    <button onClick={() => removeCartItem(idx)}
                      className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center text-sm active:scale-90">
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t border-gray-200 p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600">TOTAL</span>
              <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(cartTotal)}</span>
            </div>
            <button onClick={() => cart.length > 0 && setShowCheckout(true)}
              disabled={cart.length === 0}
              className={`w-full h-16 rounded-2xl text-lg font-extrabold transition-all active:scale-[0.97]
                ${cart.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              💳 FINALIZAR VENDA
            </button>
          </div>
        </div>
      </div>
      {/* Quick Product Modal */}
      {showQuickProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 max-w-md w-full p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">📦 Cadastro Rápido</h3>
              <button onClick={() => setShowQuickProduct(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90 text-sm">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleQuickProductSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pão de Queijo"
                  value={qpName}
                  onChange={e => setQpName(e.target.value)}
                  className="input text-sm h-11 min-h-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Preço (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5,50"
                    value={qpPrice}
                    onChange={e => setQpPrice(e.target.value)}
                    className="input text-sm h-11 min-h-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Código / Barras</label>
                  <input
                    type="text"
                    placeholder="Ex: 789012345"
                    value={qpCode}
                    onChange={e => setQpCode(e.target.value)}
                    className="input text-sm h-11 min-h-0"
                  />
                </div>
              </div>

              {/* Nested Subcategories Selector/Creator */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">📂 Categorização do Produto</span>
                
                {/* Parent Category Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Categoria Principal</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQpIsNewParent(!qpIsNewParent)
                        setQpParentCategory('')
                        setQpSubCategory('')
                      }}
                      className="text-[10px] text-brand-600 font-bold hover:underline"
                    >
                      {qpIsNewParent ? '📂 Escolher Existente' : '➕ Nova Categoria'}
                    </button>
                  </div>
                  
                  {qpIsNewParent ? (
                    <input
                      type="text"
                      required
                      placeholder="Ex: Biscoitos, Bebidas"
                      value={qpParentCategory}
                      onChange={e => setQpParentCategory(e.target.value)}
                      className="input text-sm h-10 min-h-0 bg-white"
                    />
                  ) : (
                    <select
                      value={qpParentCategory}
                      onChange={e => {
                        setQpParentCategory(e.target.value)
                        setQpSubCategory('')
                      }}
                      className="input text-sm h-10 min-h-0 bg-white"
                    >
                      <option value="">-- Sem Categoria (Geral) --</option>
                      {parentCategories.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Subcategory Row (Enabled if parent is selected or being typed) */}
                {qpParentCategory && (
                  <div className="space-y-1 animate-slide-up">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Subcategoria (Dentro de {qpParentCategory})</label>
                      <button
                        type="button"
                        onClick={() => {
                          setQpIsNewSub(!qpIsNewSub)
                          setQpSubCategory('')
                        }}
                        className="text-[10px] text-brand-600 font-bold hover:underline"
                      >
                        {qpIsNewSub ? '📂 Escolher Existente' : '➕ Nova Subcategoria'}
                      </button>
                    </div>

                    {qpIsNewSub ? (
                      <input
                        type="text"
                        required
                        placeholder="Ex: Piraquê, Bauducco"
                        value={qpSubCategory}
                        onChange={e => setQpSubCategory(e.target.value)}
                        className="input text-sm h-10 min-h-0 bg-white"
                      />
                    ) : (
                      <select
                        value={qpSubCategory}
                        onChange={e => setQpSubCategory(e.target.value)}
                        className="input text-sm h-10 min-h-0 bg-white"
                      >
                        <option value="">-- Sem Subcategoria --</option>
                        {subcategoriesForParent(qpParentCategory).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              {/* Photo Input & Preview */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase">Foto do Produto</label>
                  {qpName && (
                    <button
                      type="button"
                      onClick={() => handleSearchProductImage(qpName)}
                      className="text-xs text-brand-600 font-extrabold hover:underline flex items-center gap-1 active:scale-95 transition-all"
                    >
                      🔍 Buscar no Google
                    </button>
                  )}
                </div>

                {qpPhoto ? (
                  <div className="relative rounded-2xl border border-green-200 bg-green-50/20 p-3 flex flex-col items-center justify-center gap-1.5 group transition-all">
                    <button 
                      type="button"
                      onClick={() => setQpPhoto('')} 
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition-all shadow-sm text-xs">
                      ✕
                    </button>
                    <img src={qpPhoto} alt="Produto" className="h-20 w-auto object-contain rounded-lg shadow-sm bg-white p-0.5" />
                    <span className="text-[10px] text-green-700 font-semibold flex items-center gap-1">✨ Foto adicionada!</span>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Cole o link da foto ou busque no Google..." 
                    value={qpPhoto}
                    onChange={e => setQpPhoto(e.target.value)}
                    className="input text-xs h-10 min-h-0 bg-white" 
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuickProduct(false)}
                  className="btn btn-ghost flex-1 text-sm rounded-xl font-bold h-11 min-h-0">
                  Cancelar
                </button>
                <button type="submit" disabled={qpLoading}
                  className="btn btn-primary flex-1 text-sm rounded-xl font-bold h-11 min-h-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 shadow-md">
                  {qpLoading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Image Search Modal */}
      {showImageSearchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 max-w-lg w-full p-6 space-y-4 animate-slide-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">🔍 Imagens do Google (PNG sem Fundo)</h3>
              <button onClick={() => setShowImageSearchModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90 text-sm">
                ✕
              </button>
            </div>

            {/* Search input field to refine query */}
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Nome do produto para buscar..."
                value={imageSearchQuery}
                onChange={e => setImageSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchGoogleImages(imageSearchQuery)}
                className="input flex-1 text-sm h-11 min-h-0"
              />
              <button
                type="button"
                onClick={() => searchGoogleImages(imageSearchQuery)}
                disabled={searchingImages || !imageSearchQuery.trim()}
                className="btn btn-primary px-4 font-bold text-sm h-11 min-h-0"
              >
                {searchingImages ? '⏳' : 'Buscar'}
              </button>
            </div>

            {/* Results area */}
            <div className="flex-1 overflow-y-auto min-h-[250px] p-1">
              {searchingImages ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 gap-3">
                  <div className="animate-spin text-3xl">⏳</div>
                  <div className="text-sm font-semibold animate-pulse text-brand-600">Buscando imagens PNG com fundo branco...</div>
                </div>
              ) : imageResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                  <span className="text-3xl mb-1">🖼️</span>
                  <span className="text-sm">Nenhuma imagem encontrada.</span>
                  <span className="text-xs text-gray-400 mt-1">Experimente alterar a palavra de busca acima.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {imageResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQpPhoto(item.url)
                        setShowImageSearchModal(false)
                      }}
                      className="group relative border border-gray-200 hover:border-brand-500 rounded-xl overflow-hidden bg-white p-1 hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 aspect-square"
                    >
                      <img
                        src={item.thumbnail || item.url}
                        alt=""
                        className="max-h-full max-w-full object-contain bg-white rounded-lg p-0.5"
                        onError={(e) => { e.target.src = 'https://placehold.co/100?text=Indispon%C3%ADvel' }}
                      />
                      <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">✓ Selecionar</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-400 text-center shrink-0 border-t pt-2">
              As buscas são focadas em arquivos PNG de alta definição com fundo branco para garantir um visual limpo em suas etiquetas e PDV.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
