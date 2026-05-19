import { useStore } from '../../hooks/useStore'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'

export default function Feedback({ onBack }) {
  const { storeId } = useAuth()
  const { feedbackAll } = useStore()

  async function toggleStatus(fb) {
    const next = fb.status === 'new' ? 'read' : 'new'
    await setDoc(doc(db, 'stores', storeId, 'feedback', fb.id), { status: next }, { merge: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">💬 Feedback & CV</div>
            <div className="text-xs text-gray-500">{feedbackAll.length} registros</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {feedbackAll.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            <div className="text-4xl mb-2">📥</div>
            <div className="font-semibold">Nenhuma mensagem recebida ainda</div>
          </div>
        ) : (
          feedbackAll.map(fb => (
            <div key={fb.id} className={`card p-4 border-l-4 ${fb.status === 'new' ? 'border-l-blue-500 bg-white' : 'border-l-gray-300 bg-gray-50 opacity-80'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${fb.type === 'cv' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    {fb.type === 'cv' ? '💼' : '⭐'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 leading-tight">
                      {fb.name} {fb.rating && <span className="text-amber-500 text-xs ml-1">{"★".repeat(fb.rating)}</span>}
                    </div>
                    <div className="text-xs text-gray-500">{fb.createdAtHuman}</div>
                  </div>
                </div>
                <button onClick={() => toggleStatus(fb)} className="btn btn-ghost text-xs">
                  {fb.status === 'new' ? 'Marcar lido' : 'Marcar novo'}
                </button>
              </div>

              {fb.phone && (
                <div className="text-sm text-gray-700 font-semibold mb-2">📞 {fb.phone}</div>
              )}

              {fb.message && (
                <div className="bg-white border rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {fb.message}
                </div>
              )}

              {fb.cvLink && (
                <a href={fb.cvLink.startsWith('http') ? fb.cvLink : `https://${fb.cvLink}`} target="_blank" rel="noreferrer" 
                   className="mt-3 inline-block bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95">
                  🔗 Abrir Currículo
                </a>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
