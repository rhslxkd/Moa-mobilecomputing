import { useState, useEffect } from 'react'
import { NotificationAPI, InvitationAPI, type NotificationDTO } from '../api'

const ROLE_OPTIONS = ['팀장', '팀원', '디자이너', '개발자', '기획자', 'PM']

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [loading, setLoading] = useState(true)
  // 초대 역할 선택 모달
  const [roleTarget, setRoleTarget] = useState<{ memberId: string; projectName: string } | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const load = () => {
    NotificationAPI.list().then(setNotifications).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // 초대 알림 식별 (id: "invite-{member_id}")
  const getMemberId = (id: string) => id.replace('invite-', '')

  const handleAcceptInvite = (n: NotificationDTO) => {
    setRoleTarget({ memberId: getMemberId(n.id), projectName: n.project })
    setSelectedRoles([])
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  const confirmRole = async () => {
    if (!roleTarget || selectedRoles.length === 0) return
    try {
      await InvitationAPI.accept(roleTarget.memberId, selectedRoles)
      setRoleTarget(null)
      load()
      alert(`'${roleTarget.projectName}' 프로젝트 팀원이 됐어요! (사이드바는 새로고침 후 반영)`)
    } catch (e: any) { alert(e.message) }
  }

  const handleDeclineInvite = async (n: NotificationDTO) => {
    if (!confirm(`'${n.project}' 초대를 거절할까요?`)) return
    try { await InvitationAPI.decline(getMemberId(n.id)); load() } catch (e: any) { alert(e.message) }
  }

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
          ) : notifications.map(n => {
            const isInvite = n.id.startsWith('invite-')
            return (
            <div
              key={n.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : '#f8fbff', cursor: isInvite ? 'default' : 'pointer' }}
              onClick={() => { if (!isInvite) markRead(n.id) }}
            >
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isInvite ? '#1daaed' : (typeBg[n.type] || '#ccc'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {isInvite ? '📩' : (typeIcon[n.type] || '🔔')}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }}>{n.body}</div>
                <div style={{ fontSize: 12, color: 'var(--primary)' }}>
                  {n.project} · {n.time}
                </div>
                {isInvite && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleAcceptInvite(n) }}
                      style={{ padding: '6px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >수락</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeclineInvite(n) }}
                      style={{ padding: '6px 16px', borderRadius: 8, background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >거절</button>
                  </div>
                )}
              </div>
              {/* Close */}
              {!isInvite && (
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4, flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); markRead(n.id) }}
                >×</button>
              )}
            </div>
          )})}
        </div>
      </div>

      {/* 초대 역할 선택 모달 */}
      {roleTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setRoleTarget(null)}
        >
          <div
            style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, width: 360, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>역할을 선택해주세요</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{roleTarget.projectName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ROLE_OPTIONS.map(role => {
                const active = selectedRoles.includes(role)
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text)' }}
                  >{role}</button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRoleTarget(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={confirmRole}
                disabled={selectedRoles.length === 0}
                style={{ flex: 2, padding: '10px', borderRadius: 10, background: selectedRoles.length ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: selectedRoles.length ? 'pointer' : 'default' }}
              >{selectedRoles.length ? `${selectedRoles.join(', ')}(으)로 수락` : '역할을 선택하세요'}</button>
            </div>
          </div>
        </div>
      )}
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
