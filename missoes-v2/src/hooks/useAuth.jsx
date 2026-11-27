import { createContext, useContext, useState, useEffect } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'
import { STORE_MAP, getSession, saveSession, clearSession } from '../utils/constants'

const AuthContext = createContext(null)

function getValidatedInitialSession() {
  const ses = getSession()
  if (!ses?.user || !ses?.storeKey || !STORE_MAP[ses.storeKey]) {
    return { user: '', storeKey: 'loja_principal' }
  }
  // Ensure a manager user from Store A is never restored under Store B
  const allManagerUsers = Object.values(STORE_MAP).map(s => s.managerUser)
  if (allManagerUsers.includes(ses.user) && ses.user !== STORE_MAP[ses.storeKey].managerUser) {
    clearSession()
    return { user: '', storeKey: ses.storeKey }
  }
  return { user: ses.user, storeKey: ses.storeKey }
}

export function AuthProvider({ children }) {
  const initial = getValidatedInitialSession()
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(initial.user)
  const [storeKey, setStoreKey] = useState(initial.storeKey)
  const [loading, setLoading] = useState(true)

  // Firebase anonymous auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user)
      }
      setLoading(false)
    })
    signInAnonymously(auth).catch(console.error)
    return unsub
  }, [])

  const store = STORE_MAP[storeKey] || STORE_MAP.loja_principal
  const storeId = store.id
  const isManager = currentUser === store.managerUser

  function login(user, sk) {
    const validKey = STORE_MAP[sk] ? sk : 'loja_principal'
    setStoreKey(validKey)
    setCurrentUser(user)
    saveSession(user, validKey)
  }

  function logout() {
    setCurrentUser('')
    clearSession()
  }

  function switchStore(sk) {
    if (STORE_MAP[sk]) {
      setCurrentUser('')
      setStoreKey(sk)
      clearSession()
    }
  }

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      currentUser,
      storeKey,
      store,
      storeId,
      isManager,
      loading,
      login,
      logout,
      switchStore
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
