import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChatAPI, type ChatRoomDTO, type MessageDTO, type NoticeDTO, type PollDTO } from '../api'
import { useAuth } from '../AuthContext'

export default function Chat() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoomDTO[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoomDTO | null>(null)
  const [messages, setMessages] = useState<MessageDTO[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [notices, setNotices] = useState<NoticeDTO[]>([])
  const [polls, setPolls] = useState<PollDTO[]>([])
  const [readStatus, setReadStatus] = useState<{ user_id: string; last_read_at: string | null }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeRoom) return
    setSending(true)
    try {
      const msg = await ChatAPI.sendFile(activeRoom.id, file)
      setMessages(prev => [...prev, msg])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err: any) { alert(err.message) } finally { setSending(false) }
  }

  // 내 메시지를 읽은 '다른 멤버' 수
  const readByCount = (createdAt: string) =>
    readStatus.filter(r => r.user_id !== myId && r.last_read_at && new Date(r.last_read_at) >= new Date(createdAt)).length

  const loadBoards = async (roomId: string) => {
    const [n, p] = await Promise.all([
      ChatAPI.listNotices(roomId).catch(() => [] as NoticeDTO[]),
      ChatAPI.listPolls(roomId).catch(() => [] as PollDTO[]),
    ])
    setNotices(n); setPolls(p)
  }

  const addNotice = async () => {
    if (!activeRoom) return
    const content = window.prompt('공지 내용을 입력하세요')
    if (!content?.trim()) return
    try { await ChatAPI.createNotice(activeRoom.id, content.trim()); loadBoards(activeRoom.id) } catch (e: any) { alert(e.message) }
  }

  const delNotice = async (id: string) => {
    if (!activeRoom || !window.confirm('이 공지를 삭제할까요?')) return
    try { await ChatAPI.deleteNotice(id); loadBoards(activeRoom.id) } catch (e: any) { alert(e.message) }
  }

  const addPoll = async () => {
    if (!activeRoom) return
    const question = window.prompt('투표 질문을 입력하세요')
    if (!question?.trim()) return
    const raw = window.prompt('선택지를 쉼표(,)로 구분해 입력하세요 (예: 월요일, 화요일, 수요일)')
    const options = (raw || '').split(',').map(o => o.trim()).filter(Boolean)
    if (options.length < 2) { alert('선택지는 2개 이상이어야 합니다.'); return }
    try { await ChatAPI.createPoll(activeRoom.id, question.trim(), options); loadBoards(activeRoom.id) } catch (e: any) { alert(e.message) }
  }

  const vote = async (pollId: string, idx: number) => {
    if (!activeRoom) return
    try { await ChatAPI.votePoll(pollId, idx); loadBoards(activeRoom.id) } catch (e: any) { alert(e.message) }
  }

  const delPoll = async (id: string) => {
    if (!activeRoom || !window.confirm('이 투표를 삭제할까요?')) return
    try { await ChatAPI.deletePoll(id); loadBoards(activeRoom.id) } catch (e: any) { alert(e.message) }
  }

  useEffect(() => {
    ChatAPI.rooms().then(r => {
      setRooms(r)
      const roomId = searchParams.get('room')
      const target = roomId ? r.find(rm => rm.id === roomId) : r[0]
      if (target) openRoom(target)
    }).finally(() => setLoading(false))
  }, [])

  const openRoom = async (room: ChatRoomDTO) => {
    setActiveRoom(room)
    setNotices([]); setPolls([])
    const msgs = await ChatAPI.messages(room.id)
    setMessages(msgs)
    loadBoards(room.id)
    ChatAPI.readStatus(room.id).then(setReadStatus).catch(() => {})
    ChatAPI.markRead(room.id).catch(() => {})
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const sendMsg = async () => {
    if (!input.trim() || !activeRoom || sending) return
    setSending(true)
    try {
      const msg = await ChatAPI.send(activeRoom.id, input)
      setMessages(prev => [...prev, msg])
      setInput('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } finally { setSending(false) }
  }

  const myId = user?.id

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* Room list */}
      <div style={s.roomList}>
        <div style={s.roomHeader}>채팅</div>
        {loading ? (
          <div style={s.center}><span className="spinner" /></div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>채팅방이 없습니다</div>
        ) : rooms.map(r => (
          <div key={r.id} onClick={() => openRoom(r)} style={{
            ...s.roomItem,
            background: activeRoom?.id === r.id ? 'var(--primary-bg)' : 'transparent',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {r.type === 'project' ? '📁' : '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {r.unread_count > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 7px', fontWeight: 700 }}>{r.unread_count}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.last_message || '메시지 없음'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      {activeRoom ? (
        <div style={s.chatArea}>
          <div style={s.chatHeader}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{activeRoom.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>멤버 {activeRoom.member_count}명</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={addNotice} style={s.boardBtn}>📣 공지</button>
              <button onClick={addPoll} style={s.boardBtn}>☑️ 투표</button>
            </div>
          </div>

          {/* 공지/투표 패널 */}
          {(notices.length > 0 || polls.length > 0) && (
            <div style={s.boardPanel}>
              {notices.slice(0, 1).map(n => (
                <div key={n.id} style={s.noticeCard}>
                  <span style={{ fontSize: 16 }}>📣</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>공지 · {n.author_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{n.content}</div>
                  </div>
                  <button onClick={() => delNotice(n.id)} style={s.closeBtn}>×</button>
                </div>
              ))}
              {polls.map(p => (
                <div key={p.id} style={s.pollCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 15 }}>☑️</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{p.question}</span>
                    <button onClick={() => delPoll(p.id)} style={s.closeBtn}>×</button>
                  </div>
                  {p.options.map((opt, i) => {
                    const cnt = p.counts[i] ?? 0
                    const pct = p.total_votes > 0 ? Math.round((cnt / p.total_votes) * 100) : 0
                    const mine = p.my_vote === i
                    return (
                      <div key={i} onClick={() => vote(p.id, i)} style={{ ...s.pollOption, borderColor: mine ? 'var(--primary)' : 'var(--border)' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: mine ? 'var(--primary-bg)' : 'var(--bg-muted)', borderRadius: 8 }} />
                        <span style={{ position: 'relative', fontSize: 13, fontWeight: mine ? 700 : 500, color: mine ? 'var(--primary)' : 'var(--text)' }}>{mine ? '✓ ' : ''}{opt}</span>
                        <span style={{ position: 'relative', marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{cnt}표 · {pct}%</span>
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p.author_name} · 총 {p.total_votes}표</div>
                </div>
              ))}
            </div>
          )}

          <div style={s.messages}>
            {messages.map((m, i) => {
              const isMe = m.sender_id === myId
              const showName = !isMe && (i === 0 || messages[i - 1].sender_id !== m.sender_id)
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  {showName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, marginLeft: 4 }}>{m.sender_name}</div>}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{
                      maxWidth: 320, padding: m.attachment_type === 'image' ? 4 : '8px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMe ? 'var(--primary)' : 'var(--bg-card)',
                      color: isMe ? '#fff' : 'var(--text)',
                      fontSize: 14, border: isMe ? 'none' : '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      {m.attachment_type === 'image' && m.attachment_url ? (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer">
                          <img src={m.attachment_url} alt={m.attachment_name || 'image'} style={{ maxWidth: 280, maxHeight: 280, borderRadius: 12, display: 'block' }} />
                        </a>
                      ) : m.attachment_type === 'file' && m.attachment_url ? (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer" download={m.attachment_name || true} style={{ color: isMe ? '#fff' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                          📎 {m.attachment_name || '파일'}
                        </a>
                      ) : (
                        m.content
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {isMe && readByCount(m.created_at) > 0 && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>읽음 {readByCount(m.created_at)}</span>}
                      <span>{new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={s.inputArea}>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onPickFile} />
            <button onClick={() => fileRef.current?.click()} disabled={sending} style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>＋</button>
            <input
              style={s.msgInput}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
              placeholder="메시지를 입력하세요..."
            />
            <button style={{ ...s.sendBtn, opacity: sending ? 0.7 : 1 }} onClick={sendMsg} disabled={sending}>
              <SendIcon />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          채팅방을 선택하세요
        </div>
      )}
    </div>
  )
}

function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
}

const s: Record<string, React.CSSProperties> = {
  roomList: { width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', flexShrink: 0 },
  roomHeader: { padding: '18px 20px', fontWeight: 700, fontSize: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 },
  roomItem: { display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer', borderRadius: 10, margin: '2px 8px', alignItems: 'center', transition: 'background 0.15s' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' },
  chatHeader: { padding: '14px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 24px 12px', display: 'flex', flexDirection: 'column' },
  inputArea: { padding: '12px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 },
  msgInput: { flex: 1, padding: '10px 16px', borderRadius: 24, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--bg-muted)' },
  sendBtn: { width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
  boardBtn: { padding: '6px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' },
  boardPanel: { padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, maxHeight: 240, overflowY: 'auto' },
  noticeCard: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 },
  pollCard: { padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 },
  pollOption: { position: 'relative', display: 'flex', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', overflow: 'hidden' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, flexShrink: 0 },
}
