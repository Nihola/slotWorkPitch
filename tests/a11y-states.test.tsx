// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import App from '../src/App'
import { authService, DEMO_PASSWORD } from '../src/services/authService'
import { bootServer, stopServer } from './serverEnv'

window.scrollTo = () => {}
HTMLCanvasElement.prototype.getContext = (() => null) as never
const T = { timeout: 6000 }
const OPTS = { rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] as axe.ResultType[] }
const mount = async (path: string, heading: RegExp | string) => { render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); await screen.findByRole('heading', { name: heading, level: 1 }, T); await waitFor(() => expect(document.querySelector('.animate-pulse')).toBeNull(), T) }
const found: string[] = []
const scan = async (label: string) => { await act(async () => { await new Promise(r => setTimeout(r, 200)) }); const r = await axe.run(document.body, OPTS); found.push(...r.violations.map(v => `${label} → ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 2).map(n => n.html.slice(0, 150)).join('\n    ')}`)) }
beforeEach(async () => { found.length = 0; await bootServer() }); afterEach(async () => { cleanup(); await stopServer() })
const as = (e: string) => authService.login(e, DEMO_PASSWORD)

describe('axe: interactive states', () => {
  it('seeker dialogs, saved list and form errors', async () => {
    await as('seeker@demo.test'); const u = userEvent.setup()
    await mount('/jobs/j1', 'English tutor')
    await u.click(screen.getByRole('button', { name: 'Save job' })); await scan('job detail (saved)')
    await u.click(screen.getByRole('button', { name: 'Apply now' })); await screen.findByRole('dialog', { name: /Apply/ }); await scan('apply dialog')
    await u.click(screen.getByRole('button', { name: 'Submit application' })); await screen.findByRole('dialog', { name: 'Application submitted successfully' }, T); await scan('application submitted')
    cleanup()
    await mount('/jobs/j3', 'Weekend event staff'); await u.click(screen.getByRole('button', { name: 'Report this job' })); await scan('report dialog')
    await u.click(screen.getByRole('button', { name: 'Send report' })); await screen.findByText('Choose a reason for your report.'); await scan('report dialog with error'); cleanup()
    await mount('/saved', 'Saved jobs'); await screen.findByRole('heading', { name: 'English tutor', level: 3 }, T); await scan('saved jobs with items'); cleanup()
    await mount('/jobs', /Find work/); await u.type(screen.getByRole('searchbox'), 'part-time english after 5pm in tashkent'); await scan('jobs with interpreted chips'); cleanup()
    await mount('/applications/app-demo1', 'Restaurant assistant'); await u.click(screen.getByRole('button', { name: 'Withdraw application' })); await screen.findByRole('dialog'); await scan('withdraw dialog')
    expect(found.join('\n')).toBe('')
  }, 90000)

  it('all six onboarding steps, including validation errors', async () => {
    await as('seeker@demo.test'); const u = userEvent.setup()
    await mount('/onboarding', 'Tell us about you'); await scan('onboarding 1')
    await u.clear(screen.getByLabelText('Headline', { exact: false })); await u.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByText(/short headline/); await scan('onboarding 1 with error')
    await u.type(screen.getByLabelText('Headline', { exact: false }), 'Language student'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'What are you good at?' }); await scan('onboarding 2'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Your background' }); await u.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByText('Choose your education level.'); await scan('onboarding 3 with errors')
    await u.selectOptions(screen.getByLabelText('Education'), 'High school'); await u.selectOptions(screen.getByLabelText('Work experience'), 'No experience yet'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'What kind of work do you want?' }); await u.click(screen.getByLabelText(/Part-time/)); await scan('onboarding 4'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Where are you based?' }); await u.selectOptions(screen.getByLabelText('City'), 'Tashkent'); await scan('onboarding 5'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'When can you work?' }); await scan('onboarding 6'); await u.click(screen.getByRole('button', { name: 'Finish profile' })); await screen.findByRole('heading', { name: 'Your profile is ready!' }, T); await scan('onboarding done')
    expect(found.join('\n')).toBe('')
  }, 90000)

  it('all six job-posting steps (with shift editor and errors), applications dialogs, company form', async () => {
    await as('employer@demo.test'); const u = userEvent.setup()
    await mount('/employer/jobs/new', 'What are you hiring for?')
    await u.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByText('Enter a job title.'); await scan('wizard 1 with errors')
    await u.type(screen.getByLabelText('Job title'), 'Pastry assistant'); await u.selectOptions(screen.getByLabelText('Category'), 'Food & beverage'); await u.selectOptions(screen.getByLabelText('Job type'), 'part-time'); await u.type(screen.getByLabelText('Description'), 'Help prepare pastries early in the morning.'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'How much will you pay?' }); await u.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByText('Enter the pay amount.'); await scan('wizard 2 with errors'); await u.type(screen.getByLabelText('Pay (USD)'), '300'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Where is the work?' }); await u.click(screen.getByLabelText(/On-site/)); await scan('wizard 3'); await u.selectOptions(screen.getByLabelText('City'), 'Tashkent'); await u.type(screen.getByLabelText('Address'), 'Navoi 3'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Who are you looking for?' }); await scan('wizard 4'); await u.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'When is the work?' }); await u.click(screen.getByRole('button', { name: 'Add a shift' })); await u.click(screen.getByRole('button', { name: 'Preview' })); await screen.findByText('Name this shift.'); await scan('wizard 5 with shift error')
    await u.type(screen.getByLabelText('Shift 1 name'), 'Morning'); await u.click(screen.getByRole('button', { name: 'Preview' })); await screen.findByRole('heading', { name: 'Review your listing' }); await scan('wizard 6 preview'); cleanup()
    await mount('/employer/applications', 'Applications'); await screen.findAllByRole('heading', { name: 'Dilnoza K.', level: 2 }, T); await scan('applications list')
    await u.click(screen.getByRole('button', { name: 'Invite to interview: Dilnoza K.' })); await screen.findByRole('dialog'); await scan('interview dialog'); cleanup()
    await mount('/employer/company', 'Osh Markaz'); await u.type(screen.getByLabelText(/Website/), 'bad'); await u.click(screen.getByRole('button', { name: 'Save company profile' })); await screen.findByText(/starting with http/); await scan('company form with error')
    expect(found.join('\n')).toBe('')
  }, 120000)

  it('admin review decision forms and reports', async () => {
    await as('admin@demo.test'); const u = userEvent.setup()
    await mount('/admin/moderation/j8', /EARN/); await scan('review')
    await u.click(screen.getByRole('button', { name: 'Reject' })); await u.click(screen.getByRole('button', { name: 'Confirm rejection' })); await screen.findByText(/at least 10 characters/); await scan('review reject with error')
    await u.click(screen.getByRole('button', { name: 'Cancel' })); await u.click(screen.getByRole('button', { name: 'Approve' })); await screen.findByText(/Confirm that you reviewed/); await scan('review approve blocked'); cleanup()
    await mount('/admin/reports', 'Reports'); await screen.findAllByRole('listitem'); await scan('reports')
    expect(found.join('\n')).toBe('')
  }, 90000)
})
