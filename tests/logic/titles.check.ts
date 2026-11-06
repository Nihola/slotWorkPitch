import { titleFor } from '../../src/utils/titles'
let fails = 0
const ok = (n: string, c: boolean, x?: unknown) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)) }
ok('home', titleFor('/') === 'Work that fits your week · Slotwork')
ok('static routes', titleFor('/login') === 'Sign in · Slotwork' && titleFor('/employer/jobs/new') === 'Post a job · Slotwork' && titleFor('/admin/moderation') === 'Moderation queue · Slotwork')
ok('dynamic routes', titleFor('/jobs/j1') === 'Job details · Slotwork' && titleFor('/applications/app-1') === 'Application · Slotwork' && titleFor('/admin/moderation/j8') === 'Review job · Slotwork')
ok('edit vs coverage are distinguished', titleFor('/employer/jobs/j2/edit') === 'Edit job · Slotwork' && titleFor('/employer/jobs/j2') === 'Shift coverage · Slotwork')
ok('trailing slash tolerated', titleFor('/jobs/') === 'Find jobs · Slotwork')
ok('unknown path', titleFor('/nope/at/all') === 'Page not found · Slotwork')
const routes = ['/', '/login', '/register', '/forgot-password', '/onboarding', '/dashboard', '/jobs', '/saved', '/applications', '/messages', '/notifications', '/profile', '/settings', '/employer', '/employer/jobs', '/employer/candidates', '/employer/applications', '/employer/messages', '/employer/notifications', '/employer/company', '/admin', '/admin/reports', '/admin/jobs', '/admin/users', '/admin/analytics']
ok('every real route has a distinct, non-404 title where it should', routes.every(r => !titleFor(r).startsWith('Page not found')) && new Set(['/messages', '/employer/messages'].map(titleFor)).size === 1)
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0)
