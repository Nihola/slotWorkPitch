import { calculateMatch } from '../utils/matching'
import type { Job, JobSeeker, MatchScore } from '../types'
export const matchingService = {
  calculateMatch: (job: Job, seeker: JobSeeker): MatchScore => calculateMatch(job, seeker),
}
