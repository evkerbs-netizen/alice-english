import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sb, CATS, ICON, norm, shuffle, pct, SEED, type Lesson, type Profile, type Result, type Wrong } from './lib'

const card = 'bg-white rounded-3xl shadow-lg shadow-violet-100 p-5'
const btn = 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl px-4 py-2 font-semibold disabled:opacity-50'
const btn2 = 'bg-violet-100 text-violet-700 rounded-2xl px-4 py-2 font-semibold'
const inp = 'w-full border border-violet-200 rounded-xl px-3 py-2 mb-2 bg-white'
const Bar = ({ p }: { p: number }) => (
  <div className="h-2 rounded-full bg-violet-100"><div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: p + '%' }} /></div>
)
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0)

export default function App() {
  const [s, setS] = useState<Session | null>(null)
  const [me, setMe] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setS(data.session); setReady(true) })
    const { data } = sb.auth.onAuthStateChange((_e, x) => setS(x))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!s) { setMe(null); return }
    sb.from('profiles').select('*').eq('id', s.user.id).single().then(({ data }) => setMe(data as Profile))
  }, [s])
  if (!ready) return null
  if (!s) return <Login />
  if (!me) return <p className="p-6">Loading…</p>
  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <b className="text-lg bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">🌍 Alice’s English World</b>
        <span className="text-sm text-slate-500">{me.name} <button className={btn2 + ' ml-2'} onClick={() => sb.auth.signOut()}>Sign out</button></span>
      </header>
      {me.role === 'teacher' ? <Teacher /> : <Student me={me} />}
    </div>
  )
}

