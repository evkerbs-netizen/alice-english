import { useState } from 'react'
import { sb } from './lib'

const card = 'sky-card w-full max-w-sm text-center'
const inp = 'w-full border border-violet-200 rounded-xl px-3 py-2 mb-2 bg-white'
const btn = 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl px-4 py-3 font-semibold w-full shadow-lg shadow-violet-300/40'
const LET: [string, number, number, string, number, number][] = [
  ['A', 6, 42, '#7c6cf6', 14, 0], ['b', 18, 30, '#5b8def', 17, -6], ['C', 30, 48, '#e879b9', 15, -3], ['d', 43, 28, '#f5a524', 19, -11],
  ['E', 55, 40, '#34b8a0', 16, -8], ['f', 67, 32, '#7c6cf6', 18, -2], ['G', 78, 46, '#5b8def', 13, -9], ['h', 90, 34, '#e879b9', 20, -14],
  ['1', 12, 36, '#34b8a0', 21, -16], ['?', 72, 38, '#f5a524', 22, -5],
]
const CLOUDS: [number, number, number, number][] = [[9, 1, 70, -20], [24, 0.7, 95, -60], [62, 0.85, 80, -35], [80, 0.6, 110, -8]]

function Sky() {
  return (
    <>
      <div className="sky-sun" /><div className="sky-rainbow" />
      <div className="sky-plane"><svg viewBox="0 0 120 52" aria-hidden="true">
        <path d="M52 23 L38 4 L52 4 L76 22Z" fill="#dcd3ff" /><path d="M52 30 L40 48 L54 48 L76 31Z" fill="#c3b2ff" />
        <path d="M14 24 L6 8 L18 8 L32 22Z" fill="#7c6cf6" />
        <path d="M6 27 Q28 18 80 20 L104 23 Q118 26 104 30 L72 33 Q28 36 6 27Z" fill="#fff" stroke="#b8aef5" strokeWidth="1.5" />
        <circle cx="44" cy="26" r="2.6" fill="#97d3ff" /><circle cx="56" cy="26" r="2.6" fill="#97d3ff" /><circle cx="68" cy="26" r="2.6" fill="#97d3ff" />
        <path d="M96 24 Q106 25 108 27 Q104 28 96 28Z" fill="#5b8def" /></svg></div>
      {CLOUDS.map(([t, s, d, dl], i) => <div key={i} className="sky-cloud" style={{ top: t + '%', transform: `scale(${s})`, animationDuration: d + 's', animationDelay: dl + 's' }} />)}
      {LET.map(([c, l, f, col, d, dl], i) => <span key={i} className="sky-l" style={{ left: l + '%', fontSize: f, color: col, animationDuration: d + 's', animationDelay: dl + 's' }}>{c}</span>)}
    </>
  )
}

export function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
  const [f, setF] = useState({ name: '', email: '', pass: '' })
  const [msg, setMsg] = useState('')
  const go = async () => {
    setMsg('')
    if (mode === 'forgot') {
      const r = await sb.auth.resetPasswordForEmail(f.email, { redirectTo: window.location.origin })
      setMsg(r.error ? r.error.message : 'Check your email for the reset link.')
      return
    }
    const r = mode === 'up'
      ? await sb.auth.signUp({ email: f.email, password: f.pass, options: { data: { name: f.name } } })
      : await sb.auth.signInWithPassword({ email: f.email, password: f.pass })
    if (r.error) setMsg(r.error.message)
    else if (mode === 'up' && !r.data.session) setMsg('Check your email to confirm the account.')
  }
  return (
    <div className="sky-bg">
      <Sky />
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className={card}>
          <div className="sky-owl">🦉</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">Alice’s English World</h1>
          <p className="text-sm text-slate-500 mb-4">{mode === 'forgot' ? 'Reset your password' : 'Learn English with your teacher'}</p>
          {mode === 'up' && <input className={inp} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
          <input className={inp} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          {mode !== 'forgot' && <input className={inp} placeholder="Password (6+ characters)" type="password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />}
          <p className="text-rose-500 text-sm mb-2">{msg}</p>
          <button className={btn} onClick={go}>{mode === 'up' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
          {mode !== 'up' && <button className="block mx-auto text-sm text-violet-600 mt-3" onClick={() => { setMode('up'); setMsg('') }}>New student? Sign up</button>}
          {mode !== 'in' && <button className="block mx-auto text-sm text-violet-600 mt-3" onClick={() => { setMode('in'); setMsg('') }}>I already have an account</button>}
          {mode === 'in' && <button className="block mx-auto text-sm text-slate-500 mt-2" onClick={() => { setMode('forgot'); setMsg('') }}>Forgot password?</button>}
        </div>
      </div>
    </div>
  )
}

export function NewPassword({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState('')
  const [msg, setMsg] = useState('')
  const save = async () => {
    if (p.length < 6) { setMsg('Use at least 6 characters.'); return }
    const r = await sb.auth.updateUser({ password: p })
    if (r.error) setMsg(r.error.message); else onDone()
  }
  return (
    <div className="sky-bg"><Sky />
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className={card}>
          <div className="sky-owl">🔑</div>
          <h1 className="text-xl font-bold mb-3">Choose a new password</h1>
          <input className={inp} type="password" placeholder="New password" value={p} onChange={(e) => setP(e.target.value)} />
          <p className="text-rose-500 text-sm mb-2">{msg}</p>
          <button className={btn} onClick={save}>Save password</button>
        </div>
      </div>
    </div>
  )
}
