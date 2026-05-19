import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, parseCurrency } from '../../utils/constants'
import { printLabels } from '../../services/printer'

export default function Products({ onBack }) {
  const { isManager } = useAuth()
  const { products, saveProduct, deleteProduct } = useStore()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '' })
  const [showForm, setShowForm] = useState(false)
  
  // Barcode & Labels state
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState([])
  const [printConfig, setPrintConfig] = useState({ widthMm: 40, heightMm: 25, fontSizePx: 20 })

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }, [products, search])

  function resetForm() {
    setForm({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '' })
    setEditing(null)
    setShowForm(false)
  }

  function startEdit(product) {
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      promoPrice: product.promoPrice || '',
      category: product.category || '',
      code: product.code || ''
    })
    setEditing(product.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const product = {
      ...(editing ? { id: editing } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price,
      oldPrice: form.oldPrice,
      promoPrice: form.promoPrice,
      category: form.category.trim(),
      code: form.code.trim()
    }
    await saveProduct(product)
    resetForm()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
  }

  async function handleBarcodeSearch() {
    if (!form.code) return
    setLoadingBarcode(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${form.code}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        setForm(f => ({
          ...f,
          name: f.name || data.product.product_name_pt || data.product.product_name || f.name,
          category: f.category || (data.product.categories?.split(',')[0]) || f.category
        }))
      } else {
        alert('Produto não encontrado no banco de dados público.')
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingBarcode(false)
  }

  function togglePrintSelection(product) {
    if (selectedForPrint.find(p => p.id === product.id)) {
      setSelectedForPrint(prev => prev.filter(p => p.id !== product.id))
    } else {
      setSelectedForPrint(prev => [...prev, product])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">📦 Produtos</div>
            <div className="text-xs text-gray-500">{products.length} cadastrados</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button onClick={() => {
              if (selectedForPrint.length === 0) {
                alert('Selecione os produtos marcando a caixinha (☑) na lista abaixo primeiro!')
              } else {
                setShowPrintModal(true)
              }
            }} className={`btn text-sm font-bold px-3 ${selectedForPrint.length > 0 ? 'bg-brand-100 text-brand-700 border-0' : 'btn-ghost text-gray-500'}`}>
              🖨️ Imprimir ({selectedForPrint.length})
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="btn btn-primary text-sm px-3">
            + Novo
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar produto ou selecionar para etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editing ? '✏️ Editar Produto' : '➕ Novo Produto'}</h3>
              <button onClick={resetForm} className="text-sm text-gray-500 font-semibold">Cancelar</button>
            </div>
            
            <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-2">
              <input className="input flex-1 bg-white" placeholder="Código de barras" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()} />
              <button onClick={handleBarcodeSearch} disabled={loadingBarcode || !form.code} 
                className="btn btn-primary shrink-0">
                {loadingBarcode ? '⏳' : '🔍 Buscar'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" placeholder="Nome do produto *" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              <div className="relative">
                <input className="input" list="categorias" placeholder="Categoria (ex: Bebidas)" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                <datalist id="categorias">
                  <option value="Bebidas" />
                  <option value="Doces" />
                  <option value="Eletrônicos" />
                  <option value="Papelaria" />
                  <option value="Acessórios" />
                  <option value="Serviços" />
                  {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <input className="input" placeholder="Descrição (opcional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input" placeholder="Preço (ex: 9.99)" type="number" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <input className="input" placeholder="Preço anterior (De:)" type="number" step="0.01" value={form.oldPrice}
                onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} />
              <input className="input" placeholder="Preço promocional" type="number" step="0.01" value={form.promoPrice}
                onChange={e => setForm(f => ({ ...f, promoPrice: e.target.value }))} />
            </div>
            <button onClick={handleSave} className="btn btn-success w-full mt-4 h-12 text-base shadow-sm">
              {editing ? '💾 Atualizar Produto' : '✅ Salvar Produto'}
            </button>
          </div>
        )}

        {/* Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 animate-slide-up">
              <h3 className="font-bold text-lg mb-4">🖨️ Imprimir Etiquetas ({selectedForPrint.length})</h3>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Largura (mm)</label>
                  <input type="number" className="input" value={printConfig.widthMm}
                    onChange={e => setPrintConfig(c => ({...c, widthMm: Number(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Altura (mm)</label>
                  <input type="number" className="input" value={printConfig.heightMm}
                    onChange={e => setPrintConfig(c => ({...c, heightMm: Number(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Tamanho da Fonte Preço (px)</label>
                  <input type="number" className="input" value={printConfig.fontSizePx}
                    onChange={e => setPrintConfig(c => ({...c, fontSizePx: Number(e.target.value)}))} />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowPrintModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={() => {
                  printLabels(selectedForPrint, printConfig.widthMm, printConfig.heightMm, printConfig.fontSizePx)
                  setShowPrintModal(false)
                }} className="btn btn-primary flex-1">Imprimir Agora</button>
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <div className="font-semibold">Nenhum produto encontrado</div>
            </div>
          ) : (
            filtered.map(p => {
              const price = parseCurrency(p.promoPrice || p.price || p.oldPrice)
              const isSelected = selectedForPrint.some(s => s.id === p.id)
              
              return (
                <div key={p.id} className={`card p-3 flex items-center justify-between gap-3 border-2 transition-colors
                  ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-transparent'}`}>
                  
                  <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => togglePrintSelection(p)}>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0
                      ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300'}`}>
                      {isSelected && '✓'}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">{p.name}</span>
                        {p.category && (
                          <span className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold shrink-0">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {p.code && `Cód: ${p.code} • `}
                        Preço: {formatCurrency(price)}
                        {p.oldPrice && p.promoPrice && (
                          <span className="text-red-400 line-through ml-1">{formatCurrency(p.oldPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {isManager && (
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedForPrint([p]); 
                        setShowPrintModal(true); 
                      }}
                        className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm active:scale-90"
                        title="Imprimir Etiqueta deste produto">
                        🖨️
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); startEdit(p) }}
                      className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-sm active:scale-90">
                      ✏️
                    </button>
                    {isManager && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-sm active:scale-90">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
