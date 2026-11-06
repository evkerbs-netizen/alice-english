import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string)

export type Ex = { t: 'mc' | 'fill' | 'fix' | 'order' | 'write' | 'speak'; q: string; img?: string; say?: string; o?: string[]; a?: string | number }
export type Lesson = { id: string; data: { title: string; cat: string; lv: string; x: Ex[] } }
export type Profile = { id: string; name: string; role: 'teacher' | 'student'; level: string; notes: string }
export type Wrong = { q: string; y: string; c: string }
export type Result = { student_id: string; lesson_id: string; score: number; total: number; wrong: Wrong[]; answers: Record<string, string> }

export const CATS = ['Grammar', 'Vocabulary', 'Listening', 'Writing', 'Speaking', 'Use of English']
export const ICON: Record<string, string> = { Grammar: '📘', Vocabulary: '🔤', Listening: '🎧', Writing: '✍️', Speaking: '🎤', 'Use of English': '🧩' }
export const norm = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim()
export const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
export const pct = (r: { score: number; total: number }) => (r.total ? Math.round((r.score / r.total) * 100) : 100)

export const SEED: Lesson[] = [
  { id: 'g1', data: { title: 'Present Simple', cat: 'Grammar', lv: 'A2', x: [
    { t: 'mc', q: 'She ___ coffee every morning.', o: ['drink', 'drinks', 'drinking'], a: 1 },
    { t: 'fill', q: 'He ___ (go) to school by bus.', a: 'goes' },
    { t: 'fix', q: 'She don’t like pizza.', a: 'She doesn’t like pizza.' }] } },
  { id: 'a1', data: { title: 'Animals', cat: 'Vocabulary', lv: 'A1', x: [
    { t: 'mc', img: '🐶', q: 'What is this?', o: ['cat', 'dog', 'rabbit'], a: 1 },
    { t: 'mc', img: '🐘', q: 'What is this?', o: ['horse', 'monkey', 'elephant'], a: 2 },
    { t: 'fill', img: '🦁', q: 'Type the word in English:', a: 'lion' }] } },
  { id: 'l1', data: { title: 'At the Café', cat: 'Listening', lv: 'B1', x: [
    { t: 'mc', say: 'I would like a cup of tea with milk, please.', q: 'What does the customer order?', o: ['Coffee with sugar', 'Tea with milk', 'Orange juice'], a: 1 }] } },
  { id: 'w1', data: { title: 'My Weekend', cat: 'Writing', lv: 'B1', x: [{ t: 'write', q: 'Write 5–6 sentences about your last weekend.' }] } },
  { id: 's1', data: { title: 'Introduce Yourself', cat: 'Speaking', lv: 'A2', x: [{ t: 'speak', q: 'Introduce yourself: name, age, hobbies. Speak for 30 seconds, then write your key points.' }] } },
  { id: 'u1', data: { title: 'Word Formation', cat: 'Use of English', lv: 'B1', x: [
    { t: 'fill', q: 'She is a very ___ person. (CREATE)', a: 'creative' },
    { t: 'order', q: 'Build the sentence', a: 'She is reading a book.' }] } },
]
