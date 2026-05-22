import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, parseCurrency } from '../../utils/constants'
import { printLabels } from '../../services/printer'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function Products({ onBack }) {
  const { isManager } = useAuth()
  const { products, saveProduct, deleteProduct } = useStore()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '', photo: '' })
  const [showForm, setShowForm] = useState(false)
  const [parentCategory, setParentCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [isNewParent, setIsNewParent] = useState(false)
  const [isNewSub, setIsNewSub] = useState(false)

  // Barcode & Labels state
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState([])
  const [printConfig, setPrintConfig] = useState({ widthMm: 40, heightMm: 25, fontSizePx: 20 })
  const [showScanner, setShowScanner] = useState(false)

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

  // Removed unstable image search state

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }, [products, search])

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('reader', {
        qrbox: { width: 250, height: 150 },
        fps: 10
      }, false)
      
      scanner.render((decodedText) => {
        setForm(f => ({ ...f, code: decodedText }))
        scanner.clear()
        setShowScanner(false)
        setTimeout(() => handleBarcodeSearch(decodedText), 500)
      }, () => {})

      return () => {
        scanner.clear().catch(e => console.error(e))
      }
    }
  }, [showScanner])

  // Removed automatic search due to API instability

  // Removed searchImages function since free public APIs are blocked or unstable

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(f => ({ ...f, photo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  function resetForm() {
    setForm({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '', photo: '' })
    setParentCategory('')
    setSubCategory('')
    setIsNewParent(false)
    setIsNewSub(false)
    setEditing(null)
    setShowForm(false)
    setShowScanner(false)
  }

  function startEdit(product) {
    const parts = (product.category || '').split('>').map(s => s.trim()).filter(Boolean)
    const parent = parts[0] || ''
    const sub = parts[1] || ''

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      promoPrice: product.promoPrice || '',
      category: product.category || '',
      code: product.code || '',
      photo: product.photo || ''
    })
    setParentCategory(parent)
    setSubCategory(sub)
    setIsNewParent(false)
    setIsNewSub(false)
    setEditing(product.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const finalCategory = [parentCategory.trim(), subCategory.trim()].filter(Boolean).join(' > ')
    const product = {
      ...(editing ? { id: editing } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price,
      oldPrice: form.oldPrice,
      promoPrice: form.promoPrice,
      category: finalCategory || 'Geral',
      code: form.code.trim(),
      photo: form.photo || ''
    }
    await saveProduct(product)
    resetForm()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
  }

  async function handleBarcodeSearch(codeToSearch) {
    const code = codeToSearch || form.code
    if (!code) return
    setLoadingBarcode(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        let rawName = data.product.product_name_pt || data.product.product_name || ''
        rawName = rawName.toUpperCase().substring(0, 30) // Nome simplificado
        
        const rawCat = data.product.categories?.split(',')[0] || ''
        const parts = rawCat.split('>').map(s => s.trim()).filter(Boolean)
        const parent = parts[0] || ''
        const sub = parts[1] || ''

        setForm(f => ({
          ...f,
          code: code,
          name: f.name || rawName || f.name,
          photo: f.photo || data.product.image_front_url || data.product.image_url || ''
        }))
        setParentCategory(p => p || parent)
        setSubCategory(s => s || sub)
      } else {
        alert('Produto não encontrado no banco de dados público gratuito.')
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
            
            <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <input className="input flex-1 bg-white" placeholder="Código de barras" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()} />
                
                <button onClick={() => setShowScanner(!showScanner)} 
                  className={`btn shrink-0 ${showScanner ? 'bg-red-50 text-red-600' : 'bg-white text-gray-700 border border-gray-200'}`}>
                  {showScanner ? '✖' : '📷'}
                </button>
                
                <button onClick={() => handleBarcodeSearch()} disabled={loadingBarcode || !form.code} 
                  className="btn btn-primary shrink-0">
                  {loadingBarcode ? '⏳' : '🔍'}
                </button>
              </div>

              {showScanner && (
                <div className="w-full bg-black rounded-xl overflow-hidden mt-2 relative">
                  <div id="reader" className="w-full"></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="col-span-1 md:col-span-2">
                <input className="input w-full" placeholder="Nome do produto *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                
                {/* Automatic suggestions removed for stability. Use the direct upload/link option below. */}
              </div>

              <div className="col-span-1 md:col-span-2 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">📂 Categorização do Produto</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parent Category Row */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Categoria Principal</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewParent(!isNewParent)
                          setParentCategory('')
                          setSubCategory('')
                        }}
                        className="text-[10px] text-brand-600 font-bold hover:underline"
                      >
                        {isNewParent ? '📂 Escolher Existente' : '➕ Nova Categoria'}
                      </button>
                    </div>
                    
                    {isNewParent ? (
                      <input
                        type="text"
                        required
                        placeholder="Ex: Biscoitos, Bebidas"
                        value={parentCategory}
                        onChange={e => setParentCategory(e.target.value)}
                        className="input text-sm h-10 min-h-0 bg-white"
                      />
                    ) : (
                      <select
                        value={parentCategory}
                        onChange={e => {
                          setParentCategory(e.target.value)
                          setSubCategory('')
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

                  {/* Subcategory Row */}
                  {parentCategory && (
                    <div className="space-y-1 animate-slide-up">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Subcategoria</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewSub(!isNewSub)
                            setSubCategory('')
                          }}
                          className="text-[10px] text-brand-600 font-bold hover:underline"
                        >
                          {isNewSub ? '📂 Escolher Existente' : '➕ Nova Subcategoria'}
                        </button>
                      </div>

                      {isNewSub ? (
                        <input
                          type="text"
                          required
                          placeholder="Ex: Piraquê, Bauducco"
                          value={subCategory}
                          onChange={e => setSubCategory(e.target.value)}
                          className="input text-sm h-10 min-h-0 bg-white"
                        />
                      ) : (
                        <select
                          value={subCategory}
                          onChange={e => setSubCategory(e.target.value)}
                          className="input text-sm h-10 min-h-0 bg-white"
                        >
                          <option value="">-- Sem Subcategoria --</option>
                          {subcategoriesForParent(parentCategory).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
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

            {/* Upload de Foto Premium */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Foto do Produto</label>
              {form.photo ? (
                <div className="relative rounded-2xl border-2 border-dashed border-green-200 bg-green-50/20 p-4 flex flex-col items-center justify-center gap-2 group transition-all">
                  <button 
                    type="button"
                    onClick={() => setForm(f => ({ ...f, photo: '' }))} 
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition-all shadow-sm">
                    ✖
                  </button>
                  <img src={form.photo} alt="Produto" className="h-32 w-auto object-contain rounded-xl shadow-md bg-white p-1" />
                  <span className="text-xs text-green-700 font-semibold flex items-center gap-1">✨ Foto adicionada com sucesso!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção A: Upload de Arquivo / Tirar Foto com a Câmera */}
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-2xl bg-white hover:bg-brand-50/10 cursor-pointer transition-all text-center group active:scale-98">
                    <span className="text-3xl mb-1 group-hover:animate-bounce">📤</span>
                    <span className="text-sm font-bold text-gray-700">Tirar Foto ou Enviar</span>
                    <span className="text-xs text-gray-400 mt-0.5">Câmera do celular ou galeria</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {/* Opção B: Inserir Link/URL Direto */}
                  <div className="flex flex-col justify-center p-4 border border-gray-200 rounded-2xl bg-white gap-2">
                    <span className="text-xs font-bold text-gray-500">Ou cole o link da foto:</span>
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/foto.png" 
                      value={form.photo}
                      onChange={e => setForm(f => ({ ...f, photo: e.target.value }))}
                      className="input w-full text-xs" 
                    />
                  </div>
                </div>
              )}
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

                    {p.photo ? (
                      <img src={p.photo} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-100 shrink-0 p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">📦</div>
                    )}
                    
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
