import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { nowHuman, weekKey } from '../../utils/constants'

export default function Tasks({ onBack }) {
  const { storeId, currentUser, isManager } = useAuth()
  const { tasksAll, activeNames, colRef, currentWeekKey } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', priority: 'normal' })
  const [expandedWeeks, setExpandedWeeks] = useState({ [currentWeekKey]: true })

  async function createTask() {
    if (!form.title.trim()) return
    const id = 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
    await setDoc(doc(db, 'stores', storeId, 'tasks', id), {
      title: form.title.trim(),
      description: form.description.trim(),
      assignedTo: form.assignedTo,
      priority: form.priority,
      status: 'pending',
      createdBy: currentUser,
      createdAt: serverTimestamp(),
      createdAtHuman: nowHuman(),
      weekKey: currentWeekKey
    })
    setForm({ title: '', description: '', assignedTo: '', priority: 'normal' })
    setShowForm(false)
  }

  async function toggleTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await setDoc(doc(db, 'stores', storeId, 'tasks', taskId), {
      status: newStatus,
      completedAt: newStatus === 'done' ? nowHuman() : null,
      completedBy: newStatus === 'done' ? currentUser : null,
      completedWeek: newStatus === 'done' ? weekKey() : null
    }, { merge: true })
  }

  async function deleteTask(taskId) {
    if (!confirm('Excluir esta tarefa?')) return
    await deleteDoc(doc(db, 'stores', storeId, 'tasks', taskId))
  }

  const pending = tasksAll.filter(t => t.status !== 'done')
  const done = tasksAll.filter(t => t.status === 'done')

  const doneByWeek = {}
  done.forEach(t => {
    const wk = t.completedWeek || t.weekKey || 'Semana Anterior'
    if (!doneByWeek[wk]) doneByWeek[wk] = []
    doneByWeek[wk].push(t)
  })

  function toggleWeek(wk) {
    setExpandedWeeks(prev => ({ ...prev, [wk]: !prev[wk] }))
  }

  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-l-red-500',
    high: 'bg-orange-50 text-orange-700 border-l-orange-500',
    normal: 'bg-white text-gray-700 border-l-blue-400',
    low: 'bg-gray-50 text-gray-600 border-l-gray-300'
  }
  const priorityLabels = { urgent: '🔴 Urgente', high: '🟠 Alta', normal: '🔵 Normal', low: '⚪ Baixa' }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">📋 Tarefas</div>
            <div className="text-xs text-gray-500">{pending.length} pendentes • {done.length} concluídas</div>
          </div>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm">+ Nova Tarefa</button>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <h3 className="font-bold text-gray-900 mb-3">➕ Nova Tarefa</h3>
            <div className="space-y-3">
              <input className="input" placeholder="Título da tarefa *" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              <textarea className="input min-h-[60px]" placeholder="Descrição (opcional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={form.assignedTo}
                  onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">Todos (sem atribuir)</option>
                  {activeNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="input" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="normal">🔵 Normal</option>
                  <option value="low">⚪ Baixa</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createTask} className="btn btn-success flex-1">✅ Criar Tarefa</button>
                <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Pendentes</h3>
            <div className="space-y-2">
              {pending.map(task => (
                <div key={task.id} className={`card p-4 border-l-4 ${priorityColors[task.priority] || priorityColors.normal}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button onClick={() => toggleTask(task.id, task.status)}
                        className="w-7 h-7 rounded-lg border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5 active:scale-90 hover:border-emerald-400">
                      </button>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">{task.title}</div>
                        {task.description && <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>}
                        <div className="text-[10px] text-gray-400 mt-1">
                          {priorityLabels[task.priority]} • {task.assignedTo || 'Todos'} • {task.createdAtHuman}
                        </div>
                      </div>
                    </div>
                    {isManager && (
                      <button onClick={() => deleteTask(task.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-xs shrink-0 active:scale-90">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done Grouped by Week */}
        {Object.keys(doneByWeek).sort().reverse().map(wk => (
          <div key={wk} className="mb-4">
            <button onClick={() => toggleWeek(wk)} 
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 active:opacity-70">
              <span>Semana {wk} ({doneByWeek[wk].length})</span>
              <span>{expandedWeeks[wk] ? '▼' : '▶'}</span>
            </button>
            
            {expandedWeeks[wk] && (
              <div className="space-y-2">
                {doneByWeek[wk].map(task => (
                  <div key={task.id} className="card p-3 opacity-60">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleTask(task.id, task.status)}
                        className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 active:scale-90">
                        ✅
                      </button>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="font-semibold text-gray-700 line-through text-sm">{task.title}</div>
                        {task.description && <div className="text-xs text-gray-400 mt-0.5 line-through font-semibold">{task.description}</div>}
                        <div className="text-[10px] text-gray-400 font-bold mt-1">
                          Atribuído: {task.assignedTo || 'Todos'} • Feito por: {task.completedBy} em {task.completedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {tasksAll.length === 0 && (
          <div className="text-center p-8 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <div className="font-semibold">Nenhuma tarefa ainda</div>
          </div>
        )}
      </main>
    </div>
  )
}
