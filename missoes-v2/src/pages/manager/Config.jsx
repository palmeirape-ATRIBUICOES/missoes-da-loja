import { useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

export default function Config({ onBack }) {
  const { storeId, currentUser, store } = useAuth()
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(false)

  const publicLink = `${window.location.origin}${window.location.pathname}#/cliente/${storeId}`

  async function updateManagerPin() {
    if (newPin.length < 4) return alert('O PIN deve ter pelo menos 4 dígitos')
    setLoading(true)
    try {
      await setDoc(doc(db, 'stores', storeId), { managerPin: newPin }, { merge: true })
      alert('PIN Mestre atualizado com sucesso!')
      setNewPin('')
    } catch (e) {
      alert('Erro ao atualizar PIN')
    }
    setLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(publicLink)
    alert('Link copiado!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
        <div>
          <div className="font-bold text-gray-900">⚙️ Controle Mestre</div>
          <div className="text-xs text-gray-500">Configurações da Loja</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-2">Segurança</h3>
          <p className="text-sm text-gray-500 mb-4">Atualize o PIN de acesso do Gerente Master.</p>
          
          <div className="flex gap-2">
            <input className="input max-w-[200px]" type="password" placeholder="Novo PIN Mestre"
              value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={6} />
            <button onClick={updateManagerPin} disabled={loading || newPin.length < 4} className="btn btn-primary px-6">
              {loading ? '⏳' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-2">QR Code / Link Público</h3>
          <p className="text-sm text-gray-500 mb-4">
            Este é o link que os clientes acessam para deixar Feedbacks e Enviar Currículos.
            Gere um QR Code com este link e coloque na frente de loja.
          </p>
          
          <div className="p-4 bg-gray-100 rounded-xl border border-gray-200 break-all text-sm font-mono text-gray-700 mb-3">
            {publicLink}
          </div>
          
          <div className="flex gap-2">
            <button onClick={copyLink} className="btn bg-white border border-gray-200 flex-1">
              📋 Copiar Link
            </button>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicLink)}`}
               target="_blank" rel="noreferrer"
               className="btn btn-primary flex-1 text-center">
               🖨️ Baixar QR Code
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
