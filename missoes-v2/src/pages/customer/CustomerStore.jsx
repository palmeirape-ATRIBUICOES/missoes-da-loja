import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { STORE_MAP, formatCurrency, parseCurrency, nowHuman } from '../../utils/constants'

export default function CustomerStore() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { products, deliverySlotsAll, saveCustomerOrder, updateProductsStock, customerOrdersAll } = useStore()

  // Authentication check
  const [customer, setCustomer] = useState(null)
  useEffect(() => {
    const session = localStorage.getItem(`mdl_customer_${storeId}`)
    if (session) {
      setCustomer(JSON.parse(session))
    }
  }, [storeId])

  // Catalog State
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Checkout Flow State
  const [checkoutStep, setCheckoutStep] = useState('catalog') // 'catalog' | 'checkout' | 'payment'
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('pix') // 'pix' | 'cartao' | 'dinheiro'
  const [paymentLoading, setPaymentLoading] = useState(false)

  const storeEntry = Object.values(STORE_MAP).find(s => s.id === storeId) || STORE_MAP.loja_principal

  // Set default address when customer is loaded
  useEffect(() => {
    if (customer) {
      setDeliveryAddress(customer.address)
    }
  }, [customer])

  // Extract categories (only for in-stock products)
  const categories = useMemo(() => {
    const set = new Set()
    products.forEach(p => {
      const stock = p.stock !== undefined ? Number(p.stock) : 0
      if (stock > 0) {
        const parent = (p.category || '').split('>')[0]?.trim()
        if (parent) set.add(parent)
      }
    })
    return ['all', ...Array.from(set)]
  }, [products])

  // Filter products (exclude out of stock)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const stock = p.stock !== undefined ? Number(p.stock) : 0
      if (stock <= 0) return false

      const parentCat = (p.category || '').split('>')[0]?.trim() || 'Geral'
      const matchesCat = selectedCategory === 'all' || parentCat === selectedCategory
      const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
                            (p.description || '').toLowerCase().includes(search.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [products, selectedCategory, search])

  // Available Slots Filtered with capacity check
  const availableSlots = useMemo(() => {
    const fixedHours = [
      '06:00', '06:20', '06:40', '07:00', '07:30', '08:30', 
      '09:00', '09:30', '10:00', '11:00', '12:00', '13:00', 
      '14:00', '15:00', '15:30', '16:00', '16:30', '17:00'
    ]

    const slots = []
    const now = new Date()
    
    // Helper to get local date string YYYY-MM-DD
    const toLocalDateStr = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const todayStr = toLocalDateStr(now)
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toLocalDateStr(tomorrow)

    // 1. Generate slots for Today (only future times)
    fixedHours.forEach(time => {
      const [h, m] = time.split(':').map(Number)
      const slotTimeMs = new Date().setHours(h, m, 0, 0)
      const minDeliveryTimeMs = Date.now() + 30 * 60 * 1000 // now + 30 mins
      
      if (slotTimeMs >= minDeliveryTimeMs) {
        const label = `${formatDateBr(todayStr)} às ${time}`
        const count = (customerOrdersAll || []).filter(o => o.slotLabel === label && o.status !== 'cancelled').length
        slots.push({
          id: `today_${time}`,
          date: todayStr,
          timeStart: time,
          timeEnd: time,
          ordersCount: count,
          isFull: count >= 5,
          isToday: true
        })
      }
    })

    // 2. Generate slots for Tomorrow
    fixedHours.forEach(time => {
      const label = `${formatDateBr(tomorrowStr)} às ${time}`
      const count = (customerOrdersAll || []).filter(o => o.slotLabel === label && o.status !== 'cancelled').length
      slots.push({
        id: `tomorrow_${time}`,
        date: tomorrowStr,
        timeStart: time,
        timeEnd: time,
        ordersCount: count,
        isFull: count >= 5,
        isToday: false
      })
    })

    return slots
  }, [customerOrdersAll])

  // Cart operations
  function addToCart(product) {
    if (!customer) {
      alert('Para adicionar itens ao carrinho, é necessário fazer login ou cadastrar-se!')
      navigate(`/cliente/${storeId}/login`)
      return
    }

    const stockAvailable = product.stock !== undefined ? Number(product.stock) : 0
    if (stockAvailable <= 0) {
      alert('Desculpe, este produto está temporariamente esgotado.')
      return
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= stockAvailable) {
          alert(`Limite de estoque atingido! Temos apenas ${stockAvailable} unidades disponíveis deste item.`)
          return prev
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      const price = parseCurrency(product.promoPrice || product.price || product.oldPrice)
      return [...prev, { ...product, price, quantity: 1 }]
    })
  }

  function updateQuantity(id, delta) {
    const product = products.find(p => p.id === id)
    const stockAvailable = product?.stock !== undefined ? Number(product.stock) : 0

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQ = item.quantity + delta
        if (delta > 0 && nextQ > stockAvailable) {
          alert(`Limite de estoque atingido! Temos apenas ${stockAvailable} unidades disponíveis deste item.`)
          return item
        }
        return nextQ > 0 ? { ...item, quantity: nextQ } : item
      }
      return item
    }).filter(Boolean))
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [cart])

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  function handleLogout() {
    localStorage.removeItem(`mdl_customer_${storeId}`)
    navigate(`/cliente/${storeId}/login`)
  }

  function formatDateBr(dateStr) {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  async function handleConfirmOrder() {
    if (!deliveryAddress.trim()) {
      alert('Por favor, informe o endereço de entrega.')
      return
    }
    if (!selectedSlot) {
      alert('Por favor, selecione um horário de entrega disponível.')
      return
    }

    setPaymentLoading(true)

    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const slotLabel = `${formatDateBr(selectedSlot.date)} às ${selectedSlot.timeStart}`
      
      const finalOrder = {
        id: orderId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        condo: customer.condo || 'none',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          photo: item.photo || ''
        })),
        total: cartTotal,
        paymentMethod,
        paymentStatus: 'pending',
        slotId: selectedSlot.id,
        slotLabel,
        deliveryAddress: deliveryAddress.trim(),
        status: 'pending',
        createdAt: Date.now(),
        createdAtHuman: nowHuman()
      }

      await saveCustomerOrder(finalOrder)
      await updateProductsStock(cart, false)

      // Clear cart
      setCart([])
      setCheckoutStep('catalog')
      setSelectedSlot(null)

      // Redirect to tracking page
      navigate(`/cliente/${storeId}/pedido/${orderId}`)
    } catch (err) {
      console.error(err)
      alert('Erro ao registrar o pedido. Tente novamente.')
    }
    setPaymentLoading(false)
  }



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-1.5">
            <span>🏪</span> {storeEntry.shortName}
          </h2>
          <p className="text-xs text-gray-500">Olá, {customer ? customer.name.split(' ')[0] : 'Visitante'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {checkoutStep === 'catalog' && (
            <button onClick={() => setIsCartOpen(true)} className="relative w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-600 flex items-center justify-center text-lg active:scale-95 transition-all">
              🛒
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-scale-in">
                  {cartItemsCount}
                </span>
              )}
            </button>
          )}

          <a
            href={`https://wa.me/${storeEntry.whatsapp || '5521964422488'}?text=Olá,%20gostaria%20de%20falar%20com%20a%20padaria.`}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center text-lg active:scale-95 transition-all"
            title="Falar com a Padaria"
          >
            💬
          </a>

          {customer ? (
            <button onClick={handleLogout} className="text-xs bg-gray-100 hover:bg-gray-200 font-bold px-3 py-2 rounded-xl text-gray-600 active:scale-95 transition-all font-sans">
              Sair
            </button>
          ) : (
            <button onClick={() => navigate(`/cliente/${storeId}/login`)} className="text-xs bg-brand-500 hover:bg-brand-600 text-white font-bold px-3 py-2 rounded-xl active:scale-95 transition-all font-sans">
              Entrar
            </button>
          )}
        </div>
      </header>

      {checkoutStep === 'catalog' && (
        <>
          {/* Categories bar */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all select-none
                  ${selectedCategory === cat ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat === 'all' ? '🏷️ Todos' : cat}
              </button>
            ))}
          </div>

          <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="O que você está procurando hoje?"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-10 h-12 text-sm bg-white shadow-sm border-gray-100 focus:border-brand-300"
              />
            </div>

            {/* Products List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <span className="text-4xl">🍞</span>
                  <p className="mt-2 font-bold">Nenhum produto encontrado</p>
                </div>
              ) : (
                filteredProducts.map(p => {
                  const price = parseCurrency(p.promoPrice || p.price || p.oldPrice)
                  const hasPromo = p.oldPrice && p.promoPrice
                  const stock = p.stock !== undefined ? Number(p.stock) : 0
                  const isOutOfStock = stock <= 0

                  return (
                    <div key={p.id} className={`card p-3 flex flex-col justify-between hover:shadow-md transition-shadow relative bg-white border border-gray-100 rounded-3xl
                      ${isOutOfStock ? 'opacity-60' : ''}`}>
                      
                      {p.photo ? (
                        <div className="h-32 w-full flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden p-2 relative">
                          <img src={p.photo} alt={p.name} className="max-h-full max-w-full object-contain" />
                          {isOutOfStock && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-black uppercase tracking-wider rounded-2xl select-none">Esgotado</span>
                          )}
                        </div>
                      ) : (
                        <div className="h-32 w-full flex items-center justify-center bg-gray-100 rounded-2xl text-4xl relative">
                          🍞
                          {isOutOfStock && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-black uppercase tracking-wider rounded-2xl select-none">Esgotado</span>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-extrabold text-gray-900 text-sm line-clamp-2 leading-snug">{p.name}</h4>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{p.description || 'Sem descrição'}</p>
                          <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1
                            ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {stock > 0 ? `Estoque: ${stock} un` : 'Esgotado'}
                          </span>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between gap-1.5">
                          <div>
                            {hasPromo && (
                              <span className="text-[10px] text-gray-400 line-through block leading-none">{formatCurrency(p.oldPrice)}</span>
                            )}
                            <span className="font-black text-brand-600 text-sm">{formatCurrency(price)}</span>
                          </div>
                          
                          <button onClick={() => addToCart(p)} disabled={isOutOfStock}
                            className={`w-9 h-9 rounded-xl font-black text-lg flex items-center justify-center active:scale-90 transition-all shadow-sm
                              ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </main>

          {/* Cart Drawer Modal */}
          {isCartOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
              <div className="bg-white max-w-md w-full h-full p-5 flex flex-col justify-between shadow-2xl animate-slide-left">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">🛒 Seu Carrinho</h3>
                    <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90">✕</button>
                  </div>

                  <div className="mt-4 divide-y divide-gray-100 overflow-y-auto max-h-[60vh] pr-1">
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <span className="text-4xl">🛒</span>
                        <p className="mt-2 font-bold">Seu carrinho está vazio</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-3">
                          <div className="flex items-center gap-3">
                            {item.photo ? (
                              <img src={item.photo} alt="" className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">🍞</div>
                            )}
                            <div>
                              <h5 className="font-bold text-gray-950 text-sm line-clamp-1">{item.name}</h5>
                              <span className="text-xs text-gray-500 font-semibold">{formatCurrency(item.price)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 font-black text-sm active:scale-90">-</button>
                            <span className="font-black text-sm text-gray-800 w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 font-black text-sm active:scale-90">+</button>
                            <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 hover:text-red-600 font-bold ml-2">Remover</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="font-bold text-gray-500">Valor dos produtos</span>
                    <span className="font-black text-gray-900 text-lg">{formatCurrency(cartTotal)}</span>
                  </div>

                  <button
                    disabled={cart.length === 0}
                    onClick={() => {
                      setIsCartOpen(false)
                      setCheckoutStep('checkout')
                    }}
                    className="btn btn-primary w-full h-14 rounded-2xl font-bold text-base shadow-lg"
                  >
                    🚀 Finalizar Pedido
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Cart Button for Mobile */}
          {cartItemsCount > 0 && !isCartOpen && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-10 animate-slide-up">
              <button onClick={() => setIsCartOpen(true)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg active:scale-98 transition-all font-bold">
                <span className="flex items-center gap-2">
                  <span>🛒 Ver Carrinho</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-black">{cartItemsCount}</span>
                </span>
                <span>{formatCurrency(cartTotal)} →</span>
              </button>
            </div>
          )}
        </>
      )}

      {checkoutStep === 'checkout' && (
        <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-5 overflow-y-auto animate-slide-up">
          <button onClick={() => setCheckoutStep('catalog')} className="text-sm text-brand-600 font-extrabold mb-2 flex items-center gap-1">
            ← Voltar para a Loja
          </button>

          <h3 className="text-xl font-black text-gray-900">Finalizar sua Compra</h3>

          {/* Delivery Address */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h4 className="font-extrabold text-gray-950 text-sm flex items-center gap-1.5">📍 Endereço de Entrega</h4>
            <textarea
              required
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Rua, número, complemento, ponto de referência..."
              className="input min-h-[90px] py-2 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
            />
          </div>

          {/* Delivery Slots Selection */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h4 className="font-extrabold text-gray-950 text-sm flex items-center gap-1.5">📅 Escolha o Horário de Entrega</h4>
            
            {availableSlots.length === 0 ? (
              <div className="text-center py-6 text-red-500 font-bold text-xs bg-red-50 rounded-2xl border border-red-100">
                ⚠️ A loja não possui horários de entrega ativos disponíveis para hoje/futuro. Entre em contato com a gerência.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.map(slot => {
                  const isSelected = selectedSlot?.id === slot.id
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={slot.isFull}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-2xl border border-gray-200 text-left transition-all relative
                        ${slot.isFull ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : isSelected ? 'border-brand-500 bg-brand-50/40 text-brand-950 active:scale-98' : 'bg-white hover:border-gray-300 text-gray-700 active:scale-98'}`}
                    >
                      <div className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wide">
                        {slot.isToday ? 'Hoje' : 'Amanhã'} ({formatDateBr(slot.date).substring(0, 5)})
                      </div>
                      <div className="text-xs text-gray-900 mt-1 font-extrabold flex items-center justify-between">
                        <span>⏰ {slot.timeStart}</span>
                        {slot.isFull && <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-black uppercase tracking-wide">Cheio</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h4 className="font-extrabold text-gray-950 text-sm flex items-center gap-1.5">💳 Forma de Pagamento (No Recebimento)</h4>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-3 rounded-2xl border-2 font-bold text-xs text-center transition-all active:scale-98 flex flex-col items-center gap-1
                  ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                <span className="text-lg">⚡</span>
                <span>PIX</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`py-3 rounded-2xl border-2 font-bold text-xs text-center transition-all active:scale-98 flex flex-col items-center gap-1
                  ${paymentMethod === 'cartao' ? 'border-indigo-500 bg-indigo-50/30 text-indigo-950' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                <span className="text-lg">💳</span>
                <span>Cartão</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`py-3 rounded-2xl border-2 font-bold text-xs text-center transition-all active:scale-98 flex flex-col items-center gap-1
                  ${paymentMethod === 'dinheiro' ? 'border-amber-500 bg-amber-50/30 text-amber-950' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                <span className="text-lg">💵</span>
                <span>Dinheiro</span>
              </button>
            </div>
          </div>

          {/* Summary of Order */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h4 className="font-extrabold text-gray-950 text-sm">Resumo do Pedido</h4>
            <div className="flex justify-between items-center text-base">
              <span className="font-bold text-gray-500">Total do Pedido</span>
              <span className="font-black text-emerald-600 text-xl">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={paymentLoading}
            className="btn btn-primary w-full h-14 rounded-2xl font-bold text-base shadow-lg transition-all"
          >
            {paymentLoading ? '⏳ Enviando Pedido...' : '🚀 Confirmar e Enviar Pedido'}
          </button>
        </main>
      )}
    </div>
  )
}
