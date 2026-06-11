import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ProjectAPI, MeetingAPI, type ProjectDTO, type MeetingDTO } from '../api'

const MEMBER_COLORS = ['#1daaed', '#9b59d4', '#f59e0b', '#2db56a']

type Stage =
  | 'select'    // 회의 방 만들기 / 참여하기 선택
  | 'waiting'   // 대기중 (만든 사람)
  | 'joining'   // 참여하기 (코드 입력)
  | 'room'      // 회의실 입장 (카메라 + 시작하기 버튼)
  | 'meeting'   // 회의 진행중 (타이머 + 오디오)
  | 'ending'    // 회의 종료 (요약)

function useTimer(running: boolean) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  const h = String(Math.floor(secs / 3600)).padStart(2, '0')
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function Meetings() {
  const location = useLocation()

  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectDTO | null>(null)
  const [pastMeetings, setPastMeetings] = useState<MeetingDTO[]>([])
  const [stage, setStage] = useState<Stage>('select')
  const [joinCode, setJoinCode] = useState('')
  const timer = useTimer(stage === 'meeting')

  useEffect(() => {
    ProjectAPI.list().then(p => {
      setProjects(p)
      const params = new URLSearchParams(location.search)
      const pid = params.get('project')
      const found = pid ? p.find(pr => pr.id === pid) : null
      setSelectedProject(found || p[0] || null)
    }).catch(() => {})
    MeetingAPI.list().then(setPastMeetings).catch(() => {})
  }, [])

  const members = selectedProject?.members.slice(0, 4) ?? []

  const topbar = (title: string, showBack = true) => (
    <div style={s.topbar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && (
          <button onClick={() => setStage('select')} style={s.backBtn}>←</button>
        )}
        <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
      </div>
      <button style={s.circleBtn}>+</button>
    </div>
  )

  // ── 1. 선택 화면 ─────────────────────────────────────────
  if (stage === 'select') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>회의</span>
        <button onClick={() => setStage('joining')} style={s.circleBtn}>+</button>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 700 }}>
          {/* Blue banner card */}
          <div
            onClick={() => setStage('waiting')}
            style={{
              background: 'linear-gradient(135deg, #1daaed 0%, #0d8dc9 100%)',
              borderRadius: 16, padding: '36px 32px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 28, userSelect: 'none',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎙</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>새 회의의 시작</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>회의를 시작하거나 참여코드로 입장하세요</div>
          </div>

          {/* Past meetings */}
          {pastMeetings.length > 0 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>지난 회의</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pastMeetings.map(m => (
                  <div key={m.id} style={{ ...s.card, padding: '18px 20px' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {m.started_at ? new Date(m.started_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '날짜 미정'}
                      {m.duration_seconds > 0 && ` · ${Math.round(m.duration_seconds / 60)}분`}
                    </div>
                    {m.summary.length > 0 && (
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        AI 요약: {m.summary[0].length > 45 ? m.summary[0].slice(0, 45) + '...' : m.summary[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {pastMeetings.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 16 }}>
              아직 지난 회의가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── 2. 대기중 화면 ────────────────────────────────────────
  if (stage === 'waiting') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {topbar(`회의 대기중 · ${selectedProject?.name ?? ''}`)}
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ ...s.card, maxWidth: 700, padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>잠시 후 회의가 시작됩니다...</div>
            <div style={s.spinner} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>회의 호스트가 회의를 시작하면 자동으로 입장됩니다</div>
          </div>
          <div style={s.sectionLabel}>참여 현황</div>
          {members.map((m, i) => (
            <MemberRow key={m.id} name={m.name} color={MEMBER_COLORS[i % 4]}
              status={i < 2 ? '참여중' : '이미참여'} statusColor={i < 2 ? 'var(--primary)' : 'var(--text-muted)'} />
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStage('room')} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              회의 시작하기
            </button>
            <button onClick={() => setStage('select')} style={{ padding: '13px 20px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
              나가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── 3. 참여하기 화면 (코드 입력) ─────────────────────────
  if (stage === 'joining') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {topbar(`회의 방 참여하기 · ${selectedProject?.name ?? ''}`)}
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ ...s.card, maxWidth: 700, padding: '24px' }}>
          {/* Camera preview */}
          <div style={s.cameraBox}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>카메라</span>
          </div>
          {/* Code input */}
          <div style={{ marginTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>초대 코드 입력</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '2px solid var(--primary)', fontSize: 14, outline: 'none' }}
                placeholder="초대 코드를 입력하세요"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
              />
              <button onClick={() => setStage('room')} style={{ padding: '11px 20px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                입장
              </button>
            </div>
          </div>
          {/* Participants */}
          <div style={{ marginTop: 20 }}>
            <div style={s.sectionLabel}>참여 현황</div>
            {members.map((m, i) => (
              <MemberRow key={m.id} name={m.name} color={MEMBER_COLORS[i % 4]}
                status={i < 2 ? '참여중' : '미참여'} statusColor={i < 2 ? 'var(--primary)' : 'var(--text-muted)'} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── 4. 회의실 (카메라 + 시작하기) ────────────────────────
  if (stage === 'room') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {topbar(`회의 · ${selectedProject?.name ?? ''}`)}
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ ...s.card, maxWidth: 700, padding: '24px' }}>
          <div style={s.cameraBox}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>카메라</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={s.sectionLabel}>참여 현황</div>
            {members.map((m, i) => (
              <MemberRow key={m.id} name={m.name} color={MEMBER_COLORS[i % 4]}
                status={i < 2 ? '참여중' : '미참여'} statusColor={i < 2 ? 'var(--primary)' : 'var(--text-muted)'} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStage('meeting')} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              회의 시작하기
            </button>
            <button onClick={() => setStage('select')} style={{ padding: '14px 20px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
              나가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── 5. 회의 진행중 (타이머 + 오디오 시각화) ──────────────
  if (stage === 'meeting') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{timer}</span>
        <button onClick={() => setStage('ending')} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
          회의 종료
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ ...s.card, maxWidth: 700, padding: '28px 24px' }}>
          {/* Audio visualization */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 80, marginBottom: 28 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <AudioBar key={i} index={i} />
            ))}
          </div>
          {/* Participants with voice indicator */}
          <div style={s.sectionLabel}>참여 현황</div>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: MEMBER_COLORS[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {m.name.slice(0, 1)}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.name}</span>
              {/* Mini voice bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
                {i < 2 ? (
                  [3, 5, 4, 6, 3].map((h, j) => (
                    <div key={j} style={{ width: 3, borderRadius: 2, background: MEMBER_COLORS[i % 4], height: h * 3, animation: `voicePulse ${0.4 + j * 0.1}s ease-in-out infinite alternate` }} />
                  ))
                ) : (
                  [2, 2, 2, 2, 2].map((_, j) => (
                    <div key={j} style={{ width: 3, height: 6, borderRadius: 2, background: 'var(--border)' }} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── 6. 회의 종료 화면 ─────────────────────────────────────
  if (stage === 'ending') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{timer}</span>
        <button onClick={() => setStage('select')} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
          종료하기
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 700, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Left: participants */}
          <div style={{ ...s.card, flex: 1, minWidth: 300, padding: '20px 24px' }}>
            <div style={s.sectionLabel}>참여 현황</div>
            {members.map((m, i) => (
              <MemberRow key={m.id} name={m.name} color={MEMBER_COLORS[i % 4]}
                status={i < 2 ? '참여중' : '미참여'} statusColor={i < 2 ? 'var(--primary)' : 'var(--text-muted)'} />
            ))}
          </div>
          {/* Right: camera */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ ...s.cameraBox, height: 180 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>카메라</span>
            </div>
            <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>회의 시간</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{timer}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return null
}

// ── Sub components ────────────────────────────────────
function MemberRow({ name, color, status, statusColor }: { name: string; color: string; status: string; statusColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
        {name.slice(0, 1)}
      </div>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: 13, color: statusColor, fontWeight: status === '참여중' ? 600 : 400 }}>{status}</span>
    </div>
  )
}

function AudioBar({ index }: { index: number }) {
  const heights = [20, 35, 55, 70, 60, 80, 65, 45, 75, 50, 60, 40, 65, 55, 70, 45, 60, 35, 50, 30]
  const h = heights[index % heights.length]
  const isActive = index > 4 && index < 16
  return (
    <div style={{
      width: 6, borderRadius: 3,
      background: isActive ? 'var(--primary)' : 'var(--border)',
      height: h,
      animation: isActive ? `voicePulse ${0.5 + (index % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
      opacity: isActive ? 1 : 0.5,
    }} />
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar:   { padding: '14px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  backBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 4px', lineHeight: 1 },
  circleBtn: { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card:     { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' },
  select:   { padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 14, color: 'var(--text)', width: '100%', outline: 'none' },
  createBtn: { display: 'block', width: '100%', padding: '20px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', textAlign: 'center' },
  joinBtn:  { display: 'block', width: '100%', padding: '18px', background: 'transparent', color: 'var(--text)', fontWeight: 500, fontSize: 14, border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', textAlign: 'center' },
  cameraBox: { width: '100%', aspectRatio: '16/9', background: '#1a1f2e', borderRadius: 12, border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 },
  spinner:  { width: 60, height: 60, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' },
}
