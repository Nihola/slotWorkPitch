// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import App from '../src/App'
import { authService, DEMO_PASSWORD } from '../src/services/authService'
import { bootServer, stopServer } from './serverEnv'

window.scrollTo = () => {}
HTMLCanvasElement.prototype.getContext = (() => null) as never // jsdom has no canvas; silences axe's icon-ligature probe
// jsdom has no layout engine, so colour contrast is verified separately with real WCAG math.
const OPTS = { rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] as axe.ResultType[] }

async function scan(path: string) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  await waitFor(() => { expect(document.querySelector('h1')).toBeTruthy(); expect(document.querySelector('.animate-pulse')).toBeNull() }, { timeout: 6000 })
  await act(async () => { await new Promise(r => setTimeout(r, 350)) })
  const res = await axe.run(document.body, OPTS)
  return res.violations.map(v => `${path} → ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 2).map(n => n.html.slice(0, 140)).join('\n    ')}`)
}
const check = (paths: string[]) => async () => {
  const found: string[] = []
  for (const p of paths) { found.push(...(await scan(p))); cleanup() }
  expect(found.join('\n')).toBe('')
}
afterEach(cleanup)

describe('axe accessibility scan: no violations on any page', () => {
  describe('public', () => {
    beforeAll(bootServer); afterAll(stopServer)
    it('landing, sign in, register, forgot password', check(['/', '/login', '/register', '/register?role=employer', '/forgot-password']), 40000)
  })
  describe('job seeker', () => {
    beforeAll(async () => { await bootServer(); await authService.login('seeker@demo.test', DEMO_PASSWORD) }); afterAll(stopServer)
    it('all seeker pages', check(['/dashboard', '/jobs', '/jobs/j1', '/saved', '/applications', '/applications/app-demo1', '/messages?c=c-app-demo1', '/messages', '/notifications', '/profile', '/settings', '/onboarding']), 120000)
  })
  describe('employer', () => {
    beforeAll(async () => { await bootServer(); await authService.login('employer@demo.test', DEMO_PASSWORD) }); afterAll(stopServer)
    it('all employer pages', check(['/employer', '/employer/jobs', '/employer/jobs/new', '/employer/jobs/j2', '/employer/applications', '/employer/messages?c=c-app-demo1', '/employer/notifications', '/employer/company', '/settings']), 120000)
  })
  describe('admin', () => {
    beforeAll(async () => { await bootServer(); await authService.login('admin@demo.test', DEMO_PASSWORD) }); afterAll(stopServer)
    it('all admin pages', check(['/admin', '/admin/moderation', '/admin/moderation/j8', '/admin/reports', '/admin/jobs', '/admin/users', '/admin/analytics']), 90000)
  })
})
