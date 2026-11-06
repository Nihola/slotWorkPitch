export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'
export type Role = 'seeker' | 'employer' | 'admin'
export type VerificationLevel = 'unverified' | 'identity' | 'business' | 'trusted'
export type JobType = 'one-time' | 'short-term' | 'part-time' | 'full-time' | 'shift-based' | 'remote'
export type SlotKind = 'available' | 'preferred'
export type ApplicationStatus = 'submitted' | 'under_review' | 'shortlisted' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'

export interface User { id: string; name: string; email: string; role: Role; avatarUrl?: string }
export interface Availability { id: string; dayOfWeek: number; startHour: number; endHour: number; kind: SlotKind }
export interface JobSeeker extends User { headline: string; city: string; district: string; skills: string[]; languages: string[]; availability: Availability[]; rating: number
  education?: string; experience?: string; jobTypes?: JobType[]; remoteOk?: boolean; flexible?: boolean; availableFrom?: string; availableUntil?: string }
export interface Employer extends User { companyName: string; verification: VerificationLevel; industry: string; rating: number }
export interface Shift { id: string; label: string; startHour: number; endHour: number }
export interface JobSchedule { days: number[]; startHour: number; endHour: number; flexible: boolean; shifts: Shift[] }
export interface Job {
  id: string; title: string; employerId: string; company: string; verification: VerificationLevel
  city: string; district: string; type: JobType; salaryMin: number; salaryMax: number; salaryPeriod: 'hour' | 'day' | 'month'
  skills: string[]; schedule: JobSchedule; postedAt: string; moderation: ModerationStatus; moderationNote?: string
  description?: string; category?: string; positions?: number; address?: string; workMode?: 'on-site' | 'hybrid' | 'remote'
  experience?: string; education?: string; languages?: string[]; paymentFrequency?: string
}
export type NewJob = Omit<Job, 'id' | 'postedAt' | 'moderation' | 'moderationNote'>
export interface ModerationEntry { id: string; jobId: string; jobTitle: string; action: 'approve' | 'reject' | 'request_changes' | 'resubmit'; reason?: string; actorId: string; actorName: string; at: string }
export interface MatchScore { overall: number; skills: number; schedule: number; location: number; experience: number; preferences: number; uncoveredHours: number }
export interface Report { id: string; targetType: 'job' | 'employer' | 'user'; targetId: string; reason: 'scam' | 'fake_employer' | 'misleading' | 'inappropriate' | 'harassment' | 'payment_scam' | 'other'; details?: string; reporterId: string; createdAt: string; status: 'open' | 'resolved' | 'dismissed' }

export interface StatusEvent { status: ApplicationStatus; at: string; note?: string }
export interface Application {
  id: string; jobId: string; jobTitle: string; company: string; employerId: string; seekerId: string; candidate: JobSeeker
  shiftId?: string; shiftLabel?: string; shiftStart?: number; shiftEnd?: number; message?: string
  status: ApplicationStatus; createdAt: string; updatedAt: string; history: StatusEvent[]; conversationId: string
}
export interface Conversation {
  id: string; applicationId: string; jobId: string; jobTitle: string; company: string; shiftLabel?: string
  seekerId: string; seekerName: string; employerId: string; lastMessage: string; lastAt: string; unread: Record<string, number>
}
export interface Message { id: string; conversationId: string; senderId: string; senderName: string; body: string; sentAt: string }
export type NotificationCategory = 'applications' | 'messages' | 'jobs' | 'interviews' | 'system'
export interface Notification { id: string; userId: string; category: NotificationCategory; body: string; createdAt: string; read: boolean; link?: string; ref?: string }
export interface CompanyProfile { name: string; industry: string; city: string; website: string; description: string }
