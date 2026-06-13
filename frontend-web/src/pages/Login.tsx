import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthAPI, TokenStore } from '../api'
import { useAuth } from '../AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { fetchUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await AuthAPI.login({ username, password })
      TokenStore.set(res.access_token)
      await fetchUser()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>팀플의 모든 것,</span>
          <br />
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>MOA 시작하기</span>
        </h1>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>아이디</label>
            <input
              style={{ ...s.input, borderColor: focusedField === 'username' ? 'var(--primary)' : 'transparent' }}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              placeholder="아이디를 입력해주세요"
              autoComplete="username"
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>비밀번호</label>
            <input
              style={{ ...s.input, borderColor: focusedField === 'password' ? 'var(--primary)' : 'transparent' }}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="비밀번호를 입력해주세요"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.linksRow}>
            <Link to="/signup" style={s.linkBlue}>회원가입</Link>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <Link to="/find-id" style={s.linkGray}>아이디 / 비밀번호 찾기</Link>
          </div>

          <button
            style={{ ...s.btn, background: (!username || !password) ? 'var(--border)' : 'var(--primary)', cursor: loading ? 'not-allowed' : 'pointer' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 380,
    background: 'var(--bg-card)', borderRadius: 16,
    padding: '44px 40px 40px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 22, lineHeight: 1.4, marginBottom: 28, textAlign: 'left',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: 'var(--text-muted)' },
  input: {
    padding: '12px 16px', borderRadius: 10,
    border: '1.5px solid transparent',
    fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none',
    transition: 'border-color 0.15s', width: '100%',
  },
  error: {
    background: 'var(--danger-bg)', color: 'var(--danger)',
    padding: '10px 14px', borderRadius: 8, fontSize: 13,
  },
  linksRow: {
    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 2,
  },
  linkBlue: { fontSize: 13, color: 'var(--primary)', fontWeight: 500 },
  linkGray: { fontSize: 13, color: 'var(--text-muted)' },
  btn: {
    marginTop: 6,
    padding: '14px', borderRadius: 12,
    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', transition: 'background 0.15s',
  },
}
