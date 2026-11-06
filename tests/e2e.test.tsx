// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { bootServer, stopServer, server, clearCookies, jar } from './serverEnv'
import { jobBody, newUser, EMPLOYER } from '../server/tests/helpers'

const T = { timeout: 4000 }
const GREET = /^Good (morning|afternoon|evening),/
window.scrollTo = () => {} // not implemented in jsdom
const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const mountReady = async (path: string, heading: string) => { mount(path); await screen.findByRole('heading', { name: heading }, { timeout: 4000 }) }
beforeEach(async () => { cleanup(); await bootServer() })
afterEach(async () => { cleanup(); await stopServer() })

const click = (u: ReturnType<typeof userEvent.setup>, name: string | RegExp) => u.click(screen.getByRole('button', { name }))
async function login(u: ReturnType<typeof userEvent.setup>, who: string) {
  await u.click(await screen.findByRole('button', { name: who }))
  await u.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('role-based routing', () => {
  it('anonymous visitor to /jobs is sent to login', async () => {
    mount('/jobs')
    expect(await screen.findByRole('heading', { name: 'Welcome back' }, T)).toBeTruthy()
  })
  it('seeker logs in, lands on jobs with ranked cards, and is bounced from employer/admin', async () => {
    const u = userEvent.setup(); mount('/login'); await login(u, 'Job seeker')
    expect(await screen.findByText('English tutor', {}, T)).toBeTruthy()
    cleanup(); mount('/employer')
    await waitFor(() => expect(screen.getByText('English tutor')).toBeTruthy(), T)
    cleanup(); mount('/admin')
    await waitFor(() => expect(screen.getByText('English tutor')).toBeTruthy(), T)
  })
  it('employer lands on coverage and cannot open seeker pages', async () => {
    const u = userEvent.setup(); mount('/login'); await login(u, 'Employer')
    expect(await screen.findByRole('heading', { name: GREET, level: 1 }, T)).toBeTruthy()
    cleanup(); mount('/jobs')
    expect(await screen.findByRole('heading', { name: GREET, level: 1 }, T)).toBeTruthy()
  })
  it('admin lands on admin overview', async () => {
    const u = userEvent.setup(); mount('/login'); await login(u, 'Admin')
    expect(await screen.findByRole('heading', { name: 'Admin overview' }, T)).toBeTruthy()
  })
  it('wrong password shows an error and stays on login', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back')
    await u.type(screen.getByLabelText('Email'), 'seeker@demo.test'); await u.type(screen.getByLabelText('Password'), 'wrongpass1')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email or password is incorrect.', {}, T)).toBeTruthy()
  })
  it('logging out returns to the public home and protects routes again', async () => {
    const u = userEvent.setup(); mount('/login'); await login(u, 'Job seeker'); await screen.findByText('English tutor', {}, T)
    await u.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('link', { name: 'Find a job' }, T)).toBeTruthy()
  })
})

