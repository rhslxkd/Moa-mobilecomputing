import { useState } from 'react'
import { ProjectAPI, FriendAPI } from '../api'

const EMOJIS = ['📁', '🚀', '💡', '🎯', '🔥', '⭐', '🎨', '📊', '🛠️', '🌟', '💻', '📱']
const COLORS = ['#00A9EC', '#7C3AED', '#16A34A', '#DC2626', '#D97706', '#0D9488', '#EC4899', '#6366F1']
const ROLE_OPTIONS = ['팀장', '팀원', '디자이너', '개발자', '기획자', 'PM']

interface MemberRow { name: string; role: string; user_id?: string }

interface Props {
  onClose: () => void
  onCreated: () => void
}

function toDotDate(v: string) {
  // input[type=date] returns YYYY-MM-DD, backend needs YYYY.MM.DD
  return v.replace(/-/g, '.')
}

export default function ProjectCreateModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [color, setColor] = useState('#00A9EC')
  const [status, setStatus] = useState<'active' | 'upcoming' | 'completed'>('active')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [members, setMembers] = useState<MemberRow[]>([{ name: '', role: '팀장' }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // 친구 검색
  const [friendQ, setFriendQ] = useState('')
  const [friendSearching, setFriendSearching] = useState(false)

  const addMember = () => setMembers(m => [...m, { name: '', role: '팀원' }])
  const removeMember = (i: number) => setMembers(m => m.filter((_, idx) => idx !== i))
  const updateMember = (i: number, field: keyof MemberRow, val: string) =>
    setMembers(m => m.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const searchFriend = async () => {
    if (!friendQ.trim()) return
    setFriendSearching(true); setError('')
    try {
      const f = await FriendAPI.search(friendQ.trim())
      if (members.some(m => m.user_id === f.user_id)) { setError('이미 추가된 팀원이에요.'); return }
      setMembers(m => [...m, { name: f.name, role: '팀원', user_id: f.user_id }])
      setFriendQ('')
    } catch (e: any) {
      setError(e.message || '사용자를 찾을 수 없습니다.')
    } finally { setFriendSearching(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name || !startDate || !endDate) { setError('모든 필드를 입력해주세요'); return }
    const validMembers = members.filter(m => m.name.trim())
    if (validMembers.length === 0) { setError('멤버를 최소 1명 입력해주세요'); return }
    setLoading(true)
    try {
      await ProjectAPI.create({
        name, emoji, color, status,
        start_date: toDotDate(startDate),
        end_date: toDotDate(endDate),
        members: validMembers.map(m => ({ name: m.name.trim(), roles: [m.role], user_id: m.user_id })),
      })
      onCreated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>새 프로젝트</h2>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Emoji */}
          <div style={s.field}>
            <label style={s.label}>이모지</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} type="button"
                  style={{ ...s.emojiBtn, background: emoji === e ? 'var(--primary-bg)' : 'var(--bg-muted)', border: emoji === e ? '2px solid var(--primary)' : '2px solid transparent' }}
                  onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div style={s.field}>
            <label style={s.label}>색상</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} type="button"
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }}
                  onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>프로젝트 이름</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="프로젝트 이름" required />
          </div>

          <div style={s.field}>
            <label style={s.label}>상태</label>
            <select style={s.input} value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="active">진행중</option>
              <option value="upcoming">예정</option>
              <option value="completed">완료</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>시작일</label>
              <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>종료일</label>
              <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>

          {/* Members */}
          <div style={s.field}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={s.label}>팀원</label>
              <button type="button" onClick={addMember} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ 직접 입력</button>
            </div>

            {/* 친구 검색으로 추가 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="친구 아이디(username)로 검색해 추가"
                value={friendQ}
                onChange={e => setFriendQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchFriend() } }}
              />
              <button type="button" onClick={searchFriend} disabled={friendSearching} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                {friendSearching ? '...' : '찾기'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="이름"
                    value={m.name}
                    onChange={e => updateMember(i, 'name', e.target.value)}
                    readOnly={!!m.user_id}
                  />
                  {m.user_id && <span title="계정 연결됨(초대)" style={{ fontSize: 14, flexShrink: 0 }}>🔗</span>}
                  <select
                    style={{ ...s.input, width: 100, flexShrink: 0 }}
                    value={m.role}
                    onChange={e => updateMember(i, 'role', e.target.value)}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {members.length > 1 && (
                    <button type="button" onClick={() => removeMember(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '0 4px', flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>취소</button>
            <button type="submit" style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? <span className="spinner" style={{ borderTopColor: '#fff', width: 16, height: 16 }} /> : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 480, padding: '28px 32px', boxShadow: '0 16px 48px rgba(0,0,0,0.16)', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  close: { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' },
  input: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  emojiBtn: { width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-sub)', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  submitBtn: { flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
