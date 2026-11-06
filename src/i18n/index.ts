import ru from './ru'
import uz from './uz'

export type Lang = 'en' | 'ru' | 'uz'
export const LANGS: { code: Lang; native: string }[] = [{ code: 'en', native: 'English' }, { code: 'ru', native: 'Русский' }, { code: 'uz', native: 'Oʻzbekcha' }]
const LOCALES: Record<Lang, string> = { en: 'en-GB', ru: 'ru-RU', uz: 'uz-UZ' }
const dicts: Record<Lang, Record<string, string>> = { en: {}, ru, uz }

function initial(): Lang {
  try {
    const saved = localStorage.getItem('lang'); if (saved === 'en' || saved === 'ru' || saved === 'uz') return saved
    const n = (navigator.language || '').slice(0, 2).toLowerCase(); if (n === 'ru' || n === 'uz') return n
  } catch { /* no storage / no navigator */ }
  return 'en'
}
let current: Lang = initial()
const listeners = new Set<() => void>()
export const getLang = () => current
export const locale = () => LOCALES[current]
export const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export function setLang(l: Lang, opts: { reload?: boolean } = {}) {
  if (l === current) return
  current = l
  try { localStorage.setItem('lang', l) } catch { /* ignore */ }
  try { document.documentElement.lang = l } catch { /* ignore */ }
  listeners.forEach(f => f())
  // Labels kept in module-level constants are computed once at load, so a reload is the simple, reliable way to switch every string.
  if (opts.reload ?? true) { try { window.location.reload() } catch { /* not in a browser */ } }
}

/** Translates English source text. Unknown text falls back to English; `{name}` placeholders are filled from `vars`. */
export function t(text: string, vars?: Record<string, string | number>): string {
  const s = dicts[current][text] ?? text
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s
}
export interface Plural { one: string; few?: string; many?: string; other: string }
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
/**
 * Plural forms. The dictionary entry for the English `other` text holds the translated forms separated by `|`:
 * Russian "one|few|many" (1 вакансия | 2 вакансии | 5 вакансий), Uzbek a single form. English falls back to one/other.
 */
export function plural(n: number, f: Plural, vars: Record<string, string | number> = {}): string {
  const tr = dicts[current][f.other]
  if (!tr) return fill(n === 1 ? f.one : f.other, { n, ...vars })
  const parts = tr.split('|'), m10 = n % 10, m100 = n % 100
  const i = current === 'ru' ? (m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2) : 0
  return fill(parts[i] ?? parts[parts.length - 1], { n, ...vars })
}
