import { parseQuery, matchesQuery, monthlyPay } from '../../src/utils/search'
import { relativeTime, greeting } from '../../src/utils/time'
import { jobs } from '../../src/data/jobs'
let fails = 0
const ok = (n: string, c: boolean, x?: unknown) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)) }
const ids = (q: string) => jobs.filter(j => j.moderation === 'approved' && matchesQuery(j, parseQuery(q))).map(j => j.id).join()
const p = parseQuery('Part-time English teaching jobs after 5pm in Tashkent')
ok('spec example parses', JSON.stringify(p.chips) === '["English","Teaching","Part-time","After 17:00","Tashkent"]' && p.after === 17 && p.city === 'Tashkent' && p.types.join() === 'part-time', p)
ok('spec example finds the tutor job only', ids('Part-time English teaching jobs after 5pm in Tashkent') === 'j1', ids('Part-time English teaching jobs after 5pm in Tashkent'))
ok('empty query matches everything', ids('') === 'j1,j2,j3,j4,j5,j6' && parseQuery('   ').chips.length === 0)
ok('stems: teacher/tutoring', ids('teacher') === 'j1' && ids('tutoring') === 'j1')
ok('remote', ids('remote support') === 'j4' && parseQuery('work from home').remote)
ok('remote jobs match any city', ids('support in Samarkand') === 'j4')
ok('city excludes others', ids('Samarkand') === 'j4' && ids('Tashkent') === 'j1,j2,j3,j4,j5,j6' && ids('Bukhara') === 'j4')
ok('after hour variants', parseQuery('after 17:00').after === 17 && parseQuery('after 9am').after === 9 && parseQuery('after 12am').after === 0 && parseQuery('after 5').after === 17 && parseQuery('after 9').after === 9 && parseQuery('after 11pm').after === 23)
ok('after filters by end hour', ids('after 8pm') === 'j5' && ids('after 3pm').includes('j1'))
ok('types OR + shift', parseQuery('full time or part time').types.length === 2 && ids('shifts') === 'j2')
ok('unknown words find nothing', ids('astronaut') === '')
ok('stop words ignored', JSON.stringify(parseQuery('jobs in the near me').keywords) === '[]')
const byId = (id: string) => jobs.find(j => j.id === id)!
ok('monthly pay: month as-is, one-time counts only its own shifts', monthlyPay(byId('j1')) === 500 && monthlyPay(byId('j3')) === 80, [monthlyPay(byId('j1')), monthlyPay(byId('j3'))])
ok('monthly pay: day rate uses the schedule, hourly too', monthlyPay(byId('j9')) === Math.round(60 * 6 * 4.33) && monthlyPay({ ...byId('j1'), salaryPeriod: 'hour', salaryMax: 5 }) === Math.round(5 * 5 * 5 * 4.33))
ok('a one-time $40/day job never outranks a $650/month job', monthlyPay(byId('j3')) < monthlyPay(byId('j4')))
const now = Date.parse('2026-10-07T12:00:00Z'), ago = (m: number) => new Date(now - m * 60000).toISOString()
ok('relative time', relativeTime(ago(0), now) === 'Just now' && relativeTime(ago(2), now) === '2 min ago' && relativeTime(ago(60), now) === '1 hour ago' && relativeTime(ago(180), now) === '3 hours ago' && relativeTime(ago(1500), now) === '1 day ago' && relativeTime(ago(4000), now) === '2 days ago' && /Sept|Oct|Sep/.test(relativeTime(ago(20000), now)))
ok('greeting', greeting(new Date(2026, 0, 1, 9)) === 'Good morning' && greeting(new Date(2026, 0, 1, 14)) === 'Good afternoon' && greeting(new Date(2026, 0, 1, 20)) === 'Good evening')
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0)
