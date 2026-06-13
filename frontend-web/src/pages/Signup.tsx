import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthAPI, TokenStore } from '../api'
import { useAuth } from '../AuthContext'

type Step = 'terms' | 'name' | 'affiliation' | 'account' | 'otp'

export default function Signup() {
  const navigate = useNavigate()
  const { fetchUser } = useAuth()
  const [step, setStep] = useState<Step>('terms')

  // Terms
  const [termsAll, setTermsAll] = useState(false)
  const [termsService, setTermsService] = useState(false)
  const [termsPrivacy, setTermsPrivacy] = useState(false)
  const [termsMarketing, setTermsMarketing] = useState(false)

  // Name
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')

  // Affiliation
  const [affType, setAffType] = useState('학생(학교/대학원)')
  const [orgName, setOrgName] = useState('')
  const [dept, setDept] = useState('')
  const [studentId, setStudentId] = useState('')

  // Account
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // OTP
  const [otp, setOtp] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setLoading(true)
    try { await fn() } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const toggleAll = (checked: boolean) => {
    setTermsAll(checked); setTermsService(checked); setTermsPrivacy(checked); setTermsMarketing(checked)
  }
  const syncAll = (s: boolean, p: boolean, m: boolean) => setTermsAll(s && p && m)

  const handleTermsNext = () => {
    if (!termsService || !termsPrivacy) { setError('필수 약관에 동의해주세요.'); return }
    setError(''); setStep('name')
  }

  const handleNameNext = () => {
    if (!lastName || !firstName) { setError('성과 이름을 입력해주세요.'); return }
    setError(''); setStep('affiliation')
  }

  const handleAffNext = () => {
    if (!orgName) { setError('소속 이름을 입력해주세요.'); return }
    setError(''); setStep('account')
  }

  const handleAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    wrap(async () => {
      const affTypeMap: Record<string, string> = {
        '학생(학교/대학원)': 'student',
        '직장인': 'employee',
        '프리랜서': 'freelancer',
        '기타': 'other',
      }
      await AuthAPI.signup({
        username, email, password,
        terms_agreed: termsService,
        privacy_agreed: termsPrivacy,
        marketing_agreed: termsMarketing,
      })
      setStep('otp')
    })
  }

  const handleOtp = (e: React.FormEvent) => {
    e.preventDefault()
    wrap(async () => {
      const res = await AuthAPI.verifyEmail({ email, token: otp })
      TokenStore.set(res.access_token)
      await AuthAPI.setupName({ last_name: lastName, first_name: firstName })
      const affTypeMap: Record<string, string> = {
        '학생(학교/대학원)': 'student',
        '직장인': 'employee',
        '프리랜서': 'freelancer',
        '기타': 'other',
      }
      await AuthAPI.setupAffiliation({
        affiliation_type: affTypeMap[affType] || 'other',
        organization_name: orgName || undefined,
        department: dept || undefined,
        student_id: studentId || undefined,
      })
      await fetchUser()
      navigate('/dashboard')
    })
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    padding: '12px 16px', borderRadius: 10,
    border: `1.5px solid ${focusedField === field ? 'var(--primary)' : 'transparent'}`,
    fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none',
    width: '100%', transition: 'border-color 0.15s',
  })

  const CircleCheckbox = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
        background: checked ? '#2db56a' : 'transparent',
        border: checked ? 'none' : '2px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )

  const page = (title: string, sub: string | null, content: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 16, padding: '40px 40px 36px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{sub}</div>}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 28, lineHeight: 1.35 }}>{title}</h1>
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {content}
      </div>
    </div>
  )

  const NextBtn = ({ onClick, disabled, label = '다음' }: { onClick?: () => void; disabled?: boolean; label?: string }) => (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 12,
        background: disabled ? 'var(--border)' : 'var(--primary)',
        color: disabled ? 'var(--text-muted)' : '#fff',
        fontWeight: 700, fontSize: 15, cursor: disabled ? 'default' : 'pointer',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}
    >
      {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : label}
    </button>
  )

  // Step 1: Terms
  if (step === 'terms') return page('이용약관 및 정책', null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {/* All agree */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <CircleCheckbox checked={termsAll} onChange={toggleAll} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>전체 동의하기</span>
        </div>
        {/* Service */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
          <CircleCheckbox checked={termsService} onChange={v => { setTermsService(v); syncAll(v, termsPrivacy, termsMarketing) }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>(필수) 서비스 이용약관 동의</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
          <CircleCheckbox checked={termsPrivacy} onChange={v => { setTermsPrivacy(v); syncAll(termsService, v, termsMarketing) }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>(필수) 개인정보 수집 및 이용 동의</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
          <CircleCheckbox checked={termsMarketing} onChange={v => { setTermsMarketing(v); syncAll(termsService, termsPrivacy, v) }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>(선택) 마케팅 수신 정보 동의</span>
        </div>
      </div>
      <NextBtn onClick={handleTermsNext} disabled={!termsService || !termsPrivacy} />
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <Link to="/login" style={{ fontSize: 13, color: 'var(--text-muted)' }}>이미 계정이 있나요? 로그인</Link>
      </div>
    </div>
  )

  // Step 2: Name
  if (step === 'name') return page('이름을 입력해주세요.', '어떻게 부르면 좋을까요?',
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>성</label>
        <input style={inputStyle('lastName')} value={lastName} onChange={e => setLastName(e.target.value)}
          onFocus={() => setFocusedField('lastName')} onBlur={() => setFocusedField(null)}
          placeholder="성을 입력해주세요." />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>이름</label>
        <input style={inputStyle('firstName')} value={firstName} onChange={e => setFirstName(e.target.value)}
          onFocus={() => setFocusedField('firstName')} onBlur={() => setFocusedField(null)}
          placeholder="이름을 입력해주세요." />
      </div>
      <div style={{ marginTop: 8 }}>
        <NextBtn onClick={handleNameNext} disabled={!lastName || !firstName} />
      </div>
    </div>
  )

  // Step 3: Affiliation
  if (step === 'affiliation') return page('소속을 알려주세요.', '어디에서 활동 중이신가요?',
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <select
        style={{ ...inputStyle('affType'), appearance: 'none' as any }}
        value={affType}
        onChange={e => setAffType(e.target.value)}
        onFocus={() => setFocusedField('affType')}
        onBlur={() => setFocusedField(null)}
      >
        <option>학생(학교/대학원)</option>
        <option>직장인</option>
        <option>프리랜서</option>
        <option>기타</option>
      </select>
      <div>
        <label style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 6, display: 'block' }}>*학교명</label>
        <input style={inputStyle('orgName')} value={orgName} onChange={e => setOrgName(e.target.value)}
          onFocus={() => setFocusedField('orgName')} onBlur={() => setFocusedField(null)}
          placeholder="학교명을 입력해주세요." />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>학과(부)</label>
        <input style={inputStyle('dept')} value={dept} onChange={e => setDept(e.target.value)}
          onFocus={() => setFocusedField('dept')} onBlur={() => setFocusedField(null)}
          placeholder="학과(부)를 입력해주세요." />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>학번</label>
        <input style={inputStyle('studentId')} value={studentId} onChange={e => setStudentId(e.target.value)}
          onFocus={() => setFocusedField('studentId')} onBlur={() => setFocusedField(null)}
          placeholder="학번을 입력해주세요." />
      </div>
      <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: -6 }}>*표시는 필수 입력 항목입니다.</p>
      <NextBtn onClick={handleAffNext} disabled={!orgName} />
    </div>
  )

  // Step 4: Account
  if (step === 'account') return page('이메일, 아이디, 비밀번호를\n설정해주세요.', null,
    <form onSubmit={handleAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>이메일</label>
        <input style={inputStyle('email')} type="email" value={email} onChange={e => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
          placeholder="이메일을 입력해주세요." required />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>아이디</label>
        <input style={inputStyle('username')} value={username} onChange={e => setUsername(e.target.value)}
          onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)}
          placeholder="아이디를 입력해주세요." required />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>비밀번호</label>
        <input style={inputStyle('password')} type="password" value={password} onChange={e => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
          placeholder="비밀번호를 입력해주세요." required minLength={8} />
      </div>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>비밀번호 확인</label>
        <input style={inputStyle('passwordConfirm')} type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
          onFocus={() => setFocusedField('passwordConfirm')} onBlur={() => setFocusedField(null)}
          placeholder="비밀번호를 다시 입력해주세요." required />
      </div>
      <div style={{ marginTop: 8 }}>
        <NextBtn label="완료" disabled={!email || !username || !password || !passwordConfirm} />
      </div>
    </form>
  )

  // Step 5: OTP
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 16, padding: '40px 40px 36px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>이메일 인증</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.35 }}>인증 코드를 입력해주세요.</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{email}로 발송된 6자리 코드를 입력하세요.</p>
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            style={{ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${focusedField === 'otp' ? 'var(--primary)' : 'transparent'}`, fontSize: 20, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none', textAlign: 'center', letterSpacing: 8 }}
            value={otp} onChange={e => setOtp(e.target.value)}
            onFocus={() => setFocusedField('otp')} onBlur={() => setFocusedField(null)}
            placeholder="------" maxLength={6} required
          />
          <NextBtn label="인증하기" disabled={otp.length < 4} />
        </form>
      </div>
    </div>
  )
}
