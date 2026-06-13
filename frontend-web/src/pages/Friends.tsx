import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FriendAPI, type FriendDTO, type FriendRequestDTO, type UserSearchResponse } from '../api'

export default function Friends() {
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendDTO[]>([])
  const [requests, setRequests] = useState<FriendRequestDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchResult, setSearchResult] = useState<UserSearchResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  const load = () => {
    Promise.all([FriendAPI.list(), FriendAPI.requests()])
      .then(([f, r]) => { setFriends(f); setRequests(r) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQ.trim()) return
    setSearching(true); setSearchResult(null); setSearchErr('')
    try {
      const res = await FriendAPI.search(searchQ.trim())
      setSearchResult(res)
    } catch (e: any) {
      setSearchErr(e.message || '사용자를 찾을 수 없습니다.')
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = async (userId: string) => {
    try {
      await FriendAPI.sendRequest(userId)
      setSearchResult(null); setSearchQ('')
      load()
    } catch (e: any) {
      setSearchErr(e.message)
    }
  }

  const handleAccept = async (id: string) => {
    try { await FriendAPI.accept(id); load() } catch {}
  }

  const handleRemove = async (id: string) => {
    try { await FriendAPI.remove(id); load() } catch {}
  }

  const pendingRequests = requests

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: '0 4px' }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>친구 관리</span>
        </div>
      </div>
      <div style={{ overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search */}
          <div style={s.card}>
            <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>친구 추가</div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, padding: '14px 18px' }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="아이디(username)로 검색"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
              <button type="submit" disabled={searching} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                {searching ? '...' : '검색'}
              </button>
            </form>
            {searchErr && <div style={{ padding: '0 18px 14px', color: 'var(--danger)', fontSize: 13 }}>{searchErr}</div>}
            {searchResult && searchResult.user_id && (
              <div style={{ margin: '0 18px 14px', padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{searchResult.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{searchResult.username}</div>
                </div>
                <button onClick={() => handleSendRequest(searchResult.user_id!)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  친구 요청
                </button>
              </div>
            )}
          </div>

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div style={s.card}>
              <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>친구 요청 · {pendingRequests.length}</div>
              {pendingRequests.map(r => (
                <div key={r.friendship_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{r.username}</div>
                  </div>
                  <button onClick={() => handleAccept(r.friendship_id)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                    수락
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          <div style={s.card}>
            <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>
              친구 목록 {loading ? '' : `· ${friends.length}`}
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" /></div>
            ) : friends.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>친구가 없습니다</div>
            ) : friends.map(f => (
              <div key={f.friendship_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 16 }}>
                    {f.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{f.username}</div>
                  </div>
                </div>
                <button onClick={() => handleRemove(f.friendship_id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  삭제
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: { padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  card: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' },
}
