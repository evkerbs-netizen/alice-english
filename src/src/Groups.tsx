import { useEffect, useState } from 'react'
import { sb, ICON, type Lesson, type Profile } from './lib'

type Group = { id: string; name: string }
type GM = { group_id: string; student_id: string }
const card = 'bg-white rounded-3xl shadow-lg shadow-violet-100 p-5'
const btn = 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl px-4 py-2 font-semibold disabled:opacity-50'
const btn2 = 'bg-violet-100 text-violet-700 rounded-2xl px-4 py-2 font-semibold'
const inp = 'w-full border border-violet-200 rounded-xl px-3 py-2 mb-2 bg-white'

export function TeacherGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [gm, setGm] = useState<GM[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [name, setName] = useState('')
  const [pick, setPick] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [del, setDel] = useState<string | null>(null)
  const load = async () => {
    const g = await sb.from('groups').select('*').order('created_at')
    const m = await sb.from('group_members').select('*')
    const s = await sb.from('profiles').select('*').eq('role', 'student').order('name')
    const l = await sb.from('lessons').select('*')
    setGroups((g.data || []) as Group[]); setGm((m.data || []) as GM[])
    setStudents((s.data || []) as Profile[]); setLessons((l.data || []) as Lesson[])
  }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!name.trim()) return
    await sb.from('groups').insert({ name: name.trim() })
    setName(''); load()
  }
  const toggle = async (gid: string, sid: string, on: boolean) => {
    if (on) await sb.from('group_members').insert({ group_id: gid, student_id: sid })
    else await sb.from('group_members').delete().match({ group_id: gid, student_id: sid })
    load()
  }
  const assign = async (g: Group) => {
    const lid = pick[g.id]
    const ids = gm.filter((x) => x.group_id === g.id).map((x) => x.student_id)
    if (!lid || !ids.length) { setMsg({ ...msg, [g.id]: 'Choose a lesson and add students to the group.' }); return }
    const r = await sb.from('assignments').upsert(ids.map((s) => ({ student_id: s, lesson_id: lid })), { onConflict: 'student_id,lesson_id', ignoreDuplicates: true })
    setMsg({ ...msg, [g.id]: r.error ? r.error.message : `Assigned to ${ids.length} student(s) ✓` })
    window.dispatchEvent(new Event('aew-reload'))
  }
  const remove = async (g: Group) => {
    await sb.from('groups').delete().eq('id', g.id)
    setDel(null); load()
  }
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">👥 Groups</h2>
      <div className={card + ' mb-4'}>
        <input className={inp} placeholder="New group name (e.g. Kids A1, Tuesday class)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className={btn} onClick={create}>Create group</button>
      </div>
      {groups.map((g) => (
        <div key={g.id} className={card + ' mb-3'}>
          <b className="text-lg">{g.name}</b>
          <p className="text-xs text-slate-500 mt-2">Students in this group:</p>
          {students.map((s) => (
            <label key={s.id} className="flex gap-2 py-1 text-sm">
              <input type="checkbox" checked={gm.some((x) => x.group_id === g.id && x.student_id === s.id)} onChange={(e) => toggle(g.id, s.id, e.target.checked)} />{s.name}
            </label>
          ))}
          <p className="text-xs text-slate-500 mt-3">Give a lesson to everyone in the group:</p>
          <select className={inp} value={pick[g.id] || ''} onChange={(e) => setPick({ ...pick, [g.id]: e.target.value })}>
            <option value="">Choose a lesson…</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{ICON[l.data.cat]} {l.data.title} ({l.data.lv})</option>)}
          </select>
          <button className={btn} onClick={() => assign(g)}>Assign to group</button>
          <p className="text-sm text-slate-500 mt-2">{msg[g.id]}</p>
          <button className={btn2 + ' mt-2 !text-rose-600'} onClick={() => (del === g.id ? remove(g) : setDel(g.id))}>{del === g.id ? 'Click again to delete group' : 'Delete group'}</button>
        </div>
      ))}
    </div>
  )
}
