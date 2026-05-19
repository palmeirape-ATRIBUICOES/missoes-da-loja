import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../hooks/useStore'
import { formatCurrency, normalizeWeekKeyLoose, nowHuman } from '../../utils/constants'

export default function EmployeeDashboard() {
  const { currentUser, store, logout } = useAuth()
  const { currentWeekKey, globalsOpen, products, getMonthPoints } = useStore()

  const points = getMonthPoints(currentUser)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
              🎯
            </div>
            <div>
              <div className="font-bold text-gray-900">👤 {currentUser}</div>
              <div className="text-xs text-gray-500">{store.shortName} • Semana {currentWeekKey}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-brand-600">⭐ {points} pts</div>
            </div>
            <button onClick={logout} className="btn btn-ghost text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Points Card */}
        <div className="card p-5 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(168,85,247,0.05))' }}>
          <div className="text-sm font-semibold text-gray-500">Seus pontos do mês</div>
          <div className="text-4xl font-extrabold text-brand-600 mt-2">⭐ {points}</div>
          <div className="text-xs text-gray-500 mt-2">Conclua tarefas e globais para ganhar pontos!</div>
        </div>

        {/* Global Missions */}
        {globalsOpen.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">🎯 Globais da Semana</h3>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-bold">
                +10 pts (primeiro)
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              A GLOBAL some quando alguém conclui primeiro. Responda os itens e envie!
            </div>
            <div className="space-y-4">
              {globalsOpen.map(g => (
                <GlobalMissionItem key={g.id} globalDoc={g} />
              ))}
            </div>
          </div>
        )}

        {/* Products Search */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">📦 Consulta de Preços</h3>
          <input
            type="text"
            placeholder="Buscar produto..."
            className="input"
          />
          <div className="text-xs text-gray-500 mt-2">
            {products.length} produtos cadastrados
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold text-sm text-gray-900">Minhas Tarefas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl mb-2">📦</div>
            <div className="font-semibold text-sm text-gray-900">Cadastrar Produto</div>
          </div>
        </div>
      </main>
    </div>
  )
}

function GlobalMissionItem({ globalDoc }) {
  const { currentUser } = useAuth()
  const { updateGlobal } = useStore()
  const [responses, setResponses] = useState(
    (globalDoc.items || []).map(name => ({ itemName: name, employeeNote: '', managerStatus: null }))
  )
  const [loading, setLoading] = useState(false)

  function updateNote(index, note) {
    const next = [...responses]
    next[index].employeeNote = note
    setResponses(next)
  }

  async function submit() {
    setLoading(true)
    await updateGlobal(globalDoc.id, {
      status: 'review',
      responses,
      completedBy: currentUser,
      completedAtHuman: nowHuman(),
      updatedAtMs: Date.now()
    })
    setLoading(false)
  }

  return (
    <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
      <div className="font-bold text-gray-900 text-lg mb-1">{globalDoc.name || 'GLOBAL'}</div>
      <div className="text-xs text-gray-500 mb-4">
        Publicada por {globalDoc.createdBy || '-'} • {globalDoc.createdAtHuman || '-'}
      </div>

      <div className="space-y-3 mb-4">
        {responses.map((res, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-800">{res.itemName}</label>
            <input
              type="text"
              placeholder="Ex: Falta 3, OK, etc."
              value={res.employeeNote}
              onChange={e => updateNote(i, e.target.value)}
              className="input bg-white"
            />
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={loading} className="btn btn-success w-full h-12 text-base shadow-sm">
        {loading ? '⏳ Enviando...' : '✅ Concluir GLOBAL'}
      </button>
    </div>
  )
}
