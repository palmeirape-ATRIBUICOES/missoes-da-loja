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
  const { storeId, currentUser, isManager } = useAuth()

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
  const [loading, setLoading] = useState(true)

  // Refs
  const cfgRef = (name) => doc(db, 'stores', storeId, 'config', name)
  const stateRef = (name) => doc(db, 'stores', storeId, 'state', name)
  const colRef = (name) => collection(db, 'stores', storeId, name)

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

    setLoading(false)
    return () => unsubs.forEach(u => u())
  }, [storeId])

  // Computed
  const wk = normalizeWeekKeyLoose(currentWeekKey)
  const globalsWeek = globalsAll.filter(g => normalizeWeekKeyLoose(g.weekKey) === wk)
  const globalsOpen = globalsWeek.filter(g => g.status === 'open')
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

  return (
    <StoreContext.Provider value={{
      currentWeekKey, setCurrentWeekKey,
      employees, activeEmployees, activeNames, products,
      globalsAll, globalsWeek, globalsOpen, globalTemplates,
      tasksAll, scoresDoc, listsAll, feedbackAll,
      pdvSales, labelConfig, loading,
      getMonthPoints,
      saveProduct, deleteProduct, savePdvSale,
      deleteGlobalDoc, publishGlobal,
      saveEmployees, saveLabelConfig,
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
