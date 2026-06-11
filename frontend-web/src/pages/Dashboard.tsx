import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ProjectAPI, TodoAPI, NotificationAPI, type ProjectDTO, type TodoDTO, type NotificationDTO } from '../api'
import { useAuth } from '../AuthContext'
import { STATUS_CONFIG } from '../theme'
import ProjectCreateModal from '../components/ProjectCreateModal'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [todos, setTodos] = useState<TodoDTO[]>([])
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    Promise.all([ProjectAPI.list(), TodoAPI.list(), NotificationAPI.list()])
      .then(([p, t, n]) => { setProjects(p); setTodos(t); setNotifications(n) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const displayName = user ? `${user.last_name}${user.first_name}` : ''
  const hasUnread = notifications.some(n => !n.read)
  const unreadCount = notifications.filter(n => !n.read).length

  // Stats
  const activeCount = projects.filter(p => p.status === 'active').length
  const totalMembers = projects.reduce((s, p) => s + p.member_count, 0)
  const openTodos = todos.filter(t => !t.done).length
  const urgentTodos = todos.filter(t => {
    if (t.done || !t.due_date) return false
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000)
    return diff >= 0 && diff <= 2
  }).length

  // My todos for right panel (first 4)
  const myTodos = todos.slice(0, 4)

  // Project alerts
  const alertProjects = projects.filter(p => p.has_chat_alert || p.has_todo_alert)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={s.topbar}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {displayName}님의 프로젝트
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'transparent', textDecoration: 'none' }}>
            <BellIcon />
            {hasUnread && <div style={s.bellDot} />}
          </Link>
          <button style={s.plusBtn} onClick={() => setShowCreate(true)}>+</button>
        </div>
      </div>

      {/* Body: project list + right panel */}
      <div style={s.body}>
        {/* Left: project list */}
        <div style={s.projectCol}>
          {loading ? (
            <div style={s.center}><span className="spinner" /></div>
          ) : projects.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>프로젝트가 없습니다. 새 프로젝트를 만들어 보세요!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {projects.map(p => (
                <ProjectCard key={p.id} project={p}
                  onNavigate={() => navigate(`/project/${p.id}`)}
                  onMeeting={() => navigate(`/meetings?project=${p.id}`)}
                  onReport={() => navigate(`/project/${p.id}?view=report`)}
                />
              ))}
              {/* Alerts section */}
              {alertProjects.length > 0 && (
                <div style={s.alertCard}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>알림</div>
                  {alertProjects.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.has_chat_alert && <span style={{ fontSize: 14 }}>🎙</span>}
                        {p.has_todo_alert && <span style={{ fontSize: 14 }}>⚠</span>}
                        <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, cursor: 'pointer' }}
                          onClick={() => navigate(`/project/${p.id}`)}>{p.emoji} {p.name}</span>
                      </div>
                      {p.has_todo_alert && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>마감 D-{p.days_left}</span>}
                      {p.has_chat_alert && !p.has_todo_alert && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>새 메시지</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={s.rightPanel}>
          {/* Stats */}
          <div style={s.panelCard}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <StatItem value={activeCount} label="진행 프로젝트" />
              <StatItem value={totalMembers} label="팀원" />
              <StatItem value={openTodos} label="오픈 투두" />
              <StatItem value={urgentTodos} label="마감 임박" red />
            </div>
          </div>

          {/* Notifications */}
          <div style={s.panelCard}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>알림</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>읽지 않은 {unreadCount}개</span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>알림이 없습니다</div>
            ) : notifications.slice(0, 3).map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'var(--border)' : n.type === 'todo' ? 'var(--danger)' : 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }} className="truncate">{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* My Todos */}
          <div style={s.panelCard}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>나의 투두</span>
              <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => navigate('/todo')}>전체 보기 →</span>
            </div>
            {myTodos.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>투두가 없습니다</div>
            ) : myTodos.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: t.done ? 'none' : '2px solid var(--border)', background: t.done ? 'var(--primary)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t.done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, color: t.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }} className="truncate">{t.title}</span>
                </div>
                {t.done ? (
                  <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>완료</span>
                ) : t.due_date ? (
                  <span style={{ fontSize: 11, color: daysLeftColor(t.due_date), fontWeight: 600, flexShrink: 0 }}>D-{daysLeft(t.due_date)}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreate && (
        <ProjectCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function daysLeft(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
function daysLeftColor(dateStr: string) {
  const d = daysLeft(dateStr)
  return d <= 1 ? 'var(--danger)' : d <= 3 ? '#f59e0b' : 'var(--text-muted)'
}

function StatItem({ value, label, red }: { value: number; label: string; red?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: red ? 'var(--danger)' : 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ProjectCard({ project, onNavigate, onMeeting, onReport }: { project: ProjectDTO; onNavigate: () => void; onMeeting: () => void; onReport: () => void }) {
  const sc = STATUS_CONFIG[project.status]
  const barColors: Record<string, string> = { active: 'var(--primary)', upcoming: 'var(--purple)', completed: 'var(--success)' }
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--border)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      {/* Header — clickable → project overview */}
      <div onClick={onNavigate} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: project.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {project.emoji}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{project.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>팀원 {project.member_count}명 · D-{project.days_left}</div>
          </div>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 700, flexShrink: 0, border: `1px solid ${sc.color}` }}>
          {sc.label}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, marginBottom: 16 }}>
        <div style={{ height: '100%', borderRadius: 3, background: barColors[project.status], width: project.status === 'completed' ? '100%' : project.status === 'active' ? '50%' : '20%' }} />
      </div>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}
          onClick={onMeeting}>
          🎙 회의 시작
        </button>
        <button style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#fff', color: 'var(--text)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={onReport}>
          기여도 리포트
        </button>
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2">
      <path d="M6.45 7.97C6.76 5.14 9.15 3 12 3s5.24 2.14 5.55 4.97l.25 2.27c.13 1.12.5 2.2 1.08 3.17L19.49 15c.52.87.78 1.3.72 1.66-.08.24-.21.45-.39.6-.28.23-.79.23-1.81.23H5.93c-1.02 0-1.53 0-1.81-.23a1 1 0 01-.39-.6c-.06-.36.2-.79.72-1.66l.65-1.09A10 10 0 006.2 10.24L6.45 7.97z"/>
      <path d="M8 17a4 4 0 008 0"/>
    </svg>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: {
    padding: '16px 24px', background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  bellBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'transparent', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 9, height: 9, borderRadius: '50%',
    background: '#ff4d4d', border: '2px solid white',
  },
  plusBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'var(--primary)', color: '#fff',
    fontSize: 20, fontWeight: 300, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: {
    flex: 1, display: 'flex', overflow: 'hidden',
  },
  projectCol: {
    flex: 1, overflowY: 'auto', padding: 24,
  },
  rightPanel: {
    width: 296, flexShrink: 0, overflowY: 'auto',
    padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    borderLeft: '1px solid var(--border)',
  },
  panelCard: {
    background: 'var(--bg-card)', borderRadius: 14,
    padding: '18px 16px', border: '1px solid var(--border)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 14, fontWeight: 700, color: 'var(--text)',
  },
  alertCard: {
    background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px',
    border: '1px solid var(--border)',
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8 },
}
