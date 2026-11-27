// ===== STORE MAP (Multi-tenant) =====
export const STORE_MAP = {
  loja_principal: {
    id: 'loja_principal',
    name: 'Padaria Maná de Deus',
    shortName: 'Maná de Deus',
    managerUser: 'GERENTE',
    managerPin: '1234',
    employeesLegacy: ['Sandra', 'Thauane', 'Ingrid', 'Claudia', 'DADA'],
    whatsapp: '5521964422488',
    theme: { accent: '#7c3aed', bg: '#f5f3ff' }
  },
  loja_bogados: {
    id: 'loja_bogados',
    name: 'Padaria Maná de Deus - Bogados',
    shortName: 'Bogados',
    managerUser: 'BOGADOS - GERENTE',
    managerPin: '1234',
    employeesLegacy: ['bogados'],
    whatsapp: '5521964422488',
    theme: { accent: '#0891b2', bg: '#ecfeff' }
  },
  loja_bar: {
    id: 'loja_bar',
    name: 'Bar',
    shortName: 'Bar',
    managerUser: 'BAR - GERENTE',
    managerPin: '1234',
    employeesLegacy: ['Rafael'],
    whatsapp: '5521964422488',
    theme: { accent: '#ea580c', bg: '#fff7ed' }
  }
}

export const SESSION_KEY = 'mdl_v2_session'
export const TAB_SESSION_KEY = 'mdl_v2_tab_session'

export function normalizePersonKey(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

export function digitsOnly(str) {
  return String(str || '').replace(/\D/g, '')
}

// ===== Date Utilities =====
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0')
}

export function monthKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

export function nowHuman() {
  return new Date().toLocaleString('pt-BR')
}

export function normalizeName(n) {
  return String(n || '').trim()
}

export function normalizeCat(n) {
  return String(n || '').trim()
}

export function normalizeWeekKeyLoose(wk) {
  return String(wk || '').trim().toUpperCase()
}

// ===== Currency =====
export function formatCurrency(val) {
  const n = Number(val) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseCurrency(str) {
  if (!str) return 0
  return Number(String(str).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
}

// ===== Session (Tab-isolated + PWA persistent fallback) =====
export function saveSession(user, storeKey) {
  const payload = JSON.stringify({ user, storeKey, at: Date.now() })
  try { sessionStorage.setItem(TAB_SESSION_KEY, payload) } catch {}
  try { localStorage.setItem(SESSION_KEY, payload) } catch {}
}

export function getSession() {
  try {
    const tabRaw = sessionStorage.getItem(TAB_SESSION_KEY)
    if (tabRaw) {
      const tabObj = JSON.parse(tabRaw)
      if (tabObj?.user && tabObj?.storeKey && STORE_MAP[tabObj.storeKey]) return tabObj
    }
  } catch {}
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (obj?.user && obj?.storeKey && STORE_MAP[obj.storeKey]) {
      // Pin into sessionStorage for this tab so other tabs won't overwrite it
      try { sessionStorage.setItem(TAB_SESSION_KEY, JSON.stringify(obj)) } catch {}
      return obj
    }
    return null
  } catch { return null }
}

export function clearSession() {
  try { sessionStorage.removeItem(TAB_SESSION_KEY) } catch {}
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}
