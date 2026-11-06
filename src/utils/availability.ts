import type { Availability, SlotKind } from '../types'
export const cellKey = (day: number, hour: number) => `${day}-${hour}`
/** Collapse selected grid cells into API-friendly contiguous ranges. */
export function cellsToRanges(cells: Map<string, SlotKind>): Availability[] {
  const out: Availability[] = []
  for (let day = 0; day < 7; day++) {
    let start: number | null = null
    let kind: SlotKind = 'available'
    for (let h = 0; h <= 24; h++) {
      const k = h < 24 ? cells.get(cellKey(day, h)) : undefined
      if (start !== null && k !== kind) {
        out.push({ id: `${day}-${start}`, dayOfWeek: day, startHour: start, endHour: h, kind })
        start = null
      }
      if (k && start === null) { start = h; kind = k }
    }
  }
  return out
}
export const rangesToCells = (list: Availability[]) => {
  const m = new Map<string, SlotKind>()
  list.forEach(a => { for (let h = a.startHour; h < a.endHour; h++) m.set(cellKey(a.dayOfWeek, h), a.kind) })
  return m
}
