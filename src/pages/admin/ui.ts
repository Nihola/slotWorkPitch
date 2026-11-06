export const card = 'rounded-2xl border border-white/10 bg-[#0F1430] p-5'
export const btnPrimary = 'rounded-xl bg-gradient-to-br from-brand to-violet px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export const btnGhost = 'rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/5 disabled:opacity-50'
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const STATUS_LABEL = { pending: 'Pending review', approved: 'Live', rejected: 'Rejected', changes_requested: 'Changes requested' } as const
export const STATUS_CLS = { pending: 'bg-amber-500/15 text-amberfg', approved: 'bg-emerald-500/15 text-mintfg', rejected: 'bg-red-500/15 text-redfg', changes_requested: 'bg-sky-500/15 text-skyfg' } as const
export const ACTION_LABEL = { approve: 'Approved', reject: 'Rejected', request_changes: 'Requested changes', resubmit: 'Resubmitted by employer' } as const
