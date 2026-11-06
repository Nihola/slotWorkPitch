import { useCallback, useEffect, useState } from 'react'
import { jobService } from '../services/jobService'
import type { Job } from '../types'
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(() => {
    setLoading(true); setError(false)
    jobService.getJobs().then(setJobs).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  return { jobs, loading, error, reload: load }
}
