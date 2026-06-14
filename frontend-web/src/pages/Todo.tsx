import { useState, useEffect, useRef } from 'react'
import { TodoAPI, ProjectAPI, type TodoDTO, type ProjectDTO } from '../api'

const KR_DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toKrDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${KR_DAYS[d.getDay()]})`
}
function toKrTime(h: number, m: number) {
  const ampm = h < 12 ? '오전' : '오후'
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${ampm} ${hh}:${String(m).padStart(2, '0')}`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysLeft(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ── Mini Calendar Popover ──────────────────────────────────────
function CalendarPicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const today = new Date()
  const init = value ? new Date(value) : today
  const [year, setYear] = useState(init.getFullYear())
  const [month, setMonth] = useState(init.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startDow = first.getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDay = value ? new Date(value) : null

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 999, background: '#fff', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
      padding: '16px', width: 280, top: '100%', left: 0, marginTop: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={cs.nav}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{year}년 {month + 1}월</span>
        <button onClick={nextMonth} style={cs.nav}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isSelected = selectedDay && selectedDay.getFullYear() === year && selectedDay.getMonth() === month && selectedDay.getDate() === day
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          return (
            <button
              key={i}
              onClick={() => { onChange(toDateStr(new Date(year, month, day))); onClose() }}
              style={{
                padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? '#fff' : isToday ? 'var(--primary)' : 'var(--text)',
              }}
            >{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Time Picker Drums ──────────────────────────────────────────
function TimePicker({ ampm, hour, minute, onChange }: {
  ampm: 'AM' | 'PM'; hour: number; minute: number;
  onChange: (ampm: 'AM' | 'PM', h: number, m: number) => void
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', justifyContent: 'center' }}>
      {/* AM/PM toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={() => onChange('AM', hour, minute)} style={{ ...cs.drum, fontWeight: ampm === 'AM' ? 700 : 400, color: ampm === 'AM' ? 'var(--text)' : 'var(--text-muted)', background: ampm === 'AM' ? 'var(--primary-bg)' : 'transparent' }}>오전</button>
        <button onClick={() => onChange('PM', hour, minute)} style={{ ...cs.drum, fontWeight: ampm === 'PM' ? 700 : 400, color: ampm === 'PM' ? 'var(--text)' : 'var(--text-muted)', background: ampm === 'PM' ? 'var(--primary-bg)' : 'transparent' }}>오후</button>
      </div>
      {/* Hour drum */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: 96, overflowY: 'auto', scrollSnapType: 'y mandatory' }}>
        {hours.map(h => (
          <button key={h} onClick={() => onChange(ampm, h, minute)} style={{ ...cs.drum, scrollSnapAlign: 'center', fontWeight: h === hour ? 700 : 400, color: h === hour ? 'var(--text)' : 'var(--text-muted)', background: h === hour ? 'var(--primary-bg)' : 'transparent', minWidth: 40 }}>
            {String(h).padStart(2, '0')}
          </button>
        ))}
      </div>
      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 18 }}>:</span>
      {/* Minute drum */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: 96, overflowY: 'auto', scrollSnapType: 'y mandatory' }}>
        {minutes.map(mn => (
          <button key={mn} onClick={() => onChange(ampm, hour, mn)} style={{ ...cs.drum, scrollSnapAlign: 'center', fontWeight: mn === minute ? 700 : 400, color: mn === minute ? 'var(--text)' : 'var(--text-muted)', background: mn === minute ? 'var(--primary-bg)' : 'transparent', minWidth: 40 }}>
            {String(mn).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Date Row with chip ────────────────────────────────────────
function DateRow({ label, dateStr, ampm, hour, minute, active, onDateChange, onTimeChange }: {
  label: string; dateStr: string; ampm: 'AM' | 'PM'; hour: number; minute: number;
  active: boolean;
  onDateChange: (v: string) => void
  onTimeChange: (ampm: 'AM' | 'PM', h: number, m: number) => void
}) {
  const [showCal, setShowCal] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)', width: 50, flexShrink: 0 }}>{label}</span>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowCal(v => !v)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: active ? 'var(--primary)' : 'var(--bg-muted)',
              color: active ? '#fff' : 'var(--text)',
              fontWeight: active ? 700 : 400, fontSize: 13,
            }}
          >
            {dateStr ? toKrDate(dateStr) : '날짜 선택'}
          </button>
          {showCal && <CalendarPicker value={dateStr} onChange={onDateChange} onClose={() => setShowCal(false)} />}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
          {toKrTime(ampm === 'AM' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12), minute)}
        </span>
      </div>
    </div>
  )
}

// ── Monthly Calendar View ─────────────────────────────────────
function dateKey(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return toDateStr(d)
}
function MonthCalendar({ todos, onToggle, onDelete }: { todos: TodoDTO[]; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(toDateStr(today))

  const byDate: Record<string, TodoDTO[]> = {}
  todos.forEach(t => { const k = dateKey(t.due_date); if (k) (byDate[k] ||= []).push(t) })

  const lastDay = new Date(year, month + 1, 0).getDate()
  const startDow = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const selectedTodos = byDate[selected] || []

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ ...s.card, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={prev} style={cs.nav}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{year}년 {month + 1}월</span>
          <button onClick={next} style={cs.nav}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {KR_DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const key = toDateStr(new Date(year, month, day))
            const list = byDate[key] || []
            const isSel = key === selected
            const isToday = key === toDateStr(today)
            return (
              <button key={i} onClick={() => setSelected(key)} style={{
                minHeight: 56, padding: 4, borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                border: isSel ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isSel ? 'var(--primary-bg)' : 'var(--bg-card)',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{day}</span>
                {list.slice(0, 2).map(t => (
                  <span key={t.id} style={{ fontSize: 10, color: t.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--bg-muted)', borderRadius: 4, padding: '1px 4px' }}>{t.title}</span>
                ))}
                {list.length > 2 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{list.length - 2}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택한 날짜의 할 일 */}
      <div style={{ ...s.card, marginTop: 14 }}>
        <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>{toKrDate(selected)} · {selectedTodos.length}건</div>
        {selectedTodos.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>이 날 할 일이 없어요.</div>
        ) : selectedTodos.map(t => <TodoItem key={t.id} todo={t} onToggle={onToggle} onDelete={onDelete} />)}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function Todo() {
  const [mode, setMode] = useState<'list' | 'add'>('list')
  const [listView, setListView] = useState<'list' | 'calendar'>('list')
  const [todos, setTodos] = useState<TodoDTO[]>([])
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [listLoading, setListLoading] = useState(true)

  // Form state
  const [tab, setTab] = useState<'personal' | 'project'>('personal')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  // Start date/time
  const [startDate, setStartDate] = useState('')
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('AM')
  const [startHour, setStartHour] = useState(9)
  const [startMin, setStartMin] = useState(0)
  const [activeDate, setActiveDate] = useState<'start' | 'end'>('start')

  // End date/time
  const [endDate, setEndDate] = useState('')
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('PM')
  const [endHour, setEndHour] = useState(10)
  const [endMin, setEndMin] = useState(10)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const loadTodos = () => {
    setListLoading(true)
    TodoAPI.list().then(setTodos).finally(() => setListLoading(false))
  }

  useEffect(() => {
    loadTodos()
    ProjectAPI.list().then(p => {
      const active = p.filter(pr => pr.status !== 'completed')
      setProjects(active)
      if (active.length > 0) setSelectedProject(active[0].id)
    }).catch(() => {})
  }, [])

  const handleToggle = async (id: string) => {
    try {
      const updated = await TodoAPI.toggleDone(id)
      setTodos(prev => prev.map(t => t.id === id ? updated : t))
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await TodoAPI.delete(id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    setError(''); setLoading(true)
    try {
      const startH = startAmpm === 'AM' ? (startHour === 12 ? 0 : startHour) : (startHour === 12 ? 12 : startHour + 12)
      const endH = endAmpm === 'AM' ? (endHour === 12 ? 0 : endHour) : (endHour === 12 ? 12 : endHour + 12)
      const startISO = startDate ? `${startDate}T${String(startH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00` : undefined
      const endISO = endDate ? `${endDate}T${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00` : undefined
      await TodoAPI.create({
        title,
        description: desc || undefined,
        project_id: tab === 'project' ? selectedProject : undefined,
        start_date: startISO,
        due_date: endISO,
      })
      setSuccess(true)
      setTitle(''); setDesc(''); setStartDate(''); setEndDate('')
      loadTodos()
      setTimeout(() => { setSuccess(false); setMode('list') }, 1000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedProj = projects.find(p => p.id === selectedProject)

  // ── List view ─────────────────────────────────────────────
  if (mode === 'list') {
    const open = todos.filter(t => !t.done)
    const done = todos.filter(t => t.done)
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={s.topbar}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>투두</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 8, padding: 2 }}>
              <button onClick={() => setListView('list')} style={{ ...s.segBtn, background: listView === 'list' ? 'var(--bg-card)' : 'transparent', color: listView === 'list' ? 'var(--primary)' : 'var(--text-muted)' }}>목록</button>
              <button onClick={() => setListView('calendar')} style={{ ...s.segBtn, background: listView === 'calendar' ? 'var(--bg-card)' : 'transparent', color: listView === 'calendar' ? 'var(--primary)' : 'var(--text-muted)' }}>달력</button>
            </div>
            <button style={s.plusBtn} onClick={() => setMode('add')}>+</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: 24 }}>
          {listLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
          ) : listView === 'calendar' ? (
            <MonthCalendar todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
          ) : todos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14 }}>할 일이 없습니다. + 버튼으로 추가해보세요!</div>
            </div>
          ) : (
            <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {open.length > 0 && (
                <div style={s.card}>
                  <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>미완료 · {open.length}</div>
                  {open.map(t => <TodoItem key={t.id} todo={t} onToggle={handleToggle} onDelete={handleDelete} />)}
                </div>
              )}
              {done.length > 0 && (
                <div style={s.card}>
                  <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>완료 · {done.length}</div>
                  {done.map(t => <TodoItem key={t.id} todo={t} onToggle={handleToggle} onDelete={handleDelete} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Add view ──────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 4px', lineHeight: 1 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>새로운 To-Do</span>
        </div>
        <button style={s.plusBtn} onClick={() => setMode('add')}>+</button>
      </div>

      <div style={{ overflowY: 'auto', padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ ...s.card, maxWidth: 700 }}>
            {/* Tabs */}
            <div style={s.tabs}>
              <button type="button" style={{ ...s.tab, background: tab === 'personal' ? 'var(--primary)' : 'var(--bg-muted)', color: tab === 'personal' ? '#fff' : 'var(--text-muted)' }} onClick={() => setTab('personal')}>개인 To-Do</button>
              <button type="button" style={{ ...s.tab, background: tab === 'project' ? 'var(--primary)' : 'var(--bg-muted)', color: tab === 'project' ? '#fff' : 'var(--text-muted)' }} onClick={() => setTab('project')}>프로젝트 To-Do</button>
            </div>

            {/* Project selector */}
            {tab === 'project' && (
              <div style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                  {selectedProj && (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: (selectedProj.color || '#ccc') + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{selectedProj.emoji}</div>
                  )}
                  <select style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)' }} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                    {projects.length === 0 && <option>프로젝트 없음</option>}
                  </select>
                </div>
              </div>
            )}

            {/* Title */}
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <input
                style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: 'none', outline: 'none', fontSize: 15, color: 'var(--text)', background: 'transparent', boxSizing: 'border-box' }}
                placeholder="제목"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px' }}>
              <span style={{ fontSize: 16, marginTop: 2 }}>📋</span>
              <textarea style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)', resize: 'none', minHeight: 60 }} placeholder="설명" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>

            {/* Start date row */}
            <div onClick={() => setActiveDate('start')} style={{ cursor: 'pointer' }}>
              <DateRow label="시작일" dateStr={startDate} ampm={startAmpm} hour={startHour} minute={startMin} active={true}
                onDateChange={setStartDate}
                onTimeChange={(a, h, m) => { setStartAmpm(a); setStartHour(h); setStartMin(m) }}
              />
            </div>

            {/* End date row */}
            <div onClick={() => setActiveDate('end')} style={{ cursor: 'pointer' }}>
              <DateRow label="종료일" dateStr={endDate} ampm={endAmpm} hour={endHour} minute={endMin} active={false}
                onDateChange={setEndDate}
                onTimeChange={(a, h, m) => { setEndAmpm(a); setEndHour(h); setEndMin(m) }}
              />
            </div>

            {/* Time picker */}
            <div style={{ padding: '8px 16px' }}>
              {activeDate === 'start' ? (
                <TimePicker ampm={startAmpm} hour={startHour} minute={startMin} onChange={(a, h, m) => { setStartAmpm(a); setStartHour(h); setStartMin(m) }} />
              ) : (
                <TimePicker ampm={endAmpm} hour={endHour} minute={endMin} onChange={(a, h, m) => { setEndAmpm(a); setEndHour(h); setEndMin(m) }} />
              )}
            </div>

            {error && <div style={{ padding: '10px 16px', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

            {/* Submit */}
            <div style={{ padding: '16px' }}>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: (!title.trim() || loading) ? 'var(--border)' : 'var(--primary)', color: (!title.trim() || loading) ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {success ? '✓ 추가 완료!' : loading ? '추가 중...' : 'To-Do 추가'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function TodoItem({ todo, onToggle, onDelete }: { todo: TodoDTO; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const dl = todo.due_date ? daysLeft(todo.due_date) : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => onToggle(todo.id)}
        style={{ width: 22, height: 22, borderRadius: '50%', border: todo.done ? 'none' : '2px solid var(--border)', background: todo.done ? 'var(--primary)' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {todo.done && <svg width="11" height="11" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: todo.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: todo.done ? 'line-through' : 'none' }} className="truncate">{todo.title}</div>
        {todo.project_name && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{todo.project_name}</div>}
      </div>
      {!todo.done && dl !== null && (
        <span style={{ fontSize: 12, fontWeight: 600, color: dl <= 1 ? 'var(--danger)' : dl <= 3 ? '#f59e0b' : 'var(--text-muted)', flexShrink: 0 }}>
          {dl < 0 ? '기한 초과' : `D-${dl}`}
        </span>
      )}
      <button
        onClick={() => onDelete(todo.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
      >×</button>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: { padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  plusBtn: { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  segBtn: { padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  card: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' },
  tabs: { display: 'flex', padding: '12px 12px 0', borderBottom: '1px solid var(--border)', gap: 8 },
  tab: { flex: 1, padding: '10px', borderRadius: '10px 10px 0 0', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'all 0.15s' },
}

const cs: Record<string, React.CSSProperties> = {
  nav: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 8px', lineHeight: 1 },
  drum: { padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, transition: 'all 0.1s', flexShrink: 0 },
}
