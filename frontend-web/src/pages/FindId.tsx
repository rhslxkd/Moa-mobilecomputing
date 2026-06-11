import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthAPI } from '../api'
import MoaLogo from '../components/MoaLogo'

export default function FindId() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await AuthAPI.findIdSendOtp({ email }); setStep('otp') }
    catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { const res = await AuthAPI.findIdVerify({ email, token: otp }); setResult(res.username) }
    catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}><MoaLogo size={40} /><span style={s.brand}>MOA</span></div>
        <h1 style={s.title}>아이디 찾기</h1>
        {result ? (
          <div>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>찾은 아이디</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{result}</div>
            </div>
            <Link to="/login" style={s.btn}>로그인하기</Link>
          </div>
        ) : step === 'email' ? (
          <form onSubmit={sendOtp} style={s.form}>
            <div style={s.field}><label style={s.label}>이메일</label><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="가입한 이메일" required /></div>
            {error && <div style={s.error}>{error}</div>}
            <button style={s.submitBtn} disabled={loading}>{loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '인증 코드 받기'}</button>
            <div style={{ textAlign: 'center' }}><Link to="/login" style={s.link}>로그인으로 돌아가기</Link></div>
          </form>
        ) : (
          <form onSubmit={verify} style={s.form}>
            <div style={s.field}><label style={s.label}>인증 코드</label><input style={{ ...s.input, textAlign: 'center', letterSpacing: 4, fontSize: 20 }} value={otp} onChange={e => setOtp(e.target.value)} placeholder="------" maxLength={6} required /></div>
            {error && <div style={s.error}>{error}</div>}
            <button style={s.submitBtn} disabled={loading}>{loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '확인'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 },
  card: { width: '100%', maxWidth: 400, background: 'var(--bg-card)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' },
  brand: { fontWeight: 800, fontSize: 22, color: 'var(--primary)' },
  title: { fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' },
  input: { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none' },
  error: { background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  submitBtn: { padding: '13px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btn: { display: 'block', padding: '13px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center', marginTop: 16 },
  link: { fontSize: 13, color: 'var(--text-muted)' },
}
