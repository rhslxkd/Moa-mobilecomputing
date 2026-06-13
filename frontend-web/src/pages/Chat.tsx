import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChatAPI, type ChatRoomDTO, type MessageDTO } from '../api'
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
  const bottomRef = useRef<HTMLDivElement>(null)

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
    const msgs = await ChatAPI.messages(room.id)
    setMessages(msgs)
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
          </div>
          <div style={s.messages}>
            {messages.map((m, i) => {
              const isMe = m.sender_id === myId
              const showName = !isMe && (i === 0 || messages[i - 1].sender_id !== m.sender_id)
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  {showName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, marginLeft: 4 }}>{m.sender_name}</div>}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{
                      maxWidth: 320, padding: '8px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMe ? 'var(--primary)' : 'var(--bg-card)',
                      color: isMe ? '#fff' : 'var(--text)',
                      fontSize: 14, border: isMe ? 'none' : '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={s.inputArea}>
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
}
