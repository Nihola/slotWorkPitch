/** Demo series for the admin charts (12 weeks). Replace with an analytics endpoint later. */
export const WEEKS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`)
export interface Series { key: string; title: string; color: string; values: number[] }
export const SERIES: Series[] = [
  { key: 'registrations', title: 'Registrations', color: '#6C86FF', values: [210, 232, 245, 260, 255, 290, 318, 340, 361, 372, 398, 425] },
  { key: 'jobs', title: 'Jobs posted', color: '#7C4DFF', values: [88, 95, 90, 104, 112, 118, 121, 130, 128, 141, 150, 158] },
  { key: 'applications', title: 'Applications', color: '#3CD0E8', values: [640, 702, 690, 760, 815, 842, 901, 936, 990, 1040, 1104, 1180] },
  { key: 'matches', title: 'Successful matches', color: '#3DDC9A', values: [180, 196, 205, 221, 240, 252, 266, 281, 300, 322, 341, 366] },
  { key: 'reports', title: 'Reports', color: '#FF6B6B', values: [14, 11, 16, 12, 10, 13, 9, 11, 8, 10, 7, 9] },
  { key: 'active', title: 'Active users', color: '#FFC24A', values: [3100, 3240, 3330, 3500, 3610, 3790, 3900, 4100, 4260, 4410, 4620, 4880] },
]
