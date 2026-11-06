import type { Availability, JobSeeker } from '../types'
const av = (days: number[], s: number, e: number): Availability[] => days.map(d => ({ id: `${d}-${s}`, dayOfWeek: d, startHour: s, endHour: e, kind: 'available' }))
const base = { role: 'seeker' as const, city: 'Tashkent', languages: ['Uzbek', 'Russian'] }
export const candidates: JobSeeker[] = [
  { ...base, id: 'c1', name: 'Aziz R.', email: 'c1@demo.test', headline: 'Hospitality student', district: 'Yunusobod', skills: ['Service', 'Teamwork'], rating: 4.9, availability: av([0,1,2,3,4,5], 9, 13) },
  { ...base, id: 'c2', name: 'Madina S.', email: 'c2@demo.test', headline: 'Former cafe server', district: 'Yunusobod', skills: ['Service', 'Teamwork', 'Coffee'], rating: 4.7, availability: av([0,1,2,3,4], 13, 17) },
  { ...base, id: 'c3', name: 'Jasur T.', email: 'c3@demo.test', headline: 'Part-time, evenings free', district: 'Mirobod', skills: ['Service'], rating: 4.5, availability: av([0,1,2,3,4,5], 15, 20) },
  { ...base, id: 'c4', name: 'Nilufar A.', email: 'c4@demo.test', headline: 'Event staff, flexible', district: 'Chilonzor', skills: ['Events', 'Service', 'English', 'Teaching'], rating: 4.8, availability: av([0,2,4,5], 9, 18) },
  { ...base, id: 'c5', name: 'Bekzod M.', email: 'c5@demo.test', headline: 'Weekends only', district: 'Sergeli', skills: ['Events', 'Teamwork'], rating: 4.4, availability: av([5, 6], 10, 19) },
]
