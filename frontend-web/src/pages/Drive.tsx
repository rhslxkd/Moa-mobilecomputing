import { useState, useEffect, useRef } from 'react'
import { DriveAPI, ProjectAPI, type FolderDTO, type FileDTO, type ProjectDTO } from '../api'

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function Drive() {
  const [folders, setFolders] = useState<FolderDTO[]>([])
  const [files, setFiles] = useState<FileDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState<string>('')
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [stack, setStack] = useState<{ id: string; name: string }[]>([])
  const [organizing, setOrganizing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const current = stack[stack.length - 1]
  const projectId = ctx || undefined

  useEffect(() => { ProjectAPI.list().then(setProjects).catch(() => {}) }, [])

  const load = () => {
    setLoading(true)
    Promise.all([
      DriveAPI.folders(projectId).catch(() => [] as FolderDTO[]),
      DriveAPI.files(projectId, current?.id).catch(() => [] as FileDTO[]),
    ]).then(([fl, fi]) => {
      // 현재 폴더의 하위 폴더만 (parent_id 일치)
      setFolders(fl.filter(f => (f.parent_id ?? null) === (current?.id ?? null)))
      setFiles(fi)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [current?.id, ctx])
  // 컨텍스트 바뀌면 경로 초기화
  useEffect(() => { setStack([]) }, [ctx])

  const openFolder = (f: FolderDTO) => setStack(prev => [...prev, { id: f.id, name: f.name }])
  const goTo = (idx: number) => setStack(prev => prev.slice(0, idx))

  const createFolder = async () => {
    const name = window.prompt('새 폴더 이름')
    if (!name?.trim()) return
    try { await DriveAPI.createFolder(name.trim(), projectId, current?.id); load() } catch (e: any) { alert(e.message) }
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { await DriveAPI.uploadFile(file, projectId, current?.id); load() } catch (e: any) { alert(e.message) }
  }

  const download = async (id: string) => {
    try { const { url } = await DriveAPI.downloadUrl(id); window.open(url, '_blank') } catch (e: any) { alert(e.message) }
  }

  const delFile = async (id: string) => {
    if (!window.confirm('이 파일을 삭제할까요?')) return
    try { await DriveAPI.deleteFile(id); load() } catch (e: any) { alert(e.message) }
  }

  const delFolder = async (id: string) => {
    if (!window.confirm('이 폴더를 삭제할까요? (안의 파일도 삭제됩니다)')) return
    try { await DriveAPI.deleteFolder(id); load() } catch (e: any) { alert(e.message) }
  }

  const autoOrganize = async () => {
    if (!projectId) { alert('프로젝트를 먼저 선택하세요.'); return }
    setOrganizing(true)
    try {
      const result = await DriveAPI.autoOrganize(projectId)
      alert(result.message || `${result.moved}개 파일을 정리했어요.`)
      load()
    } catch (e: any) { alert(e.message || 'AI 정리에 실패했습니다.') }
    finally { setOrganizing(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.topbar}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>📁 드라이브</span>
        <select value={ctx} onChange={e => setCtx(e.target.value)} style={{ marginLeft: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 13, color: 'var(--text)', outline: 'none' }}>
          <option value="">내 드라이브</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onUpload} />
          {projectId && (
            <button onClick={autoOrganize} disabled={organizing} style={s.btnGhost}>
              {organizing ? '✨ AI 정리 중...' : '✨ AI로 파일 정리'}
            </button>
          )}
          <button onClick={createFolder} style={s.btnGhost}>+ 폴더</button>
          <button onClick={() => fileRef.current?.click()} style={s.btnPrimary}>파일 업로드</button>
        </div>
      </div>

      {/* 경로 */}
      <div style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        <span onClick={() => goTo(0)} style={{ cursor: 'pointer', fontWeight: stack.length === 0 ? 700 : 500, color: stack.length === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{ctx ? (projects.find(p => p.id === ctx)?.name ?? '프로젝트') : '내 드라이브'}</span>
        {stack.map((f, i) => (
          <span key={f.id} style={{ display: 'flex', gap: 6 }}>
            <span>/</span>
            <span onClick={() => goTo(i + 1)} style={{ cursor: 'pointer', fontWeight: i === stack.length - 1 ? 700 : 500, color: i === stack.length - 1 ? 'var(--primary)' : 'var(--text-muted)' }}>{f.name}</span>
          </span>
        ))}
      </div>

      <div style={{ overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner" /></div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48, fontSize: 14 }}>비어 있어요. 폴더를 만들거나 파일을 업로드하세요.</div>
        ) : (
          <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {folders.map(f => (
              <div key={f.id} style={s.row}>
                <div onClick={() => openFolder(f)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>📁</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</span>
                </div>
                <button onClick={() => delFolder(f.id)} style={s.del}>삭제</button>
              </div>
            ))}
            {files.map(f => (
              <div key={f.id} style={s.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>{f.mime_type?.startsWith('image') ? '🖼️' : '📄'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtSize(f.size_bytes)}</div>
                  </div>
                </div>
                <button onClick={() => download(f.id)} style={s.btnGhost}>다운로드</button>
                <button onClick={() => delFile(f.id)} style={s.del}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  topbar: { padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0 },
  btnPrimary: { padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnGhost: { padding: '8px 14px', borderRadius: 8, background: 'var(--bg-muted)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 },
  del: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 },
}
