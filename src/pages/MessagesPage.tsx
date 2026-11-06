import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { applicationService } from '../services/applicationService'
import { ChatError, conversationService } from '../services/conversationService'
import { relativeTime } from '../utils/time'
import StatusBadge from '../components/StatusBadge'
import type { Application, Conversation, Message } from '../types'
import { t as tr } from '../i18n'

const POLL_MS = 4000
export default function MessagesPage() {
  const { session } = useAuth()
  const user = session!.user
  const employer = user.role === 'employer'
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const sel = params.get('c')
  const [convs, setConvs] = useState<Conversation[] | null>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [app, setApp] = useState<Application | null>(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    const list = await conversationService.list(); setConvs(list)
    const c = sel ? list.find(x => x.id === sel) : undefined
    if (!c) { setMsgs([]); setApp(null); return }
    const [m, a] = await Promise.all([conversationService.messages(c.id), applicationService.get(c.applicationId)])
    setMsgs(m); setApp(a ?? null)
  }, [sel])
  // New messages from the other side arrive by polling; our own actions refresh immediately.
  useEffect(() => {
    refresh().catch(() => { /* keep what we have */ })
    const quiet = () => { refresh().catch(() => undefined) }, t = setInterval(() => { if (!document.hidden) quiet() }, POLL_MS)
    window.addEventListener('slotwork:data', quiet); window.addEventListener('focus', quiet)
    return () => { clearInterval(t); window.removeEventListener('slotwork:data', quiet); window.removeEventListener('focus', quiet) }
  }, [refresh])
  useEffect(() => { if (sel) conversationService.markRead(sel) }, [sel, msgs.length])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [msgs.length, sel])

  const conv = convs?.find(c => c.id === sel)
  const who = (c: Conversation) => (employer ? c.seekerName : c.company)
  const send = async () => {
    if (!sel || busy) return
    setBusy(true); setErr('')
    try { await conversationService.send(sel, text); setText(''); await refresh() }
    catch (e) { setErr(e instanceof ChatError ? e.message : tr("We couldn't send your message. Please try again.")) }
    finally { setBusy(false) }
  }
  const empty = employer ? 'Your conversations with candidates will appear here.' : 'Your conversations with employers will appear here.'
  const box = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#131839]'

  return (
    <div className="grid gap-4 pb-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{tr('Messages')}</h1>
      {convs === null ? <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" /> : convs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><p className="font-bold">{empty}</p><p className="text-muted">{employer ? tr('Candidates can message you once they apply.') : tr('Apply to a job to start a conversation.')}</p>
          {!employer && <Link to="/jobs" className="mt-3 inline-block font-bold text-brandfg">{tr('Find jobs')}</Link>}</div>
      ) : (
        <div className="grid gap-4 md:h-[620px] md:grid-cols-[300px_1fr]">
          <nav aria-label={tr('Conversations')} className={`${box} overflow-y-auto ${sel ? 'hidden md:block' : 'block'}`}>
            <ul>{convs.map(c => { const n = c.unread[user.id] ?? 0; return (
              <li key={c.id}><button onClick={() => setParams({ c: c.id })} aria-current={c.id === sel}
                className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left last:border-0 dark:border-slate-800 ${c.id === sel ? 'bg-brand/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet font-bold text-white" aria-hidden="true">{who(c)[0]}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="truncate text-sm">{who(c)}</b><span className="shrink-0 text-[11px] text-muted">{relativeTime(c.lastAt)}</span></span>
                  <span className="block truncate text-xs text-muted">{c.jobTitle}{c.shiftLabel ? ` · ${c.shiftLabel}` : ''}</span><span className="block truncate text-sm text-slate-600 dark:text-slate-300">{c.lastMessage}</span></span>
                {n > 0 && <span className="mt-1 rounded-full bg-redfill px-1.5 text-[10px] font-extrabold text-white">{n}<span className="sr-only"> {tr('unread')}</span></span>}</button></li>) })}</ul>
          </nav>
          <section aria-label={tr('Conversation')} className={`${box} min-h-[480px] flex-col overflow-hidden ${sel ? 'flex' : 'hidden md:flex'}`}>
            {!conv ? (<div className="m-auto p-8 text-center"><p className="font-bold">{sel ? tr('We couldn’t find that conversation.') : tr('Select a conversation')}</p><p className="text-sm text-muted">{sel ? '' : tr('Pick one from the list to read and reply.')}</p>
              {sel && <button onClick={() => setParams({})} className="mt-2 font-bold text-brandfg">{tr('Back to conversations')}</button>}</div>) : (<>
              <header className="flex items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
                <button onClick={() => setParams({})} aria-label={tr('Back to conversations')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 md:hidden dark:border-slate-700"><ArrowLeft size={16} /></button>
                <div className="min-w-0"><h2 className="truncate font-bold">{who(conv)}</h2><p className="truncate text-xs text-muted">{conv.jobTitle}{conv.shiftLabel ? ` · ${conv.shiftLabel} shift` : ''}</p></div></header>
              {app && <div aria-label={tr('Application context')} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-lav px-3 py-2 text-xs dark:bg-slate-800/60"><b>{tr('Application')}</b><span>{app.jobTitle}</span>{app.shiftLabel && <span>{app.shiftLabel} {app.shiftStart}:00–{app.shiftEnd}:00</span>}<StatusBadge status={app.status} />
                <Link to={employer ? '/employer/applications' : `/applications/${app.id}`} className="ml-auto font-bold text-brandfg">{tr('View application')}</Link></div>}
              <div role="log" aria-live="polite" aria-label={tr('Messages')} className="flex-1 space-y-3 overflow-y-auto p-4">
                {msgs.map(m => { const mine = m.senderId === user.id; return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-1 text-[10px] ${mine ? 'text-white' : 'text-muted'}`}>{mine ? tr('You') : m.senderName} · {relativeTime(m.sentAt)}</p></div></div>) })}
                <div ref={end} /></div>
              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                {err && <p role="alert" className="mb-2 text-xs font-semibold text-redfg">{err}</p>}
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => toast(tr("Attachments aren't available in this prototype yet."))} aria-label={tr('Attach a file')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Paperclip size={18} /></button>
                  <label htmlFor="composer" className="sr-only">{tr('Type a message')}</label>
                  <textarea id="composer" rows={1} value={text} onChange={e => { setText(e.target.value); setErr('') }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder={tr('Type a message…')} className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm dark:border-slate-600" />
                  <button type="button" onClick={send} disabled={busy} aria-label={tr('Send message')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-50"><Send size={18} /></button></div>
                <p className="mt-1 text-[11px] text-muted">{tr('Enter to send, Shift+Enter for a new line.')}</p></div></>)}
          </section>
        </div>
      )}
    </div>
  )
}
