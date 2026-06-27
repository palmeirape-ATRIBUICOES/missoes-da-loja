import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

const DEFAULT_BREADS = [
  { id: 'pao_de_sal', name: 'Pão de Sal', category: 'pao_de_sal', unitWeightG: 50, divisor: 1 },
  { id: 'suico', name: 'Suíço', category: 'massa_fina', unitWeightG: 50, divisor: 30, blockWeightG: 1500 }
]

export default function Bakery({ onBack }) {
  const { storeId, currentUser, isManager } = useAuth()
  const { 
    employees, 
    activeEmployees, 
    bakeryOrdersAll = [], 
    saveBakeryOrder, 
    deleteBakeryOrder, 
    incrementEmployeePoints 
  } = useStore()

  // Tabs
  const [activeTab, setActiveTab] = useState('producao') // 'producao' | 'calculadora_livre' | 'config_paes'
  
  // Custom breads state
  const [customBreads, setCustomBreads] = useState([])
  const [breadFormOpen, setBreadFormOpen] = useState(false)
  const [breadForm, setBreadForm] = useState({ name: '', category: 'pao_de_sal', unitWeightG: 50, divisor: 1, blockWeightG: 1500 })
  const [editingBreadId, setEditingBreadId] = useState(null)

  // Manager production order creation form
  const [orderForm, setOrderForm] = useState({
    breadId: 'pao_de_sal',
    assignedTo: '',
    inputMode: 'pães', // 'pães' | 'blocos' | 'farinha'
    quantity: 100, // pães
    blocks: 5, // blocos de divisora
    flourKg: 5, // kg de farinha
    notes: '',
    yeastType: 'fresco',
    hydrationPct: 40,
    saltPct: 2,
    sugarPct: 15,
    fatPct: 10,
    eggPct: 0,
    improverPct: 1,
    tempMode: 'ameno', // 'frio' | 'ameno' | 'quente' | 'muito_quente'
    timeMode: 'media' // 'rapida' | 'media' | 'longa' | 'geladeira'
  })

  // Free calculator state
  const [calcState, setCalcState] = useState({
    breadId: 'pao_de_sal',
    inputMode: 'pães', // 'pães' | 'blocos' | 'farinha'
    quantity: 100,
    blocks: 5,
    flourKg: 5,
    yeastType: 'fresco',
    hydrationPct: 40,
    saltPct: 2,
    sugarPct: 15,
    fatPct: 10,
    eggPct: 0,
    improverPct: 1,
    tempMode: 'ameno',
    timeMode: 'media'
  })

  // Checklist states for active preparation
  const [activePrepId, setActivePrepId] = useState(null)
  const [prepChecklist, setPrepChecklist] = useState({})
  const [prepStep, setPrepStep] = useState(1) // 1: pesagem, 2: mistura, 3: divisora/modelagem, 4: fermentacao, 5: assamento

  // Fetch custom breads
  useEffect(() => {
    if (!storeId) return
    const un = onSnapshot(doc(db, 'stores', storeId, 'config', 'bakery_breads'), (snap) => {
      if (snap.exists()) {
        setCustomBreads(snap.data().list || [])
      } else {
        setCustomBreads([])
      }
    })
    return () => un()
  }, [storeId])

  // Merge default and custom breads
  const allBreads = useMemo(() => {
    return [...DEFAULT_BREADS, ...customBreads]
  }, [customBreads])

  // Bakers list (employees with canAccessBakery === true)
  const bakers = useMemo(() => {
    return activeEmployees.filter(e => e.canAccessBakery)
  }, [activeEmployees])

  // Set default baker in orderForm if available
  useEffect(() => {
    if (bakers.length > 0 && !orderForm.assignedTo) {
      setOrderForm(f => ({ ...f, assignedTo: bakers[0].name }))
    }
  }, [bakers, orderForm.assignedTo])

  // Handle custom bread save/delete
  async function handleSaveBread() {
    if (!breadForm.name.trim()) return
    const list = [...customBreads]
    const newBread = {
      id: editingBreadId || 'bread_' + Date.now().toString(36),
      name: breadForm.name.trim(),
      category: breadForm.category,
      unitWeightG: Number(breadForm.unitWeightG) || 50,
      divisor: Number(breadForm.divisor) || 1,
      blockWeightG: breadForm.divisor > 1 ? Number(breadForm.blockWeightG) || 1500 : 0
    }
    
    const idx = list.findIndex(b => b.id === newBread.id)
    if (idx >= 0) {
      list[idx] = newBread
    } else {
      list.push(newBread)
    }

    await setDoc(doc(db, 'stores', storeId, 'config', 'bakery_breads'), { list })
    setBreadForm({ name: '', category: 'pao_de_sal', unitWeightG: 50, divisor: 1, blockWeightG: 1500 })
    setEditingBreadId(null)
    setBreadFormOpen(false)
  }

  async function handleDeleteBread(breadId) {
    if (!confirm('Deseja excluir este pão customizado?')) return
    const list = customBreads.filter(b => b.id !== breadId)
    await setDoc(doc(db, 'stores', storeId, 'config', 'bakery_breads'), { list })
  }

  function startEditBread(b) {
    setEditingBreadId(b.id)
    setBreadForm({
      name: b.name,
      category: b.category,
      unitWeightG: b.unitWeightG,
      divisor: b.divisor,
      blockWeightG: b.divisor > 1 ? b.blockWeightG || 1500 : 1500
    })
    setBreadFormOpen(true)
  }

  // SUGGESTED YEAST CALCULATION ENGINE
  // Returns fresh yeast percentage (dry is 1/3 of this)
  const getSuggestedYeastPct = (timeMode, tempMode) => {
    if (timeMode === 'geladeira') return 0.5

    const matrix = {
      rapida: { frio: 4.0, ameno: 3.0, quente: 2.0, muito_quente: 1.5 },
      media:  { frio: 2.5, ameno: 2.0, quente: 1.5, muito_quente: 1.0 },
      longa:  { frio: 1.5, ameno: 1.0, quente: 0.8, muito_quente: 0.5 }
    }

    return matrix[timeMode]?.[tempMode] || 2.0
  }

  // RECIPE DYNAMIC ENGINE
  const calculateRecipe = (config) => {
    const bread = allBreads.find(b => b.id === config.breadId) || DEFAULT_BREADS[0]
    const isSweet = bread.category === 'massa_fina'

    // Get input parameters
    const inputMode = config.inputMode
    const yeastPct = getSuggestedYeastPct(config.timeMode, config.tempMode)
    const yeastFinalPct = config.yeastType === 'seco' ? yeastPct / 3 : yeastPct

    // Percentages (relative to flour 100%)
    const pct = {
      flour: 100,
      water: Number(config.hydrationPct) || 40,
      salt: Number(config.saltPct) || 2,
      yeast: yeastFinalPct,
      sugar: isSweet ? (Number(config.sugarPct) || 15) : 0,
      fat: isSweet ? (Number(config.fatPct) || 10) : 0,
      egg: isSweet ? (Number(config.eggPct) || 0) : 0,
      improver: bread.category === 'pao_de_sal' ? (Number(config.improverPct) || 1) : 0
    }

    const sumPct = Object.values(pct).reduce((a, b) => a + b, 0) // e.g. 100 + 40 + 2 + 2 + 1 = 145%

    let targetDoughG = 0
    let totalPães = 0
    let totalBlocos = 0

    if (inputMode === 'farinha') {
      const flourG = (Number(config.flourKg) || 1) * 1000
      const factor = flourG / 100
      
      const flour = flourG
      const water = pct.water * factor
      const salt = pct.salt * factor
      const yeast = pct.yeast * factor
      const sugar = pct.sugar * factor
      const fat = pct.fat * factor
      const egg = pct.egg * factor
      const improver = pct.improver * factor
      const totalDough = flour + water + salt + yeast + sugar + fat + egg + improver

      if (bread.divisor > 1) {
        totalBlocos = totalDough / (bread.blockWeightG || 1500)
        totalPães = totalBlocos * bread.divisor
      } else {
        totalPães = totalDough / (bread.unitWeightG || 50)
      }

      return {
        flour, water, salt, yeast, sugar, fat, egg, improver,
        totalDough, totalPães: Math.round(totalPães), totalBlocos: totalBlocos.toFixed(1),
        pct
      }
    } else if (inputMode === 'blocos' && bread.divisor > 1) {
      totalBlocos = Number(config.blocks) || 1
      targetDoughG = totalBlocos * (bread.blockWeightG || 1500)
      totalPães = totalBlocos * bread.divisor
    } else {
      // Input mode is quantity of bread rolls
      totalPães = Number(config.quantity) || 100
      if (bread.divisor > 1) {
        // Round to nearest divisora block
        totalBlocos = Math.max(1, Math.round(totalPães / bread.divisor))
        totalPães = totalBlocos * bread.divisor
        targetDoughG = totalBlocos * (bread.blockWeightG || 1500)
      } else {
        targetDoughG = totalPães * (bread.unitWeightG || 50)
      }
    }

    // Flour calculation based on target dough weight: TargetWeight = Flour * (SumPercentages / 100)
    // Flour = TargetWeight / (SumPercentages / 100)
    const flour = (targetDoughG / sumPct) * 100
    const factor = flour / 100

    const water = pct.water * factor
    const salt = pct.salt * factor
    const yeast = pct.yeast * factor
    const sugar = pct.sugar * factor
    const fat = pct.fat * factor
    const egg = pct.egg * factor
    const improver = pct.improver * factor

    return {
      flour, water, salt, yeast, sugar, fat, egg, improver,
      totalDough: targetDoughG,
      totalPães,
      totalBlocos: totalBlocos > 0 ? totalBlocos : 0,
      pct
    }
  }

  // Live calculated recipe for free calculator
  const freeRecipe = useMemo(() => {
    return calculateRecipe(calcState)
  }, [calcState, allBreads])

  // Synchronize suggested yeast whenever time, temp, yeastType, or bread selection changes
  useEffect(() => {
    const defaultHydration = 40 //Establishment standard hydration rate
    const defaultSalt = calcState.breadId === 'pao_de_sal' ? 2 : 1.5
    
    // Auto-update recipe defaults based on bread type
    const bread = allBreads.find(b => b.id === calcState.breadId)
    const category = bread?.category || 'pao_de_sal'
    
    setCalcState(c => ({
      ...c,
      hydrationPct: defaultHydration,
      saltPct: defaultSalt,
      sugarPct: category === 'massa_fina' ? 15 : 0,
      fatPct: category === 'massa_fina' ? 10 : 0,
      improverPct: category === 'pao_de_sal' ? 1 : 0
    }))
  }, [calcState.breadId, allBreads])

  // Auto-sync for manager order builder
  useEffect(() => {
    const bread = allBreads.find(b => b.id === orderForm.breadId)
    const category = bread?.category || 'pao_de_sal'
    
    setOrderForm(f => ({
      ...f,
      hydrationPct: 40,
      saltPct: category === 'pao_de_sal' ? 2 : 1.5,
      sugarPct: category === 'massa_fina' ? 15 : 0,
      fatPct: category === 'massa_fina' ? 10 : 0,
      improverPct: category === 'pao_de_sal' ? 1 : 0
    }))
  }, [orderForm.breadId, allBreads])

  // Order submission
  async function handleCreateOrder() {
    if (!orderForm.assignedTo) {
      alert('Selecione um padeiro para executar a produção.')
      return
    }

    const calculated = calculateRecipe(orderForm)
    const bread = allBreads.find(b => b.id === orderForm.breadId)
    
    const newOrder = {
      breadId: orderForm.breadId,
      breadName: bread?.name || 'Pão',
      assignedTo: orderForm.assignedTo,
      notes: orderForm.notes.trim(),
      status: 'pending',
      inputs: {
        mode: orderForm.inputMode,
        quantity: orderForm.quantity,
        blocks: orderForm.blocks,
        flourKg: orderForm.flourKg
      },
      recipe: {
        flour: calculated.flour,
        water: calculated.water,
        salt: calculated.salt,
        yeast: calculated.yeast,
        sugar: calculated.sugar,
        fat: calculated.fat,
        egg: calculated.egg,
        improver: calculated.improver,
        yeastType: orderForm.yeastType,
        totalDough: calculated.totalDough,
        totalPães: calculated.totalPães,
        totalBlocos: calculated.totalBlocos
      },
      timeMode: orderForm.timeMode,
      tempMode: orderForm.tempMode,
      createdAtMs: Date.now()
    }

    try {
      await saveBakeryOrder(newOrder)
      alert('Ordem de produção enviada com sucesso!')
      setOrderForm(f => ({ ...f, notes: '', quantity: 100, blocks: 5, flourKg: 5 }))
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar ordem.')
    }
  }

  // Baker interactions
  async function handleStartPrep(order) {
    setActivePrepId(order.id)
    setPrepChecklist({})
    setPrepStep(1)
    
    // Update order status
    await saveBakeryOrder({
      ...order,
      status: 'in_progress',
      startedAtMs: Date.now()
    })
  }

  async function handleCompletePrep(order) {
    if (!confirm('Deseja concluir esta produção? A quantidade de pães será registrada.')) return

    // Update order status
    await saveBakeryOrder({
      ...order,
      status: 'completed',
      completedAtMs: Date.now(),
      completedBy: currentUser
    })

    // Award Points! (+15 pts for completing a bake session)
    try {
      await incrementEmployeePoints(currentUser, 15)
      alert(`Parabéns! Produção concluída. Você ganhou +15 pontos! 🍞🏆`)
    } catch (e) {
      console.error(e)
      alert('Produção concluída com sucesso!')
    }

    setActivePrepId(null)
    setPrepChecklist({})
  }

  // Helper format weights
  const fmtWeight = (g) => {
    if (g === 0) return '-'
    if (g >= 1000) {
      return `${(g / 1000).toFixed(2)} kg`
    }
    return `${Math.round(g)} g`
  }

  // Get status label color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">Pendente</span>
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">Preparando</span>
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">Concluído</span>
      default:
        return null
    }
  }

  // Bakers filter orders
  const myPendingOrders = bakeryOrdersAll.filter(o => o.assignedTo === currentUser && o.status !== 'completed')
  const managerOrders = bakeryOrdersAll.slice(0, 50) // recent orders list

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
        <div>
          <div className="font-bold text-gray-900">🍞 Cálculo dos Pães</div>
          <div className="text-xs text-gray-500">Produção Diária e Padronização</div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex gap-2 p-1 bg-gray-200/60 rounded-xl">
          <button onClick={() => setActiveTab('producao')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'producao' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            📋 Produção Diária
          </button>
          <button onClick={() => setActiveTab('calculadora_livre')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'calculadora_livre' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            🧮 Calculadora Livre
          </button>
          {isManager && (
            <button onClick={() => setActiveTab('config_paes')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'config_paes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              ⚙️ Cadastro de Pães
            </button>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* ================= TAB 1: PRODUÇÃO DIÁRIA ================= */}
        {activeTab === 'producao' && (
          <div className="space-y-6">
            
            {/* Baker View: Active Prep Workspace */}
            {activePrepId && (
              (() => {
                const order = bakeryOrdersAll.find(o => o.id === activePrepId)
                if (!order) return null
                const bread = allBreads.find(b => b.id === order.breadId)
                
                return (
                  <div className="card p-5 border-2 border-brand-500 shadow-elevated bg-white animate-fade-in">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                      <div>
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">PREPARANDO AGORA</span>
                        <h3 className="font-extrabold text-2xl text-gray-900 mt-1">🍞 {order.breadName}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Rendimento Alvo</span>
                        <span className="font-extrabold text-xl text-gray-900">
                          {order.recipe.totalPães} pães
                          {order.recipe.totalBlocos > 0 && ` (${order.recipe.totalBlocos} Bl.)`}
                        </span>
                      </div>
                    </div>

                    {/* Step wizard indicator */}
                    <div className="grid grid-cols-5 gap-1 mb-6 text-center text-[10px] font-bold">
                      <div onClick={() => setPrepStep(1)} className={`py-2 rounded-lg cursor-pointer transition-all ${prepStep >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>1. Peso</div>
                      <div onClick={() => setPrepStep(2)} className={`py-2 rounded-lg cursor-pointer transition-all ${prepStep >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2. Mistura</div>
                      <div onClick={() => setPrepStep(3)} className={`py-2 rounded-lg cursor-pointer transition-all ${prepStep >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>3. Modelar</div>
                      <div onClick={() => setPrepStep(4)} className={`py-2 rounded-lg cursor-pointer transition-all ${prepStep >= 4 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>4. Crescer</div>
                      <div onClick={() => setPrepStep(5)} className={`py-2 rounded-lg cursor-pointer transition-all ${prepStep >= 5 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>5. Assar</div>
                    </div>

                    {/* Step 1: Weighing Ingredients */}
                    {prepStep === 1 && (
                      <div className="space-y-3 animate-slide-up">
                        <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 font-semibold mb-2">
                          💡 Dica: Use a balança e zere com o balde. Adicione água gelada para manter o ponto frio!
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm mb-2">Pesagem de Ingredientes:</h4>
                        
                        <div className="space-y-2">
                          {[
                            { name: 'Farinha de Trigo', weight: order.recipe.flour, key: 'flour' },
                            { name: 'Água Gelada (ou Gelo)', weight: order.recipe.water, key: 'water' },
                            { name: `Fermento Biológico (${order.recipe.yeastType === 'seco' ? 'Seco' : 'Fresco'})`, weight: order.recipe.yeast, key: 'yeast' },
                            { name: 'Sal', weight: order.recipe.salt, key: 'salt' },
                            order.recipe.sugar > 0 && { name: 'Açúcar', weight: order.recipe.sugar, key: 'sugar' },
                            order.recipe.fat > 0 && { name: 'Margarina / Gordura', weight: order.recipe.fat, key: 'fat' },
                            order.recipe.egg > 0 && { name: 'Ovos', weight: order.recipe.egg, key: 'egg' },
                            order.recipe.improver > 0 && { name: 'Melhorador / Aditivo', weight: order.recipe.improver, key: 'improver' }
                          ].filter(Boolean).map((ing, i) => (
                            <label key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${prepChecklist[ing.key] ? 'bg-emerald-50/60 border-emerald-200 text-gray-400 line-through' : 'bg-gray-50 border-gray-200 text-gray-800 hover:border-amber-300'}`}>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={!!prepChecklist[ing.key]}
                                  onChange={e => setPrepChecklist({ ...prepChecklist, [ing.key]: e.target.checked })}
                                  className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                                <span className="font-semibold text-sm">{ing.name}</span>
                              </div>
                              <span className="font-extrabold text-base shrink-0">{fmtWeight(ing.weight)}</span>
                            </label>
                          ))}
                        </div>
                        <button onClick={() => setPrepStep(2)} className="btn btn-primary w-full mt-4 h-12">
                          Continuar para Mistura →
                        </button>
                      </div>
                    )}

                    {/* Step 2: Mixing */}
                    {prepStep === 2 && (
                      <div className="space-y-4 animate-slide-up text-center py-4">
                        <div className="text-4xl">🌀</div>
                        <h4 className="font-bold text-gray-800 text-lg">Mistura e Ponto de Véu</h4>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          Bata os ingredientes secos, depois adicione a água aos poucos. Misture na masseira rápida por cerca de 8 a 12 minutos até a massa ficar elástica e atingir o **ponto de véu**.
                        </p>
                        <div className="p-4 bg-blue-50 rounded-xl text-left border border-blue-100 max-w-md mx-auto">
                          <strong className="text-blue-800 text-xs block mb-1">💡 Controle de Temperatura</strong>
                          <span className="text-xs text-blue-700">
                            A temperatura ideal da massa ao sair da masseira é entre **24°C e 26°C**. Evite que passe de 28°C para não fermentar antes da hora!
                          </span>
                        </div>
                        <div className="flex gap-2 max-w-md mx-auto mt-4">
                          <button onClick={() => setPrepStep(1)} className="btn btn-ghost flex-1">← Voltar</button>
                          <button onClick={() => setPrepStep(3)} className="btn btn-primary flex-1">Ir para Divisão →</button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Dividing and Modeling */}
                    {prepStep === 3 && (
                      <div className="space-y-4 animate-slide-up py-4 text-center">
                        <div className="text-4xl">⚖️</div>
                        <h4 className="font-bold text-gray-800 text-lg">Divisão e Modelagem</h4>
                        
                        {bread?.divisor > 1 ? (
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="bg-amber-50 p-4 rounded-xl text-left border border-amber-200">
                              <span className="text-xs font-bold text-amber-800 uppercase block mb-1">INSTRUÇÃO DA DIVISORA</span>
                              <p className="text-sm text-amber-900 leading-relaxed">
                                Peser blocos de exatamente **{(bread.blockWeightG || 1500) / 1000} kg ({bread.blockWeightG || 1500}g)**. <br/>
                                Passe na máquina divisora para obter **{bread.divisor} unidades** por bloco. <br/>
                                <strong className="mt-2 block">Total de blocos nesta massa: {order.recipe.totalBlocos} blocos</strong>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="bg-amber-50 p-4 rounded-xl text-left border border-amber-200">
                              <span className="text-xs font-bold text-amber-800 uppercase block mb-1">INSTRUÇÃO DE CORTE</span>
                              <p className="text-sm text-amber-900 leading-relaxed">
                                Modele as unidades com o peso médio de **{bread?.unitWeightG || 50}g** cruas.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 max-w-md mx-auto mt-4">
                          <button onClick={() => setPrepStep(2)} className="btn btn-ghost flex-1">← Voltar</button>
                          <button onClick={() => setPrepStep(4)} className="btn btn-primary flex-1">Ir para Fermentação →</button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Fermenting */}
                    {prepStep === 4 && (
                      <div className="space-y-4 animate-slide-up py-4 text-center">
                        <div className="text-4xl">📈</div>
                        <h4 className="font-bold text-gray-800 text-lg">Fermentação (Crescimento)</h4>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          Coloque os pães nos carrinhos/armários de crescimento. 
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <span className="text-[10px] text-gray-400 block">Tempo Definido</span>
                            <span className="font-bold text-gray-800 capitalize">{order.timeMode === 'media' ? 'Médio (3-5h)' : order.timeMode === 'rapida' ? 'Rápido (1-2h)' : order.timeMode === 'longa' ? 'Longo (6-12h)' : 'Geladeira (12-24h)'}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <span className="text-[10px] text-gray-400 block">Temperatura sugerida</span>
                            <span className="font-bold text-gray-800 capitalize">{order.tempMode}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 max-w-md mx-auto mt-4">
                          <button onClick={() => setPrepStep(3)} className="btn btn-ghost flex-1">← Voltar</button>
                          <button onClick={() => setPrepStep(5)} className="btn btn-primary flex-1">Forno / Assar →</button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Baking */}
                    {prepStep === 5 && (
                      <div className="space-y-4 animate-slide-up py-4 text-center">
                        <div className="text-4xl">🔥</div>
                        <h4 className="font-bold text-gray-800 text-lg">Forno e Conclusão</h4>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          Asse no forno turbo com vapor (pão de sal) ou lastro conforme o padrão estabelecido. Quando terminar, marque como concluído para computar a produção.
                        </p>
                        
                        <div className="border border-emerald-100 bg-emerald-50/50 p-4 rounded-xl max-w-md mx-auto">
                          <div className="text-emerald-700 font-bold text-xs uppercase mb-1">🎁 Recompensa Pela Produção</div>
                          <div className="text-sm text-emerald-800 font-semibold">Ao concluir, você ganhará **+15 pontos** no ranking mensal!</div>
                        </div>

                        <div className="flex gap-2 max-w-md mx-auto mt-4">
                          <button onClick={() => setPrepStep(4)} className="btn btn-ghost flex-1">← Voltar</button>
                          <button onClick={() => handleCompletePrep(order)} className="btn btn-success flex-[2] h-12">
                            ✅ Concluir Produção
                          </button>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { setActivePrepId(null); setPrepChecklist({}); }} 
                      className="btn btn-ghost w-full mt-4 text-xs font-bold text-red-500 border-red-200 bg-red-50">
                      Sair do Preparo (Manter em Andamento)
                    </button>
                  </div>
                )
              })()
            )}

            {/* Baker View: My Pending Orders list */}
            {!activePrepId && !isManager && (
              <div className="card p-5 bg-white">
                <h3 className="font-bold text-gray-900 text-lg mb-3">🥖 Minhas Produções de Hoje</h3>
                {myPendingOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-sm font-semibold">Tudo pronto! Nenhuma ordem de produção pendente.</p>
                    <p className="text-xs mt-1">Você pode usar a "Calculadora Livre" no menu acima para bater massas avulsas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPendingOrders.map(order => (
                      <div key={order.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">{order.breadName}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Alvo: **{order.recipe.totalPães} pães** 
                            {order.recipe.totalBlocos > 0 && ` (${order.recipe.totalBlocos} blocos)`} 
                            • Farinha: **{(order.recipe.flour / 1000).toFixed(1)}kg**
                          </div>
                          {order.notes && (
                            <div className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md mt-2 inline-block border border-amber-100">
                              📝 {order.notes}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleStartPrep(order)}
                          className="btn btn-primary shrink-0 self-end md:self-center">
                          {order.status === 'in_progress' ? '⚡ Continuar Preparo' : '🧑‍🍳 Iniciar Preparo'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manager View: Create Order & Assigned List */}
            {isManager && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Order Creator Form */}
                <div className="lg:col-span-2 card p-5 bg-white space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
                    <span>📝 Novo Pedido de Produção</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Bread Selector */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Pão</label>
                      <select value={orderForm.breadId} 
                        onChange={e => setOrderForm({ ...orderForm, breadId: e.target.value })}
                        className="input">
                        {allBreads.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Baker Assigned */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Padeiro Responsável</label>
                      <select value={orderForm.assignedTo} 
                        onChange={e => setOrderForm({ ...orderForm, assignedTo: e.target.value })}
                        className="input">
                        <option value="">Selecione um padeiro...</option>
                        {bakers.map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                      {bakers.length === 0 && (
                        <span className="text-[10px] text-red-500 mt-1 block">Nenhum funcionário cadastrado com permissão de Padeiro. Cadastre um na aba Equipe.</span>
                      )}
                    </div>

                    {/* Input Mode Selector */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Modo de Entrada</label>
                      <div className="flex border rounded-lg overflow-hidden">
                        <button type="button" onClick={() => setOrderForm({ ...orderForm, inputMode: 'pães' })}
                          className={`flex-1 py-1.5 text-xs font-semibold ${orderForm.inputMode === 'pães' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                          Pães Un.
                        </button>
                        {allBreads.find(b => b.id === orderForm.breadId)?.divisor > 1 && (
                          <button type="button" onClick={() => setOrderForm({ ...orderForm, inputMode: 'blocos' })}
                            className={`flex-1 py-1.5 text-xs font-semibold ${orderForm.inputMode === 'blocos' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                            Blocos
                          </button>
                        )}
                        <button type="button" onClick={() => setOrderForm({ ...orderForm, inputMode: 'farinha' })}
                          className={`flex-1 py-1.5 text-xs font-semibold ${orderForm.inputMode === 'farinha' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                          Farinha (Kg)
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Quantity Fields */}
                    <div>
                      {orderForm.inputMode === 'pães' && (
                        <>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Quantidade de Pães Alvo</label>
                          <input type="number" min={1} value={orderForm.quantity}
                            onChange={e => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                            className="input" />
                        </>
                      )}
                      {orderForm.inputMode === 'blocos' && (
                        <>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Quantidade de Blocos (30 pães/cada)</label>
                          <input type="number" min={1} value={orderForm.blocks}
                            onChange={e => setOrderForm({ ...orderForm, blocks: Number(e.target.value) })}
                            className="input" />
                        </>
                      )}
                      {orderForm.inputMode === 'farinha' && (
                        <>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Farinha de Trigo (Kg)</label>
                          <input type="number" step="0.1" min={0.1} value={orderForm.flourKg}
                            onChange={e => setOrderForm({ ...orderForm, flourKg: Number(e.target.value) })}
                            className="input" />
                        </>
                      )}
                    </div>

                    {/* Temperature and Time suggestions for Yeast calculation */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Temperatura Ambiente</label>
                      <select value={orderForm.tempMode} 
                        onChange={e => setOrderForm({ ...orderForm, tempMode: e.target.value })}
                        className="input">
                        <option value="frio">Frio (&lt; 20°C)</option>
                        <option value="ameno">Ameno (20-25°C)</option>
                        <option value="quente">Quente (25-30°C)</option>
                        <option value="muito_quente">Muito Quente (&gt; 30°C)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tempo de Fermentação</label>
                      <select value={orderForm.timeMode} 
                        onChange={e => setOrderForm({ ...orderForm, timeMode: e.target.value })}
                        className="input">
                        <option value="rapida">Rápido (1 - 2 horas)</option>
                        <option value="media">Médio (3 - 5 horas)</option>
                        <option value="longa">Longo (6 - 12 horas)</option>
                        <option value="geladeira">Geladeira (12 - 24 horas)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Fermento</label>
                      <select value={orderForm.yeastType} 
                        onChange={e => setOrderForm({ ...orderForm, yeastType: e.target.value })}
                        className="input">
                        <option value="fresco">Fresco (Biológico)</option>
                        <option value="seco">Seco (Instantâneo)</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-600 block mb-1">Observações / Instruções Especiais</label>
                      <input type="text" placeholder="Ex: Deixar mais corado, menor modelagem..." value={orderForm.notes}
                        onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                        className="input" />
                    </div>

                  </div>

                  {/* Summary preview of recipe before saving */}
                  {(() => {
                    const preview = calculateRecipe(orderForm)
                    const bread = allBreads.find(b => b.id === orderForm.breadId)
                    return (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mt-2">
                        <h4 className="font-bold text-amber-900 text-xs uppercase mb-2">📋 Resumo da Produção Gerada</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-amber-950 font-semibold">
                          <div>Farinha: <span className="font-extrabold">{fmtWeight(preview.flour)}</span></div>
                          <div>Água: <span className="font-extrabold">{fmtWeight(preview.water)}</span></div>
                          <div>Massa Total: <span className="font-extrabold">{fmtWeight(preview.totalDough)}</span></div>
                          <div>Rendimento: <span className="font-extrabold">{preview.totalPães} pães {preview.totalBlocos > 0 && `(${preview.totalBlocos} Bl.)`}</span></div>
                        </div>
                      </div>
                    )
                  })()}

                  <button onClick={handleCreateOrder} className="btn btn-primary w-full h-12 text-sm shadow-md mt-4">
                    🚀 Enviar Ordem de Produção
                  </button>
                </div>

                {/* 2. Assigned / Recent Orders list */}
                <div className="card p-5 bg-white space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-2">📋 Ordens Ativas</h3>
                  
                  {managerOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Nenhuma ordem de produção ativa registrada.</div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                      {managerOrders.map(order => (
                        <div key={order.id} className="p-3 bg-gray-50 border rounded-xl space-y-2 text-xs relative font-semibold">
                          <button onClick={() => deleteBakeryOrder(order.id)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm p-1 font-bold">
                            🗑️
                          </button>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-gray-900">{order.breadName}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          
                          <div className="text-gray-600 space-y-0.5">
                            <div>Responsável: <strong>{order.assignedTo}</strong></div>
                            <div>Farinha: <strong>{fmtWeight(order.recipe.flour)}</strong></div>
                            <div>Rendimento: <strong>{order.recipe.totalPães} pães</strong></div>
                            {order.recipe.totalBlocos > 0 && <div>Divisora: <strong>{order.recipe.totalBlocos} blocos</strong></div>}
                            <div className="text-[10px] text-gray-400 mt-1">Criada em: {order.createdAtHuman}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* ================= TAB 2: CALCULADORA LIVRE ================= */}
        {activeTab === 'calculadora_livre' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Calculator Settings */}
            <div className="card p-5 bg-white space-y-4">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2">🎛️ Parâmetros</h3>
              
              {/* Select Bread */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Selecionar Pão</label>
                <select value={calcState.breadId} 
                  onChange={e => setCalcState({ ...calcState, breadId: e.target.value })}
                  className="input">
                  {allBreads.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Entrada</label>
                <div className="flex border rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setCalcState({ ...calcState, inputMode: 'pães' })}
                    className={`flex-1 py-1.5 text-xs font-semibold ${calcState.inputMode === 'pães' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    Pães
                  </button>
                  {allBreads.find(b => b.id === calcState.breadId)?.divisor > 1 && (
                    <button type="button" onClick={() => setCalcState({ ...calcState, inputMode: 'blocos' })}
                      className={`flex-1 py-1.5 text-xs font-semibold ${calcState.inputMode === 'blocos' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                      Blocos
                    </button>
                  )}
                  <button type="button" onClick={() => setCalcState({ ...calcState, inputMode: 'farinha' })}
                    className={`flex-1 py-1.5 text-xs font-semibold ${calcState.inputMode === 'farinha' ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    Farinha
                  </button>
                </div>
              </div>

              {/* Dynamic input quantity */}
              <div>
                {calcState.inputMode === 'pães' && (
                  <>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Quantidade de Pães</label>
                    <input type="number" min={1} value={calcState.quantity}
                      onChange={e => setCalcState({ ...calcState, quantity: Number(e.target.value) })}
                      className="input" />
                  </>
                )}
                {calcState.inputMode === 'blocos' && (
                  <>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Quantidade de Blocos (30 p/cada)</label>
                    <input type="number" min={1} value={calcState.blocks}
                      onChange={e => setCalcState({ ...calcState, blocks: Number(e.target.value) })}
                      className="input" />
                  </>
                )}
                {calcState.inputMode === 'farinha' && (
                  <>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Quantidade de Farinha (Kg)</label>
                    <input type="number" step="0.1" min={0.1} value={calcState.flourKg}
                      onChange={e => setCalcState({ ...calcState, flourKg: Number(e.target.value) })}
                      className="input" />
                  </>
                )}
              </div>

              {/* Fermentation details */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Temperatura Ambiente</label>
                <select value={calcState.tempMode} 
                  onChange={e => setCalcState({ ...calcState, tempMode: e.target.value })}
                  className="input">
                  <option value="frio">Frio (&lt; 20°C)</option>
                  <option value="ameno">Ameno (20-25°C)</option>
                  <option value="quente">Quente (25-30°C)</option>
                  <option value="muito_quente">Muito Quente (&gt; 30°C)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tempo de Fermentação</label>
                <select value={calcState.timeMode} 
                  onChange={e => setCalcState({ ...calcState, timeMode: e.target.value })}
                  className="input">
                  <option value="rapida">Rápido (1 - 2 horas)</option>
                  <option value="media">Médio (3 - 5 horas)</option>
                  <option value="longa">Longo (6 - 12 horas)</option>
                  <option value="geladeira">Geladeira (12 - 24 horas)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Fermento</label>
                <select value={calcState.yeastType} 
                  onChange={e => setCalcState({ ...calcState, yeastType: e.target.value })}
                  className="input">
                  <option value="fresco">Fresco (Biológico)</option>
                  <option value="seco">Seco (Instantâneo)</option>
                </select>
              </div>

              {/* Recipe custom ratios toggles */}
              <div className="border-t border-gray-100 pt-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Relação de Ingredientes (%)</span>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-700 font-bold mb-1">
                      <span>Hidratação (Água)</span>
                      <span>{calcState.hydrationPct}%</span>
                    </div>
                    <input type="range" min={35} max={65} value={calcState.hydrationPct}
                      onChange={e => setCalcState({ ...calcState, hydrationPct: Number(e.target.value) })}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-700 font-bold mb-1">
                      <span>Sal</span>
                      <span>{calcState.saltPct}%</span>
                    </div>
                    <input type="range" min={1} max={3} step={0.1} value={calcState.saltPct}
                      onChange={e => setCalcState({ ...calcState, saltPct: Number(e.target.value) })}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  </div>
                </div>
              </div>

            </div>

            {/* Recipe Output Display */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Output Ingredients List */}
              <div className="card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-extrabold text-xl text-gray-900">Receita Calculada</h3>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Rendimento Estimado</span>
                    <span className="font-black text-amber-600 text-lg">
                      {freeRecipe.totalPães} pães
                      {freeRecipe.totalBlocos > 0 && ` (${freeRecipe.totalBlocos} Blocos)`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 border rounded-xl">
                    <span className="text-xs text-gray-500 block">Massa Total</span>
                    <span className="font-black text-lg text-gray-900">{fmtWeight(freeRecipe.totalDough)}</span>
                  </div>
                  <div className="p-3 bg-gray-50 border rounded-xl">
                    <span className="text-xs text-gray-500 block">Farinha Necessária</span>
                    <span className="font-black text-lg text-gray-900">{fmtWeight(freeRecipe.flour)}</span>
                  </div>
                  <div className="p-3 bg-gray-50 border rounded-xl col-span-2 md:col-span-1">
                    <span className="text-xs text-gray-500 block">Água Hidratação</span>
                    <span className="font-black text-lg text-gray-900">{fmtWeight(freeRecipe.water)}</span>
                  </div>
                </div>

                <div className="space-y-2 font-semibold">
                  <div className="flex items-center justify-between p-3.5 bg-amber-50/40 border border-amber-100 rounded-xl">
                    <span className="font-bold text-gray-800">Farinha de Trigo</span>
                    <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.flour)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/30 border border-blue-100 rounded-xl">
                    <span className="font-bold text-gray-800">Água Gelada (ou Gelo)</span>
                    <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.water)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl">
                    <span className="font-semibold text-gray-800">
                      Fermento Biológico ({calcState.yeastType === 'seco' ? 'Seco' : 'Fresco'})
                    </span>
                    <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.yeast)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl">
                    <span className="font-semibold text-gray-800">Sal</span>
                    <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.salt)}</span>
                  </div>

                  {freeRecipe.sugar > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl">
                      <span className="font-semibold text-gray-800">Açúcar</span>
                      <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.sugar)}</span>
                    </div>
                  )}

                  {freeRecipe.fat > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl">
                      <span className="font-semibold text-gray-800">Margarina / Gordura</span>
                      <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.fat)}</span>
                    </div>
                  )}

                  {freeRecipe.improver > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl">
                      <span className="font-semibold text-gray-800">Melhorador / Aditivo</span>
                      <span className="font-extrabold text-lg text-gray-900">{fmtWeight(freeRecipe.improver)}</span>
                    </div>
                  )}
                </div>

                {/* Professional Bakery Tips Box */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-xs space-y-2 text-orange-950 font-semibold leading-relaxed">
                  <div className="font-black text-sm text-orange-900 uppercase">💡 Dicas de Padronização para Melhor Qualidade:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Controle da masseira:</strong> Temperatura ambiente quente dita o uso de água gelada. Em dias de calor (&gt;28°C), misture escamas de gelo na água da receita.
                    </li>
                    <li>
                      <strong>Ponto de véu:</strong> A massa deve alcançar a elasticidade ideal sem rasgar ao abrir uma fina película com os dedos. Isso garante uma pestana aberta no forno e casca crocante.
                    </li>
                    <li>
                      <strong>Fórmula de Padeiro:</strong> A farinha de trigo é 100%. Os outros ingredientes mudam de peso seguindo a proporção da farinha, o que garante a consistência, sabor e maciez.
                    </li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= TAB 3: CONFIG PAES (Cadastros) ================= */}
        {activeTab === 'config_paes' && isManager && (
          <div className="space-y-6">
            
            {/* Bread Forms */}
            {breadFormOpen ? (
              <div className="card p-5 bg-white space-y-4 max-w-lg mx-auto">
                <h3 className="font-bold text-gray-900 text-lg border-b pb-2">
                  {editingBreadId ? '✏️ Editar Tipo de Pão' : '➕ Novo Tipo de Pão'}
                </h3>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Nome do Pão</label>
                  <input type="text" placeholder="Ex: Pão de Forma, Pão de Hambúrguer" value={breadForm.name}
                    onChange={e => setBreadForm({ ...breadForm, name: e.target.value })}
                    className="input" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Categoria</label>
                  <select value={breadForm.category}
                    onChange={e => setBreadForm({ ...breadForm, category: e.target.value })}
                    className="input">
                    <option value="pao_de_sal">Pão de Sal / Francês (Massa Básica)</option>
                    <option value="massa_fina">Pão de Massa Fina (Pão Doce / Brioche)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Peso Médio da Unidade de Pão Crua (g)</label>
                  <input type="number" min={5} value={breadForm.unitWeightG}
                    onChange={e => setBreadForm({ ...breadForm, unitWeightG: Number(e.target.value) })}
                    className="input" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Divisor da Máquina (Divisora)</label>
                  <select value={breadForm.divisor}
                    onChange={e => setBreadForm({ ...breadForm, divisor: Number(e.target.value) })}
                    className="input">
                    <option value={1}>Sem divisor (Modelagem Manual Individual)</option>
                    <option value={30}>Divisora de 30 pães (Suíço, etc.)</option>
                    <option value={36}>Divisora de 36 pães</option>
                  </select>
                </div>

                {breadForm.divisor > 1 && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Peso Total do Bloco na Divisora (g)</label>
                    <input type="number" min={100} value={breadForm.blockWeightG}
                      onChange={e => setBreadForm({ ...breadForm, blockWeightG: Number(e.target.value) })}
                      className="input" />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Peso recomendado para {breadForm.unitWeightG}g/pão: **{breadForm.divisor * breadForm.unitWeightG}g**
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setBreadFormOpen(false); setEditingBreadId(null); }} className="btn btn-ghost flex-1">Cancelar</button>
                  <button onClick={handleSaveBread} className="btn btn-primary flex-1">Salvar Pão</button>
                </div>

              </div>
            ) : (
              <div className="card p-5 bg-white">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">🥖 Cadastro de Pães do Estabelecimento</h3>
                  <button onClick={() => { setBreadFormOpen(true); setEditingBreadId(null); }}
                    className="btn btn-primary text-xs">
                    ➕ Adicionar Pão
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Default breads (read-only) */}
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Padrões do Sistema</div>
                  {DEFAULT_BREADS.map(b => (
                    <div key={b.id} className="p-3 bg-gray-50 border rounded-xl flex items-center justify-between opacity-80">
                      <div>
                        <div className="font-bold text-gray-800">{b.name} <span className="text-xs text-gray-500 font-semibold">({b.category === 'pao_de_sal' ? 'Sal' : 'Massa Fina'})</span></div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Peso unitário: {b.unitWeightG}g 
                          {b.divisor > 1 && ` • Máquina Divisora: Divisão por ${b.divisor} (Bloco de ${(b.blockWeightG || 1500) / 1000}kg)`}
                        </div>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">Original</span>
                    </div>
                  ))}

                  {/* Custom breads (editable) */}
                  {customBreads.length > 0 && (
                    <>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2">Pães Customizados</div>
                      {customBreads.map(b => (
                        <div key={b.id} className="p-3 bg-white border rounded-xl flex items-center justify-between shadow-sm font-semibold">
                          <div>
                            <div className="font-bold text-gray-800">{b.name} <span className="text-xs text-gray-500 font-semibold">({b.category === 'pao_de_sal' ? 'Sal' : 'Massa Fina'})</span></div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Peso unitário: {b.unitWeightG}g 
                              {b.divisor > 1 && ` • Máquina Divisora: Divisão por ${b.divisor} (Bloco de ${(b.blockWeightG || 1500) / 1000}kg)`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditBread(b)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100">Editar</button>
                            <button onClick={() => handleDeleteBread(b.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100">Excluir</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  )
}
