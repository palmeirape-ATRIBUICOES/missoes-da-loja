import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { STORE_MAP, nowHuman } from '../utils/constants'

export default function PublicStore() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [type, setType] = useState(null) // 'feedback' | 'cv'
  const [step, setStep] = useState('select') // select -> form -> success
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    name: '', phone: '', message: '', rating: 5, cvLink: ''
  })

  // Validação da loja
  const storeEntry = Object.values(STORE_MAP).find(s => s.id === storeId)
  if (!storeEntry) {
    return <div className="p-8 text-center text-red-500 font-bold">Loja não encontrada.</div>
  }

  async function handleSubmit() {
    if (type === 'cv' && !form.name) return alert('Preencha seu nome')
    if (type === 'feedback' && !form.message) return alert('Escreva uma mensagem')

    setLoading(true)
    try {
      const docId = `pub_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
      await setDoc(doc(db, 'stores', storeId, 'feedback', docId), {
        type,
        name: form.name || 'Anônimo',
        phone: form.phone,
        message: form.message,
        rating: type === 'feedback' ? form.rating : null,
        cvLink: type === 'cv' ? form.cvLink : null,
        createdAt: serverTimestamp(),
        createdAtHuman: nowHuman(),
        status: 'new'
      })
      setStep('success')
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-4 flex flex-col"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.1), transparent 50%), #f8fafc' }}>
      
      <div className="flex-1 max-w-md w-full mx-auto">
        <div className="text-center mt-8 mb-8 animate-slide-up">
          <div className="w-24 h-24 mx-auto mb-4 rounded-[2rem] flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <span className="text-5xl">🏪</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{storeEntry.shortName}</h1>
          <p className="text-gray-500 mt-2">Canal direto com a gerência</p>
        </div>

        {step === 'select' && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button onClick={() => {
              const session = localStorage.getItem(`mdl_customer_${storeId}`)
              if (session) {
                navigate(`/cliente/${storeId}/loja`)
              } else {
                navigate(`/cliente/${storeId}/login`)
              }
            }}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white p-6 rounded-3xl shadow-md border-0 transition-all flex items-center gap-4 text-left active:scale-95">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🛍️</div>
              <div>
                <h3 className="font-black text-white text-lg">Fazer Pedido / Comprar</h3>
                <p className="text-sm text-white/80 mt-1">Compre online e agende a entrega</p>
              </div>
            </button>

            <button onClick={() => { setType('feedback'); setStep('form') }}
              className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all flex items-center gap-4 text-left active:scale-95">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">⭐</div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Deixar Avaliação</h3>
                <p className="text-sm text-gray-500 mt-1">Elogios, críticas ou sugestões</p>
              </div>
            </button>

            <button onClick={() => { setType('cv'); setStep('form') }}
              className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all flex items-center gap-4 text-left active:scale-95">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">💼</div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Trabalhe Conosco</h3>
                <p className="text-sm text-gray-500 mt-1">Envie seu currículo ou contato</p>
              </div>
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-slide-up">
            <button onClick={() => setStep('select')} className="text-sm text-brand-600 font-bold mb-6 flex items-center gap-1">
              ← Voltar
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {type === 'feedback' ? 'Sua Avaliação' : 'Envie seu Currículo'}
            </h2>

            <div className="space-y-4">
              {type === 'feedback' && (
                <div className="flex justify-center gap-2 mb-6">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setForm(f => ({...f, rating: star}))}
                      className="text-4xl transition-transform active:scale-75"
                      style={{ filter: star <= form.rating ? 'grayscale(0)' : 'grayscale(1)', opacity: star <= form.rating ? 1 : 0.3 }}>
                      ⭐
                    </button>
                  ))}
                </div>
              )}

              {type === 'cv' && (
                <>
                  <input className="input h-14 text-lg bg-gray-50" placeholder="Seu nome completo *" 
                    value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                  <input className="input h-14 text-lg bg-gray-50" placeholder="Telefone / WhatsApp *" type="tel"
                    value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                  <input className="input h-14 text-lg bg-gray-50" placeholder="Link do Currículo (Drive, LinkedIn)" 
                    value={form.cvLink} onChange={e => setForm(f => ({...f, cvLink: e.target.value}))} />
                </>
              )}

              {type === 'feedback' && (
                <input className="input h-14 text-lg bg-gray-50" placeholder="Seu nome (opcional)" 
                  value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              )}

              <textarea className="input bg-gray-50 min-h-[120px] text-lg py-3" 
                placeholder={type === 'feedback' ? "Conta pra gente como foi sua experiência..." : "Resumo da sua experiência (opcional)..."}
                value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />

              <button onClick={handleSubmit} disabled={loading} 
                className="btn btn-primary w-full h-14 text-lg rounded-2xl shadow-md mt-4">
                {loading ? '⏳ Enviando...' : '🚀 Enviar'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center animate-slide-up">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tudo certo!</h2>
            <p className="text-gray-500 mb-8">
              {type === 'feedback' 
                ? 'Sua mensagem foi enviada diretamente para a gerência. Muito obrigado!' 
                : 'Seu currículo está na nossa base. Entraremos em contato se houver vagas.'}
            </p>
            <button onClick={() => { setStep('select'); setForm({name:'', phone:'', message:'', rating:5, cvLink:''}) }} 
              className="btn btn-ghost w-full">
              Enviar outra resposta
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-xs text-gray-400 font-medium">
        Desenvolvido com Antigravity • Missões SaaS
      </div>
    </div>
  )
}
