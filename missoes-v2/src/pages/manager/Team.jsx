import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

export default function Team({ onBack }) {
  const { employees, activeEmployees, saveEmployees, getMonthPoints } = useStore()
  const { storeId, store } = useAuth()
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [editingPin, setEditingPin] = useState(null)
  const [pinValue, setPinValue] = useState('')

  async function addEmployee() {
    if (!newName.trim()) return
    const name = newName.trim()
    if (employees.some(e => e.name === name)) return
    const next = [...employees, { name, active: true, canEditPrices: false }]
    await saveEmployees(next)
    setNewName('')
  }

  async function toggleActive(name) {
    const next = employees.map(e => e.name === name ? { ...e, active: !e.active } : e)
    await saveEmployees(next)
  }

  async function togglePricePermission(name) {
    const next = employees.map(e => e.name === name ? { ...e, canEditPrices: !e.canEditPrices } : e)
    await saveEmployees(next)
  }

  async function removeEmployee(name) {
    if (!confirm(`Remover ${name} da equipe?`)) return
    const next = employees.filter(e => e.name !== name)
    await saveEmployees(next)
  }

  async function savePin(name) {
    if (!pinValue.trim()) return
    await setDoc(doc(db, 'stores', storeId, 'users', name), { pin: pinValue.trim() }, { merge: true })
    setEditingPin(null)
    setPinValue('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
        <div>
          <div className="font-bold text-gray-900">👥 Equipe</div>
          <div className="text-xs text-gray-500">{activeEmployees.length} ativos de {employees.length}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Add Employee */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Adicionar Funcionário</h3>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Nome do funcionário" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmployee()} />
            <button onClick={addEmployee} className="btn btn-success shrink-0">Adicionar</button>
          </div>
        </div>

        {/* Employee List */}
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.name} className={`card p-4 ${!emp.active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{emp.name}</span>
                    {emp.active ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Inativo</span>
                    )}
                    {emp.canEditPrices && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">📦 Produtos</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ⭐ {getMonthPoints(emp.name)} pontos este mês
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(emp.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all
                      ${emp.active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {emp.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => togglePricePermission(emp.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all
                      ${emp.canEditPrices ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {emp.canEditPrices ? '🔓 Produtos' : '🔒 Produtos'}
                  </button>
                  <button onClick={() => { setEditingPin(emp.name); setPinValue('') }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 active:scale-95">
                    🔑 PIN
                  </button>
                  <button onClick={() => removeEmployee(emp.name)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-sm active:scale-90">
                    🗑
                  </button>
                </div>
              </div>

              {/* PIN Editor */}
              {editingPin === emp.name && (
                <div className="mt-3 flex gap-2 animate-slide-up">
                  <input type="password" inputMode="numeric" maxLength={6} placeholder="Novo PIN" value={pinValue}
                    onChange={e => setPinValue(e.target.value)} className="input flex-1" autoFocus />
                  <button onClick={() => savePin(emp.name)} className="btn btn-primary text-sm">Salvar</button>
                  <button onClick={() => setEditingPin(null)} className="btn btn-ghost text-sm">Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
