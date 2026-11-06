import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'
import type { ReactNode } from 'react'
import { t } from '../i18n'
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-ink via-[#2A2D8F] to-violet p-10 text-white lg:flex">
        <Link to="/" className="text-xl font-extrabold">{t('Slotwork')}</Link>
        <div><p className="text-4xl font-extrabold leading-tight tracking-tight">{t('Work that fits the hours you actually have.')}</p>
          <div className="mt-8 grid max-w-xs gap-2" aria-hidden="true">{[['Mon', 'w-3/5 ml-[20%]'], ['Tue', 'w-3/5 ml-[20%]'], ['Wed', 'w-2/5 ml-[40%]']].map(([d, c]) => (
            <div key={d} className="flex items-center gap-3 text-xs"><span className="w-8 font-bold">{d}</span><span className="h-5 flex-1 rounded-md bg-white/15"><span className={`block h-5 rounded-md bg-mint ${c}`} /></span></div>))}</div></div>
        <p className="text-sm text-white/70">{t('Demo companies and people are fictional.')}</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
          <Link to="/" className="mb-6 block text-xl font-extrabold lg:hidden">{t('Slotwork')}</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
