import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthAPI, ProjectAPI, type ProjectDTO } from '../api'
import { useAuth } from '../AuthContext'
import { TokenStore } from '../api'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectDTO[]>([])

  useEffect(() => {
    ProjectAPI.list().then(setProjects).catch(() => {})
  }, [])

  const displayName = user ? `${user.last_name}${user.first_name}` : ''
  const initial = displayName ? displayName[0] : '?'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Topbar */}
      <div style={s.topbar}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>프로필</span>
        <button style={s.plusBtn} onClick={handleLogout} title="로그아웃">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        {/* Profile header card */}
        <div style={s.profileCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {displayName} <span style={{ fontWeight: 400, fontSize: 14 }}>@{user?.username}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                  {projects.length}개 프로젝트 참여중
                </span>
              </div>
            </div>
          </div>
          {user?.organization_name && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
              {user.organization_name}{user.department ? ` · ${user.department}` : ''}{user.student_id ? ` · ${user.student_id}` : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.profileBtn} onClick={() => navigate('/profile/edit')}>✏️ 회원정보 수정</button>
            <button style={s.profileBtn} onClick={() => navigate('/friends')}>🧑‍🤝‍🧑 친구 관리</button>
          </div>
        </div>

        {/* Info card */}
        <div style={s.infoCard}>
          {[
            { label: '이름', value: displayName },
            { label: '이메일', value: user?.email },
            { label: '학교', value: user?.organization_name },
            { label: '학과', value: user?.department },
          ].filter(r => r.value).map(row => (
            <div key={row.label} style={s.infoRow}>
              <span style={s.infoLabel}>{row.label}</span>
              <span style={s.infoValue}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Projects card */}
        {projects.length > 0 && (
          <div style={s.infoCard}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>참여 프로젝트 현황</div>
            {projects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{p.emoji} {p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>팀원 {p.member_count}명 참여 중</div>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: p.status === 'active' ? '#dff4e9' : p.status === 'upcoming' ? '#f0e6f9' : 'var(--border)', color: p.status === 'active' ? '#2db56a' : p.status === 'upcoming' ? '#9b59d4' : 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                  {p.status === 'active' ? '진행중' : p.status === 'upcoming' ? '예정' : '완료'}
                </div>
              </div>
            ))}
          </div>
        )}
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
  plusBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'var(--primary)', color: '#fff',
    fontSize: 20, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  profileCard: {
    background: 'linear-gradient(135deg, #1daaed 0%, #1590c9 100%)',
    borderRadius: 16, padding: '24px 24px 20px',
  },
  profileBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
  },
  infoCard: {
    background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px',
    border: '1px solid var(--border)',
  },
  infoRow: {
    display: 'flex', alignItems: 'center', padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  infoLabel: { width: 60, fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 },
  infoValue: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
}
