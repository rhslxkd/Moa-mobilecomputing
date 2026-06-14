import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MeetingAPI, type MeetingDTO } from '../api'

function fmtDate(iso: string | null) {
  if (!iso) return '날짜 미정'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtDur(sec: number) {
  if (!sec) return ''
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export default function Meetings() {
  const location = useLocation()
  const [meetings, setMeetings] = useState<MeetingDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MeetingDTO | null>(null)

  useEffect(() => {
    const pid = new URLSearchParams(location.search).get('project') || undefined
    MeetingAPI.list(pid).then(setMeetings).catch(() => {}).finally(() => setLoading(false))
  }, [location.search])

  const openMeeting = async (id: string) => {
    try { setSelected(await MeetingAPI.get(id)) } catch (e: any) { alert(e.message) }
  }

  if (loading) return <div style={s.center}><span className="spinner" /></div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>🎙 회의록</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>웹은 조회 전용 · 녹음/AI는 모바일 앱에서</span>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        {meetings.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 32 }}>아직 회의록이 없습니다</div>
        ) : (
          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {meetings.map(m => (
              <div key={m.id} onClick={() => openMeeting(m.id)} style={{ ...s.card, padding: '18px 20px', cursor: 'pointer' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: m.summary.length ? 10 : 0 }}>
                  {fmtDate(m.started_at)}{m.duration_seconds > 0 && ` · ${fmtDur(m.duration_seconds)}`}
                  {m.project_name && ` · ${m.project_name}`}
                </div>
                {m.summary.length > 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    AI 요약: {m.summary[0].length > 50 ? m.summary[0].slice(0, 50) + '…' : m.summary[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div style={s.backdrop} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(selected.started_at)}{selected.duration_seconds > 0 && ` · ${fmtDur(selected.duration_seconds)}`}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
            </div>

            {selected.summary.length > 0 && (
              <Section title="🤖 AI 요약">
                {selected.summary.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--primary)' }}>•</span>
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{line}</span>
                  </div>
                ))}
              </Section>
            )}

            {selected.participants.length > 0 && (
              <Section title="🎤 참여자">
                {selected.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
                    <span>{p.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>발언 {fmtDur(p.speak_time_seconds)}</span>
                  </div>
                ))}
              </Section>
            )}

            {selected.action_items.length > 0 && (
              <Section title="📋 회의에서 나온 할 일">
                {selected.action_items.map((it, i) => (
                  <div key={i} style={{ fontSize: 14, padding: '4px 0' }}>• {it.title}{it.date ? ` (📅 ${it.date})` : ''}</div>
                ))}
              </Section>
            )}

            {selected.transcript && (
              <Section title="회의록 전문">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto' }}>
                  {selected.transcript}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: { padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  card: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 },
  modal: { background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' },
}
