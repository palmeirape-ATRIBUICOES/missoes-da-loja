import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'

const CATEGORIES = [
  'Geral',
  'Mercearia',
  'Padaria & Confeitaria',
  'Frios & Laticínios',
  'Hortifruti',
  'Bebidas',
  'Descartáveis & Embalagens',
  'Limpeza & Higiene'
]

export default function ShoppingLists({ onBack }) {
  const { currentUser } = useAuth()
  const { products, shoppingListsAll, saveShoppingList, deleteShoppingList } = useStore()

  const [tab, setTab] = useState('pending') // 'pending' | 'completed' | 'all'
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form State
  const [listTitle, setListTitle] = useState('')
  const [listCategory, setListCategory] = useState('Geral')
  const [listNotes, setListNotes] = useState('')
  const [items, setItems] = useState([]) // [{ id, name, qty, bought: false }]

  // Product Picker state
  const [productSearch, setProductSearch] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('1 un')

  // Filtered Products for Autocomplete
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return []
    const q = productSearch.toLowerCase().trim()
    return (products || []).filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.category?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [products, productSearch])

  // Filter lists based on tab
  const filteredLists = useMemo(() => {
    return (shoppingListsAll || []).filter(l => {
      if (tab === 'pending') return l.status !== 'completed'
      if (tab === 'completed') return l.status === 'completed'
      return true
    })
  }, [shoppingListsAll, tab])

  function resetForm() {
    setListTitle('')
    setListCategory('Geral')
    setListNotes('')
    setItems([])
    setProductSearch('')
    setManualName('')
    setManualQty('1 un')
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(list) {
    setListTitle(list.title || '')
    setListCategory(list.category || 'Geral')
    setListNotes(list.notes || '')
    setItems(list.items || [])
    setEditingId(list.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addProductFromCatalog(product) {
    const existingIdx = items.findIndex(i => i.name.toLowerCase() === product.name.toLowerCase())
    if (existingIdx >= 0) {
      alert(`O produto "${product.name}" já está na lista!`)
      return
    }
    const newItem = {
      id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name: product.name,
      qty: '1 un',
      productId: product.id || '',
      bought: false
    }
    setItems(prev => [...prev, newItem])
    setProductSearch('')
  }

  function addManualItem() {
    if (!manualName.trim()) {
      alert('Informe o nome do item para adicionar!')
      return
    }
    const newItem = {
      id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name: manualName.trim(),
      qty: manualQty.trim() || '1 un',
      bought: false
    }
    setItems(prev => [...prev, newItem])
    setManualName('')
    setManualQty('1 un')
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItemQty(idx, qty) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, qty } : item))
  }

  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveList() {
    if (!listTitle.trim()) {
      alert('Por favor, informe o título da lista de compras!')
      return
    }

    let currentItems = [...items]

    // Auto-add manual item if user typed name but forgot to click "+ Incluir"
    if (manualName.trim()) {
      const autoItem = {
        id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        name: manualName.trim(),
        qty: manualQty.trim() || '1 un',
        bought: false
      }
      currentItems.push(autoItem)
      setItems(currentItems)
      setManualName('')
      setManualQty('1 un')
    }

    if (currentItems.length === 0) {
      alert('Adicione pelo menos 1 item à lista antes de salvar!')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: listTitle.trim(),
        category: listCategory || 'Geral',
        notes: listNotes.trim(),
        items: currentItems,
        status: 'pending',
        updatedBy: currentUser || 'Gerente'
      }

      await saveShoppingList(payload)
      alert('✅ Lista de Compras salva com sucesso!')
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar lista de compras:', err)
      alert('Ocorreu um erro ao salvar a lista: ' + (err.message || 'Tente novamente.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleItemBought(listDoc, itemIdx) {
    const updatedItems = (listDoc.items || []).map((item, idx) => {
      if (idx === itemIdx) return { ...item, bought: !item.bought }
      return item
    })
    
    // Check if all items are now bought
    const allBought = updatedItems.length > 0 && updatedItems.every(i => i.bought)
    const newStatus = allBought ? 'completed' : (listDoc.status === 'completed' ? 'pending' : listDoc.status)

    await saveShoppingList({
      ...listDoc,
      items: updatedItems,
      status: newStatus
    })
  }

  async function toggleListCompleted(listDoc) {
    const nextStatus = listDoc.status === 'completed' ? 'pending' : 'completed'
    await saveShoppingList({
      ...listDoc,
      status: nextStatus
    })
  }

  async function handleDeleteList(id) {
    if (confirm('Excluir esta lista de compras permanentemente?')) {
      await deleteShoppingList(id)
    }
  }

  function buildListText(list) {
    let text = `🛒 *LISTA DE COMPRAS: ${list.title.toUpperCase()}*\n`
    if (list.category) text += `🏷️ Categoria: ${list.category}\n`
    if (list.createdAtHuman) text += `📅 Criada em: ${list.createdAtHuman}\n`
    if (list.notes) text += `📝 Obs: ${list.notes}\n`
    text += `\n*ITENS DE COMPRA:*\n`

    (list.items || []).forEach(item => {
      const statusIcon = item.bought ? '✅' : '▫️'
      text += `${statusIcon} *${item.name}*: ${item.qty || '1 un'}\n`
    })

    return text
  }

  function handleExportWhatsApp(list) {
    const text = buildListText(list)
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  function handleCopyList(list) {
    const text = buildListText(list)
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Lista copiada para a área de transferência com sucesso!')
    }).catch(err => {
      console.error('Erro ao copiar:', err)
      alert('Não foi possível copiar automaticamente.')
    })
  }

  const pendingCount = (shoppingListsAll || []).filter(l => l.status !== 'completed').length
  const completedCount = (shoppingListsAll || []).filter(l => l.status === 'completed').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90 flex items-center justify-center font-bold">←</button>
          <div>
            <div className="font-bold text-gray-900 flex items-center gap-2">
              <span>🛒 Listas de Compras</span>
            </div>
            <div className="text-xs text-gray-500">
              {pendingCount} ativas • {completedCount} concluídas
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              resetForm()
              setShowForm(true)
            }
          }}
          className="btn btn-primary text-sm shadow-md flex items-center gap-1 font-bold"
        >
          {showForm ? 'Fechar Form' : '➕ Nova Lista'}
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Editor / Form */}
        {showForm && (
          <div className="card p-5 border-2 border-brand-200 bg-white shadow-xl animate-slide-up space-y-4 rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-gray-900 text-lg">
                {editingId ? '✏️ Editar Lista de Compras' : '➕ Nova Lista de Compras'}
              </h3>
              <button onClick={resetForm} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                Cancelar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Título da Lista *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra Semanal Hortifruti & Mercearia"
                  className="input font-semibold"
                  value={listTitle}
                  onChange={e => setListTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Categoria / Setor
                  </label>
                  <select
                    className="input font-semibold"
                    value={listCategory}
                    onChange={e => setListCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Observação / Detalhes (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Comprar preferencialmente na distribuidora X"
                    className="input font-semibold"
                    value={listNotes}
                    onChange={e => setListNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Addition Controls: Catalog vs Manual */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <span>📦 Adicionar Itens à Lista</span>
              </h4>

              {/* Option 1: Pick from registered Products */}
              <div className="relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  1. Buscar dos Produtos Cadastrados na Loja
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o nome do produto para buscar no catálogo..."
                    className="input pl-9 text-sm font-semibold bg-white"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                </div>

                {filteredProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl z-20 overflow-hidden max-h-60 overflow-y-auto divide-y">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductFromCatalog(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-brand-50 flex items-center justify-between transition-colors active:bg-brand-100"
                      >
                        <div>
                          <div className="font-bold text-sm text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-400">
                            {p.category || 'Geral'} {p.stock !== undefined ? `• Estoque: ${p.stock}` : ''}
                          </div>
                        </div>
                        <span className="text-xs font-black bg-brand-100 text-brand-700 px-2 py-1 rounded-lg">
                          + Adicionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 2: Add Manual Item */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  2. Ou Escrever Item Manualmente
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nome do produto/item (ex: Saco de Lixo 100L)"
                    className="input flex-1 text-sm font-semibold bg-white"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Quantidade (ex: 5 fardos, 2kg)"
                    className="input w-full sm:w-36 text-sm font-semibold bg-white"
                    value={manualQty}
                    onChange={e => setManualQty(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="btn btn-primary text-xs px-4 font-bold shrink-0 rounded-xl"
                  >
                    + Incluir
                  </button>
                </div>
              </div>
            </div>

            {/* Table / List of Added Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Itens da Lista ({items.length})
                </span>
                {items.length > 0 && (
                  <button onClick={() => setItems([])} className="text-xs text-red-500 font-semibold hover:underline">
                    Limpar Todos
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs font-medium">
                  Nenhum item adicionado ainda. Busque no catálogo acima ou digite manualmente.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-gray-900 truncate">{item.name}</div>
                        {item.productId && (
                          <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-semibold">
                            Catálogo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-500">Qtd:</span>
                        <input
                          type="text"
                          value={item.qty}
                          onChange={e => updateItemQty(idx, e.target.value)}
                          className="input h-8 w-28 text-xs font-bold text-center bg-white border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs active:scale-90 transition-all font-bold"
                          title="Remover Item"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Footer */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                disabled={isSaving}
                onClick={handleSaveList}
                className="btn btn-success flex-1 h-12 rounded-xl text-base font-extrabold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '⏳ Salvando Lista...' : '💾 Salvar Lista de Compras'}
              </button>
              <button
                onClick={resetForm}
                className="btn btn-ghost h-12 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setTab('pending')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 font-bold ${tab === 'pending' ? 'active' : ''}`}
          >
            ⏳ Ativas ({pendingCount})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 font-bold ${tab === 'completed' ? 'active' : ''}`}
          >
            ✅ Concluídas ({completedCount})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 font-bold ${tab === 'all' ? 'active' : ''}`}
          >
            📁 Todas ({shoppingListsAll?.length || 0})
          </button>
        </div>

        {/* Shopping Lists Stream */}
        {filteredLists.length === 0 ? (
          <div className="card p-10 text-center text-gray-400 space-y-3 rounded-3xl">
            <div className="text-5xl">🛒</div>
            <div className="font-bold text-gray-700 text-base">Nenhuma lista de compras encontrada</div>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Clique no botão "+ Nova Lista" para criar sua primeira lista de compras com produtos do seu estoque ou itens manuais.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLists.map(list => {
              const totalItems = list.items?.length || 0
              const boughtItems = (list.items || []).filter(i => i.bought).length
              const isCompleted = list.status === 'completed'
              const percent = totalItems > 0 ? Math.round((boughtItems / totalItems) * 100) : 0

              return (
                <div
                  key={list.id}
                  className={`card p-5 border-l-4 transition-all rounded-3xl ${
                    isCompleted
                      ? 'border-l-emerald-500 bg-gray-50/60 opacity-80'
                      : 'border-l-brand-500 bg-white shadow-md'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-950 text-lg">{list.title}</span>
                        {list.category && (
                          <span className="text-[10px] font-extrabold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                            {list.category}
                          </span>
                        )}
                        {isCompleted ? (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            ✅ Concluída
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            ⏳ Em Andamento
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap font-medium">
                        {list.createdBy && <span>Criada por <b>{list.createdBy}</b></span>}
                        {list.createdAtHuman && <span>• {list.createdAtHuman}</span>}
                      </div>

                      {list.notes && (
                        <div className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg mt-2 inline-block font-medium">
                          📝 {list.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
                      <button
                        onClick={() => handleExportWhatsApp(list)}
                        className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all active:scale-95 flex items-center gap-1"
                        title="Exportar para o WhatsApp"
                      >
                        💬 WhatsApp
                      </button>

                      <button
                        onClick={() => handleCopyList(list)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all active:scale-95"
                        title="Copiar texto"
                      >
                        📋 Copiar
                      </button>

                      <button
                        onClick={() => startEdit(list)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all active:scale-95"
                      >
                        ✏️ Editar
                      </button>

                      <button
                        onClick={() => toggleListCompleted(list)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all active:scale-95 ${
                          isCompleted
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {isCompleted ? '🔄 Reabrir' : '✅ Concluir'}
                      </button>

                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all active:scale-95"
                        title="Excluir lista"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {totalItems > 0 && (
                    <div className="my-3 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Progresso de Compras</span>
                        <span>{boughtItems} de {totalItems} itens ({percent}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Items List Checklist */}
                  <div className="mt-3 space-y-2">
                    {(list.items || []).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => toggleItemBought(list, idx)}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all active:scale-[0.99] ${
                          item.bought
                            ? 'bg-emerald-50/50 border-emerald-200 opacity-75'
                            : 'bg-white border-gray-200 hover:border-brand-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                              item.bought
                                ? 'bg-emerald-500 border-emerald-500 text-white font-bold text-xs'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {item.bought ? '✓' : ''}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`font-extrabold text-sm block truncate ${
                                item.bought ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.productId && (
                              <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded">
                                Do catálogo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                              item.bought
                                ? 'bg-emerald-100 text-emerald-800 line-through'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.qty || '1 un'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
