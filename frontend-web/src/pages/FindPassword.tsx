import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthAPI, TokenStore } from '../api'
import MoaLogo from '../components/MoaLogo'

export default function FindPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp' | 'reset'>('form')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setLoading(true)
    try { await fn() } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const sendOtp = (e: React.FormEvent) => { e.preventDefault(); wrap(async () => { await AuthAPI.findPasswordSendOtp({ email, username }); setStep('otp') }) }
  const verify = (e: React.FormEvent) => { e.preventDefault(); wrap(async () => { const res = await AuthAPI.findPasswordVerify({ email, username, token: otp }); setResetToken(res.access_token); setStep('reset') }) }
  const reset = (e: React.FormEvent) => { e.preventDefault(); wrap(async () => { await AuthAPI.resetPassword({ new_password: newPw }, resetToken); TokenStore.clear(); navigate('/login') }) }

  const forms = {
    form: (
      <form onSubmit={sendOtp} style={s.form}>
        <Field label="아이디"><input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="아이디" required /></Field>
        <Field label="이메일"><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="가입한 이메일" required /></Field>
        {error && <div style={s.error}>{error}</div>}
        <Btn loading={loading}>인증 코드 받기</Btn>
        <div style={{ textAlign: 'center' }}><Link to="/login" style={s.link}>로그인으로 돌아가기</Link></div>
      </form>
    ),
    otp: (
      <form onSubmit={verify} style={s.form}>
        <Field label="인증 코드"><input style={{ ...s.input, textAlign: 'center', letterSpacing: 4, fontSize: 20 }} value={otp} onChange={e => setOtp(e.target.value)} placeholder="------" maxLength={6} required /></Field>
        {error && <div style={s.error}>{error}</div>}
        <Btn loading={loading}>확인</Btn>
      </form>
    ),
    reset: (
      <form onSubmit={reset} style={s.form}>
        <Field label="새 비밀번호"><input style={s.input} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="8자 이상" minLength={8} required /></Field>
        {error && <div style={s.error}>{error}</div>}
        <Btn loading={loading}>비밀번호 변경</Btn>
      </form>
    ),
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}><MoaLogo size={40} /><span style={s.brand}>MOA</span></div>
        <h1 style={s.title}>비밀번호 찾기</h1>
        {forms[step]}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' }}>{label}</label>{children}</div>
}
function Btn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button style={{ padding: '13px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }} disabled={loading}>{loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : children}</button>
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 },
  card: { width: '100%', maxWidth: 400, background: 'var(--bg-card)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' },
  brand: { fontWeight: 800, fontSize: 22, color: 'var(--primary)' },
  title: { fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none' },
  error: { background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  link: { fontSize: 13, color: 'var(--text-muted)' },
}
