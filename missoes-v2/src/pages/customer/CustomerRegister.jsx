import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { STORE_MAP } from '../../utils/constants'

export default function CustomerRegister() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { saveCustomer, customersAll } = useStore()
  
  const isBogados = (storeId || '').toLowerCase().includes('bogados')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    condo: isBogados ? 'none' : 'dom_pedro_1'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [registeredCondo, setRegisteredCondo] = useState('')

  // Sync condo selection when storeId parameter resolves
  useEffect(() => {
    if (isBogados) {
      setForm(f => ({ ...f, condo: 'none' }))
    }
  }, [storeId, isBogados])

  const storeEntry = Object.values(STORE_MAP).find(s => s.id === storeId) || STORE_MAP.loja_principal

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.name || !form.phone || !form.email || !form.address || !form.password) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    const cleanedPhone = form.phone.replace(/[^\d]/g, '')
    if (cleanedPhone.length < 10) {
      alert('Por favor, insira um número de telefone/WhatsApp válido com DDD.')
      return
    }

    setLoading(true)

    try {
      // Check if customer already exists
      const existing = customersAll.find(c => c.id === cleanedPhone)
      if (existing) {
        alert('Este número de WhatsApp já está cadastrado. Tente fazer login.')
        setLoading(false)
        return
      }

      await saveCustomer({
        id: cleanedPhone,
        name: form.name.trim(),
        phone: cleanedPhone,
        email: form.email.trim().toLowerCase(),
        address: form.address.trim(),
        password: form.password,
        condo: isBogados ? 'none' : form.condo,
        status: 'active', // Automatic approval/activation
        createdAt: new Date().toISOString()
      })

      // Save customer session in localStorage for immediate access
      localStorage.setItem(`mdl_customer_${storeId}`, JSON.stringify({
        id: cleanedPhone,
        name: form.name.trim(),
        phone: cleanedPhone,
        address: form.address.trim(),
        email: form.email.trim().toLowerCase()
      }))

      // Redirect immediately to store catalog
      navigate(`/cliente/${storeId}/loja`)
    } catch (err) {
      console.error(err)
      alert('Erro ao realizar o cadastro. Tente novamente.')
    }
    setLoading(false)
  }

  if (success) {
    const isCondoApproved = registeredCondo === 'dom_pedro_1' || registeredCondo === 'dom_pedro_2'
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.08), transparent 70%), #f8fafc' }}>
        <div className="bg-white max-w-md w-full p-8 rounded-[2.5rem] shadow-xl border border-gray-100 text-center animate-slide-up">
          {isCondoApproved ? (
            <>
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">
                ✅
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">Cadastro Ativado!</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 font-semibold">
                Seu cadastro foi ativado automaticamente por residir no <strong>{registeredCondo === 'dom_pedro_1' ? 'Condomínio Dom Pedro 1' : 'Condomínio Dom Pedro 2'}</strong>. 
                Você já pode fazer login e realizar seus pedidos imediatamente!
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">
                ⏳
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">Cadastro Enviado!</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 font-semibold">
                Como você mora fora do Condomínio Dom Pedro, seu cadastro foi enviado para a gerência da loja <strong>{storeEntry.shortName}</strong> para análise. 
                Você receberá permissão para comprar assim que for ativado!
              </p>
            </>
          )}
          <button onClick={() => navigate(`/cliente/${storeId}/login`)}
            className="btn btn-primary w-full h-14 rounded-2xl text-base font-bold shadow-md">
            Ir para a Tela de Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-4"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.12), transparent 50%), #f8fafc' }}>
      
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <span className="text-3xl">🤝</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Criar Nova Conta</h1>
          <p className="text-sm text-gray-500 mt-1">{storeEntry.name}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 animate-slide-up">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input h-12 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WhatsApp (com DDD)</label>
              <input
                type="tel"
                required
                placeholder="Ex: 81999998888"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input h-12 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                required
                placeholder="Ex: joao@gmail.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input h-12 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
              />
            </div>

            {!isBogados && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Você mora em condomínio parceiro?</label>
                <select
                  value={form.condo}
                  onChange={e => setForm(f => ({ ...f, condo: e.target.value }))}
                  className="input h-12 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl font-semibold"
                >
                  <option value="dom_pedro_1">Condomínio Dom Pedro 1</option>
                  <option value="dom_pedro_2">Condomínio Dom Pedro 2</option>
                  <option value="none">Não moro em condomínio parceiro</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço Completo de Entrega</label>
              <textarea
                required
                placeholder="Rua, número, bairro, complemento, cidade e ponto de referência"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="input min-h-[80px] py-2 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Criar Senha de Acesso</label>
              <input
                type="password"
                required
                placeholder="Insira sua senha"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input h-12 text-sm bg-gray-50 border-gray-200 focus:border-brand-500 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-13 rounded-2xl text-sm font-bold shadow-md mt-4 transition-all"
            >
              {loading ? '⏳ Cadastrando...' : '🚀 Criar Cadastro'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">Já possui cadastro? </span>
            <button onClick={() => navigate(`/cliente/${storeId}/login`)}
              className="text-xs text-brand-600 font-bold hover:underline">
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
