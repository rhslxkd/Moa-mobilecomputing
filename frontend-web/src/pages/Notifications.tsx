import { useState, useEffect } from 'react'
import { NotificationAPI, type NotificationDTO } from '../api'

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    NotificationAPI.list().then(setNotifications).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = async (id: string) => {
    await NotificationAPI.markRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteRead = () => {
    setNotifications(prev => prev.filter(n => !n.read))
  }

  const typeIcon: Record<string, string> = {
    meeting: '🎙',
    todo: '✅',
    mention: '💬',
    report: '📊',
  }
  const typeBg: Record<string, string> = {
    meeting: '#1daaed',
    todo: '#2db56a',
    mention: '#f59e0b',
    report: '#9b59d4',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Topbar */}
      <div style={s.topbar}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>알림</span>
      </div>

      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={s.card}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>알림</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>읽지 않은 알림 {unreadCount}개</span>
              )}
            </div>
            {notifications.some(n => n.read) && (
              <button
                onClick={deleteRead}
                style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                읽은 알림 삭제
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>알림이 없습니다</div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : '#f8fbff', cursor: 'pointer' }}
              onClick={() => markRead(n.id)}
            >
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: typeBg[n.type] || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {typeIcon[n.type] || '🔔'}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }}>{n.body}</div>
                <div style={{ fontSize: 12, color: 'var(--primary)' }}>
                  {n.project} · {n.time}
                </div>
              </div>
              {/* Close */}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4, flexShrink: 0 }}
                onClick={e => { e.stopPropagation(); markRead(n.id) }}
              >×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: {
    padding: '16px 24px', background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  card: {
    background: 'var(--bg-card)', borderRadius: 14,
    border: '1px solid var(--border)', maxWidth: 720, overflow: 'hidden',
  },
}
