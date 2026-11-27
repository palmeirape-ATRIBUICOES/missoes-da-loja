import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../config/firebase'
import {
  doc, getDoc, setDoc, deleteDoc, collection, onSnapshot,
  query, orderBy, limit, serverTimestamp, runTransaction, getDocs
} from 'firebase/firestore'
import { useAuth } from './useAuth'
import { weekKey, monthKey, normalizeWeekKeyLoose, nowHuman, STORE_MAP, normalizePersonKey, digitsOnly } from '../utils/constants'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const { storeId: authStoreId, currentUser, isManager } = useAuth()

  // Extract storeId from hash if client route (e.g. #/cliente/loja_principal/...)
  const hash = window.location.hash
  let storeId = authStoreId
  if (hash.includes('/cliente/')) {
    const parts = hash.split('/')
    const found = parts[2]
    if (found) {
      storeId = found.split('?')[0]
    }
  }

  const [currentWeekKey, setCurrentWeekKey] = useState(weekKey())
  const [rawEmployees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [globalsAll, setGlobalsAll] = useState([])
  const [globalTemplates, setGlobalTemplates] = useState([])
  const [tasksAll, setTasksAll] = useState([])
  const [scoresDoc, setScoresDoc] = useState({})
  const [listsAll, setListsAll] = useState([])
  const [feedbackAll, setFeedbackAll] = useState([])
  const [pdvSales, setPdvSales] = useState([])
  const [labelConfig, setLabelConfig] = useState({})
  const [rawContrachequesAll, setContrachequesAll] = useState([])
  const [rawContrachequeEmployees, setContrachequeEmployees] = useState([])
  const [customersAll, setCustomersAll] = useState([])
  const [deliverySlotsAll, setDeliverySlotsAll] = useState([])
  const [customerOrdersAll, setCustomerOrdersAll] = useState([])
  const [bakeryOrdersAll, setBakeryOrdersAll] = useState([])
  const [shoppingListsAll, setShoppingListsAll] = useState([])
  const [financeMonthsAll, setFinanceMonthsAll] = useState([])
  const [financeDaysAll, setFinanceDaysAll] = useState([])
  const [rawFinancePayrollAll, setFinancePayrollAll] = useState([])
  const [otherStoreRegistry, setOtherStoreRegistry] = useState({ names: [], cpfs: [] })
  const [loading, setLoading] = useState(true)
  // Refs
  const cfgRef = (name) => doc(db, 'stores', storeId, 'config', name)
  const stateRef = (name) => doc(db, 'stores', storeId, 'state', name)
  const colRef = (name) => collection(db, 'stores', storeId, name)

  // Trigger high-urgency notifications for manager
  const triggerUrgentNotification = useCallback((customerName) => {
    // 1. Play alert sound (synthesized with Web Audio API for 100% offline support)
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        const ctx = new AudioContextClass()
        const playBeep = (time, freq, duration) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, time)
          gain.gain.setValueAtTime(0, time)
          gain.gain.linearRampToValueAtTime(0.8, time + 0.05)
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(time)
          osc.stop(time + duration)
        }
        const now = ctx.currentTime
        // Alarm chime
        playBeep(now, 587.33, 0.25)
        playBeep(now + 0.15, 698.46, 0.25)
        playBeep(now + 0.3, 880.00, 0.45)
      }
    } catch (e) {
      console.warn('Audio context alert failed:', e)
    }

    // 2. Show native browser/PWA notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'Aprovação Pendente! ⏳'
      const body = `O cliente ${customerName} acabou de se cadastrar e está aguardando aprovação.`
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-192x192.png',
            vibrate: [300, 100, 300, 100, 400],
            tag: 'customer-pending-approval',
            requireInteraction: true,
            renotify: true
          }).catch(err => {
            console.warn('Service worker showNotification failed:', err)
            new Notification(title, { body, requireInteraction: true, tag: 'customer-pending-approval', renotify: true })
          })
        })
      } else {
        new Notification(title, { body, requireInteraction: true, tag: 'customer-pending-approval', renotify: true })
      }
    }
  }, [])

  // Subscribe to all collections
  useEffect(() => {
    if (!storeId) return
    let cancelled = false
    const unsubs = []

    // Immediately clear store-scoped state on store change to prevent any cross-store flash
    setEmployees([])
    setContrachequesAll([])
    setContrachequeEmployees([])
    setFinanceMonthsAll([])
    setFinanceDaysAll([])
    setFinancePayrollAll([])

    // Cross-store employee isolation between Bogados and other stores
    const conflictingStoreIds = storeId === 'loja_bogados'
      ? Object.values(STORE_MAP).map(s => s.id).filter(id => id !== 'loja_bogados')
      : ['loja_bogados']

    const crossSources = {}
    const recomputeCrossRegistry = () => {
      if (cancelled) return
      const names = new Set()
      const cpfs = new Set()
      conflictingStoreIds.forEach(otherId => {
        ;(STORE_MAP[otherId]?.employeesLegacy || []).forEach(n => {
          const nk = normalizePersonKey(n)
          if (nk && nk !== 'BOGADOS') names.add(nk)
        })
      })
      Object.values(crossSources).forEach(arr => {
        ;(arr || []).forEach(item => {
          const nk = normalizePersonKey(item.name)
          if (nk) names.add(nk)
          const ck = digitsOnly(item.cpf)
          if (ck.length >= 11) cpfs.add(ck)
        })
      })
      setOtherStoreRegistry({
        names: Array.from(names),
        cpfs: Array.from(cpfs)
      })
    }
    recomputeCrossRegistry()

    conflictingStoreIds.forEach(otherId => {
      unsubs.push(onSnapshot(doc(db, 'stores', otherId, 'config', 'employees'), (snap) => {
        if (cancelled) return
        const raw = snap.exists() ? snap.data().list : []
        crossSources[`${otherId}_emp`] = Array.isArray(raw) ? raw : []
        recomputeCrossRegistry()
      }, () => {}))

      unsubs.push(onSnapshot(collection(db, 'stores', otherId, 'state/contracheque_employees/items'), (qs) => {
        if (cancelled) return
        crossSources[`${otherId}_ccemp`] = qs.docs.map(d => d.data() || {})
        recomputeCrossRegistry()
      }, () => {}))
    })

    // Employees
    unsubs.push(onSnapshot(cfgRef('employees'), (snap) => {
      if (cancelled) return
      const raw = snap.exists() ? snap.data().list : []
      setEmployees(Array.isArray(raw) ? raw.filter(e => e?.name) : [])
    }))

    // Products
    unsubs.push(onSnapshot(cfgRef('products'), (snap) => {
      const raw = snap.exists() ? snap.data().items : []
      setProducts(Array.isArray(raw) ? raw.filter(p => p?.name) : [])
    }))

    // Global Templates
    unsubs.push(onSnapshot(cfgRef('globalTemplates'), (snap) => {
      const raw = snap.exists() ? snap.data().templates : []
      setGlobalTemplates(Array.isArray(raw) ? raw : [])
    }))

    // Labels config
    unsubs.push(onSnapshot(cfgRef('labels'), (snap) => {
      setLabelConfig(snap.exists() ? snap.data() : {})
    }))

    // Globals
    const globalsQ = query(colRef('globals'), orderBy('createdAt', 'desc'), limit(300))
    unsubs.push(onSnapshot(globalsQ, (qs) => {
      setGlobalsAll(qs.docs.map(d => {
        const o = d.data() || {}
        return { id: d.id, ...o, createdAtMs: o.createdAt?.toMillis?.() || 0 }
      }))
    }))

    // Tasks
    const tasksQ = query(colRef('tasks'), orderBy('createdAt', 'desc'), limit(300))
    unsubs.push(onSnapshot(tasksQ, (qs) => {
      setTasksAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Scores
    unsubs.push(onSnapshot(stateRef('scores'), (snap) => {
      setScoresDoc(snap.exists() ? snap.data() : {})
    }))

    // Lists
    const listsQ = query(colRef('lists'), orderBy('createdAt', 'desc'), limit(200))
    unsubs.push(onSnapshot(listsQ, (qs) => {
      setListsAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Feedback
    const fbQ = query(colRef('feedback'), orderBy('createdAt', 'desc'), limit(200))
    unsubs.push(onSnapshot(fbQ, (qs) => {
      setFeedbackAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // PDV Sales
    const salesQ = query(colRef('pdv_sales'), orderBy('createdAt', 'desc'), limit(500))
    unsubs.push(onSnapshot(salesQ, (qs) => {
      setPdvSales(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Contracheques
    const ccQ = query(colRef('state/contracheques/items'), orderBy('createdAt', 'desc'))
    unsubs.push(onSnapshot(ccQ, (qs) => {
      setContrachequesAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Contracheque Employees
    const ccEmpQ = query(colRef('state/contracheque_employees/items'), orderBy('name', 'asc'))
    unsubs.push(onSnapshot(ccEmpQ, (qs) => {
      setContrachequeEmployees(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Customers
    let isInitialCustomersLoad = true
    const custQ = query(colRef('state/customers/items'), orderBy('createdAt', 'desc'))
    unsubs.push(onSnapshot(custQ, (qs) => {
      const items = qs.docs.map(d => ({ id: d.id, ...d.data() }))
      setCustomersAll(items)
      
      if (isManager && !isInitialCustomersLoad) {
        qs.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data()
            if (data.status === 'pending') {
              triggerUrgentNotification(data.name || 'Cliente')
            }
          }
        })
      }
      isInitialCustomersLoad = false
    }))

    // Delivery slots
    const slotsQ = query(colRef('state/delivery_slots/items'), orderBy('date', 'asc'), orderBy('timeStart', 'asc'))
    unsubs.push(onSnapshot(slotsQ, (qs) => {
      setDeliverySlotsAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Customer orders
    const ordersQ = query(colRef('state/customer_orders/items'), orderBy('createdAt', 'desc'))
    unsubs.push(onSnapshot(ordersQ, (qs) => {
      setCustomerOrdersAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Bakery orders
    const bakeryQ = query(colRef('bakery_orders'), orderBy('createdAt', 'desc'), limit(150))
    unsubs.push(onSnapshot(bakeryQ, (qs) => {
      setBakeryOrdersAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Shopping lists
    const shoppingQ = query(colRef('shopping_lists'))
    unsubs.push(onSnapshot(shoppingQ, (qs) => {
      const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0))
      setShoppingListsAll(docs)
    }, (err) => {
      console.warn('shopping_lists snapshot error:', err)
    }))

    // Admin Finance (Manager only)
    if (isManager) {
      const finMonthsQ = query(colRef('state/finance_months/items'))
      unsubs.push(onSnapshot(finMonthsQ, (qs) => {
        const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => String(b.monthKey || b.id).localeCompare(String(a.monthKey || a.id)))
        setFinanceMonthsAll(docs)
      }, (err) => console.warn('finance_months snapshot error:', err)))

      const finDaysQ = query(colRef('state/finance_days/items'))
      unsubs.push(onSnapshot(finDaysQ, (qs) => {
        const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => String(b.date || b.id).localeCompare(String(a.date || a.id)))
        setFinanceDaysAll(docs)
      }, (err) => console.warn('finance_days snapshot error:', err)))

      const finPayrollQ = query(colRef('state/finance_payroll/items'))
      unsubs.push(onSnapshot(finPayrollQ, (qs) => {
        const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || ((b.updatedAtMs || 0) - (a.updatedAtMs || 0)))
        setFinancePayrollAll(docs)
      }, (err) => console.warn('finance_payroll snapshot error:', err)))
    } else {
      setFinanceMonthsAll([])
      setFinanceDaysAll([])
      setFinancePayrollAll([])
    }

    setLoading(false)
    return () => {
      cancelled = true
      unsubs.forEach(u => u())
    }
  }, [storeId, isManager])

  const forbiddenNamesSet = useMemo(() => new Set(otherStoreRegistry.names || []), [otherStoreRegistry])
  const forbiddenCpfsSet = useMemo(() => new Set(otherStoreRegistry.cpfs || []), [otherStoreRegistry])

  const isForbiddenCrossStoreEmployee = useCallback((name, cpf = '') => {
    const nk = normalizePersonKey(name)
    const ck = digitsOnly(cpf)
    if (ck.length >= 11 && forbiddenCpfsSet.has(ck)) return true
    if (nk && forbiddenNamesSet.has(nk)) return true
    return false
  }, [forbiddenNamesSet, forbiddenCpfsSet])

  const employees = useMemo(
    () => rawEmployees.filter(e => (!e.storeId || e.storeId === storeId) && !isForbiddenCrossStoreEmployee(e.name, e.cpf)),
    [rawEmployees, storeId, isForbiddenCrossStoreEmployee]
  )
  const contrachequeEmployees = useMemo(
    () => rawContrachequeEmployees.filter(e => (!e.storeId || e.storeId === storeId) && !isForbiddenCrossStoreEmployee(e.name, e.cpf)),
    [rawContrachequeEmployees, storeId, isForbiddenCrossStoreEmployee]
  )
  const contrachequesAll = useMemo(
    () => rawContrachequesAll.filter(cc => (!cc.storeId || cc.storeId === storeId) && !isForbiddenCrossStoreEmployee(cc.employee, cc.cpf)),
    [rawContrachequesAll, storeId, isForbiddenCrossStoreEmployee]
  )
  const financePayrollAll = useMemo(
    () => rawFinancePayrollAll.filter(p => (!p.storeId || p.storeId === storeId) && !isForbiddenCrossStoreEmployee(p.employeeName)),
    [rawFinancePayrollAll, storeId, isForbiddenCrossStoreEmployee]
  )

  // Computed
  const wk = normalizeWeekKeyLoose(currentWeekKey)
  const globalsWeek = globalsAll.filter(g => normalizeWeekKeyLoose(g.weekKey) === wk)
  const globalsOpen = globalsWeek.filter(g => g.status === 'open')
  const globalsReview = globalsWeek.filter(g => g.status === 'review' || g.status === 'completed')
  const activeEmployees = employees.filter(e => e.active)
  const activeNames = activeEmployees.map(e => e.name)

  function getMonthPoints(user) {
    const mk = monthKey()
    return Number(scoresDoc?.monthScores?.[mk]?.[user] || 0)
  }

  // ===== CRUD Operations =====
  async function saveProduct(product) {
    const existing = products.findIndex(p => p.id === product.id)
    let next
    if (existing >= 0) {
      next = products.map(p => p.id === product.id ? { ...p, ...product, updatedAt: nowHuman() } : p)
    } else {
      next = [...products, { ...product, id: 'p_' + Date.now().toString(36), createdAt: nowHuman() }]
    }
    await setDoc(cfgRef('products'), { items: next, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function deleteProduct(id) {
    const next = products.filter(p => p.id !== id)
    await setDoc(cfgRef('products'), { items: next, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function savePdvSale(sale) {
    const ref = doc(colRef('pdv_sales'))
    await setDoc(ref, {
      ...sale,
      storeId,
      createdAt: serverTimestamp(),
      createdAtHuman: nowHuman()
    })
  }

  async function updateGlobal(globalId, data) {
    await setDoc(doc(db, 'stores', storeId, 'globals', globalId), data, { merge: true })
  }

  async function deleteGlobalDoc(globalId) {
    const gDoc = globalsAll.find(x => x.id === globalId)
    if (gDoc?.templateId) {
      const tpl = globalTemplates.find(t => t.id === gDoc.templateId)
      if (tpl) {
        const cancelled = Array.isArray(tpl.cancelledWeeks) ? [...tpl.cancelledWeeks] : []
        if (!cancelled.includes(wk)) cancelled.push(wk)
        const next = globalTemplates.map(t =>
          t.id === tpl.id ? { ...t, cancelledWeeks: cancelled } : t
        )
        await setDoc(cfgRef('globalTemplates'), { templates: next, updatedAt: serverTimestamp() }, { merge: false })
      }
    }
    await deleteDoc(doc(db, 'stores', storeId, 'globals', globalId))
  }

  async function publishGlobal(tpl, isAuto = false) {
    const docId = isAuto ? `auto_${wk}_${tpl.id}` : undefined
    const docRef = docId ? doc(db, 'stores', storeId, 'globals', docId) : doc(colRef('globals'))

    if (isAuto) {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef)
        if (snap.exists()) return
        tx.set(docRef, {
          weekKey: currentWeekKey, status: 'open', name: tpl.name,
          items: tpl.items || [], templateId: tpl.id || '',
          createdAt: serverTimestamp(), createdAtHuman: nowHuman(),
          createdBy: 'Sistema Automático', isAuto: true
        })
      })
    } else {
      await setDoc(docRef, {
        weekKey: currentWeekKey, status: 'open', name: tpl.name,
        items: tpl.items || [], templateId: tpl.id || '',
        createdAt: serverTimestamp(), createdAtHuman: nowHuman(),
        createdBy: currentUser
      })
    }
  }

  async function saveEmployees(list) {
    const blocked = (list || []).find(e => isForbiddenCrossStoreEmployee(e?.name, e?.cpf))
    if (blocked) {
      throw new Error(`O funcionário "${blocked.name}" pertence a outra loja e não pode ser vinculado a esta unidade.`)
    }
    const cleanList = (list || []).map(e => ({ ...e, storeId }))
    await setDoc(cfgRef('employees'), { list: cleanList, storeId, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function saveLabelConfig(config) {
    await setDoc(cfgRef('labels'), { ...config, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function saveContrachequeDoc(cc) {
    if (isForbiddenCrossStoreEmployee(cc?.employee, cc?.cpf)) {
      throw new Error(`O funcionário "${cc.employee}" pertence a outra loja e não pode ter contracheque gerado nesta unidade.`)
    }
    const ref = cc.id ? doc(db, 'stores', storeId, 'state/contracheques/items', cc.id) : doc(colRef('state/contracheques/items'))
    await setDoc(ref, {
      ...cc,
      storeId,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteContrachequeDoc(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/contracheques/items', id))
  }

  async function saveContrachequeEmployee(emp) {
    if (isForbiddenCrossStoreEmployee(emp?.name, emp?.cpf)) {
      throw new Error(`O funcionário "${emp.name}" pertence a outra loja e não pode ser cadastrado nesta unidade.`)
    }
    const ref = emp.id ? doc(db, 'stores', storeId, 'state/contracheque_employees/items', emp.id) : doc(colRef('state/contracheque_employees/items'))
    await setDoc(ref, {
      ...emp,
      storeId,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteContrachequeEmployee(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/contracheque_employees/items', id))
  }

  async function saveCustomer(c) {
    const ref = doc(db, 'stores', storeId, 'state/customers/items', c.id)
    await setDoc(ref, {
      ...c,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteCustomer(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/customers/items', id))
  }

  async function saveDeliverySlot(s) {
    const ref = s.id ? doc(db, 'stores', storeId, 'state/delivery_slots/items', s.id) : doc(colRef('state/delivery_slots/items'))
    const finalId = s.id || ref.id
    await setDoc(ref, {
      ...s,
      id: finalId,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteDeliverySlot(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/delivery_slots/items', id))
  }

  async function saveCustomerOrder(o) {
    const ref = o.id ? doc(db, 'stores', storeId, 'state/customer_orders/items', o.id) : doc(colRef('state/customer_orders/items'))
    const finalId = o.id || ref.id
    await setDoc(ref, {
      ...o,
      id: finalId,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteCustomerOrder(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/customer_orders/items', id))
  }

  async function saveMultipleProducts(itemsToSave) {
    let next = [...products]
    itemsToSave.forEach(product => {
      const existingIndex = next.findIndex(p => p.id === product.id)
      if (existingIndex >= 0) {
        next = next.map(p => p.id === product.id ? { ...p, ...product, updatedAt: nowHuman() } : p)
      } else {
        const newId = product.id || 'p_' + Math.random().toString(36).substring(2, 9)
        next.push({ ...product, id: newId, createdAt: nowHuman() })
      }
    })
    await setDoc(cfgRef('products'), { items: next, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function updateProductsStock(cartItems, isRefund = false) {
    const next = products.map(p => {
      const cartItem = cartItems.find(item => item.id === p.id)
      if (cartItem) {
        const currentStock = Number(p.stock) || 0
        const delta = Number(cartItem.quantity) || 0
        const nextStock = isRefund ? (currentStock + delta) : Math.max(0, currentStock - delta)
        return { ...p, stock: nextStock }
      }
      return p
    })
    await setDoc(cfgRef('products'), { items: next, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function saveBakeryOrder(order) {
    const ref = order.id ? doc(db, 'stores', storeId, 'bakery_orders', order.id) : doc(colRef('bakery_orders'))
    const newId = order.id || ref.id
    await setDoc(ref, {
      ...order,
      id: newId,
      updatedAt: serverTimestamp(),
      ...(order.id ? {} : { createdAt: serverTimestamp(), createdAtHuman: nowHuman() })
    }, { merge: true })
  }

  async function deleteBakeryOrder(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'bakery_orders', id))
  }

  async function saveShoppingList(list) {
    const listId = list.id || ('shop_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6))
    const ref = doc(db, 'stores', storeId, 'shopping_lists', listId)

    const now = Date.now()
    const cleanData = JSON.parse(JSON.stringify({
      title: list.title || 'Nova Lista',
      category: list.category || 'Geral',
      notes: list.notes || '',
      items: (list.items || []).map(i => ({
        id: i.id || ('item_' + Math.random().toString(36).slice(2, 6)),
        name: i.name || '',
        qty: i.qty || '1 un',
        bought: !!i.bought,
        ...(i.productId ? { productId: i.productId } : {})
      })),
      status: list.status || 'pending',
      updatedAtMs: now,
      updatedBy: currentUser || 'Usuário',
      createdAtHuman: list.createdAtHuman || nowHuman(),
      createdBy: list.createdBy || currentUser || 'Usuário',
      id: listId
    }))

    await setDoc(ref, {
      ...cleanData,
      updatedAt: serverTimestamp(),
      ...(list.id ? {} : { createdAt: serverTimestamp() })
    }, { merge: true })

    return listId
  }

  async function deleteShoppingList(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'shopping_lists', id))
  }

  // ===== Admin Finance CRUD =====
  async function saveFinanceMonth(monthData) {
    const mk = String(monthData.monthKey || monthData.id || '').trim()
    if (!mk) throw new Error('Mês inválido')
    const ref = doc(db, 'stores', storeId, 'state/finance_months/items', mk)
    const clean = JSON.parse(JSON.stringify({
      id: mk,
      monthKey: mk,
      openingBalance: Number(monthData.openingBalance) || 0,
      revenueGoal: Number(monthData.revenueGoal) || 0,
      status: monthData.status || 'open',
      notes: String(monthData.notes || '').trim(),
      openedBy: monthData.openedBy || currentUser || 'GERENTE',
      openedAtHuman: monthData.openedAtHuman || nowHuman(),
      updatedBy: currentUser || 'GERENTE',
      updatedAtMs: Date.now()
    }))
    await setDoc(ref, {
      ...clean,
      updatedAt: serverTimestamp()
    }, { merge: true })
    return mk
  }

  async function deleteFinanceMonth(mk) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/finance_months/items', mk))
  }

  async function saveFinanceDay(dayData) {
    const dateStr = String(dayData.date || dayData.id || '').trim()
    if (!dateStr) throw new Error('Data inválida')
    const mk = dateStr.slice(0, 7)
    const ref = doc(db, 'stores', storeId, 'state/finance_days/items', dateStr)

    const inf = dayData.inflows || {}
    const inflows = {
      credito: Math.max(0, Number(inf.credito) || 0),
      debito: Math.max(0, Number(inf.debito) || 0),
      voucher: Math.max(0, Number(inf.voucher) || 0),
      pix: Math.max(0, Number(inf.pix) || 0),
      dinheiro: Math.max(0, Number(inf.dinheiro) || 0)
    }

    const extraInflows = (dayData.extraInflows || []).map(item => ({
      id: item.id || ('in_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
      name: String(item.name || 'Entrada Avulsa').trim(),
      amount: Math.max(0, Number(item.amount) || 0),
      notes: String(item.notes || '').trim()
    })).filter(i => i.amount > 0)

    const outflows = (dayData.outflows || []).map(item => ({
      id: item.id || ('out_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
      category: item.category || 'outros',
      name: String(item.name || 'Despesa').trim(),
      amount: Math.max(0, Number(item.amount) || 0),
      paymentMethod: item.paymentMethod || 'dinheiro',
      notes: String(item.notes || '').trim()
    })).filter(o => o.amount > 0)

    const baseInflowSum = inflows.credito + inflows.debito + inflows.voucher + inflows.pix + inflows.dinheiro
    const extraInflowSum = extraInflows.reduce((acc, x) => acc + x.amount, 0)
    const totalInflows = Math.round((baseInflowSum + extraInflowSum) * 100) / 100
    const totalOutflows = Math.round(outflows.reduce((acc, x) => acc + x.amount, 0) * 100) / 100
    const netDay = Math.round((totalInflows - totalOutflows) * 100) / 100

    const clean = JSON.parse(JSON.stringify({
      id: dateStr,
      date: dateStr,
      monthKey: mk,
      inflows,
      extraInflows,
      outflows,
      totalInflows,
      totalOutflows,
      netDay,
      notes: String(dayData.notes || '').trim(),
      updatedBy: currentUser || 'GERENTE',
      updatedAtHuman: nowHuman(),
      updatedAtMs: Date.now()
    }))

    await setDoc(ref, {
      ...clean,
      updatedAt: serverTimestamp()
    }, { merge: false })
    return dateStr
  }

  async function deleteFinanceDay(dateStr) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/finance_days/items', dateStr))
  }

  async function saveFinancePayroll(payData) {
    if (isForbiddenCrossStoreEmployee(payData?.employeeName)) {
      throw new Error(`O funcionário "${payData.employeeName}" pertence a outra loja e não pode ser lançado no caixa desta unidade.`)
    }
    const payId = payData.id || ('pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6))
    const dateStr = String(payData.date || '').trim()
    if (!dateStr) throw new Error('Data do pagamento obrigatória')
    const mk = dateStr.slice(0, 7)
    const ref = doc(db, 'stores', storeId, 'state/finance_payroll/items', payId)

    const clean = JSON.parse(JSON.stringify({
      id: payId,
      storeId,
      date: dateStr,
      monthKey: mk,
      referenceMonth: String(payData.referenceMonth || mk).trim(),
      employeeName: String(payData.employeeName || '').trim(),
      paymentType: payData.paymentType || 'salario',
      amount: Math.max(0, Number(payData.amount) || 0),
      paymentMethod: payData.paymentMethod || 'dinheiro',
      notes: String(payData.notes || '').trim(),
      contrachequeId: String(payData.contrachequeId || '').trim(),
      updatedBy: currentUser || 'GERENTE',
      createdAtHuman: payData.createdAtHuman || nowHuman(),
      updatedAtMs: Date.now()
    }))

    await setDoc(ref, {
      ...clean,
      updatedAt: serverTimestamp(),
      ...(payData.id ? {} : { createdAt: serverTimestamp() })
    }, { merge: true })
    return payId
  }

  async function deleteFinancePayroll(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/finance_payroll/items', id))
  }

  async function incrementEmployeePoints(user, amount) {
    const ref = stateRef('scores')
    const snap = await getDoc(ref)
    const data = snap.exists() ? snap.data() : { monthScores: {} }
    const mk = monthKey()
    if (!data.monthScores) data.monthScores = {}
    if (!data.monthScores[mk]) data.monthScores[mk] = {}
    const current = Number(data.monthScores[mk][user] || 0)
    data.monthScores[mk][user] = current + amount
    await setDoc(ref, data, { merge: true })
  }

  return (
    <StoreContext.Provider value={{
      currentWeekKey, setCurrentWeekKey,
      employees, activeEmployees, activeNames, products,
      globalsAll, globalsWeek, globalsOpen, globalsReview, globalTemplates,
      tasksAll, scoresDoc, listsAll, feedbackAll,
      pdvSales, labelConfig, loading,
      contrachequesAll, contrachequeEmployees,
      customersAll, deliverySlotsAll, customerOrdersAll,
      getMonthPoints,
      saveProduct, deleteProduct, savePdvSale,
      updateGlobal, deleteGlobalDoc, publishGlobal,
      saveEmployees, saveLabelConfig,
      saveContrachequeDoc, deleteContrachequeDoc,
      saveContrachequeEmployee, deleteContrachequeEmployee,
      saveCustomer, deleteCustomer,
      saveDeliverySlot, deleteDeliverySlot,
      saveCustomerOrder, deleteCustomerOrder,
      saveMultipleProducts, updateProductsStock,
      bakeryOrdersAll, saveBakeryOrder, deleteBakeryOrder, incrementEmployeePoints,
      shoppingListsAll, saveShoppingList, deleteShoppingList,
      financeMonthsAll, saveFinanceMonth, deleteFinanceMonth,
      financeDaysAll, saveFinanceDay, deleteFinanceDay,
      financePayrollAll, saveFinancePayroll, deleteFinancePayroll,
      isForbiddenCrossStoreEmployee,
      cfgRef, stateRef, colRef
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
