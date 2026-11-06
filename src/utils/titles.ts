const SITE = 'Slotwork'
const EXACT: Record<string, string> = {
  '/': 'Work that fits your week', '/login': 'Sign in', '/register': 'Create your account', '/forgot-password': 'Reset your password', '/onboarding': 'Set up your profile',
  '/dashboard': 'Dashboard', '/jobs': 'Find jobs', '/saved': 'Saved jobs', '/applications': 'Applications', '/messages': 'Messages', '/notifications': 'Notifications', '/profile': 'Your profile', '/settings': 'Settings',
  '/employer': 'Employer overview', '/employer/jobs': 'Your jobs', '/employer/jobs/new': 'Post a job', '/employer/candidates': 'Candidates', '/employer/applications': 'Applications',
  '/employer/messages': 'Messages', '/employer/notifications': 'Notifications', '/employer/company': 'Company profile',
  '/admin': 'Admin overview', '/admin/moderation': 'Moderation queue', '/admin/reports': 'Reports', '/admin/jobs': 'All jobs', '/admin/users': 'Users', '/admin/analytics': 'Analytics',
}
/** Each route gets its own document title so screen-reader users and browser tabs can tell pages apart. */
export function titleFor(pathname: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  let t = EXACT[p]
  if (!t) {
    if (/^\/jobs\/[^/]+$/.test(p)) t = 'Job details'
    else if (/^\/applications\/[^/]+$/.test(p)) t = 'Application'
    else if (/^\/employer\/jobs\/[^/]+\/edit$/.test(p)) t = 'Edit job'
    else if (/^\/employer\/jobs\/[^/]+$/.test(p)) t = 'Shift coverage'
    else if (/^\/admin\/moderation\/[^/]+$/.test(p)) t = 'Review job'
    else t = 'Page not found'
  }
  return `${t} · ${SITE}`
}
