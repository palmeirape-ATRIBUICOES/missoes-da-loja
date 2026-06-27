import { useState, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'

export default function DeliverySlots({ onBack }) {
  const { deliverySlotsAll, saveDeliverySlot, deleteDeliverySlot } = useStore()
  
  const [form, setForm] = useState({
    date: '',
    timeStart: '',
    timeEnd: '',
    maxCapacity: 5,
    active: true
  })
  const [showForm, setShowForm] = useState(false)

  const sortedSlots = useMemo(() => {
    return [...deliverySlotsAll].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeStart.localeCompare(b.timeStart)
    })
  }, [deliverySlotsAll])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.date || !form.timeStart || !form.timeEnd) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    const slot = {
      date: form.date,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      maxCapacity: Number(form.maxCapacity) || 0,
      active: form.active
    }

    await saveDeliverySlot(slot)
    
    // Reset form
    setForm({
      date: '',
      timeStart: '',
      timeEnd: '',
      maxCapacity: 5,
      active: true
    })
    setShowForm(false)
  }

  async function handleToggleActive(slot) {
    await saveDeliverySlot({
      ...slot,
      active: !slot.active
    })
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este horário de entrega?')) return
    await deleteDeliverySlot(id)
  }

  function formatDateBr(dateStr) {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">📅 Horários de Entrega</div>
            <div className="text-xs text-gray-500">{deliverySlotsAll.length} cadastrados</div>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm px-3.5 h-10">
          {showForm ? 'Fechar' : '+ Novo Horário'}
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <h3 className="font-bold text-gray-900 mb-4">➕ Cadastrar Novo Horário</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Data da Entrega</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="input text-sm h-11 bg-gray-50"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Horário Fixo da Entrega</label>
                  <select
                    required
                    value={form.timeStart}
                    onChange={e => setForm(f => ({ ...f, timeStart: e.target.value, timeEnd: e.target.value }))}
                    className="input text-sm h-11 bg-gray-50"
                  >
                    <option value="">Selecione um horário...</option>
                    <option value="06:00">06:00</option>
                    <option value="06:20">06:20</option>
                    <option value="06:40">06:40</option>
                    <option value="07:00">07:00</option>
                    <option value="07:30">07:30</option>
                    <option value="08:30">08:30</option>
                    <option value="09:00">09:00</option>
                    <option value="09:30">09:30</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="12:00">12:00</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="15:30">15:30</option>
                    <option value="16:00">16:00</option>
                    <option value="16:30">16:30</option>
                    <option value="17:00">17:00</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Capacidade Máxima (Pedidos)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 para ilimitado"
                    value={form.maxCapacity}
                    onChange={e => setForm(f => ({ ...f, maxCapacity: e.target.value }))}
                    className="input text-sm h-11 bg-gray-50"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      className="w-5 h-5 rounded text-brand-600 border-gray-300 focus:ring-brand-500"
                    />
                    Ativar horário para clientes
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-success w-full h-12 text-sm shadow-sm mt-2">
                ✅ Criar Horário de Entrega
              </button>
            </form>
          </div>
        )}

        {/* List of Slots */}
        <div className="space-y-2">
          {sortedSlots.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400">
              <span className="text-4xl">📅</span>
              <p className="mt-2 font-semibold">Nenhum horário de entrega cadastrado.</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "+ Novo Horário" para configurar as entregas.</p>
            </div>
          ) : (
            sortedSlots.map(slot => (
              <div key={slot.id} className={`card p-4 flex items-center justify-between gap-4 transition-all ${!slot.active ? 'opacity-55' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{formatDateBr(slot.date)}</span>
                    <span className="text-sm font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                      ⏰ {slot.timeStart === slot.timeEnd ? slot.timeStart : `${slot.timeStart} às ${slot.timeEnd}`}
                    </span>
                    {slot.active ? (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Disponível</span>
                    ) : (
                      <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Inativo</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                    <span>👥 Capacidade Máxima: {slot.maxCapacity === 0 ? 'Ilimitada' : `${slot.maxCapacity} pedidos`}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggleActive(slot)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95
                      ${slot.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    {slot.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => handleDelete(slot.id)}
                    className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-lg transition-all active:scale-90">
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