describe('register + onboarding', () => {
  it('new seeker completes all 6 steps and reaches ranked jobs', async () => {
    const u = userEvent.setup(); await mountReady('/register', 'Create your account')
    await u.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Choose what you are looking for.')).toBeTruthy()
    await u.click(screen.getByLabelText(/Job seeker/))
    await u.type(screen.getByLabelText('Full name'), 'Zarina K'); await u.type(screen.getByLabelText('Email'), 'zarina@test.uz'); await u.type(screen.getByLabelText('Password'), 'longenough1')
    await u.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Tell us about you' }, T)).toBeTruthy()

    // validation blocks empty step; jobs route is still guarded
    await u.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/Add a short headline/)).toBeTruthy()
    await u.type(screen.getByLabelText('Headline', { exact: false }), 'Language student'); await u.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'What are you good at?' })
    await u.click(screen.getByRole('button', { name: 'Continue' })); expect(await screen.findByText('Pick or add at least one skill.')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'English' })); await u.click(screen.getByRole('button', { name: 'Teaching' }))
    await u.type(screen.getByLabelText('Add another skill'), 'Tutoring{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Tutoring' })).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'Your background' })
    await u.selectOptions(screen.getByLabelText('Education'), 'Bachelor student'); await u.selectOptions(screen.getByLabelText('Work experience'), 'Under 1 year')
    await u.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'What kind of work do you want?' })
    await u.click(screen.getByRole('button', { name: 'Continue' })); expect(await screen.findByText('Choose at least one job type.')).toBeTruthy()
    await u.click(screen.getByLabelText(/Part-time/)); await u.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'Where are you based?' })
    await u.click(screen.getByRole('button', { name: 'Continue' })); expect(await screen.findByText('Choose your city.')).toBeTruthy()
    await u.selectOptions(screen.getByLabelText('City'), 'Tashkent'); await u.type(screen.getByLabelText(/District/), 'Chilonzor'); await u.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'When can you work?' })
    await u.click(screen.getByRole('button', { name: 'Finish profile' })); expect(await screen.findByText('Mark at least one hour you can work.')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: '+ Weekday evenings' }))
    expect(screen.getByText('20 hours per week marked')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Finish profile' }))
    expect(await screen.findByRole('heading', { name: 'Your profile is ready!' }, T)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'See jobs that fit' }))
    expect(await screen.findByText('Evening barista', {}, T)).toBeTruthy()
    // part-time English tutor must be ranked above non-preferred jobs
    const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    expect(titles.indexOf('Evening barista')).toBeLessThan(titles.indexOf('Weekend event staff'))
  })
  it('un-onboarded seeker is held at /onboarding and resumes after reload', async () => {
    const u = userEvent.setup(); await mountReady('/register', 'Create your account')
    await u.click(screen.getByLabelText(/Job seeker/)); await u.type(screen.getByLabelText('Full name'), 'Aziz'); await u.type(screen.getByLabelText('Email'), 'aziz@test.uz'); await u.type(screen.getByLabelText('Password'), 'longenough1')
    await u.click(screen.getByRole('button', { name: 'Create account' })); await screen.findByRole('heading', { name: 'Tell us about you' }, T)
    cleanup(); mount('/jobs')   // simulates typing the URL / reloading: session restored from storage
    expect(await screen.findByRole('heading', { name: 'Tell us about you' }, T)).toBeTruthy()
  })
  it('employer registration skips onboarding', async () => {
    const u = userEvent.setup(); await mountReady('/register?role=employer', 'Create your account')
    await u.type(screen.getByLabelText('Company or contact name'), 'Qahva Lab'); await u.type(screen.getByLabelText('Email'), 'hr@qahva.uz'); await u.type(screen.getByLabelText('Password'), 'longenough1')
    await u.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: GREET, level: 1 }, T)).toBeTruthy()
  })
})

