import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, parseCurrency } from '../../utils/constants'

export default function Products({ onBack }) {
  const { products, saveProduct, deleteProduct } = useStore()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '' })
  const [showForm, setShowForm] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">📦 Produtos & Preços</div>
            <div className="text-xs text-gray-500">{products.length} cadastrados</div>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="btn btn-primary text-sm">
          + Novo Produto
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar produto..."
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
              <input className="input" placeholder="Código de barras / SKU" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <input className="input" placeholder="Descrição (opcional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input" placeholder="Preço (ex: 9.99)" type="number" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <input className="input" placeholder="Preço anterior (De:)" type="number" step="0.01" value={form.oldPrice}
                onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} />
              <input className="input" placeholder="Preço promocional" type="number" step="0.01" value={form.promoPrice}
                onChange={e => setForm(f => ({ ...f, promoPrice: e.target.value }))} />
            </div>
            <button onClick={handleSave} className="btn btn-success w-full mt-4 h-12 text-base">
              {editing ? '💾 Atualizar Produto' : '✅ Salvar Produto'}
            </button>
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
              return (
                <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 truncate">{p.name}</span>
                      {p.category && (
                        <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.code && `Cód: ${p.code} • `}
                      {p.description && `${p.description} • `}
                      Preço: {formatCurrency(price)}
                      {p.oldPrice && p.promoPrice && (
                        <span className="text-red-400 line-through ml-1">{formatCurrency(p.oldPrice)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(p)}
                      className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm active:scale-90">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm active:scale-90">
                      🗑️
                    </button>
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
