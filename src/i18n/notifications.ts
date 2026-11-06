import { t } from '.'
import type { Notification } from '../types'

/** English templates per notification kind. The server sends `kind` + `params`, so each language can reorder words and decline names properly. */
export const NOTIFICATION_TEMPLATES: Record<string, string> = {
  'application.new': '{name} applied to {job}.',
  'application.withdrawn': '{name} withdrew their application for {job}.',
  'application.under_review': '{company} is reviewing your application for {job}.',
  'application.shortlisted': 'Your application for {job} was shortlisted.',
  'application.interview': '{company} invited you to an interview for {job}.',
  'application.accepted': 'Congratulations! {company} accepted your application for {job}.',
  'application.rejected': "{company} didn't move forward with your application for {job}.",
  'chat.new': 'New message from {name}.',
  'job.approved': 'Your job “{job}” is now live.',
  'job.rejected': 'Your job “{job}” was rejected: {reason}',
  'job.changes': 'Changes requested for “{job}”: {reason}',
  'job.match': 'New {percent}% match found: {job} at {company}.',
  'system.password_changed': 'Your password was changed. If this wasn’t you, reset it again.',
  'system.welcome.seeker': 'Welcome to Slotwork! Finish your profile so we can match you with jobs that fit your schedule.',
  'system.welcome.employer': 'Welcome to Slotwork! Post your first job to start receiving applications.',
}
export const notificationText = (n: Notification & { kind?: string; params?: Record<string, string | number> }): string => {
  const tpl = n.kind && NOTIFICATION_TEMPLATES[n.kind]
  return tpl ? t(tpl, n.params ?? {}) : n.body
}