describe('employer job wizard', () => {
  it('lists existing jobs, validates every step, submits as pending, and keeps it hidden from seekers', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Employer')
    await screen.findByRole('heading', { name: GREET, level: 1 }, T)

    // employer's own job list (seeded Osh Markaz job is live)
    await u.click(screen.getByRole('link', { name: 'Jobs' }))
    expect(await screen.findByRole('heading', { name: 'Restaurant assistant' }, T)).toBeTruthy()
    expect(screen.getAllByText('Live').length).toBe(6)

    await u.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Post a job' }))
    await screen.findByRole('heading', { name: 'What are you hiring for?' })
    await click(u, 'Continue')
    for (const m of ['Enter a job title.', 'Choose a category.', 'Choose a job type.', /at least 20 characters/]) expect(await screen.findByText(m)).toBeTruthy()
    await u.type(screen.getByLabelText('Job title'), 'Pastry assistant')
    await u.selectOptions(screen.getByLabelText('Category'), 'Food & beverage'); await u.selectOptions(screen.getByLabelText('Job type'), 'part-time')
    await u.type(screen.getByLabelText('Description'), 'Prepare coffee and welcome guests during the evening rush.')
    await u.clear(screen.getByLabelText('Number of positions')); await u.type(screen.getByLabelText('Number of positions'), '0'); await click(u, 'Continue')
    expect(await screen.findByText('Enter a whole number from 1 to 500.')).toBeTruthy()
    await u.clear(screen.getByLabelText('Number of positions')); await u.type(screen.getByLabelText('Number of positions'), '2'); await click(u, 'Continue')

    await screen.findByRole('heading', { name: 'How much will you pay?' })
    await click(u, 'Continue'); expect(await screen.findByText('Enter the pay amount.')).toBeTruthy()
    await u.type(screen.getByLabelText('Pay (USD)'), '300'); await u.type(screen.getByLabelText('Up to (optional)'), '200'); await click(u, 'Continue')
    expect(await screen.findByText('The maximum must be at least the minimum.')).toBeTruthy()
    await u.clear(screen.getByLabelText('Up to (optional)')); await u.type(screen.getByLabelText('Up to (optional)'), '400')
    await u.selectOptions(screen.getByLabelText('Payment frequency'), 'Weekly'); await click(u, 'Continue')

    await screen.findByRole('heading', { name: 'Where is the work?' })
    await click(u, 'Continue'); expect(await screen.findByText('Choose where the work happens.')).toBeTruthy()
    await u.click(screen.getByLabelText(/On-site/)); await click(u, 'Continue')
    expect(await screen.findByText('Choose a city.')).toBeTruthy(); expect(screen.getByText(/Add the address/)).toBeTruthy()
    await u.selectOptions(screen.getByLabelText('City'), 'Tashkent'); await u.type(screen.getByLabelText('Address'), 'Shota Rustaveli 10'); await click(u, 'Continue')

    await screen.findByRole('heading', { name: 'Who are you looking for?' })
    await u.click(screen.getByRole('button', { name: 'Coffee' })); await u.click(within(screen.getByRole('group', { name: 'Languages' })).getByRole('button', { name: 'Russian' })); await click(u, 'Continue')

    await screen.findByRole('heading', { name: 'When is the work?' })
    await u.click(screen.getByRole('button', { name: 'Fri' })); await u.click(screen.getByRole('button', { name: 'Mon' })); await u.click(screen.getByRole('button', { name: 'Tue' }))
    await u.click(screen.getByRole('button', { name: 'Wed' })); await u.click(screen.getByRole('button', { name: 'Thu' }))
    await click(u, 'Preview'); expect(await screen.findByText('Choose at least one working day.')).toBeTruthy()
    for (const d of ['Mon', 'Tue']) await u.click(screen.getByRole('button', { name: d }))
    await u.click(screen.getByRole('button', { name: 'Add a shift' })); await click(u, 'Preview')
    expect(await screen.findByText('Name this shift.')).toBeTruthy()
    await u.type(screen.getByLabelText('Shift 1 name'), 'Evening'); await click(u, 'Preview')

    await screen.findByRole('heading', { name: 'Review your listing' })
    expect(screen.getByText(/Mon, Tue · 09:00–18:00/)).toBeTruthy(); expect(screen.getByText(/\$300–400 per month, paid weekly/)).toBeTruthy()
    expect(screen.getByText(/Evening 09:00–13:00/)).toBeTruthy(); expect(screen.getByText(/Every listing is reviewed/)).toBeTruthy()
    await click(u, 'Back'); await screen.findByRole('heading', { name: 'When is the work?' }); await click(u, 'Preview'); await screen.findByRole('heading', { name: 'Review your listing' })
    await click(u, 'Submit for review')
    expect(await screen.findByRole('heading', { name: 'Submitted for review' }, T)).toBeTruthy()

    await u.click(screen.getByRole('link', { name: 'View my jobs' }))
    expect(await screen.findByRole('heading', { name: 'Pastry assistant' }, T)).toBeTruthy()
    expect(screen.getByText('Pending review')).toBeTruthy(); expect(screen.getByText(/2 positions/)).toBeTruthy()

    // seekers never see a pending job
    await u.click(screen.getByRole('button', { name: 'Log out' })); cleanup()
    await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await screen.findByText('English tutor', {}, T); await toJobs(u)
    expect(screen.queryByText('Pastry assistant')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(6)
  })
  it('a seeker cannot open the wizard and a fresh employer sees the empty state', async () => {
    const u = userEvent.setup(); await mountReady('/register?role=employer', 'Create your account')
    await u.type(screen.getByLabelText('Company or contact name'), 'New Co'); await u.type(screen.getByLabelText('Email'), 'new@co.uz'); await u.type(screen.getByLabelText('Password'), 'longenough1')
    await click(u, 'Create account'); await screen.findByRole('heading', { name: GREET, level: 1 }, T)
    await u.click(screen.getByRole('link', { name: 'Jobs' }))
    expect(await screen.findByText("You haven't posted any jobs yet.", {}, T)).toBeTruthy()
    await click(u, 'Log out'); cleanup()
    await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker'); await screen.findByText('English tutor', {}, T)
    cleanup(); mount('/employer/jobs/new')
    await waitFor(() => expect(screen.getByText('English tutor')).toBeTruthy(), T)
  })
})

