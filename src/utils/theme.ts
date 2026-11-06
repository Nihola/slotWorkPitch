export type ThemePref = 'light' | 'dark' | 'system'
export function getThemePref(): ThemePref { try { const v = localStorage.getItem('theme'); return v === 'light' || v === 'dark' ? v : 'system' } catch { return 'system' } }
export function applyTheme(pref: ThemePref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
export function setThemePref(p: ThemePref) {
  try { if (p === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', p) } catch { /* storage unavailable */ }
  applyTheme(p)
}
