import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Ctx } from '../context'
import { all, get, run, tx } from '../db'
import { bad, notFound, parse } from '../http'
import { requireAuth } from '../auth'
import { messageSchema } from '../schemas'
import { toConversation, type ConvRow } from '../mappers'
import { notify } from '../notify'
import type { Message } from '../../src/types'

export function chatRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx
  r.use(requireAuth)
  /** A conversation is visible only to its two participants. Anyone else gets "not found". */
  const mine = (id: string, uid: string) => { const c = get<ConvRow>(db, 'SELECT * FROM conversations WHERE id = ? AND (seeker_id = ?2 OR employer_id = ?2)', id, uid); if (!c) throw notFound('Conversation not found.'); return c }
  r.get('/', (req, res) => res.json(all<ConvRow>(db, 'SELECT * FROM conversations WHERE seeker_id = ?1 OR employer_id = ?1 ORDER BY last_at DESC', req.user!.id).map(toConversation)))
  r.get('/:id/messages', (req, res) => {
    const c = mine(String(req.params.id), req.user!.id)
    res.json(all<{ id: string; conversation_id: string; sender_id: string; sender_name: string; body: string; sent_at: string }>(db, 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at, rowid LIMIT 1000', c.id)
      .map((m): Message => ({ id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, senderName: m.sender_name, body: m.body, sentAt: m.sent_at })))
  })
  r.post('/:id/messages', (req, res) => {
    const c = mine(String(req.params.id), req.user!.id), body = parse(messageSchema, req.body).body.trim()
    if (!body) throw bad('Write a message first.')
    const me = req.user!, now = new Date(ctx.now()).toISOString(), id = randomUUID(), toEmployer = me.id === c.seeker_id
    tx(db, () => {
      run(db, 'INSERT INTO messages (id, conversation_id, sender_id, sender_name, body, sent_at) VALUES (?,?,?,?,?,?)', id, c.id, me.id, me.name, body, now)
      run(db, `UPDATE conversations SET last_message = ?, last_at = ?, ${toEmployer ? 'unread_employer = unread_employer + 1' : 'unread_seeker = unread_seeker + 1'} WHERE id = ?`, body, now, c.id)
      notify(db, { userId: toEmployer ? c.employer_id : c.seeker_id, category: 'messages', kind: 'chat.new', params: { name: me.name }, body: `New message from ${me.name}.`, link: `/${toEmployer ? 'employer/' : ''}messages?c=${c.id}`, ref: c.id }, now)
    })
    res.status(201).json({ id, conversationId: c.id, senderId: me.id, senderName: me.name, body, sentAt: now } satisfies Message)
  })
  r.post('/:id/read', (req, res) => {
    const c = mine(String(req.params.id), req.user!.id)
    run(db, `UPDATE conversations SET ${req.user!.id === c.seeker_id ? 'unread_seeker' : 'unread_employer'} = 0 WHERE id = ?`, c.id)
    res.status(204).end()
  })
  return r
}
