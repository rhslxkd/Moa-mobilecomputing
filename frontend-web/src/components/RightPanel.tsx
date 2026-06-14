import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationAPI, TodoAPI, type NotificationDTO, type TodoDTO } from '../api'

function daysLeft(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
function daysLeftColor(dateStr: string) {
  const d = daysLeft(dateStr)
  return d <= 1 ? 'var(--danger)' : d <= 3 ? '#f59e0b' : 'var(--text-muted)'
}

export default function RightPanel() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [todos, setTodos] = useState<TodoDTO[]>([])

  useEffect(() => {
    NotificationAPI.list().then(setNotifications).catch(() => {})
    TodoAPI.list().then(setTodos).catch(() => {})
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length
  const myTodos = todos.filter(t => !t.done).slice(0, 5)

  return (
    <aside style={s.panel}>
      {/* 알림 */}
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>알림</span>
          {unreadCount > 0 && <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>읽지 않은 {unreadCount}개</span>}
        </div>
        {notifications.length === 0 ? (
          <div style={s.empty}>알림이 없습니다</div>
        ) : notifications.slice(0, 4).map(n => (
          <div key={n.id} onClick={() => navigate('/notifications')} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'var(--border)' : n.type === 'todo' ? 'var(--danger)' : 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }} className="truncate">{n.body}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 나의 투두 */}
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>나의 투두</span>
          <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/todo')}>전체 보기 →</span>
        </div>
        {myTodos.length === 0 ? (
          <div style={s.empty}>투두가 없습니다</div>
        ) : myTodos.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
            {t.due_date && <span style={{ fontSize: 11, color: daysLeftColor(t.due_date), fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>D-{daysLeft(t.due_date)}</span>}
          </div>
        ))}
      </div>
    </aside>
  )
}

const s: Record<string, React.CSSProperties> = {
  panel: { width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg)', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: 16 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  empty: { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' },
}