const toJobs = async (u: ReturnType<typeof userEvent.setup>) => { await u.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Find jobs' })); await screen.findByText(/opportunit(y|ies)$/, {}, T) }
const signOut = () => { cleanup(); clearCookies() }
const adminNav = (name: string) => within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', { name })
const titles = (level: number) => screen.getAllByRole('heading', { level }).map(h => h.textContent)

describe('admin moderation', () => {
  it('queue is ordered by risk; decisions enforce reasons and risk acknowledgement; approval publishes to seekers', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Admin')
    await screen.findByRole('heading', { name: 'Admin overview' }, T)
    expect(await screen.findByText('Needs your attention', {}, T)).toBeTruthy()

    await u.click(adminNav('Moderation'))
    await screen.findByRole('heading', { name: 'Moderation queue' }); await screen.findByText('Delivery helper', {}, T)
    expect(titles(2)).toEqual(['EARN $3000 PER WEEK - NO EXPERIENCE NEEDED!!!', 'Delivery helper', 'Restaurant worker'])
    expect(screen.getAllByText('High risk').length).toBeGreaterThan(0)
    await u.click(screen.getByRole('button', { name: /^high \(1\)/ })); expect(titles(2)).toEqual(['EARN $3000 PER WEEK - NO EXPERIENCE NEEDED!!!'])
    await u.click(screen.getByRole('button', { name: /^low \(1\)/ })); expect(titles(2)).toEqual(['Restaurant worker'])
    await u.click(screen.getByRole('button', { name: /^All/ }))

    // high-risk review: dossier, acknowledgement, reason rules
    await u.click(screen.getByRole('link', { name: /Review EARN/ }))
    await screen.findByRole('heading', { name: /EARN \$3000/, level: 1 }, T)
    expect(await screen.findByText('Mentions fees, deposits or guaranteed earnings')).toBeTruthy()
    expect(screen.getByText('2 open reports from users')).toBeTruthy(); expect(screen.getByText('Payment scam')).toBeTruthy()
    expect(screen.getByText('No previous moderation actions.')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText(/Confirm that you reviewed the risk signals/)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Reject' }))
    await u.type(screen.getByLabelText('Reason for rejection'), 'too short'); await u.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(await screen.findByText(/at least 10 characters/)).toBeTruthy()
    await u.clear(screen.getByLabelText('Reason for rejection')); await u.type(screen.getByLabelText('Reason for rejection'), 'Asks candidates to pay a registration fee.')
    await u.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    await screen.findByRole('heading', { name: 'Moderation queue' }, T); await screen.findByText('Delivery helper', {}, T)
    expect(titles(2)).toEqual(['Delivery helper', 'Restaurant worker'])
    await u.click(screen.getByRole('tab', { name: 'Reviewed' }))
    expect(await screen.findByText('Rejected')).toBeTruthy(); expect(screen.getByText(/registration fee/)).toBeTruthy()

    // approve a medium-risk job: no acknowledgement needed, and it appears for seekers
    await u.click(screen.getByRole('tab', { name: /Pending/ }))
    await u.click(screen.getByRole('link', { name: 'Review Delivery helper' }))
    await screen.findByRole('heading', { name: 'Delivery helper', level: 1 }, T)
    await u.click(screen.getByRole('button', { name: 'Approve' }))
    await screen.findByRole('heading', { name: 'Moderation queue' }, T); await screen.findByText('Restaurant worker', {}, T)
    expect(titles(2)).toEqual(['Restaurant worker'])

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await screen.findByText('English tutor', {}, T); await toJobs(u)
    expect(screen.getByText('Delivery helper')).toBeTruthy(); expect(screen.queryByText('Restaurant worker')).toBeNull(); expect(screen.queryByText(/EARN \$3000/)).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(7)
  })

  it('request changes -> employer sees the note, edits, resubmits -> back in the admin queue with history', async () => {
    const emp = await server.as(EMPLOYER); const posted = (await emp.post('/api/employer/jobs', jobBody({ title: 'Pastry assistant' }))).body
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Admin')
    await u.click(await screen.findByRole('link', { name: 'Moderation' }))
    await u.click(await screen.findByRole('link', { name: 'Review Pastry assistant' }, T))
    await screen.findByRole('heading', { name: 'Pastry assistant', level: 1 }, T)
    await u.click(screen.getByRole('button', { name: 'Request changes' }))
    await u.click(screen.getByRole('button', { name: 'Send change request' })); expect(await screen.findByText(/Describe what to change/)).toBeTruthy()
    await u.type(screen.getByLabelText('What should the employer change?'), 'Please add the shift hours to the description.'); await u.click(screen.getByRole('button', { name: 'Send change request' }))
    await screen.findByRole('heading', { name: 'Moderation queue' }, T)

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Employer')
    await u.click(await screen.findByRole('link', { name: 'Jobs' }))
    expect(await screen.findByText('Changes requested', {}, T)).toBeTruthy(); expect(screen.getByText(/Please add the shift hours/)).toBeTruthy()
    await u.click(screen.getByRole('link', { name: 'Edit and resubmit' }))
    await screen.findByRole('heading', { name: 'What are you hiring for?' }, T)
    expect(screen.getByRole('note').textContent).toMatch(/Please add the shift hours/)
    expect((screen.getByLabelText('Job title') as HTMLInputElement).value).toBe('Pastry assistant')
    await u.type(screen.getByLabelText('Description'), ' Shifts run 8:00 to 12:00.')
    for (const h of ['Pay', 'Location', 'Requirements', 'Schedule']) { await u.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByRole('heading', { name: new RegExp(h === 'Pay' ? 'How much' : h === 'Location' ? 'Where is the work' : h === 'Requirements' ? 'Who are you' : 'When is the work') }) }
    await u.click(screen.getByRole('button', { name: 'Preview' })); await screen.findByRole('heading', { name: 'Review your listing' })
    expect(screen.getByText(/Shifts run 8:00 to 12:00/)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Resubmit for review' }))
    expect(await screen.findByRole('heading', { name: 'Resubmitted for review' }, T)).toBeTruthy()
    await u.click(screen.getByRole('link', { name: 'View my jobs' }))
    expect(await screen.findByText('Pending review', {}, T)).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Edit and resubmit' })).toBeNull()
    // a pending job cannot be edited by URL either
    cleanup(); mount('/employer/jobs/' + posted.id + '/edit')
    expect(await screen.findByText("This job can't be edited right now.", {}, T)).toBeTruthy()

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Admin')
    await u.click(await screen.findByRole('link', { name: 'Moderation' }))
    await u.click(await screen.findByRole('link', { name: 'Review Pastry assistant' }, T))
    await screen.findByRole('heading', { name: 'Pastry assistant', level: 1 }, T)
    expect(await screen.findByText('Resubmitted by employer')).toBeTruthy(); expect(screen.getByText('Requested changes')).toBeTruthy()
  })
})

describe('reports', () => {
  it('seeker reports a job once; admin resolves it', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await u.click(await screen.findByRole('link', { name: 'English tutor' }, T))
    await u.click(await screen.findByRole('button', { name: 'Report this job' }, T))
    await u.click(screen.getByRole('button', { name: 'Send report' })); expect(await screen.findByText('Choose a reason for your report.')).toBeTruthy()
    await u.click(screen.getByLabelText('Misleading job')); await u.type(screen.getByLabelText('Tell us more (optional)'), 'Pay is lower than advertised.')
    await u.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByRole('dialog', { name: 'Report received' }, T)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Done' }))
    await u.click(screen.getByRole('button', { name: 'Report this job' })); await u.click(screen.getByLabelText('Scam')); await u.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/already reported this job/, {}, T)).toBeTruthy()

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Admin')
    await u.click(await screen.findByRole('link', { name: 'Reports' }))
    await screen.findByRole('heading', { name: 'Reports' }); expect(await screen.findByText(/Pay is lower than advertised/, {}, T)).toBeTruthy()
    expect(screen.getAllByRole('listitem').length).toBe(4)
    await u.click(screen.getByRole('button', { name: /Resolve report: Misleading job on English tutor/ }))
    await waitFor(() => expect(screen.queryByText(/Pay is lower than advertised/)).toBeNull(), T)
    expect(screen.getAllByRole('listitem').length).toBe(3)
    await u.click(screen.getByRole('button', { name: 'All' })); expect(screen.getAllByRole('listitem').length).toBe(4)
  })
})

