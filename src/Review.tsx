import { useState } from 'react'
import { sb, type Result } from './lib'

const GRADES = ['', '⭐⭐⭐ Excellent', '⭐⭐ Good', '⭐ Keep practicing']

export function ReviewBox({ r, onSaved }: { r: Result; onSaved: () => void }) {
  const [grade, setGrade] = useState(r.grade || '')
  const [fb, setFb] = useState(r.feedback || '')
  const [msg, setMsg] = useState('')
  const save = async () => {
    const { error } = await sb.from('results').update({ grade: grade || null, feedback: fb.trim() || null }).match({ student_id: r.student_id, lesson_id: r.lesson_id })
    setMsg(error ? error.message : 'Saved ✓')
    if (!error) onSaved()
  }
  return (
    <div className="mt-2 rounded-xl border border-violet-100 p-2">
      <select className="w-full border border-violet-200 rounded-xl px-2 py-1 mb-1 bg-white text-sm" value={grade} onChange={(e) => setGrade(e.target.value)}>
        {GRADES.map((g) => <option key={g} value={g}>{g || 'Grade…'}</option>)}
      </select>
      <textarea className="w-full border border-violet-200 rounded-xl px-2 py-1 mb-1 bg-white text-sm" rows={2} placeholder="Comment for the student" value={fb} onChange={(e) => setFb(e.target.value)} />
      <button className="bg-violet-100 text-violet-700 rounded-xl px-3 py-1 text-sm font-semibold" onClick={save}>Save review</button>
      <span className="text-xs text-slate-500 ml-2">{msg}</span>
    </div>
  )
}

export function FeedbackNote({ r }: { r: Result }) {
  if (!r.grade && !r.feedback) return null
  return (
    <div className="rounded-xl bg-amber-50 text-amber-800 text-sm p-2 mb-2">
      {r.grade && <b>{r.grade}</b>}
      {r.feedback && <p>💬 {r.feedback}</p>}
    </div>
  )
}
