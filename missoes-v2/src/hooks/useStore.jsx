import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../config/firebase'
import {
  doc, getDoc, setDoc, deleteDoc, collection, onSnapshot,
  query, orderBy, limit, serverTimestamp, runTransaction, getDocs
} from 'firebase/firestore'
import { useAuth } from './useAuth'
import { weekKey, monthKey, normalizeWeekKeyLoose, nowHuman } from '../utils/constants'

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
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [globalsAll, setGlobalsAll] = useState([])
  const [globalTemplates, setGlobalTemplates] = useState([])
  const [tasksAll, setTasksAll] = useState([])
  const [scoresDoc, setScoresDoc] = useState({})
  const [listsAll, setListsAll] = useState([])
  const [feedbackAll, setFeedbackAll] = useState([])
  const [pdvSales, setPdvSales] = useState([])
  const [labelConfig, setLabelConfig] = useState({})
  const [contrachequesAll, setContrachequesAll] = useState([])
  const [contrachequeEmployees, setContrachequeEmployees] = useState([])
  const [customersAll, setCustomersAll] = useState([])
  const [deliverySlotsAll, setDeliverySlotsAll] = useState([])
  const [customerOrdersAll, setCustomerOrdersAll] = useState([])
  const [bakeryOrdersAll, setBakeryOrdersAll] = useState([])
  const [shoppingListsAll, setShoppingListsAll] = useState([])
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
    const unsubs = []

    // Employees
    unsubs.push(onSnapshot(cfgRef('employees'), (snap) => {
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
    const shoppingQ = query(colRef('shopping_lists'), orderBy('createdAt', 'desc'), limit(150))
    unsubs.push(onSnapshot(shoppingQ, (qs) => {
      setShoppingListsAll(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    setLoading(false)
    return () => unsubs.forEach(u => u())
  }, [storeId])

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
    await setDoc(cfgRef('employees'), { list, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function saveLabelConfig(config) {
    await setDoc(cfgRef('labels'), { ...config, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function saveContrachequeDoc(cc) {
    const ref = cc.id ? doc(db, 'stores', storeId, 'state/contracheques/items', cc.id) : doc(colRef('state/contracheques/items'))
    await setDoc(ref, {
      ...cc,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  async function deleteContrachequeDoc(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'state/contracheques/items', id))
  }

  async function saveContrachequeEmployee(emp) {
    const ref = emp.id ? doc(db, 'stores', storeId, 'state/contracheque_employees/items', emp.id) : doc(colRef('state/contracheque_employees/items'))
    await setDoc(ref, {
      ...emp,
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
    const ref = list.id ? doc(db, 'stores', storeId, 'shopping_lists', list.id) : doc(colRef('shopping_lists'))
    const newId = list.id || ref.id
    await setDoc(ref, {
      ...list,
      id: newId,
      updatedAt: serverTimestamp(),
      ...(list.id ? {} : { createdAt: serverTimestamp(), createdAtHuman: nowHuman(), createdBy: currentUser })
    }, { merge: true })
  }

  async function deleteShoppingList(id) {
    await deleteDoc(doc(db, 'stores', storeId, 'shopping_lists', id))
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