describe('other admin pages', () => {
  it('overview KPIs are live; jobs, users and analytics work', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Admin')
    await screen.findByRole('heading', { name: 'Admin overview' }, T)
    await waitFor(() => { expect(within(screen.getByText('Pending review').parentElement!).getByText('3')).toBeTruthy(); expect(within(screen.getByText('Open reports').parentElement!).getByText('3')).toBeTruthy() }, T)

    await u.click(adminNav('Jobs')); await screen.findByRole('heading', { name: 'All jobs' }); await screen.findByText('English tutor', {}, T)
    expect(screen.getAllByRole('listitem').length).toBe(9)
    await u.selectOptions(screen.getByLabelText('Status'), 'Pending review'); expect(screen.getAllByRole('listitem').length).toBe(3)
    await u.selectOptions(screen.getByLabelText('Status'), 'Rejected'); expect(screen.getByText('No jobs with this status.')).toBeTruthy()

    await u.click(adminNav('Users')); await screen.findByRole('heading', { name: 'Users' }); await screen.findByText('seeker@demo.test', {}, T)
    expect(screen.getAllByRole('listitem').length).toBe(3)
    await u.type(screen.getByLabelText('Search users'), 'employer'); expect(screen.getAllByRole('listitem').length).toBe(1)
    await u.clear(screen.getByLabelText('Search users')); await u.selectOptions(screen.getByLabelText('Role'), 'admin'); expect(screen.getAllByRole('listitem').length).toBe(1)
    await u.type(screen.getByLabelText('Search users'), 'zzz'); expect(screen.getByText('No users match your search.')).toBeTruthy()

    await u.click(adminNav('Analytics')); await screen.findByRole('heading', { name: 'Analytics' })
    expect(screen.getByRole('heading', { name: 'No live analytics yet' })).toBeTruthy()
    expect(screen.getByText(/does not represent real user counts, hiring outcomes, or marketplace performance/)).toBeTruthy()
  })
  it('non-admins cannot open admin pages', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Employer'); await screen.findByRole('heading', { name: GREET, level: 1 }, T)
    cleanup(); mount('/admin/moderation'); expect(await screen.findByRole('heading', { name: GREET, level: 1 }, T)).toBeTruthy()
  })
})

