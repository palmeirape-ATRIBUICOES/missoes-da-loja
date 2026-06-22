import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { nowHuman, normalizeWeekKeyLoose } from '../../utils/constants'

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function Globals({ onBack }) {
  const { storeId, currentUser } = useAuth()
  const { globalTemplates, globalsWeek, globalsOpen, deleteGlobalDoc, publishGlobal, cfgRef, currentWeekKey, globalsAll } = useStore()
  const [tab, setTab] = useState('published') // 'published' | 'templates' | 'past_weeks'
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [form, setForm] = useState({ name: '', items: '', scheduledDay: '', scheduledHour: '08:00' })

  // Filtering and grouping past weeks' globals
  const currentWeekNormalized = normalizeWeekKeyLoose(currentWeekKey)
  const pastGlobals = (globalsAll || []).filter(g => normalizeWeekKeyLoose(g.weekKey) !== currentWeekNormalized)
  const pastGlobalsByWeek = pastGlobals.reduce((acc, g) => {
    const key = g.weekKey || 'Sem Semana'
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})

  function resetForm() {
    setForm({ name: '', items: '', scheduledDay: '', scheduledHour: '08:00' })
    setEditingTemplate(null)
    setShowTemplateForm(false)
  }

  function startEditTemplate(tpl) {
    setForm({
      name: tpl.name || '',
      items: (tpl.items || []).join('\n'),
      scheduledDay: tpl.scheduledDay ?? '',
      scheduledHour: tpl.scheduledHour || '08:00'
    })
    setEditingTemplate(tpl.id)
    setShowTemplateForm(true)
  }

  async function saveTemplate() {
    if (!form.name.trim()) return
    const items = form.items.split('\n').map(i => i.trim()).filter(Boolean)
    const now = Date.now()

    let next
    if (editingTemplate) {
      next = globalTemplates.map(t =>
        t.id === editingTemplate
          ? { ...t, name: form.name.trim(), items, scheduledDay: form.scheduledDay, scheduledHour: form.scheduledHour, updatedAtMs: now, cancelledWeeks: [] }
          : t
      )
    } else {
      const id = 'tpl_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 6)
      next = [...globalTemplates, {
        id, name: form.name.trim(), items, scheduledDay: form.scheduledDay,
        scheduledHour: form.scheduledHour, createdAtMs: now, updatedAtMs: now, cancelledWeeks: []
      }]
    }

    await setDoc(cfgRef('globalTemplates'), { templates: next, updatedAt: serverTimestamp() }, { merge: false })
    resetForm()
  }

  async function deleteTemplate(id) {
    if (!confirm('Excluir este template?')) return
    const next = globalTemplates.filter(t => t.id !== id)
    await setDoc(cfgRef('globalTemplates'), { templates: next, updatedAt: serverTimestamp() }, { merge: false })
  }

  async function handlePublishNow(tpl) {
    await publishGlobal(tpl, false)
  }

  async function handleDeleteGlobal(id) {
    if (!confirm('Excluir esta global publicada?')) return
    await deleteGlobalDoc(id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">🎯 Globais</div>
            <div className="text-xs text-gray-500">{globalsOpen.length} abertas • {globalTemplates.length} templates</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setTab('published')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 ${tab === 'published' ? 'active' : ''}`}>
            📡 Abertas ({globalsOpen.length})
          </button>
          <button onClick={() => setTab('review')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 ${tab === 'review' ? 'active' : ''}`}>
            👀 Revisão ({globalsWeek.filter(g => g.status === 'review' || g.status === 'completed').length})
          </button>
          <button onClick={() => setTab('past_weeks')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 ${tab === 'past_weeks' ? 'active' : ''}`}>
            📅 Semanas Anteriores ({pastGlobals.length})
          </button>
          <button onClick={() => setTab('templates')}
            className={`pdv-cat-tab whitespace-nowrap shrink-0 ${tab === 'templates' ? 'active' : ''}`}>
            📁 Templates ({globalTemplates.length})
          </button>
        </div>

        {/* Published Globals */}
        {tab === 'published' && (
          <div className="space-y-3">
            {globalsOpen.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <div className="text-4xl mb-2">🎯</div>
                <div className="font-semibold">Nenhuma global aberta</div>
              </div>
            ) : (
              globalsOpen.map(g => (
                <div key={g.id} className="card p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{g.name || 'GLOBAL'}</div>
                      <div className="text-xs text-gray-500">
                        🔵 Aberta • {g.createdBy || '-'} • {g.createdAtHuman || '-'}
                      </div>
                      {g.items?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {g.items.map((item, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDeleteGlobal(g.id)}
                      className="btn btn-danger text-xs py-1 px-3">🗑 Excluir</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Review Globals */}
        {tab === 'review' && (
          <div className="space-y-4">
            {globalsWeek.filter(g => g.status === 'review' || g.status === 'completed').length === 0 ? (
               <div className="text-center p-8 text-gray-400">
                 <div className="text-4xl mb-2">👀</div>
                 <div className="font-semibold">Nenhuma missão para revisar</div>
               </div>
            ) : (
               globalsWeek.filter(g => g.status === 'review' || g.status === 'completed').map(g => (
                 <GlobalReviewCard key={g.id} globalDoc={g} />
               ))
            )}
          </div>
        )}

        {/* Past Weeks Globals */}
        {tab === 'past_weeks' && (
          <div className="space-y-6 animate-slide-up">
            {Object.keys(pastGlobalsByWeek).length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <div className="text-4xl mb-2">📅</div>
                <div className="font-semibold">Nenhuma global de semanas anteriores</div>
              </div>
            ) : (
              Object.keys(pastGlobalsByWeek)
                .sort((a, b) => b.localeCompare(a))
                .map(week => (
                  <div key={week} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 mt-2">
                      <span className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <span>📅 Semana {week}</span>
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                        {pastGlobalsByWeek[week].length} {pastGlobalsByWeek[week].length === 1 ? 'global' : 'globais'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {pastGlobalsByWeek[week].map(g => {
                        if (g.status === 'open') {
                          return (
                            <div key={g.id} className="card p-4 border-l-4 border-l-gray-400 bg-gray-50/50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-gray-900">{g.name || 'GLOBAL'}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                    <span>⏳ Expirou Aberta • Publicada por {g.createdBy || '-'} • {g.createdAtHuman || '-'}</span>
                                  </div>
                                  {g.items?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {g.items.map((item, i) => (
                                        <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{item}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => handleDeleteGlobal(g.id)}
                                  className="btn btn-danger text-xs py-1 px-3">🗑 Excluir</button>
                              </div>
                            </div>
                          )
                        } else {
                          return <GlobalReviewCard key={g.id} globalDoc={g} />
                        }
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Templates */}
        {tab === 'templates' && (
          <div className="space-y-3">
            <button onClick={() => { resetForm(); setShowTemplateForm(true) }}
              className="btn btn-primary w-full">+ Novo Template</button>

            {showTemplateForm && (
              <div className="card p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">{editingTemplate ? '✏️ Editar' : '➕ Novo Template'}</h3>
                  <button onClick={resetForm} className="text-sm text-gray-500 font-semibold">Cancelar</button>
                </div>
                <div className="space-y-3">
                  <input className="input" placeholder="Nome da global *" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  <textarea className="input min-h-[80px]" placeholder="Itens (um por linha)" value={form.items}
                    onChange={e => setForm(f => ({ ...f, items: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Dia automático</label>
                      <select className="input" value={form.scheduledDay}
                        onChange={e => setForm(f => ({ ...f, scheduledDay: e.target.value }))}>
                        <option value="">Sem agendamento</option>
                        {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Horário</label>
                      <input type="time" className="input" value={form.scheduledHour}
                        onChange={e => setForm(f => ({ ...f, scheduledHour: e.target.value }))} />
                    </div>
                  </div>
                  <button onClick={saveTemplate} className="btn btn-success w-full">
                    {editingTemplate ? '💾 Atualizar' : '✅ Salvar Template'}
                  </button>
                </div>
              </div>
            )}

            {globalTemplates.map(tpl => (
              <div key={tpl.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{tpl.name}</div>
                    <div className="text-xs text-gray-500">
                      {tpl.scheduledDay !== undefined && tpl.scheduledDay !== ''
                        ? `⏰ ${DAYS[Number(tpl.scheduledDay)]} às ${tpl.scheduledHour || '08:00'}`
                        : '📌 Publicação manual'}
                      {tpl.items?.length > 0 && ` • ${tpl.items.length} itens`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handlePublishNow(tpl)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 active:scale-95">
                      📡 Publicar
                    </button>
                    <button onClick={() => startEditTemplate(tpl)}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-sm flex items-center justify-center active:scale-90">✏️</button>
                    <button onClick={() => deleteTemplate(tpl.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-sm flex items-center justify-center active:scale-90">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function GlobalReviewCard({ globalDoc }) {
  const { updateGlobal, deleteGlobalDoc } = useStore()
  const responses = globalDoc.responses || []

  // Sort: items with managerStatus placed at the bottom
  const sorted = [...responses].sort((a, b) => {
    if (a.managerStatus && !b.managerStatus) return 1
    if (!a.managerStatus && b.managerStatus) return -1
    return 0
  })

  async function setItemStatus(originalIndex, mStatus) {
    const next = [...responses]
    next[originalIndex].managerStatus = mStatus
    await updateGlobal(globalDoc.id, { responses: next })
  }

  async function archive() {
    await updateGlobal(globalDoc.id, { status: 'completed' })
  }

  return (
    <div className={`card p-4 border-l-4 ${globalDoc.status === 'completed' ? 'border-l-emerald-500 opacity-70' : 'border-l-orange-500'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900 text-lg">{globalDoc.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span>Concluída por {globalDoc.completedBy} • {globalDoc.completedAtHuman}</span>
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
              Semana {globalDoc.weekKey}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {globalDoc.status === 'review' && (
            <button onClick={archive} className="btn btn-ghost text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
              📦 Arquivar
            </button>
          )}
          <button 
            onClick={async () => {
              if (confirm('Excluir esta global permanentemente?')) {
                await deleteGlobalDoc(globalDoc.id)
              }
            }} 
            className="btn btn-ghost text-xs text-red-600 px-2.5 py-1.5 border border-red-100 rounded-lg hover:bg-red-50"
          >
            🗑 Excluir
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((res, i) => {
          const originalIndex = responses.indexOf(res)
          return (
            <div key={i} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2
              ${res.managerStatus ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'}`}>
              
              <div className="min-w-0">
                <div className={`font-semibold text-sm ${res.managerStatus ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {res.itemName}
                </div>
                {res.employeeNote && (
                  <div className="text-xs text-blue-700 font-medium mt-0.5">
                    ↳ {res.employeeNote}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {res.managerStatus === 'comprado' && <span className="text-xs font-bold text-emerald-600">✅ Comprado</span>}
                {res.managerStatus === 'falta' && <span className="text-xs font-bold text-red-600">❌ Em Falta</span>}
                
                {!res.managerStatus && (
                  <>
                    <button onClick={() => setItemStatus(originalIndex, 'comprado')} 
                      className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold active:scale-95">
                      Comprado
                    </button>
                    <button onClick={() => setItemStatus(originalIndex, 'falta')} 
                      className="px-3 py-1.5 rounded bg-red-50 text-red-700 text-xs font-bold active:scale-95">
                      Falta
                    </button>
                  </>
                )}
                {res.managerStatus && (
                  <button onClick={() => setItemStatus(originalIndex, null)} className="text-xs text-gray-400 underline">Desfazer</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
