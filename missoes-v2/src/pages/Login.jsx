import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { STORE_MAP } from '../utils/constants'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

async function sha256(str) {
  const enc = new TextEncoder().encode(str)
  const buf = await crypto.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ mode = 'app' }) {
  const { login } = useAuth()
  const [storeKey, setStoreKey] = useState('loja_principal')
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('store')

  async function handleChangePin() {
    if (!newPin || newPin.length < 4) {
      return setError('O PIN deve conter pelo menos 4 números.')
    }
    if (newPin === '1234') {
      return setError('Escolha um PIN diferente da senha padrão 1234.')
    }
    if (newPin !== newPinConfirm) {
      return setError('Os PINs digitados não são iguais.')
    }
    
    setLoading(true)
    setError('')
    try {
      const hashedPin = await sha256(newPin)
      await setDoc(doc(db, 'stores', store.id, 'users', selectedUser), {
        pin: newPin,
        pinHash: hashedPin,
        changed: true
      })
      login(selectedUser, storeKey)
    } catch (e) {
      console.error(e)
      setError('Erro ao salvar novo PIN.')
    }
    setLoading(false)
  }

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
      // 1. Fetch store document to get the up-to-date managerPin dynamically
      const storeDoc = await getDoc(doc(db, 'stores', store.id))
      const currentManagerPin = (storeDoc.exists() && storeDoc.data().managerPin) 
        ? storeDoc.data().managerPin 
        : '366724'
 
      // 2. Fetch the user's specific PIN
      const pinDoc = await getDoc(doc(db, 'stores', store.id, 'users', selectedUser))
      
      let savedPin = ''
      let savedPinHash = ''
      let isDefaultPin = false

      if (selectedUser === store.managerUser) {
        savedPin = currentManagerPin
      } else {
        if (pinDoc.exists()) {
          savedPin = pinDoc.data().pin || ''
          savedPinHash = pinDoc.data().pinHash || ''
          if (savedPin === '1234' || (!savedPin && !savedPinHash)) {
            isDefaultPin = true
          }
        } else {
          savedPin = '1234'
          isDefaultPin = true
        }
      }
 
      // Check validation: match either cleartext, hash, or manager bypass override
      const hashedEnteredPin = await sha256(pin)
      const isMatch = (pin === savedPin) || 
                      (savedPinHash && hashedEnteredPin === savedPinHash) ||
                      (pin === currentManagerPin)
 
      if (!isMatch) {
        setError('PIN incorreto.')
        setLoading(false)
        return
      }

      if (isDefaultPin && selectedUser !== store.managerUser) {
        setNewPin('')
        setNewPinConfirm('')
        setStep('change_pin')
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
                inputMode="none"
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

        {/* Step: Change PIN */}
        {step === 'change_pin' && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-2">
                🔒
              </div>
              <h3 className="text-lg font-black text-gray-900">Escolha seu PIN único</h3>
              <p className="text-xs text-gray-500 mt-1">
                Como este é seu primeiro acesso, altere a senha padrão <strong>1234</strong> para um novo PIN numérico exclusivo.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Novo PIN (Apenas Números)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="Novo PIN (ex: 4321)"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-lg font-bold tracking-widest focus:border-brand-500 rounded-xl"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Confirme seu Novo PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="Confirme o novo PIN"
                  value={newPinConfirm}
                  onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-lg font-bold tracking-widest focus:border-brand-500 rounded-xl"
                />
              </div>

              <button onClick={handleChangePin} disabled={loading}
                className="btn btn-primary w-full text-lg h-14 mt-4">
                {loading ? 'Salvando...' : 'Salvar Novo PIN e Acessar'}
              </button>

              <button onClick={() => { setError(''); setStep('user'); setPin('') }}
                className="btn btn-ghost w-full text-xs font-bold text-gray-500">
                Cancelar
              </button>
            </div>
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