const mainNav = (name: string | RegExp) => within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name })

describe('applications, hiring and messaging', () => {
  it('seeker applies, employer moves the candidate to accepted and chats, seeker sees every update', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await u.click(await screen.findByRole('link', { name: 'English tutor' }, T))
    await u.click(await screen.findByRole('button', { name: 'Apply now' }, T))
    const dlg = await screen.findByRole('dialog', { name: 'Apply: English tutor' })
    await u.type(within(dlg).getByLabelText(/Message to employer/), 'I can start Monday.')
    await u.click(within(dlg).getByRole('button', { name: 'Submit application' }))
    expect(await screen.findByRole('dialog', { name: 'Application submitted successfully' }, T)).toBeTruthy()
    await u.click(screen.getByRole('link', { name: 'View application' }))
    expect(await screen.findByRole('heading', { name: 'English tutor', level: 1 }, T)).toBeTruthy()
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
    await u.click(screen.getByRole('link', { name: 'View job' }))
    expect(await screen.findByRole('link', { name: /Applied · View your application/ }, T)).toBeTruthy()   // no second application possible
    expect(screen.queryByRole('button', { name: 'Apply now' })).toBeNull()

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Employer')
    await screen.findByRole('heading', { name: GREET, level: 1 }, T)
    expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' }, T)).toBeTruthy()
    await u.click(mainNav('Applications')); await screen.findByRole('heading', { name: 'Applications', level: 1 })
    expect((await screen.findAllByRole('heading', { name: 'Dilnoza K.', level: 2 }, T)).length).toBe(2)
    await u.selectOptions(screen.getByLabelText('Job'), 'English tutor')
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(1)
    expect(screen.getByText(/I can start Monday/)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Shortlist: Dilnoza K.' }))
    await u.click(await screen.findByRole('button', { name: 'Invite to interview: Dilnoza K.' }, T))
    await u.type(screen.getByLabelText('Interview details (optional)'), 'Tuesday 10:00 at our office.'); await u.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await within(screen.getByRole('list')).findByText('Interview', {}, T)).toBeTruthy()   // wait for the invitation to finish
    await u.click(await screen.findByRole('button', { name: 'Accept: Dilnoza K.' }, T))
    expect(await within(screen.getByRole('list')).findByText('Accepted', {}, T)).toBeTruthy()
    await u.click(screen.getByRole('link', { name: 'Message' }))
    expect(await within(await screen.findByRole('log', { name: 'Messages' }, T)).findByText('I can start Monday.', {}, T)).toBeTruthy()
    await u.type(screen.getByLabelText('Type a message'), 'Great, see you Monday!{Enter}')
    expect(await within(screen.getByRole('log', { name: 'Messages' })).findByText('Great, see you Monday!', {}, T)).toBeTruthy()

    signOut(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await screen.findByRole('heading', { name: GREET, level: 1 }, T)
    expect(await screen.findByRole('link', { name: /^Messages\s*2\s*unread/ }, T)).toBeTruthy()   // the badge arrives from the server
    await u.click(screen.getByRole('link', { name: /^Notifications, \d+ unread/ }))
    await screen.findByRole('heading', { name: 'Notifications', level: 1 }, T)
    await u.click(screen.getByRole('button', { name: /^Interviews/ }))
    await u.click(await screen.findByText(/invited you to an interview for English tutor/, {}, T))
    expect(await screen.findByRole('heading', { name: 'English tutor', level: 1 }, T)).toBeTruthy()
    expect(screen.getByText(/Tuesday 10:00 at our office/)).toBeTruthy()
    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0); expect(screen.queryByRole('button', { name: 'Withdraw application' })).toBeNull()
    await u.click(mainNav(/^Messages/)); await u.click(await screen.findByRole('button', { name: /Bright Academy.*English tutor/ }, T))
    expect(await within(await screen.findByRole('log', { name: 'Messages' }, T)).findByText('Great, see you Monday!', {}, T)).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('link', { name: /^Messages\s*\d+\s*unread/ })).toBeTruthy(), T)   // the demo conversation is still unread
  })

  it('withdrawing frees the job to be applied for again', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker')
    await u.click(await screen.findByRole('link', { name: 'Applications' }, T))
    await u.click(await screen.findByRole('link', { name: /Restaurant assistant/ }, T))
    await screen.findByRole('heading', { name: 'Restaurant assistant', level: 1 }, T)
    await u.click(screen.getByRole('button', { name: 'Withdraw application' })); await u.click(await screen.findByRole('button', { name: 'Withdraw' }))
    await waitFor(() => expect(screen.getAllByText('Withdrawn').length).toBeGreaterThan(0), T); expect(screen.queryByRole('button', { name: 'Withdraw application' })).toBeNull()
    await u.click(screen.getByRole('link', { name: 'View job' }))
    expect(await screen.findByRole('button', { name: 'Apply now' }, T)).toBeTruthy()
  })
})

