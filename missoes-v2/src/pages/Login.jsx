import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { STORE_MAP } from '../utils/constants'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

export default function Login({ mode = 'app' }) {
  const { login } = useAuth()
  const [storeKey, setStoreKey] = useState('loja_principal')
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('store')

  const store = STORE_MAP[storeKey]

  async function handleStoreSelect(sk) {
    setStoreKey(sk)
    setLoading(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'stores', STORE_MAP[sk].id, 'config', 'employees'))
      const raw = snap.exists() ? snap.data().list : []
      const emps = Array.isArray(raw)
        ? raw.filter(e => e?.name && e?.active && (mode !== 'pdv' || e?.canAccessPdv)).map(e => e.name)
        : []
      const manager = STORE_MAP[sk].managerUser
      setUsers([manager, ...emps.filter(n => n !== manager)])
      setStep('user')
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar funcionários.')
    }
    setLoading(false)
  }

  async function handleLogin() {
    if (!selectedUser) return setError('Selecione um usuário.')
    if (!pin) return setError('Digite o PIN.')
    setLoading(true)
    setError('')

    try {
      const pinDoc = await getDoc(doc(db, 'stores', store.id, 'users', selectedUser))
      const savedPin = pinDoc.exists() ? pinDoc.data().pin : store.managerPin

      if (pin !== savedPin && pin !== store.managerPin) {
        setError('PIN incorreto.')
        setLoading(false)
        return
      }
      login(selectedUser, storeKey)
    } catch (e) {
      console.error(e)
      setError('Erro ao verificar PIN.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.08), transparent 70%), #f8fafc' }}>

      <div className="card p-8 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <span className="text-4xl">{mode === 'pdv' ? '🖥️' : '🎯'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {mode === 'pdv' ? 'Caixa PDV' : 'Missões da Loja'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'pdv' ? 'Sistema de Frente de Caixa' : 'Acesso da Equipe'}
          </p>
        </div>

        {/* Step: Store Selection */}
        {step === 'store' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm font-semibold text-gray-700 mb-4 text-center">Selecione a loja:</p>
            {Object.entries(STORE_MAP).map(([key, s]) => (
              <button key={key} onClick={() => handleStoreSelect(key)}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400
                  flex items-center gap-4 transition-all active:scale-[0.97] bg-white"
                style={{ minHeight: 64 }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: s.theme.bg }}>
                  🏪
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">{s.shortName}</div>
                  <div className="text-xs text-gray-500">{s.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: User Selection */}
        {step === 'user' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setStep('store')} className="text-sm text-brand-600 font-semibold mb-2 flex items-center gap-1">
              ← Trocar loja
            </button>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {store.shortName} — Quem é você?
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-auto scrollbar-thin">
              {users.map(u => (
                <button key={u}
                  onClick={() => { setSelectedUser(u); setStep('pin') }}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95
                    ${u === store.managerUser
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-brand-300'}`}
                  style={{ minHeight: 56 }}>
                  {u === store.managerUser ? '👑 ' : '👤 '}{u}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: PIN */}
        {step === 'pin' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => { setStep('user'); setPin('') }} className="text-sm text-brand-600 font-semibold mb-2 flex items-center gap-1">
              ← Trocar usuário
            </button>
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-brand-100 flex items-center justify-center text-2xl mb-2">
                {selectedUser === store.managerUser ? '👑' : '👤'}
              </div>
              <p className="font-bold text-lg text-gray-900">{selectedUser}</p>
              <p className="text-xs text-gray-500">{store.shortName}</p>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Digite seu PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="input text-center text-2xl tracking-[0.5em] font-bold"
                autoFocus
              />
            </div>

            {/* Numpad for touch */}
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((n, i) => (
                <button key={i}
                  onClick={() => {
                    if (n === '⌫') setPin(p => p.slice(0, -1))
                    else if (n !== null) setPin(p => p.length < 6 ? p + String(n) : p)
                  }}
                  disabled={n === null}
                  className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-90
                    ${n === null ? 'invisible' : n === '⌫' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`}>
                  {n !== null ? n : ''}
                </button>
              ))}
            </div>

            <button onClick={handleLogin} disabled={loading || !pin}
              className="btn btn-primary w-full text-lg h-14 disabled:opacity-50">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
