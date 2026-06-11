import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthAPI } from '../api'
import { useAuth } from '../AuthContext'

export default function ProfileEdit() {
  const { user, fetchUser } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [orgName, setOrgName] = useState(user?.organization_name || '')
  const [dept, setDept] = useState(user?.department || '')
  const [studentId, setStudentId] = useState(user?.student_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) { setError('이름을 입력해주세요.'); return }
    setError(''); setLoading(true)
    try {
      await AuthAPI.updateProfile({
        name: `${lastName}${firstName}`,
        organization_name: orgName || undefined,
        department: dept || undefined,
        student_id: studentId || undefined,
      })
      await fetchUser()
      setSuccess(true)
      setTimeout(() => navigate('/profile'), 900)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 4px' }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>회원정보 수정</span>
        </div>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <form onSubmit={handleSave} style={{ maxWidth: 560 }}>
          <div style={s.card}>
            <Field label="성" value={lastName} onChange={setLastName} placeholder="성" />
            <Field label="이름" value={firstName} onChange={setFirstName} placeholder="이름" />
            <Field label="학교" value={orgName} onChange={setOrgName} placeholder="학교명" />
            <Field label="학과" value={dept} onChange={setDept} placeholder="학과명" />
            <Field label="학번" value={studentId} onChange={setStudentId} placeholder="학번" last />
          </div>

          {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 16, width: '100%', padding: '14px', borderRadius: 12, background: loading ? 'var(--border)' : 'var(--primary)', color: loading ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {success ? '✓ 저장 완료!' : loading ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, last }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: last ? 'none' : '1px solid var(--border)', gap: 16 }}>
      <span style={{ width: 56, fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)', background: 'transparent' }}
      />
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: { padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  card: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' },
}