describe('search and saved jobs', () => {
  it('understands plain language, filters, and keeps saved jobs', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker'); await screen.findByText('English tutor', {}, T); await toJobs(u)
    expect(screen.getByText('6 opportunities')).toBeTruthy()
    await u.type(screen.getByRole('searchbox', { name: /Search jobs/ }), 'Part-time English teaching jobs after 5pm in Tashkent')
    const chips = within(screen.getByLabelText('Understood as')); for (const c of ['English', 'Teaching', 'Part-time', 'After 17:00', 'Tashkent']) expect(chips.getByText(c)).toBeTruthy()
    expect(screen.getByText('1 opportunity')).toBeTruthy(); expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['English tutor'])
    await u.type(screen.getByRole('searchbox'), ' astronaut'); expect(screen.getByText('No jobs match your search.')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Clear search' })); expect(screen.getByText('6 opportunities')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Remote only' })); expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Support agent (remote)'])
    await u.click(screen.getByRole('button', { name: 'Remote only' }))
    await u.selectOptions(screen.getByLabelText('Sort'), 'Highest pay'); expect(screen.getAllByRole('heading', { level: 3 })[0].textContent).toBe('Support agent (remote)')

    await u.click(screen.getByRole('button', { name: 'Save English tutor' }))
    await u.click(mainNav('Saved')); await screen.findByRole('heading', { name: 'Saved jobs' })
    expect(await screen.findByRole('heading', { name: 'English tutor', level: 3 }, T)).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Remove English tutor from saved jobs' }))
    expect(await screen.findByText("You haven't saved any opportunities yet.")).toBeTruthy()
  })
})