function Login() {
  const [up, setUp] = useState(false)
  const [f, setF] = useState({ name: '', email: '', pass: '' })
  const [msg, setMsg] = useState('')
  const go = async () => {
    setMsg('')
    const r = up
      ? await sb.auth.signUp({ email: f.email, password: f.pass, options: { data: { name: f.name } } })
      : await sb.auth.signInWithPassword({ email: f.email, password: f.pass })
    if (r.error) setMsg(r.error.message)
    else if (up && !r.data.session) setMsg('Check your email to confirm the account.')
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={card + ' w-full max-w-sm text-center'}>
        <div className="text-6xl">🦉</div>
        <h1 className="text-2xl font-bold mb-3">Alice’s English World</h1>
        {up && <input className={inp} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className={inp} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={inp} placeholder="Password (6+ characters)" type="password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
        <p className="text-rose-500 text-sm mb-2">{msg}</p>
        <button className={btn + ' w-full'} onClick={go}>{up ? 'Create account' : 'Sign in'}</button>
        <button className="text-sm text-violet-600 mt-3" onClick={() => setUp(!up)}>{up ? 'I already have an account' : 'New student? Sign up'}</button>
      </div>
    </div>
  )
}

function Teacher() {
  const [st, setSt] = useState<Profile[]>([])
  const [ls, setLs] = useState<Lesson[]>([])
  const [asg, setAsg] = useState<{ student_id: string; lesson_id: string }[]>([])
  const [rs, setRs] = useState<Result[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState('Students')
  const [nl, setNl] = useState({ title: '', cat: CATS[0], lv: 'A1', lines: '' })
  const load = async (): Promise<void> => {
    const [p, l, a, r] = await Promise.all([
      sb.from('profiles').select('*').eq('role', 'student').order('name'),
      sb.from('lessons').select('*'), sb.from('assignments').select('*'), sb.from('results').select('*'),
    ])
    if (l.data && !l.data.length) { await sb.from('lessons').upsert(SEED); return load() }
    setSt((p.data || []) as Profile[]); setLs((l.data || []) as Lesson[]); setAsg(a.data || []); setRs((r.data || []) as Result[])
  }
  useEffect(() => { load() }, [])
  const toggle = async (sid: string, lid: string, on: boolean) => {
    if (on) await sb.from('assignments').insert({ student_id: sid, lesson_id: lid })
    else await sb.from('assignments').delete().match({ student_id: sid, lesson_id: lid })
    load()
  }
  const addLesson = async () => {
    const lines = nl.lines.split('\n').map((x) => x.trim()).filter(Boolean)
    if (!nl.title || !lines.length) return
    const pr = nl.cat === 'Writing' || nl.cat === 'Speaking'
    const x = lines.map((ln) => {
      if (pr) return { t: nl.cat === 'Writing' ? 'write' : 'speak', q: ln }
      const p = ln.split('|').map((z) => z.trim()); const o = shuffle(p.slice(1))
      const m = p[0].match(/^(\p{Extended_Pictographic}+)\s*(.*)/u)
      return { t: 'mc', img: m ? m[1] : '', q: m ? m[2] : p[0], o, a: o.indexOf(p[1]) }
    })
    await sb.from('lessons').insert({ id: 'c' + Date.now(), data: { title: nl.title, cat: nl.cat, lv: nl.lv, x } })
    setNl({ ...nl, title: '', lines: '' }); load()
  }
  const stu = st.find((s) => s.id === sel)
  const all = rs.map(pct)
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[[st.length, 'Students'], [ls.length, 'Lessons'], [rs.length, 'Completed'], [avg(all) + '%', 'Average']].map(([a, b]) => (
          <div key={b} className={card + ' text-center'}><div className="text-3xl font-bold text-violet-600">{a}</div><div className="text-xs text-slate-500">{b}</div></div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">{['Students', 'Lessons'].map((t) => <button key={t} className={tab === t ? btn : btn2} onClick={() => { setTab(t); setSel(null) }}>{t}</button>)}</div>
      {tab === 'Students' && !stu && (
        <div className="grid sm:grid-cols-2 gap-3">
          {st.map((s) => { const mine = rs.filter((r) => r.student_id === s.id); return (
            <button key={s.id} className={card + ' text-left'} onClick={() => setSel(s.id)}>
              <b>{s.name}</b><p className="text-xs text-slate-500 mb-2">{asg.filter((a) => a.student_id === s.id).length} assigned · {mine.length} done</p><Bar p={avg(mine.map(pct))} />
            </button>) })}
          {!st.length && <p className="text-slate-500">Students appear here after they sign up.</p>}
        </div>
      )}
      {tab === 'Students' && stu && (
        <div>
          <button className={btn2 + ' mb-3'} onClick={() => setSel(null)}>← All students</button>
          <div className={card + ' mb-4 flex justify-between'}><b className="text-xl">{stu.name}</b>
            <button className={btn2 + ' !text-rose-600'} onClick={async () => { await sb.from('profiles').delete().eq('id', stu.id); setSel(null); load() }}>Remove</button></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className={card}><h3 className="font-bold mb-2">Assign lessons</h3>
              {ls.map((l) => <label key={l.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={asg.some((a) => a.student_id === stu.id && a.lesson_id === l.id)} onChange={(e) => toggle(stu.id, l.id, e.target.checked)} />{ICON[l.data.cat]} {l.data.title} <span className="text-slate-400">{l.data.lv}</span></label>)}</div>
            <div className={card}><h3 className="font-bold mb-2">Notes</h3><textarea className={inp} rows={5} defaultValue={stu.notes} onBlur={(e) => sb.from('profiles').update({ notes: e.target.value }).eq('id', stu.id).then(() => {})} /></div>
          </div>
          <div className={card + ' mt-4'}><h3 className="font-bold mb-2">Completed work</h3>
            {rs.filter((r) => r.student_id === stu.id).map((r) => <div key={r.lesson_id} className="py-2 border-b border-violet-50 text-sm">
              <div className="flex justify-between"><b>{ls.find((l) => l.id === r.lesson_id)?.data.title}</b><b className="text-violet-600">{r.total ? `${r.score}/${r.total}` : 'Needs review'}</b></div>
              {Object.values(r.answers || {}).map((t, i) => <p key={i} className="bg-violet-50 rounded-xl p-2 mt-1">{t}</p>)}
              {(r.wrong || []).map((w, i) => <p key={i} className="text-rose-500">✗ {w.q} — “{w.y}”</p>)}</div>)}</div>
        </div>
      )}
      {tab === 'Lessons' && (
        <div>
          <div className={card + ' mb-4'}><h3 className="font-bold mb-2">Create a lesson</h3>
            <input className={inp} placeholder="Title" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2"><select className={inp} value={nl.cat} onChange={(e) => setNl({ ...nl, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
              <select className={inp} value={nl.lv} onChange={(e) => setNl({ ...nl, lv: e.target.value })}>{['A1', 'A2', 'B1', 'B2', 'C1'].map((c) => <option key={c}>{c}</option>)}</select></div>
            <textarea className={inp} rows={4} placeholder={'Quiz: 🐶 What is this? | dog | cat | bird\nWriting/Speaking: one prompt per line'} value={nl.lines} onChange={(e) => setNl({ ...nl, lines: e.target.value })} />
            <button className={btn} onClick={addLesson}>Save lesson</button></div>
          <div className="grid sm:grid-cols-2 gap-2">{ls.map((l) => <div key={l.id} className={card + ' !p-3 flex justify-between text-sm'}><b>{ICON[l.data.cat]} {l.data.title}</b><span className="text-slate-500">{l.data.lv} · {l.data.x.length} tasks</span></div>)}</div>
        </div>
      )}
    </div>
  )
}

function Student({ me }: { me: Profile }) {
  const [ls, setLs] = useState<Lesson[]>([])
  const [rs, setRs] = useState<Result[]>([])
  const [play, setPlay] = useState<Lesson | null>(null)
  const load = async () => {
    const a = await sb.from('assignments').select('lesson_id').eq('student_id', me.id)
    const ids = (a.data || []).map((x) => x.lesson_id as string)
    if (ids.length) { const l = await sb.from('lessons').select('*').in('id', ids); setLs((l.data || []) as Lesson[]) }
    const r = await sb.from('results').select('*').eq('student_id', me.id); setRs((r.data || []) as Result[])
  }
  useEffect(() => { load() }, [])
  if (play) return <Player l={play} onClose={() => setPlay(null)} onSave={async (r) => { await sb.from('results').upsert({ student_id: me.id, lesson_id: play.id, ...r }); load() }} />
  const stars = rs.reduce((a, r) => a + r.score, 0)
  const cat: Record<string, number[]> = {}
  rs.forEach((r) => { const l = ls.find((x) => x.id === r.lesson_id); if (l) (cat[l.data.cat] ||= []).push(pct(r)) })
  const wrong = rs.flatMap((r) => (r.wrong || []).map((w: Wrong) => w))
  return (
    <div>
      <div className={card + ' mb-4 flex items-center gap-4 text-white !bg-gradient-to-r from-violet-500 to-blue-500'}>
        <div className="text-6xl">🦉</div><div><h2 className="text-xl font-bold">Hello, {me.name.split(' ')[0]}! 👋</h2><p className="font-semibold">⭐ {stars} stars</p></div></div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {ls.map((l) => { const r = rs.find((x) => x.lesson_id === l.id); return (
          <div key={l.id} className={card}><div className="text-5xl">{ICON[l.data.cat]}</div><b>{l.data.title}</b>
            <p className="text-xs text-slate-500 mb-2">{l.data.cat} · {l.data.lv}</p>
            {r && <p className="text-sm text-emerald-600 font-semibold mb-2">Done: {r.total ? `${r.score}/${r.total}` : 'sent to teacher'}</p>}
            <button className={btn} onClick={() => setPlay(l)}>{r ? 'Practice again' : 'Start'}</button></div>) })}
        {!ls.length && <p className="text-slate-500">No lessons assigned yet. Ask Alice!</p>}
      </div>
      <div className={card + ' mb-4'}><h3 className="font-bold mb-3">My progress</h3>
        {CATS.map((c) => <div key={c} className="mb-3"><div className="flex justify-between text-sm mb-1"><span>{ICON[c]} {c}</span><b>{avg(cat[c] || [])}%</b></div><Bar p={avg(cat[c] || [])} /></div>)}</div>
      <div className={card}><h3 className="font-bold mb-2">Review mistakes</h3>
        {wrong.map((w, i) => <p key={i} className="text-sm py-1">{w.q}<br /><span className="text-rose-500">You: {w.y}</span> · <span className="text-emerald-600">Correct: {w.c}</span></p>)}
        {!wrong.length && <p className="text-slate-400 text-sm">No mistakes. Great work!</p>}</div>
    </div>
  )
}

function Player({ l, onSave, onClose }: { l: Lesson; onSave: (r: Omit<Result, 'student_id' | 'lesson_id'>) => void; onClose: () => void }) {
  const x = l.data.x
  const [i, setI] = useState(0)
  const [val, setVal] = useState(x[0].t === 'fix' ? x[0].q : '')
  const [pick, setPick] = useState<number[]>([])
  const [fb, setFb] = useState<{ ok: boolean | null; c: string } | null>(null)
  const [st, setSt] = useState<{ score: number; total: number; wrong: Wrong[]; answers: Record<string, string> }>({ score: 0, total: 0, wrong: [], answers: {} })
  const e = x[i]
  const words = useMemo(() => (e && e.t === 'order' ? shuffle(String(e.a).replace(/[.!?]$/, '').split(' ')) : []), [i])
  const say = (t: string) => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch { /* no TTS */ } }
  const check = () => {
    let ok: boolean | null = null, u = val, c = ''
    if (e.t === 'mc') { if (val === '') return; u = e.o![+val]; c = e.o![e.a as number]; ok = +val === e.a }
    else if (e.t === 'fill' || e.t === 'fix') { if (!val.trim()) return; c = String(e.a); ok = norm(val) === norm(c) }
    else if (e.t === 'order') { u = pick.map((k) => words[k]).join(' '); if (!u) return; c = String(e.a); ok = norm(u) === norm(c) }
    else { if (!val.trim()) return }
    setSt((s) => ok === null ? { ...s, answers: { ...s.answers, [i]: u } }
      : { ...s, score: s.score + (ok ? 1 : 0), total: s.total + 1, wrong: ok ? s.wrong : [...s.wrong, { q: e.q, y: u, c }] })
    setFb({ ok, c })
  }
  const next = () => {
    const n = i + 1
    if (n >= x.length) onSave(st)
    setI(n); setFb(null); setPick([]); setVal(x[n]?.t === 'fix' ? x[n].q : '')
  }
  if (!e) return (
    <div className={card + ' text-center max-w-md mx-auto'}>
      <div className="text-6xl">{st.total && st.score === st.total ? '🏆' : '🎉'}</div>
      <div className="text-3xl">{'⭐'.repeat(st.total ? Math.max(1, Math.round((st.score / st.total) * 3)) : 3)}</div>
      <h2 className="text-xl font-bold my-2">Lesson complete!</h2><p className="text-3xl font-bold text-violet-600 mb-3">{st.total ? `${st.score} / ${st.total}` : 'Sent'}</p>
      <button className={btn} onClick={onClose}>Back to my lessons</button></div>
  )
  return (
    <div className={card + ' max-w-xl mx-auto'}>
      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{l.data.title}</span><span>{i + 1}/{x.length}</span></div><Bar p={((i + (fb ? 1 : 0)) / x.length) * 100} />
      {e.img && <div className="text-center text-7xl my-4">{e.img}</div>}
      <p className="text-lg font-semibold my-3">{e.t === 'fix' ? 'Correct the mistake:' : e.q}</p>
      {e.say && <button className={btn2 + ' mb-3'} onClick={() => say(e.say!)}>🔊 Play audio</button>}
      <fieldset disabled={!!fb} className="mb-3">
        {e.t === 'mc' && e.o!.map((o, k) => <label key={k} className="block border border-violet-100 rounded-xl p-3 mb-2"><input type="radio" className="mr-2" checked={val === String(k)} onChange={() => setVal(String(k))} />{o}</label>)}
        {(e.t === 'fill' || e.t === 'fix') && <input className={inp} value={val} onChange={(ev) => setVal(ev.target.value)} placeholder="Type your answer" />}
        {e.t === 'order' && <>
          <div className="min-h-[3rem] bg-violet-50 rounded-xl p-2 mb-3 flex flex-wrap gap-2">{pick.map((k) => <button key={k} className={btn2} onClick={() => setPick(pick.filter((p) => p !== k))}>{words[k]}</button>)}</div>
          <div className="flex flex-wrap gap-2">{words.map((w, k) => (pick.includes(k) ? null : <button key={k} className={btn} onClick={() => setPick([...pick, k])}>{w}</button>))}</div></>}
        {(e.t === 'write' || e.t === 'speak') && <textarea className={inp} rows={6} value={val} onChange={(ev) => setVal(ev.target.value)} placeholder="Write here..." />}
      </fieldset>
      {fb && <div className={'rounded-xl p-3 mb-3 ' + (fb.ok === null ? 'bg-blue-50 text-blue-700' : fb.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{fb.ok === null ? 'Saved — Alice will review it.' : fb.ok ? '🌟 Great job!' : '❌ Correct answer: ' + fb.c}</div>}
      <button className={btn} onClick={fb ? next : check}>{fb ? (i + 1 < x.length ? 'Next →' : 'Finish') : 'Check'}</button>
      <button className="block mx-auto text-xs text-slate-400 mt-4" onClick={onClose}>Exit lesson</button>
    </div>
  )
}
