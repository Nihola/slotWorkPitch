import type { JobSeeker } from '../types'
export const mockSeeker: JobSeeker = {
  id: 's1', name: 'Dilnoza K.', email: 'demo@slotwork.test', role: 'seeker', headline: 'Language student', city: 'Tashkent', district: 'Chilonzor',
  skills: ['English', 'Teaching', 'Service'], languages: ['Uzbek', 'English', 'Russian'], rating: 4.8,
  availability: [0, 1, 2].map(d => ({ id: `a${d}`, dayOfWeek: d, startHour: 15, endHour: 20, kind: 'available' as const })),
}
