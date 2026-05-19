import { createContext, useContext, useState, useEffect } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'
import { STORE_MAP, getSession, saveSession, clearSession } from '../utils/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [currentUser, setCurrentUser] = useState('')
  const [storeKey, setStoreKey] = useState('loja_principal')
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

  // Restore session
  useEffect(() => {
    const ses = getSession()
    if (ses?.user && ses?.storeKey && STORE_MAP[ses.storeKey]) {
      setCurrentUser(ses.user)
      setStoreKey(ses.storeKey)
    }
  }, [])

  const store = STORE_MAP[storeKey] || STORE_MAP.loja_principal
  const storeId = store.id
  const isManager = currentUser === store.managerUser

  function login(user, sk) {
    setCurrentUser(user)
    setStoreKey(sk)
    saveSession(user, sk)
  }

  function logout() {
    setCurrentUser('')
    clearSession()
  }

  function switchStore(sk) {
    if (STORE_MAP[sk]) {
      setStoreKey(sk)
      logout()
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
