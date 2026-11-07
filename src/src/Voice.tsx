import { useEffect, useRef, useState } from 'react'
import { sb, type Profile } from './lib'

type Msg = { id: string; from_id: string; to_id: string; path: string; mime: string | null; note: string | null; created_at: string }
const card = 'bg-white rounded-3xl shadow-lg shadow-violet-100 p-5'
const btn = 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl px-4 py-2 font-semibold disabled:opacity-50'
const btn2 = 'bg-violet-100 text-violet-700 rounded-2xl px-4 py-2 font-semibold'
const inp = 'w-full border border-violet-200 rounded-xl px-3 py-2 mb-2 bg-white'

const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
  .find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || ''
const extOf = (m: string) => (m.includes('webm') ? 'webm' : m.includes('mp4') || m.includes('aac') ? 'm4a' : 'ogg')

function Recorder({ onSend }: { onSend: (b: Blob, mime: string) => Promise<boolean> }) {
  const [rec, setRec] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState('')
  const [sec, setSec] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => { window.clearInterval(timer.current); mr.current?.stream.getTracks().forEach((t) => t.stop()) }, [])
  useEffect(() => { if (rec && sec >= 120) stop() }, [sec, rec])
  const start = async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const b = new Blob(chunks.current, { type: r.mimeType || mime || 'audio/webm' })
        setBlob(b); setUrl(URL.createObjectURL(b))
      }
      r.start(); mr.current = r; setRec(true); setSec(0); setBlob(null); setUrl('')
      timer.current = window.setInterval(() => setSec((s) => s + 1), 1000)
    } catch { setErr('Please allow microphone access in your browser.') }
  }
  const stop = () => { window.clearInterval(timer.current); mr.current?.stop(); setRec(false) }
  const send = async () => {
    if (!blob) return
    setBusy(true)
    if (await onSend(blob, blob.type)) { setBlob(null); setUrl('') }
    setBusy(false)
  }
  return (
    <div>
      {!rec && <button className={btn} onClick={start} disabled={busy}>🎤 {blob ? 'Record again' : 'Record'}</button>}
      {rec && <button className={btn + ' !bg-none !bg-rose-500 animate-pulse'} onClick={stop}>⏹ Stop · {sec}s</button>}
      {url && <audio controls src={url} className="w-full mt-3" />}
      {blob && !rec && <button className={btn2 + ' mt-3'} disabled={busy} onClick={send}>{busy ? 'Sending…' : '📨 Send'}</button>}
      <p className="text-rose-500 text-sm mt-2">{err}</p>
    </div>
  )
}

function Thread({ meId, names, peer, tick }: { meId: string; names: Record<string, string>; peer?: string; tick: number }) {
  const [ms, setMs] = useState<Msg[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [del, setDel] = useState<string | null>(null)
  const [k, setK] = useState(0)
  useEffect(() => {
    sb.from('voice_messages').select('*').order('created_at', { ascending: false }).limit(40).then(async ({ data }) => {
      const list = ((data || []) as Msg[]).filter((m) => !peer || m.from_id === peer || m.to_id === peer)
      setMs(list)
      if (!list.length) return
      const s = await sb.storage.from('voice').createSignedUrls(list.map((m) => m.path), 3600)
      const o: Record<string, string> = {}
      s.data?.forEach((d) => { if (d.path && d.signedUrl) o[d.path] = d.signedUrl })
      setUrls(o)
    })
  }, [tick, peer, k])
  const remove = async (m: Msg) => {
    await sb.storage.from('voice').remove([m.path])
    await sb.from('voice_messages').delete().eq('id', m.id)
    setDel(null); setK(k + 1)
  }
  if (!ms.length) return <p className="text-slate-400 text-sm mt-3">No voice messages yet.</p>
  return (
    <div className="mt-4">
      {ms.map((m) => {
        const mine = m.from_id === meId
        return (
          <div key={m.id} className={'rounded-2xl p-3 mb-2 ' + (mine ? 'bg-violet-50' : 'bg-blue-50')}>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{mine ? 'You → ' + (names[m.to_id] || '') : (names[m.from_id] || '') + ' → You'}</span>
              <span>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            {m.note && <p className="text-sm font-semibold mt-1">{m.note}</p>}
            {urls[m.path] ? <audio controls src={urls[m.path]} className="w-full mt-2" /> : <p className="text-xs text-slate-400">Loading…</p>}
            {mine && <button className="text-xs text-rose-500 mt-1" onClick={() => (del === m.id ? remove(m) : setDel(m.id))}>{del === m.id ? 'Click again to delete' : 'Delete'}</button>}
          </div>
        )
      })}
    </div>
  )
}

async function upload(fromId: string, toId: string, note: string, blob: Blob, mime: string): Promise<string> {
  const clean = (mime || 'audio/webm').split(';')[0]
  const path = `${fromId}/${Date.now()}.${extOf(clean)}`
  const up = await sb.storage.from('voice').upload(path, blob, { contentType: clean })
  if (up.error) return up.error.message
  const ins = await sb.from('voice_messages').insert({ from_id: fromId, to_id: toId, path, mime: clean, note: note.trim() || null })
  return ins.error ? ins.error.message : ''
}

export function TeacherVoice({ me }: { me: Profile }) {
  const [students, setStudents] = useState<Profile[]>([])
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => { sb.from('profiles').select('*').eq('role', 'student').order('name').then(({ data }) => setStudents((data || []) as Profile[])) }, [])
  const names: Record<string, string> = { [me.id]: me.name }
  students.forEach((s) => { names[s.id] = s.name })
  const send = async (b: Blob, mime: string) => {
    if (!to) { setMsg('Choose a student first.'); return false }
    const e = await upload(me.id, to, note, b, mime)
    setMsg(e || 'Sent ✓'); if (!e) { setNote(''); setTick(tick + 1) }
    return !e
  }
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">🎙️ Voice messages</h2>
      <div className={card}>
        <select className={inp} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Choose a student…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className={inp} placeholder="Title (e.g. Sound TH, Word: bird)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Recorder onSend={send} />
        <p className="text-sm text-slate-500 mt-2">{msg}</p>
        <Thread meId={me.id} names={names} peer={to || undefined} tick={tick} />
      </div>
    </div>
  )
}

export function StudentVoice({ me }: { me: Profile }) {
  const [teacher, setTeacher] = useState<Profile | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => { sb.from('profiles').select('*').eq('role', 'teacher').limit(1).then(({ data }) => setTeacher(((data || [])[0] as Profile) || null)) }, [])
  const names: Record<string, string> = { [me.id]: me.name }
  if (teacher) names[teacher.id] = teacher.name
  const send = async (b: Blob, mime: string) => {
    if (!teacher) { setMsg('Teacher not found.'); return false }
    const e = await upload(me.id, teacher.id, note, b, mime)
    setMsg(e || 'Sent to ' + teacher.name + ' ✓'); if (!e) { setNote(''); setTick(tick + 1) }
    return !e
  }
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">🎙️ Voice with {teacher?.name || 'teacher'}</h2>
      <div className={card}>
        <input className={inp} placeholder="Title (optional, e.g. My reading)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Recorder onSend={send} />
        <p className="text-sm text-slate-500 mt-2">{msg}</p>
        <Thread meId={me.id} names={names} tick={tick} />
      </div>
    </div>
  )
}
