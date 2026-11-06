import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mockSeeker } from '../services/mockSeeker'
import { cellsToRanges, rangesToCells } from '../utils/availability'
import { useAuth } from './AuthContext'
import type { JobSeeker, SlotKind } from '../types'

interface Ctx { seeker: JobSeeker; cells: Map<string, SlotKind>; setCells: (c: Map<string, SlotKind>) => void }
const SeekerCtx = createContext<Ctx | null>(null)

/** Live availability for the signed-in seeker; edits are saved back to their profile. */
export function SeekerProvider({ children }: { children: ReactNode }) {
  const { session, updateAvailability } = useAuth()
  const profile = session?.profile ?? null
  const base = profile ?? mockSeeker
  const [cells, setCellsState] = useState(() => rangesToCells(base.availability))
  const profileId = profile?.id
  // Re-sync only when a different profile loads (login, logout, onboarding finished), not on every edit.
  useEffect(() => { setCellsState(rangesToCells((profile ?? mockSeeker).availability)) }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setCells = useCallback((c: Map<string, SlotKind>) => { setCellsState(c); updateAvailability(cellsToRanges(c)) }, [updateAvailability])
  const value = useMemo(() => ({ seeker: { ...base, availability: cellsToRanges(cells) }, cells, setCells }), [base, cells, setCells])
  return <SeekerCtx.Provider value={value}>{children}</SeekerCtx.Provider>
}
export function useSeeker() {
  const c = useContext(SeekerCtx)
  if (!c) throw new Error('useSeeker must be used inside SeekerProvider')
  return c
}
