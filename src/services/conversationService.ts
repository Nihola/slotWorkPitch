import { api, asDomain } from '../api/client'
import type { Conversation, Message } from '../types'
export class ChatError extends Error {}
const rej = asDomain(ChatError)
export const conversationService = {
  list: (): Promise<Conversation[]> => api('GET', '/conversations'),
  messages: (id: string): Promise<Message[]> => api<Message[]>('GET', `/conversations/${encodeURIComponent(id)}/messages`).catch(rej),
  send: (id: string, body: string): Promise<Message> => api<Message>('POST', `/conversations/${encodeURIComponent(id)}/messages`, { body }).catch(rej),
  markRead: async (id: string) => { await api('POST', `/conversations/${encodeURIComponent(id)}/read`).catch(() => undefined) },
}
