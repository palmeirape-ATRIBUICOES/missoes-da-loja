import { useState, useMemo, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, parseCurrency, nowHuman } from '../../utils/constants'
import { printReceipt } from '../../services/printer'
import Checkout from './Checkout'
import ShiftClose from './ShiftClose'
import CashOps from './CashOps'

export default function PDV() {
  const { currentUser, store, logout } = useAuth()
  const { products, savePdvSale, pdvSales } = useStore()

  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('TODOS')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showShift, setShowShift] = useState(false)
  const [showCashOps, setShowCashOps] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const searchRef = useRef(null)

  // Categories from products
  const categories = useMemo(() => {
    const cats = new Set()
    products.forEach(p => { if (p.category) cats.add(p.category.toUpperCase()) })
    return ['TODOS', ...Array.from(cats).sort()]
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.name && (p.price || p.oldPrice))
    if (activeCategory !== 'TODOS') {
      list = list.filter(p => (p.category || '').toUpperCase() === activeCategory)
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
  }, [products, activeCategory, searchQuery])

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
        unit: product.fractioned ? 'kg' : 'un'
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
          <div className="p-3 bg-white border-b border-gray-200 shrink-0">
            <div className="relative">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm active:scale-90">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-thin bg-gray-50 border-b border-gray-200 shrink-0">
            {categories.map(cat => (
              <button key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`pdv-cat-tab ${activeCategory === cat ? 'active' : ''}`}>
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
                      className="pdv-product-btn">
                      <span className="text-xs font-bold truncate w-full">{p.name}</span>
                      <span className="text-brand-700 font-extrabold text-sm">
                        {formatCurrency(price)}
                      </span>
                      {p.promoPrice && p.oldPrice && (
                        <span className="text-[10px] text-red-400 line-through">
                          {formatCurrency(p.oldPrice)}
                        </span>
                      )}
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
                <div key={idx} className="cart-item animate-fade-in">
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
    </div>
  )
}
