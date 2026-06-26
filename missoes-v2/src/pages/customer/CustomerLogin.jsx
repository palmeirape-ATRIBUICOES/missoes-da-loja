import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { STORE_MAP } from '../../utils/constants'

export default function CustomerLogin() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { customersAll } = useStore()
  
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const storeEntry = Object.values(STORE_MAP).find(s => s.id === storeId) || STORE_MAP.loja_principal

  function handleLogin(e) {
    e.preventDefault()
    if (!phone || !password) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    const cleanedPhone = phone.replace(/[^\d]/g, '')
    setLoading(true)

    // Lookup customer in local store cache
    const customer = customersAll.find(c => c.id === cleanedPhone)

    if (!customer) {
      alert('Cliente não cadastrado ou WhatsApp incorreto.')
      setLoading(false)
      return
    }

    if (customer.password !== password) {
      alert('Senha incorreta. Verifique os dados digitados.')
      setLoading(false)
      return
    }

    if (customer.status === 'pending') {
      alert('Seu cadastro está pendente de aprovação pela gerência. Por favor, aguarde a ativação de sua conta.')
      setLoading(false)
      return
    }

    if (customer.status === 'inactive') {
      alert('Sua conta foi inativada pela gerência. Entre em contato com a loja para mais informações.')
      setLoading(false)
      return
    }

    // Save customer session in localStorage
    localStorage.setItem(`mdl_customer_${storeId}`, JSON.stringify({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      email: customer.email
    }))

    // Redirect to store page
    navigate(`/cliente/${storeId}/loja`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-4"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.12), transparent 50%), #f8fafc' }}>
      
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-6 animate-slide-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{storeEntry.shortName}</h1>
          <p className="text-sm text-gray-500 mt-1">Área do Cliente • Faça seu Login</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 animate-slide-up"
          style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Seu WhatsApp</label>
              <input
                type="tel"
                required
                placeholder="Ex: 81999998888"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input h-13 text-base bg-gray-50 border-gray-200 focus:border-brand-500 rounded-2xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sua Senha</label>
              <input
                type="password"
                required
                placeholder="Insira sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input h-13 text-base bg-gray-50 border-gray-200 focus:border-brand-500 rounded-2xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-14 rounded-2xl text-base font-bold shadow-md mt-4 transition-all"
            >
              {loading ? '⏳ Conectando...' : '🚀 Entrar na Loja'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">Não tem conta? </span>
            <button onClick={() => navigate(`/cliente/${storeId}/cadastro`)}
              className="text-xs text-brand-600 font-bold hover:underline">
              Cadastre-se Aqui
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
