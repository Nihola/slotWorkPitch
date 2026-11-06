import type { Availability, Job, JobSeeker, MatchScore } from '../types'
const WEIGHTS = { schedule: 0.4, skills: 0.25, location: 0.2, experience: 0.1, preferences: 0.05 }
const pct = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 100)

export function scheduleCompatibility(job: Job, availability: Availability[]) {
  const have = new Set<string>()
  availability.forEach(a => { for (let h = a.startHour; h < a.endHour; h++) have.add(`${a.dayOfWeek}-${h}`) })
  let total = 0, covered = 0
  job.schedule.days.forEach(d => { for (let h = job.schedule.startHour; h < job.schedule.endHour; h++) { total++; if (have.has(`${d}-${h}`)) covered++ } })
  return { ratio: total ? covered / total : 0, uncoveredHours: total - covered }
}
export function calculateMatch(job: Job, seeker: JobSeeker): MatchScore {
  const { ratio, uncoveredHours } = scheduleCompatibility(job, seeker.availability)
  const owned = seeker.skills.map(s => s.toLowerCase())
  const skills = job.skills.length ? job.skills.filter(s => owned.includes(s.toLowerCase())).length / job.skills.length : 1
  const location = job.type === 'remote' || job.workMode === 'remote' ? 1 : job.city === seeker.city ? (job.district === seeker.district ? 1 : 0.75) : 0.2
  const experience = 0.8
  const preferences = seeker.jobTypes?.length ? (seeker.jobTypes.includes(job.type) ? 1 : 0.5) : 0.85
  const overall = ratio * WEIGHTS.schedule + skills * WEIGHTS.skills + location * WEIGHTS.location + experience * WEIGHTS.experience + preferences * WEIGHTS.preferences
  return { overall: pct(overall), skills: pct(skills), schedule: pct(ratio), location: pct(location), experience: pct(experience), preferences: pct(preferences), uncoveredHours }
}
export const matchLabel = (p: number) => (p >= 85 ? 'Excellent match' : p >= 65 ? 'Good match' : 'Partial match')
