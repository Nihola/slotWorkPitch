import type { ApplicationStatus } from '../types'
/** Shared by the server (which enforces them) and the UI (which uses them to show the right buttons). */
export const FINAL: ApplicationStatus[] = ['accepted', 'rejected', 'withdrawn']
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['under_review', 'shortlisted', 'rejected'], under_review: ['shortlisted', 'rejected'], shortlisted: ['interview', 'accepted', 'rejected'],
  interview: ['accepted', 'rejected'], accepted: [], rejected: [], withdrawn: [],
}
