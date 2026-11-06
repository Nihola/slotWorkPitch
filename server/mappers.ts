import type { Application, Conversation, CompanyProfile, Job, JobSeeker, ModerationEntry, Notification, Report, User } from '../src/types'

export interface UserRow { id: string; email: string; name: string; role: User['role']; pw_hash: string; onboarded: number; profile: string | null; company: string | null; created_at: string }
export const toUser = (r: UserRow): User => ({ id: r.id, name: r.name, email: r.email, role: r.role })
export const toSession = (r: UserRow) => ({ user: toUser(r), profile: r.profile ? (JSON.parse(r.profile) as JobSeeker) : null, onboarded: !!r.onboarded, company: r.company ? (JSON.parse(r.company) as CompanyProfile) : null })

export interface JobRow { id: string; employer_id: string; moderation: Job['moderation']; moderation_note: string | null; posted_at: string; data: string }
export const toJob = (r: JobRow): Job => ({ ...JSON.parse(r.data), id: r.id, employerId: r.employer_id, moderation: r.moderation, moderationNote: r.moderation_note ?? undefined, postedAt: r.posted_at })

export interface AppRow { id: string; job_id: string; seeker_id: string; employer_id: string; status: Application['status']; created_at: string; updated_at: string; data: string }
export const toApplication = (r: AppRow): Application => ({ ...JSON.parse(r.data), id: r.id, jobId: r.job_id, seekerId: r.seeker_id, employerId: r.employer_id, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at })

export interface ConvRow { id: string; application_id: string; job_id: string; job_title: string; company: string; shift_label: string | null; seeker_id: string; seeker_name: string; employer_id: string; last_message: string; last_at: string; unread_seeker: number; unread_employer: number }
export const toConversation = (r: ConvRow): Conversation => ({ id: r.id, applicationId: r.application_id, jobId: r.job_id, jobTitle: r.job_title, company: r.company, shiftLabel: r.shift_label ?? undefined, seekerId: r.seeker_id, seekerName: r.seeker_name, employerId: r.employer_id, lastMessage: r.last_message, lastAt: r.last_at, unread: { [r.seeker_id]: r.unread_seeker, [r.employer_id]: r.unread_employer } })

export interface NotifRow { id: string; user_id: string; category: Notification['category']; kind: string; params: string; body: string; link: string | null; ref: string | null; read: number; created_at: string }
export const toNotification = (r: NotifRow): Notification & { kind: string; params: Record<string, string | number> } => ({ id: r.id, userId: r.user_id, category: r.category, kind: r.kind, params: JSON.parse(r.params), body: r.body, createdAt: r.created_at, read: !!r.read, link: r.link ?? undefined, ref: r.ref ?? undefined })

export interface ReportRow { id: string; target_id: string; reason: Report['reason']; details: string | null; reporter_id: string; status: Report['status']; created_at: string }
export const toReport = (r: ReportRow): Report => ({ id: r.id, targetType: 'job', targetId: r.target_id, reason: r.reason, details: r.details ?? undefined, reporterId: r.reporter_id, createdAt: r.created_at, status: r.status })

export interface LogRow { id: string; job_id: string; job_title: string; action: ModerationEntry['action']; reason: string | null; actor_id: string; actor_name: string; at: string }
export const toLog = (r: LogRow): ModerationEntry => ({ id: r.id, jobId: r.job_id, jobTitle: r.job_title, action: r.action, reason: r.reason ?? undefined, actorId: r.actor_id, actorName: r.actor_name, at: r.at })
