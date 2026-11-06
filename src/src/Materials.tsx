import { useEffect, useState } from 'react'
import { sb, type Profile } from './lib'

type Mat = { id: string; title: string; path: string; mime: string | null }
const card = 'bg-white rounded-3xl shadow-lg shadow-violet-100 p-5'
const btn = 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl px-4 py-2 font-semibold disabled:opacity-50'
const btn2 = 'bg-violet-100 text-violet-700 rounded-2xl px-4 py-2 font-semibold'
const inp = 'w-full border border-violet-200 rounded-xl px-3 py-2 mb-2 bg-white'

function useUrls(items: Mat[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!items.length) return
    sb.storage.from('materials').createSignedUrls(items.map((m) => m.path), 3600).then(({ data }) => {
      const o: Record<string, string> = {}
      data?.forEach((d) => { if (d.path && d.signedUrl) o[d.path] = d.signedUrl })
      setUrls(o)
    })
  }, [items])
  return urls
}

function Preview({ m, url }: { m: Mat; url?: string }) {
  if (!url) return <p className="text-xs text-slate-400">Loading…</p>
  const t = m.mime || ''
  if (t.startsWith('image/')) return <img src={url} alt={m.title} className="rounded-2xl w-full mt-2" />
  if (t.startsWith('audio/')) return <audio controls src={url} className="w-full mt-2" />
  if (t.startsWith('video/')) return <video controls src={url} className="rounded-2xl w-full mt-2" />
  return <a href={url} target="_blank" rel="noreferrer" className={btn2 + ' inline-block mt-2'}>Open file</a>
}

export function TeacherMaterials() {
  const [students, setStudents] = useState<Profile[]>([])
  const [ms, setMs] = useState<Mat[]>([])
  const [asg, setAsg] = useState<{ student_id: string; material_id: string }[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [who, setWho] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState<string | null>(null)
  const [k, setK] = useState(0)
  const load = async () => {
    const p = await sb.from('profiles').select('*').eq('role', 'student').order('name')
    const m = await sb.from('materials').select('*').order('created_at', { ascending: false })
    const a = await sb.from('material_assign').select('*')
    setStudents((p.data || []) as Profile[]); setMs((m.data || []) as Mat[]); setAsg(a.data || [])
  }
  useEffect(() => { load() }, [])
  const urls = useUrls(ms)
  const upload = async () => {
    if (!file || !title.trim()) { setMsg('Add a title and choose a file.'); return }
    if (file.size > 20 * 1024 * 1024) { setMsg('File is too big (max 20 MB).'); return }
    setBusy(true); setMsg('')
    const path = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const up = await sb.storage.from('materials').upload(path, file, { contentType: file.type })
    if (up.error) { setMsg(up.error.message); setBusy(false); return }
    const ins = await sb.from('materials').insert({ title: title.trim(), path, mime: file.type }).select().single()
    if (ins.error || !ins.data) { setMsg(ins.error?.message || 'Error'); setBusy(false); return }
    if (who.length) await sb.from('material_assign').insert(who.map((s) => ({ student_id: s, material_id: ins.data.id })))
    setTitle(''); setFile(null); setWho([]); setK(k + 1); setBusy(false); setMsg('Uploaded ✓'); load()
  }
  const toggle = async (sid: string, mid: string, on: boolean) => {
    if (on) await sb.from('material_assign').insert({ student_id: sid, material_id: mid })
    else await sb.from('material_assign').delete().match({ student_id: sid, material_id: mid })
    load()
  }
  const remove = async (m: Mat) => {
    await sb.storage.from('materials').remove([m.path])
    await sb.from('materials').delete().eq('id', m.id)
    setDel(null); load()
  }
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">📎 Materials</h2>
      <div className={card + ' mb-4'}>
        <h3 className="font-bold mb-2">Upload a file</h3>
        <input className={inp} placeholder="Title (e.g. Animals poster)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input key={k} type="file" accept="image/*,audio/*,video/*,.pdf" className="mb-2 block text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <p className="text-sm text-slate-500 mb-1">Show to:</p>
        {students.map((s) => <label key={s.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={who.includes(s.id)} onChange={(e) => setWho(e.target.checked ? [...who, s.id] : who.filter((x) => x !== s.id))} />{s.name}</label>)}
        <p className="text-sm text-slate-500 my-2">{msg}</p>
        <button className={btn} disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</button>
      </div>
      {ms.map((m) => (
        <div key={m.id} className={card + ' mb-3'}>
          <b>{m.title}</b>
          <Preview m={m} url={urls[m.path]} />
          <p className="text-xs text-slate-500 mt-3">Assigned to:</p>
          {students.map((s) => <label key={s.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={asg.some((a) => a.student_id === s.id && a.material_id === m.id)} onChange={(e) => toggle(s.id, m.id, e.target.checked)} />{s.name}</label>)}
          <button className={btn2 + ' mt-2 !text-rose-600'} onClick={() => (del === m.id ? remove(m) : setDel(m.id))}>{del === m.id ? 'Click again to delete' : 'Delete'}</button>
        </div>
      ))}
    </div>
  )
}

export function StudentMaterials({ me }: { me: Profile }) {
  const [ms, setMs] = useState<Mat[]>([])
  useEffect(() => {
    sb.from('material_assign').select('material_id').eq('student_id', me.id).then(async ({ data }) => {
      const ids = (data || []).map((x) => x.material_id as string)
      if (!ids.length) return
      const m = await sb.from('materials').select('*').in('id', ids).order('created_at', { ascending: false })
      setMs((m.data || []) as Mat[])
    })
  }, [])
  const urls = useUrls(ms)
  if (!ms.length) return null
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">📎 Materials</h2>
      {ms.map((m) => <div key={m.id} className={card + ' mb-3'}><b>{m.title}</b><Preview m={m} url={urls[m.path]} /></div>)}
    </div>
  )
}
