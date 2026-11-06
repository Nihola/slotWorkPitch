import { useRef } from 'react'
import type { SlotKind } from '../types'
import { cellKey } from '../utils/availability'
import { t } from '../i18n'
const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
interface Props { value: Map<string, SlotKind>; onChange: (next: Map<string, SlotKind>) => void; mode?: SlotKind; startHour?: number; endHour?: number; highlight?: { days: number[]; startHour: number; endHour: number } }
const fill: Record<string, string> = { available: 'bg-mint', preferred: 'bg-violet', none: 'bg-slate-100 dark:bg-slate-800' }
/** Drag to paint. Starting on a filled cell erases. Works with mouse and touch. */
export default function AvailabilityCalendar({ value, onChange, mode = 'available', startHour = 8, endHour = 22, highlight }: Props) {
  const painting = useRef<'add' | 'remove' | null>(null)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const apply = (k: string) => {
    const next = new Map(value)
    if (painting.current === 'add') next.set(k, mode); else next.delete(k)
    onChange(next)
  }
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-[3px] min-w-[560px] select-none touch-none" style={{ gridTemplateColumns: `40px repeat(${hours.length}, minmax(28px,1fr))` }}
        onPointerMove={e => { if (!painting.current) return; const k = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.dataset.k; if (k) apply(k) }}
        onPointerUp={() => { painting.current = null }} onPointerLeave={() => { painting.current = null }}>
        <span />{hours.map(h => <span key={h} className="text-[10px] text-center text-muted">{h}</span>)}
        {DAYS.map((d, di) => (
          <div key={d} className="contents">
            <span className="text-xs font-bold self-center">{d}</span>
            {hours.map(h => {
              const k = cellKey(di, h), kind = value.get(k)
              const req = highlight?.days.includes(di) && h >= highlight.startHour && h < highlight.endHour
              return <button key={k} data-k={k} aria-label={`${d} ${h}:00 ${kind ?? 'unavailable'}`} aria-pressed={!!kind}
                onPointerDown={e => { e.preventDefault(); painting.current = kind ? 'remove' : 'add'; apply(k) }}
                className={`h-7 rounded-md transition-colors ${fill[kind ?? 'none']} ${req ? 'ring-2 ring-violet' : ''}`} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