describe('profile, settings, company', () => {
  it('seeker edits settings: name, password, notification switches, theme', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Job seeker'); await screen.findByText('English tutor', {}, T)
    await u.click(mainNav('Profile')); expect(await screen.findByRole('heading', { name: 'Dilnoza K.', level: 1 }, T)).toBeTruthy()
    expect(screen.getByText('English', { selector: 'span' })).toBeTruthy(); expect(screen.getByRole('link', { name: 'Edit profile' })).toBeTruthy()   // the skill chip (the language selector also contains "English")
    await u.click(screen.getByRole('link', { name: 'Settings' }))
    await screen.findByRole('heading', { name: 'Settings', level: 1 })
    await u.clear(screen.getByLabelText('Full name')); await u.type(screen.getByLabelText('Full name'), 'Dilnoza Karimova'); await u.click(screen.getByRole('button', { name: 'Save changes' }))
    await u.type(screen.getByLabelText('Current password'), 'wrongpass1'); await u.type(screen.getByLabelText('New password'), 'brandnew456'); await u.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Your current password is incorrect.', {}, T)).toBeTruthy()
    const sw = screen.getByRole('switch', { name: 'New messages' }) as HTMLInputElement; expect(sw.checked).toBe(true); await u.click(sw); expect(sw.checked).toBe(false)
    await u.click(screen.getByRole('radio', { name: 'dark' })); expect(document.documentElement.classList.contains('dark')).toBe(true)
    await u.click(screen.getByRole('radio', { name: 'light' })); expect(document.documentElement.classList.contains('dark')).toBe(false)
    await u.click(mainNav('Profile')); expect(await screen.findByRole('heading', { name: 'Dilnoza Karimova', level: 1 }, T)).toBeTruthy()
  })
  it('employer company profile validates and saves', async () => {
    const u = userEvent.setup(); await mountReady('/login', 'Welcome back'); await login(u, 'Employer'); await screen.findByRole('heading', { name: GREET, level: 1 }, T)
    await u.click(mainNav('Company')); await screen.findByLabelText('Company name')
    await u.type(screen.getByLabelText(/Website/), 'oshmarkaz.com'); await u.click(screen.getByRole('button', { name: 'Save company profile' }))
    expect(await screen.findByText(/starting with http/, {}, T)).toBeTruthy()
    await u.clear(screen.getByLabelText(/Website/)); await u.type(screen.getByLabelText(/Website/), 'https://oshmarkaz.example'); await u.selectOptions(screen.getByLabelText('Industry'), 'Food & beverage')
    await u.click(screen.getByRole('button', { name: 'Save company profile' }))
    await waitFor(() => expect(screen.queryByText(/starting with http/)).toBeNull(), T)
    expect(within((await screen.findByText('Jobs posted', {}, T)).parentElement!).getByText('6')).toBeTruthy()   // jobs posted
  })
})

describe('landing and empty states', () => {
  it('landing explains the idea, the demo is interactive, CTAs lead to sign-up', async () => {
    await mountReady('/', 'Find work that fits your life.')
    expect(screen.getByLabelText('Interactive availability demo')).toBeTruthy(); expect(screen.getByText(/Your schedule .*(matches|covers)/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Hire flexible talent' }).getAttribute('href')).toBe('/register?role=employer')
    expect(screen.getAllByRole('link', { name: 'Find a job' })[0].getAttribute('href')).toBe('/register?role=seeker')
    expect(screen.getByText('Schedule-first matching')).toBeTruthy()
    expect(screen.queryByText('12K+')).toBeNull()
    const slider = screen.getByLabelText(/Candidate B starts at/); expect(screen.getByText('100%')).toBeTruthy()
    fireEvent.change(slider, { target: { value: '15' } }); expect(screen.getByText('78%')).toBeTruthy(); expect(screen.getByText('Partial coverage')).toBeTruthy()
    for (const h of ['How it works', 'Why availability matters', 'Trust and safety', 'Your schedule shouldn\'t limit your opportunities.']) expect(screen.getByRole('heading', { name: h })).toBeTruthy()
  })
  it('a brand-new seeker sees helpful empty states everywhere', async () => {
    const fresh = await newUser(server, 'seeker', 'Test User'); jar.set('slotwork_sid', fresh.c.cookies.get('slotwork_sid')!)   // the browser is now signed in as this new seeker
    mount('/messages'); expect(await screen.findByText('Your conversations with employers will appear here.', {}, T)).toBeTruthy()
    cleanup(); mount('/applications'); expect(await screen.findByText('Your next opportunity could be one search away.', {}, T)).toBeTruthy()
    cleanup(); mount('/saved'); expect(await screen.findByText("You haven't saved any opportunities yet.", {}, T)).toBeTruthy()
    cleanup(); mount('/notifications'); expect(await screen.findByText(/Welcome to Slotwork!/, {}, T)).toBeTruthy()
    cleanup(); mount('/dashboard'); expect(await screen.findByText("You haven't applied to anything yet.", {}, T)).toBeTruthy()
  })
})
