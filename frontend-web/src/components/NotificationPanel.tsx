import { useEffect, useRef } from 'react'
import type { NotificationDTO } from '../api'

interface Props {
  notifications: NotificationDTO[]
  onClose: () => void
  onMarkRead: (id: string) => void
}

const typeColor: Record<string, string> = {
  meeting: '#155DFC',
  todo: '#DC2626',
  mention: '#94A3B8',
  report: '#7C3AED',
}

export default function NotificationPanel({ notifications, onClose, onMarkRead }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={ref} style={{
      position: 'fixed', top: 64, right: 24, width: 320,
      background: 'var(--bg-card)', borderRadius: 16,
      border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      zIndex: 500, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>알림</span>
        {unread > 0 && (
          <span style={{ background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
            읽지 않은 {unread}개
          </span>
        )}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>알림이 없습니다</div>
        ) : notifications.map(n => (
          <div key={n.id} onClick={() => !n.read && onMarkRead(n.id)} style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 10, cursor: n.read ? 'default' : 'pointer',
            background: n.read ? 'transparent' : 'var(--primary-bg)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: typeColor[n.type] ?? '#94A3B8', flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
