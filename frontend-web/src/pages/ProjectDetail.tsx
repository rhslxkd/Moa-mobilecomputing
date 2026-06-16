import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ProjectAPI, TodoAPI, MeetingAPI, ReportAPI, MeetPollAPI, ChatAPI, DriveAPI, MemberAPI, FriendAPI,
  type ProjectDTO, type TodoDTO, type MeetingDTO, type ReportDTO,
  type MeetPollDetailDTO, type MeetPollDTO, type FileDTO, type FolderDTO,
} from '../api'
import { useAuth } from '../AuthContext'

const KR_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MEMBER_COLORS = ['#1daaed', '#2db56a', '#f59e0b', '#9b59d4', '#dc2626', '#0d9488']

function dotDateToKr(s: string) {
  if (!s) return ''
  const parts = s.split('.')
  if (parts.length !== 3) return s
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return `${Number(parts[1])}월 ${Number(parts[2])}일 (${KR_DAYS[d.getDay()]})`
}

type View = 'overview' | 'todo' | 'meetings' | 'report' | 'drive' | 'meetpoll'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [project, setProject] = useState<ProjectDTO | null>(null)
  const initView = (new URLSearchParams(location.search).get('view') as View) ?? 'overview'
  const [view, setView] = useState<View>(initView)
  const [loading, setLoading] = useState(true)

  const reloadProject = () => { if (id) ProjectAPI.get(id).then(setProject) }

  useEffect(() => {
    if (!id) return
    ProjectAPI.get(id).then(setProject).finally(() => setLoading(false))
  }, [id])

  // 방장 = 프로젝트 소유자
  const isLeader = !!project && !!user && project.owner_id === user.id

  const handleInvite = async () => {
    if (!id) return
    const username = window.prompt('초대할 친구의 아이디(username)를 입력하세요')
    if (!username?.trim()) return
    try {
      const found = await FriendAPI.search(username.trim())
      const role = window.prompt(`역할을 입력하세요 (쉼표로 여러 개)`, '팀원')
      const roles = (role || '팀원').split(',').map(r => r.trim()).filter(Boolean)
      await MemberAPI.add(id, { user_id: found.user_id, name: found.name, roles: roles.length ? roles : ['팀원'] })
      alert(`${found.name}님을 초대했어요. (수락 대기)`)
      reloadProject()
    } catch (e: any) {
      alert(e.message || '초대에 실패했어요.')
    }
  }

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!window.confirm(`${name}님을 프로젝트에서 제외할까요?`)) return
    try { await MemberAPI.delete(memberId); reloadProject() } catch (e: any) { alert(e.message) }
  }

  const handleChat = async () => {
    if (!project) return
    try {
      const room = await ChatAPI.openProject(project.id)
      navigate(`/chat?room=${room.id}`)
    } catch { navigate('/chat') }
  }

  const handleMeeting = () => navigate(`/meetings?project=${id}`)

  if (loading) return <div style={s.center}><span className="spinner" /></div>
  if (!project) return <div style={s.center}>프로젝트를 찾을 수 없습니다</div>

  const statusLabel: Record<string, string> = { active: '진행중', upcoming: '예정', completed: '완료' }
  const statusColor: Record<string, string> = { active: 'var(--primary)', upcoming: 'var(--purple)', completed: 'var(--success)' }

  const actionBtns = [
    { label: '회의 시작',   icon: '🎙',  action: handleMeeting },
    { label: '기여도 리포트', icon: '📊', action: () => setView('report') },
    { label: '채팅',        icon: '💬',  action: handleChat },
    { label: 'To-Do',      icon: '✅',  action: () => setView('todo') },
    { label: '파일',        icon: '📁',  action: () => setView('drive') },
    { label: '일정 조율',    icon: '📅',  action: () => setView('meetpoll') },
  ]

  const handleEditProject = async () => {
    if (!project) return
    const name = window.prompt('프로젝트 이름 수정', project.name)
    if (name === null) return
    try { await ProjectAPI.update(project.id, { name: name.trim() || project.name }); reloadProject() }
    catch (e: any) { alert(e.message) }
  }

  const handleDeleteProject = async () => {
    if (!project || !window.confirm(`'${project.name}' 프로젝트를 삭제할까요? 되돌릴 수 없어요.`)) return
    try { await ProjectAPI.delete(project.id); navigate('/dashboard') }
    catch (e: any) { alert(e.message) }
  }

  const viewTitle: Record<View, string> = {
    overview: project.name,
    todo: `To-Do · ${project.name}`,
    meetings: `회의 · ${project.name}`,
    report: `기여도 리포트 · ${project.name}`,
    drive: `파일 · ${project.name}`,
    meetpoll: `일정 조율 · ${project.name}`,
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {view !== 'overview' && (
            <button onClick={() => setView('overview')} style={s.backBtn}>←</button>
          )}
          {view === 'overview' && (
            <button onClick={() => navigate('/dashboard')} style={s.backBtn}>←</button>
          )}
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{viewTitle[view]}</span>
        </div>
        {view === 'overview' && isLeader && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleEditProject} style={s.plusBtn} title="프로젝트 수정">✏️</button>
            <button onClick={handleDeleteProject} style={s.plusBtn} title="프로젝트 삭제">🗑️</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {view === 'overview' && (
          <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Blue header card */}
            <div style={{
              background: 'linear-gradient(135deg, #1daaed 0%, #1590c9 100%)',
              borderRadius: 18, padding: '28px 28px 24px',
              boxShadow: '0 4px 20px rgba(29,170,237,0.25)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                {project.emoji} {project.name}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                팀원 {project.member_count}명 · D-{project.days_left}
              </div>
            </div>

            {/* Action buttons grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {actionBtns.map(btn => (
                <button key={btn.label} onClick={btn.action} style={s.actionBtn}>
                  <span style={{ fontSize: 28, marginBottom: 8, display: 'block' }}>{btn.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Info table */}
            <div style={s.card}>
              {[
                { label: '시작일', value: dotDateToKr(project.start_date) },
                { label: '종료일', value: dotDateToKr(project.end_date) },
                { label: '상태',   value: project.status, isStatus: true },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 80, fontSize: 14, color: 'var(--text-muted)' }}>{row.label}</span>
                  {row.isStatus ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: statusColor[project.status] }}>
                      {statusLabel[project.status]}
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* 팀원 목록 */}
            <div style={s.card}>
              <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>팀원 목록</span>
                {isLeader && (
                  <button onClick={handleInvite} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ 멤버 초대</button>
                )}
              </div>
              {project.members.map((m, i) => {
                const isLeaderMember = m.roles.includes('팀장') || m.roles.includes('방장')
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < project.members.length - 1 ? '1px solid var(--border)' : 'none', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: MEMBER_COLORS[i % MEMBER_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {m.name.slice(0, 1)}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.roles.join(', ')}</span>
                    {isLeaderMember && <span style={{ fontSize: 16 }}>👑</span>}
                    {isLeader && !isLeaderMember && (
                      <button onClick={() => handleRemoveMember(m.id, m.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>제외</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'todo'     && <TodoTab projectId={project.id} members={project.members} />}
        {view === 'meetings' && <MeetingsTab projectId={project.id} isLeader={isLeader} />}
        {view === 'report'   && <ReportTab projectId={project.id} />}
        {view === 'drive'    && <DriveTab projectId={project.id} isLeader={isLeader} />}
        {view === 'meetpoll' && <MeetPollTab projectId={project.id} />}
      </div>
    </div>
  )
}

// ── Todo Tab ──────────────────────────────────────────
function TodoTab({ projectId, members }: { projectId: string; members: { id: string; name: string }[] }) {
  const [todos, setTodos] = useState<TodoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'done' | 'undone'>('all')

  // 추가 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignees, setNewAssignees] = useState<string[]>([])
  const [newDifficulty, setNewDifficulty] = useState(2)
  const [adding, setAdding] = useState(false)

  // 수정 모달 상태
  const [editTodo, setEditTodo] = useState<TodoDTO | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editAssignees, setEditAssignees] = useState<string[]>([])
  const [editDifficulty, setEditDifficulty] = useState(2)

  const load = () => TodoAPI.listByProject(projectId).then(setTodos).finally(() => setLoading(false))
  useEffect(() => { load() }, [projectId])

  const resetForm = () => {
    setNewTitle(''); setNewStartDate(''); setNewDueDate('')
    setNewAssignees([]); setNewDifficulty(2); setShowForm(false)
  }

  const addTodo = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      await TodoAPI.create({
        title: newTitle.trim(),
        project_id: projectId,
        assignee_member_ids: newAssignees,
        start_date: newStartDate || undefined,
        due_date: newDueDate || undefined,
        difficulty: newDifficulty,
      })
      resetForm(); load()
    } finally { setAdding(false) }
  }

  const openEdit = (todo: TodoDTO) => {
    setEditTodo(todo)
    setEditTitle(todo.title)
    setEditStartDate(todo.start_date ?? '')
    setEditDueDate(todo.due_date ?? '')
    setEditAssignees(todo.assignee_member_ids ?? [])
    setEditDifficulty(todo.difficulty ?? 2)
  }

  const saveEdit = async () => {
    if (!editTodo || !editTitle.trim()) return
    await TodoAPI.update(editTodo.id, {
      title: editTitle.trim(),
      assignee_member_ids: editAssignees,
      start_date: editStartDate || undefined,
      due_date: editDueDate || undefined,
      difficulty: editDifficulty,
    })
    setEditTodo(null); load()
  }

  const toggle = async (id: string) => {
    const updated = await TodoAPI.toggleDone(id)
    setTodos(prev => prev.map(t => t.id === id ? updated : t))
  }

  const del = async (id: string) => {
    await TodoAPI.delete(id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const toggleAssignee = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const filtered = todos.filter(t => filter === 'all' ? true : filter === 'done' ? t.done : !t.done)
  const done = todos.filter(t => t.done).length

  if (loading) return <div style={s.center}><span className="spinner" /></div>

  return (
    <div style={{ maxWidth: 640 }}>
      {/* 진행률 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }}>
          <span>진행률</span><span>{done}/{todos.length}</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 4, width: todos.length ? `${(done / todos.length) * 100}%` : '0%', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* 추가 폼 토글 버튼 */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ ...s.addBtn, width: '100%', marginBottom: 16, padding: '10px 0' }}>+ 새 할 일 추가</button>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <input
            style={{ ...s.input, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="할 일 제목" autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>시작일</div>
              <input type="date" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>마감일</div>
              <input type="date" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>
          </div>
          {members.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>담당자 (중복 선택 가능)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {members.map(m => {
                  const active = newAssignees.includes(m.id)
                  return (
                    <button key={m.id} onClick={() => toggleAssignee(m.id, newAssignees, setNewAssignees)}
                      style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>난이도</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([1, 2, 3] as const).map(d => {
                const labels = { 1: '하', 2: '중', 3: '상' }
                const colors = { 1: '#16A34A', 2: '#D97706', 3: '#DC2626' }
                const bgs = { 1: '#F0FDF4', 2: '#FFFBEB', 3: '#FEF2F2' }
                const active = newDifficulty === d
                return (
                  <button key={d} onClick={() => setNewDifficulty(d)}
                    style={{ padding: '4px 14px', borderRadius: 10, border: `1px solid ${active ? colors[d] : 'var(--border)'}`, background: active ? bgs[d] : 'transparent', color: active ? colors[d] : 'var(--text-muted)', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer' }}>
                    {labels[d]}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addTodo} disabled={adding || !newTitle.trim()}
              style={{ ...s.addBtn, flex: 1, opacity: adding || !newTitle.trim() ? 0.5 : 1 }}>
              {adding ? '추가 중...' : '추가'}
            </button>
            <button onClick={resetForm}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'undone', 'done'] as const).map(f => (
          <button key={f} style={{ ...s.chip, background: filter === f ? 'var(--primary-bg)' : 'var(--bg-muted)', color: filter === f ? 'var(--primary)' : 'var(--text-sub)', fontWeight: filter === f ? 700 : 500 }}
            onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : f === 'undone' ? '미완료' : '완료'}
          </button>
        ))}
      </div>

      {/* 할 일 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(todo => (
          <div key={todo.id} onClick={() => openEdit(todo)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
            <input type="checkbox" checked={todo.done} onChange={e => { e.stopPropagation(); toggle(todo.id) }}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: todo.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: todo.done ? 'line-through' : 'none' }} className="truncate">{todo.title}</div>
              {todo.assignee_names && todo.assignee_names.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>담당: {todo.assignee_names.join(', ')}</div>
              )}
              {(todo.start_date || todo.due_date) && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {todo.start_date ? todo.start_date.slice(0, 10) : ''}{todo.start_date && todo.due_date ? ' ~ ' : ''}{todo.due_date ? todo.due_date.slice(0, 10) : ''}
                </div>
              )}
            </div>
            <DiffBadge diff={todo.difficulty} />
            <button onClick={e => { e.stopPropagation(); del(todo.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 2px', flexShrink: 0 }}>×</button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>할 일이 없습니다</div>}
      </div>

      {/* 수정 모달 */}
      {editTodo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={() => setEditTodo(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>할 일 수정</div>
            <input style={{ ...s.input, width: '100%', marginBottom: 12, boxSizing: 'border-box' }}
              value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="제목" autoFocus />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>시작일</div>
                <input type="date" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                  value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>마감일</div>
                <input type="date" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                  value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
              </div>
            </div>
            {members.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>담당자 (중복 선택 가능)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {members.map(m => {
                    const active = editAssignees.includes(m.id)
                    return (
                      <button key={m.id} onClick={() => toggleAssignee(m.id, editAssignees, setEditAssignees)}
                        style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>난이도</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([1, 2, 3] as const).map(d => {
                  const labels = { 1: '하', 2: '중', 3: '상' }
                  const colors = { 1: '#16A34A', 2: '#D97706', 3: '#DC2626' }
                  const bgs = { 1: '#F0FDF4', 2: '#FFFBEB', 3: '#FEF2F2' }
                  const active = editDifficulty === d
                  return (
                    <button key={d} onClick={() => setEditDifficulty(d)}
                      style={{ padding: '4px 14px', borderRadius: 10, border: `1px solid ${active ? colors[d] : 'var(--border)'}`, background: active ? bgs[d] : 'transparent', color: active ? colors[d] : 'var(--text-muted)', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer' }}>
                      {labels[d]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} disabled={!editTitle.trim()}
                style={{ ...s.addBtn, flex: 1, opacity: !editTitle.trim() ? 0.5 : 1 }}>저장</button>
              <button onClick={() => setEditTodo(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DiffBadge({ diff }: { diff: number }) {
  const map = { 1: { label: '하', color: '#16A34A', bg: '#F0FDF4' }, 2: { label: '중', color: '#D97706', bg: '#FFFBEB' }, 3: { label: '상', color: '#DC2626', bg: '#FEF2F2' } } as const
  const d = map[diff as 1 | 2 | 3]
  if (!d) return null
  return <span style={{ padding: '2px 8px', borderRadius: 10, background: d.bg, color: d.color, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{d.label}</span>
}

// ── Meetings Tab ──────────────────────────────────────
function MeetingsTab({ projectId, isLeader }: { projectId: string; isLeader: boolean }) {
  const [meetings, setMeetings] = useState<MeetingDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MeetingDTO | null>(null)
  const [detailTab, setDetailTab] = useState<'summary' | 'attendance'>('summary')

  // 회의 시작 모달
  const [showStart, setShowStart] = useState(false)
  const [startTitle, setStartTitle] = useState('')
  const [starting, setStarting] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState<MeetingDTO | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const load = useCallback(() => MeetingAPI.list(projectId).then(setMeetings).finally(() => setLoading(false)), [projectId])
  useEffect(() => { load() }, [load])

  const handleStart = async () => {
    if (!startTitle.trim()) return
    setStarting(true)
    try {
      const meeting = await MeetingAPI.start(startTitle.trim(), projectId)
      setActiveMeeting(meeting)
      setShowStart(false)
      setStartTitle('')
      // QR에 인코딩할 URL: 앱에서 /meetings/{id}/attend 호출하는 딥링크 또는 웹 URL
      const attendUrl = `${window.location.origin}/attend/${meeting.id}`
      const dataUrl = await QRCode.toDataURL(attendUrl, { width: 240, margin: 2 })
      setQrDataUrl(dataUrl)
      load()
    } catch (err: any) { alert(err.message) }
    finally { setStarting(false) }
  }

  const handleDelete = async (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation()
    if (!confirm('이 회의 기록을 삭제할까요?')) return
    try { await MeetingAPI.delete(meetingId); setMeetings(prev => prev.filter(m => m.id !== meetingId)); if (selected?.id === meetingId) setSelected(null) }
    catch (err: any) { alert(err.message) }
  }

  if (loading) return <div style={s.center}><span className="spinner" /></div>

  // QR 모달 (회의 진행 중)
  if (activeMeeting && qrDataUrl) return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🎙</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{activeMeeting.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>회의가 시작됐어요. QR을 스캔해 출석체크하세요.</div>
        <img src={qrDataUrl} alt="출석 QR" style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 20 }} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, wordBreak: 'break-all', padding: '0 16px' }}>
          {`${window.location.origin}/attend/${activeMeeting.id}`}
        </div>
        <button onClick={() => { setActiveMeeting(null); setQrDataUrl('') }}
          style={{ ...s.addBtn, width: '100%', padding: '12px 0' }}>회의 종료</button>
      </div>
    </div>
  )

  // 회의 상세
  if (selected) return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button style={s.backLink} onClick={() => { setSelected(null); setDetailTab('summary') }}>← 목록으로</button>
        {isLeader && (
          <button onClick={e => handleDelete(e, selected.id)}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600, fontSize: 12, border: '1px solid var(--danger)', cursor: 'pointer' }}>
            삭제
          </button>
        )}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{selected.title}</h2>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        {selected.started_at ? new Date(selected.started_at).toLocaleString('ko-KR') : ''}{selected.duration_seconds ? ` · ${Math.round(selected.duration_seconds / 60)}분` : ''}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['summary', 'attendance'] as const).map(t => (
          <button key={t} onClick={() => setDetailTab(t)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', background: detailTab === t ? 'var(--primary)' : 'var(--bg-muted)', color: detailTab === t ? '#fff' : 'var(--text-sub)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {t === 'summary' ? '회의록' : '출석'}
          </button>
        ))}
      </div>

      {detailTab === 'summary' && (
        <>
          {selected.summary.length > 0 && <Section title="요약"><ul style={{ paddingLeft: 16 }}>{selected.summary.map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 4 }}>{s}</li>)}</ul></Section>}
          {selected.keywords.length > 0 && <Section title="키워드"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{selected.keywords.map(k => <span key={k} style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: 12 }}>{k}</span>)}</div></Section>}
          {selected.participants.length > 0 && <Section title="발언자">{selected.participants.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(p.speak_time_seconds / 60)}분 발언</span>
            </div>
          ))}</Section>}
          {selected.action_items.length > 0 && <Section title="액션 아이템">{selected.action_items.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
              <span style={{ color: a.added ? 'var(--success)' : 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{a.title}</span>
            </div>
          ))}</Section>}
          {selected.summary.length === 0 && selected.participants.length === 0 && (
            <div style={s.empty}>회의록이 아직 없습니다.</div>
          )}
        </>
      )}

      {detailTab === 'attendance' && (
        <Section title={`출석 (${selected.attendance?.length ?? 0}명)`}>
          {(selected.attendance ?? []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>출석 기록이 없습니다.</div>
          ) : (selected.attendance ?? []).map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                {a.joined_at && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(a.joined_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 참여</div>}
              </div>
              <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: a.late_seconds > 0 ? '#FEF2F2' : '#F0FDF4', color: a.late_seconds > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                {a.late_seconds > 0 ? `${Math.round(a.late_seconds / 60)}분 지각` : '출석'}
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      {/* 회의 시작 버튼 */}
      <button onClick={() => setShowStart(true)}
        style={{ ...s.addBtn, width: '100%', padding: '12px 0', marginBottom: 20, fontSize: 15 }}>
        🎙 회의 시작
      </button>

      {/* 회의 시작 모달 */}
      {showStart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={() => setShowStart(false)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>회의 시작</div>
            <input style={{ ...s.input, width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
              placeholder="회의 제목" value={startTitle} onChange={e => setStartTitle(e.target.value)}
              autoFocus onKeyDown={e => e.key === 'Enter' && handleStart()} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleStart} disabled={starting || !startTitle.trim()}
                style={{ ...s.addBtn, flex: 1, opacity: starting || !startTitle.trim() ? 0.5 : 1 }}>
                {starting ? '시작 중...' : '시작'}
              </button>
              <button onClick={() => setShowStart(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {meetings.length === 0 ? <div style={s.empty}>회의 기록이 없습니다</div>
        : meetings.map(m => (
          <div key={m.id} style={{ ...s.meetCard, position: 'relative', cursor: 'pointer' }} onClick={() => setSelected(m)}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, paddingRight: isLeader ? 60 : 0 }}>{m.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {m.started_at ? new Date(m.started_at).toLocaleDateString('ko-KR') : m.created_at.slice(0, 10)} · {Math.round(m.duration_seconds / 60)}분 · 참여자 {m.participants.length}명
            </div>
            {m.keywords.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>{m.keywords.slice(0, 3).map(k => <span key={k} style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: 11 }}>{k}</span>)}</div>}
            {isLeader && <button onClick={e => handleDelete(e, m.id)} style={{ position: 'absolute', top: 14, right: 14, padding: '4px 10px', borderRadius: 6, background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600, fontSize: 11, border: '1px solid var(--danger)', cursor: 'pointer' }}>삭제</button>}
          </div>
        ))}
      <canvas ref={qrCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ── Report Tab ────────────────────────────────────────
function ReportTab({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<ReportDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { ReportAPI.get(projectId).then(setReport).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [projectId])

  if (loading) return <div style={s.center}><span className="spinner" /></div>
  if (error) return <div style={s.empty}>{error}</div>
  if (!report) return null

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="할 일 완료율" value={`${Math.round(report.completion_rate)}%`} color="var(--primary)" />
        <StatCard label="전체 할 일" value={`${report.done_todos}/${report.total_todos}`} color="var(--success)" />
        <StatCard label="회의 횟수" value={`${report.meeting_count}회`} color="var(--purple)" />
      </div>
      {report.overall_comment && (
        <div style={{ padding: 16, background: 'var(--primary-bg)', borderRadius: 12, marginBottom: 24, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
          💬 {report.overall_comment}
        </div>
      )}
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>팀원별 기여도</h3>
      {report.members.map(m => (
        <div key={m.member_id} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700 }}>{m.name.slice(0, 1)}</div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>{m.contribution}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 3, width: `${m.contribution}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>할 일 {m.todos_done}/{m.todos_total}</span>
            <span>발언 {Math.round(m.speak_seconds / 60)}분</span>
            <span>점수 {m.score}점</span>
          </div>
          {m.ai_comment && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic' }}>"{m.ai_comment}"</div>}
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ── Drive Tab ─────────────────────────────────────────
function DriveTab({ projectId, isLeader }: { projectId: string; isLeader: boolean }) {
  const [files, setFiles] = useState<FileDTO[]>([])
  const [folders, setFolders] = useState<FolderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [newFolder, setNewFolder] = useState('')
  const [organizing, setOrganizing] = useState(false)
  const [organizeMsg, setOrganizeMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    Promise.all([
      DriveAPI.folders(projectId),
      DriveAPI.files(projectId),
    ]).then(([folds, fils]) => { setFolders(folds); setFiles(fils) }).finally(() => setLoading(false))
  }, [projectId])
  useEffect(() => { load() }, [load])

  const createFolder = async () => {
    if (!newFolder.trim()) return
    await DriveAPI.createFolder(newFolder.trim(), projectId)
    setNewFolder(''); load()
  }

  const deleteFolder = async (id: string) => {
    if (!confirm('폴더를 삭제할까요?')) return
    await DriveAPI.deleteFolder(id); load()
  }

  const deleteFile = async (id: string) => {
    if (!confirm('파일을 삭제할까요?')) return
    await DriveAPI.deleteFile(id); load()
  }

  const downloadFile = async (id: string, name: string) => {
    try {
      const { url } = await DriveAPI.downloadUrl(id)
      const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    } catch {}
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    if (projectId) form.append('project_id', projectId)
    try {
      const token = localStorage.getItem('moa_access_token')
      await fetch('/api/drive/files', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
      load()
    } catch {}
    e.target.value = ''
  }

  const autoOrganize = async () => {
    if (files.length === 0) { alert('정리할 파일이 없습니다.'); return }
    setOrganizing(true); setOrganizeMsg('')
    try {
      const result = await DriveAPI.autoOrganize(projectId)
      setOrganizeMsg(result.message || `${result.moved}개 파일을 정리했어요.`)
      load()
    } catch (err: any) { setOrganizeMsg(err.message || 'AI 정리에 실패했습니다.') }
    finally { setOrganizing(false) }
  }

  const formatSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : b > 1024 ? `${(b / 1024).toFixed(0)}KB` : `${b}B`

  if (loading) return <div style={s.center}><span className="spinner" /></div>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input style={{ ...s.input, flex: 1 }} placeholder="새 폴더 이름" value={newFolder} onChange={e => setNewFolder(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} />
          <button style={s.addBtn} onClick={createFolder}>폴더 만들기</button>
        </div>
        <button style={s.addBtn} onClick={() => fileRef.current?.click()}>📎 파일 업로드</button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
      </div>
      <button onClick={autoOrganize} disabled={organizing}
        style={{ width: '100%', marginBottom: 16, padding: '10px 0', borderRadius: 10, border: '1px solid var(--primary)', background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: organizing ? 'not-allowed' : 'pointer', opacity: organizing ? 0.6 : 1 }}>
        {organizing ? '✨ AI가 정리 중...' : '✨ AI로 비슷한 파일 정리하기'}
      </button>
      {organizeMsg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: 13 }}>
          {organizeMsg}
        </div>
      )}

      {folders.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>폴더</div>
          {folders.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ fontSize: 18, marginRight: 10 }}>📁</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{f.name}</span>
              <button onClick={() => deleteFolder(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>파일</div>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ fontSize: 18, marginRight: 10 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }} className="truncate">{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(f.size_bytes)}</div>
              </div>
              <button onClick={() => downloadFile(f.id, f.name)} style={{ ...s.addBtn, padding: '4px 10px', fontSize: 12, marginRight: 6 }}>다운로드</button>
              <button onClick={() => deleteFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15 }}>×</button>
            </div>
          ))}
        </div>
      ) : folders.length === 0 ? (
        <div style={s.empty}>파일이 없습니다. 파일을 업로드해보세요!</div>
      ) : null}
    </div>
  )
}

// ── MeetPoll Tab ──────────────────────────────────────
function MeetPollTab({ projectId }: { projectId: string }) {
  const [polls, setPolls] = useState<MeetPollDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MeetPollDetailDTO | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [dates, setDates] = useState('')
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(18)
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])

  const load = () => MeetPollAPI.listByProject(projectId).then(setPolls).finally(() => setLoading(false))
  useEffect(() => { load() }, [projectId])

  const openPoll = async (id: string) => { const d = await MeetPollAPI.get(id); setSelected(d); setSelectedSlots(d.my_slots) }
  const savePoll = async () => { if (!selected) return; const u = await MeetPollAPI.setAvailability(selected.id, selectedSlots); setSelected(u) }
  const createPoll = async () => {
    const dateList = dates.split(',').map(d => d.trim()).filter(Boolean)
    await MeetPollAPI.create(projectId, { title, dates: dateList, start_hour: startHour, end_hour: endHour })
    setCreating(false); setTitle(''); setDates(''); load()
  }
  const toggleSlot = (slot: string) => setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])

  if (loading) return <div style={s.center}><span className="spinner" /></div>

  if (selected) {
    const hours = Array.from({ length: selected.end_hour - selected.start_hour }, (_, i) => selected.start_hour + i)
    return (
      <div style={{ maxWidth: 700 }}>
        <button style={s.backLink} onClick={() => setSelected(null)}>← 목록으로</button>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '12px 0 4px' }}>{selected.title}</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>응답자 {selected.total_respondents}명</div>
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>시간</th>
              {selected.dates.map(d => <th key={d} style={{ padding: '4px 8px', color: 'var(--text-sub)', fontWeight: 600 }}>{d.slice(5)}</th>)}
            </tr></thead>
            <tbody>{hours.map(h => (
              <tr key={h}>
                <td style={{ padding: '2px 8px', color: 'var(--text-muted)', textAlign: 'right' }}>{h}:00</td>
                {selected.dates.map(d => {
                  const slot = `${d} ${h}`  // 앱/백엔드와 동일한 슬롯 키 형식
                  const count = selected.counts[slot] ?? 0
                  const isSel = selectedSlots.includes(slot)
                  const isBest = selected.best_slots.includes(slot)
                  const opacity = selected.total_respondents > 0 ? count / selected.total_respondents : 0
                  const bg = isSel
                    ? count > 0 ? `rgba(0,169,236,${0.25 + opacity * 0.55})` : 'rgba(0,169,236,0.25)'
                    : count > 0 ? `rgba(0,169,236,${opacity * 0.45})` : 'var(--bg-muted)'
                  return <td key={d} onClick={() => toggleSlot(slot)} style={{ width: 48, height: 28, cursor: 'pointer', borderRadius: 4, background: bg, border: isSel ? '2px solid var(--primary)' : isBest ? '2px solid var(--primary)' : '1px solid var(--border)', textAlign: 'center', lineHeight: '28px', fontWeight: count > 0 ? 600 : 400, color: count > 0 ? 'var(--primary)' : isSel ? 'var(--primary)' : 'transparent', fontSize: 11 }}>{count > 0 ? count : isSel ? '✓' : ''}</td>
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <button style={{ ...s.addBtn, padding: '10px 24px' }} onClick={savePoll}>가능 시간 저장</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={s.addBtn} onClick={() => setCreating(!creating)}>+ 새 일정 조율</button>
      </div>
      {creating && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={s.input} placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={s.input} placeholder="날짜 (쉼표 구분, 예: 2025-06-10, 2025-06-11)" value={dates} onChange={e => setDates(e.target.value)} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: 'var(--text-muted)' }}>시작</label><input style={s.input} type="number" min={0} max={23} value={startHour} onChange={e => setStartHour(+e.target.value)} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: 'var(--text-muted)' }}>종료</label><input style={s.input} type="number" min={0} max={23} value={endHour} onChange={e => setEndHour(+e.target.value)} /></div>
            </div>
            <button style={s.addBtn} onClick={createPoll}>만들기</button>
          </div>
        </div>
      )}
      {polls.length === 0 ? <div style={s.empty}>일정 조율이 없습니다</div>
        : polls.map(p => (
          <div key={p.id} style={s.meetCard} onClick={() => openPoll(p.id)}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>응답자 {p.respondent_count}명 · {p.dates.length}일 · {p.start_hour}~{p.end_hour}시</div>
          </div>
        ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  center:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 },
  empty:    { textAlign: 'center', color: 'var(--text-muted)', padding: 40 },
  topbar:   { padding: '14px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  backBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 4px', lineHeight: 1 },
  plusBtn:  { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionBtn: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
    padding: '20px 10px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s',
  },
  card:     { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' },
  backLink: { fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
  input:    { padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  addBtn:   { padding: '9px 16px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', flexShrink: 0 },
  chip:     { padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' },
  meetCard: { background: 'var(--bg-card)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', marginBottom: 10, cursor: 'pointer' },
}
