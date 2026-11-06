import { Star, Plus, Check } from 'lucide-react'
import MatchScore from './MatchScore'
import type { JobSeeker, MatchScore as Score } from '../types'
import { t } from '../i18n'
interface Props { person: JobSeeker; match: Score; selected: boolean; color: string; onToggle: () => void }
export default function CandidateCard({ person, match, selected, color, onToggle }: Props) {
  return (
    <article className={`flex items-center gap-3 rounded-2xl border p-3 transition ${selected ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#131839]'}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white ${selected ? color : 'bg-slate-400'}`}>{person.name[0]}</div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold">{person.name}</h3>
        <p className="truncate text-sm text-muted">{person.headline}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Star size={12} className="text-amberfg" fill="currentColor" />{person.rating}</span>
          <span>{person.district}</span><span className="font-semibold text-mintfg">{t('Schedule fit')} {match.schedule}%</span></p>
      </div>
      <MatchScore value={match.overall} size={48} />
      <button onClick={onToggle} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Add'} ${person.name} ${selected ? 'from' : 'to'} coverage`}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-bold ${selected ? 'border-brand bg-brand text-white' : 'border-slate-200 dark:border-slate-600'}`}>{selected ? <Check size={16} /> : <Plus size={16} />}</button>
    </article>
  )
}
