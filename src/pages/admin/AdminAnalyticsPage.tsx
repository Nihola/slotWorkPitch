import { t } from '../../i18n'
import { card } from './ui'

export default function AdminAnalyticsPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('Analytics')}</h1>
        <p className="text-slate-400">{t('Verified marketplace activity will appear here.')}</p>
      </div>
      <section className={card}>
        <h2 className="text-lg font-extrabold">{t('No live analytics yet')}</h2>
        <p className="mt-2 max-w-2xl text-slate-400">{t('This demo uses sample accounts and job listings. It does not represent real user counts, hiring outcomes, or marketplace performance.')}</p>
      </section>
    </div>
  )
}
