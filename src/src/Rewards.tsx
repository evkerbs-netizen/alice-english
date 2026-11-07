const fmt = (d: Date) => d.toLocaleDateString('en-CA')
export const today = () => fmt(new Date())

export function calcStreak(days: string[]) {
  const set = new Set(days)
  const d = new Date()
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

export function Rewards({ stars, done, streak }: { stars: number; done: number; streak: number }) {
  const B = [
    { e: '🌱', t: 'First lesson', ok: done >= 1 },
    { e: '🚀', t: '3 lessons', ok: done >= 3 },
    { e: '🏅', t: '10 lessons', ok: done >= 10 },
    { e: '⭐', t: '50 stars', ok: stars >= 50 },
    { e: '🔥', t: '3-day streak', ok: streak >= 3 },
    { e: '💎', t: '7-day streak', ok: streak >= 7 },
  ]
  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-violet-100 p-4 mb-4">
      <h3 className="font-bold mb-2">My stickers</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {B.map((b) => (
          <div key={b.t} className={'text-center shrink-0 w-16 ' + (b.ok ? '' : 'opacity-30 grayscale')}>
            <div className="text-4xl">{b.e}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{b.t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
