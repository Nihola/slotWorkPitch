# Slotwork

An availability-first employment marketplace: people paint the hours they can work, and jobs are ranked by how well they fit skills, location **and schedule**.
One repository, one deployable app: a React front end plus a Node/Express API with a SQLite database. No external services needed.

## Run it
Requires **Node 22.13 or newer** (uses the built-in `node:sqlite`).
```
npm install
npm run dev        # API on :3000 + Vite on :5173 (open http://localhost:5173)
```
Demo accounts are created automatically in development (password `demo1234`): `seeker@demo.test`, `employer@demo.test`, `admin@demo.test`.

### Pitch demo walkthrough
Start with `npm run dev` and open `http://localhost:5173`. On the sign-in page, choose a demo role to fill its account and password, then sign in. The seeker account has a completed profile, saved marketplace data, an application, and a conversation; the employer account can review that application and post a job; the admin account can review the seeded moderation queue and reports. Demo data is sample content for exercising the product flow, not real customer activity or verified hiring outcomes. The landing page and analytics area do not claim traction metrics.

Demo accounts are seeded on an empty development database. If demo mode is enabled after a database already contains users, only missing demo logins are added; existing data is preserved.

## Deploy
```
npm run build      # type-checks client + server, builds the site into dist/
npm start          # production: serves dist/ and /api on $PORT (default 3000)
```
Configuration is by environment variables (see `.env.example`):
| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `DATABASE_PATH` | SQLite file (default `./data/slotwork.db`). **Back this file up.** |
| `SEED_DEMO` | Demo accounts + sample jobs. Default **off in production**, on in development. Never enable on a public site (shared public password). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creates the first administrator once, if none exists. Use a strong password. |
| `TRUST_PROXY` | `true` only behind a reverse proxy that terminates HTTPS. |
| `SMTP_URL` (or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`) | Your mail server, for password-reset emails. |
| `MAIL_FROM`, `APP_URL` | Sender address, and the public site address used in email links (**required in production**). |

Run behind HTTPS (the session cookie gets the `Secure` flag in production). Example: `node --env-file=.env --import tsx server/index.ts --production`.

## Tests and checks
```
npm run typecheck   # client + server
npm run lint
npm test            # server API + real SMTP delivery, UI against a real in-process server, pure logic, languages
```
`npm run test:logic` runs two small script checks (search parsing, page titles).

## Architecture
- `src/` React 18 + TypeScript + Tailwind + React Router 7. `src/api/client.ts` is the only code that calls the server; `src/services/*` keep the same function names the pages use.
- `server/` Express 5. `routes/` (auth, me, jobs, applications, chat, misc, admin), `schemas.ts` (zod validation of every input), `security.ts` (scrypt, sessions, CSRF, rate limit), `db.ts` (schema), `seed.ts`.
- Rules live on the server: ownership and roles, application status transitions, moderation decisions, risk scoring, unread counters, notification preferences. The UI only displays results.

## Security model (what is and is not covered)
- Passwords: scrypt with a per-password salt. Sessions: random token in an `HttpOnly; SameSite=Lax` cookie (`Secure` in production); only the token's hash is stored; 7-day expiry; new token at every login; other devices are signed out on password change.
- Brute force: 5 failed sign-ins lock the account for 15 minutes (same message for unknown emails); per-IP request limits.
- CSRF: state-changing requests need a custom header and a same-origin `Origin`. Security headers via helmet (CSP, nosniff, HSTS in production).
- Authorization: every route checks role; other people's applications, chats and jobs answer "not found". Clients cannot set their own role, job owner/company/verification/status, or application candidate data.
- **Not covered:** no email (password reset only returns the same answer; nothing is sent), no email confirmation, in-memory rate limiter (single process), no file uploads (the chat paperclip says so), no audit of dependencies for your environment. Add these before a large public launch.

## Languages (English, Русский, Oʻzbekcha)
A language selector is in the header, the footer, the sign-in pages and the admin sidebar. The choice is saved in the browser, sets `<html lang>`, and the page reloads so every label is recomputed. The first visit follows the browser language.
- Source text is English. Wrap any new visible string in `t('English text')` (`t('Hello {name}', { name })` for values, `plural(n, {...})` for counts). Translations live in `src/i18n/ru.ts` and `uz.ts`, keyed by the English text. Missing keys simply show English.
- Russian plural forms are stored as `one|few|many` in one entry (`"{n} vakansiya|..."`). Dates and times follow the language.
- Notifications are stored by the server as `kind` + `params` and rendered from templates (`src/i18n/notifications.ts`), so word order and names can differ per language. Server error messages are translated when they arrive (list in `src/i18n/serverMessages.ts`).
- `npm run i18n:check` lists coverage (currently 96% for both). **The remaining 4% are deliberate:** short word fragments that the code glues into sentences (plural endings such as "s") would produce broken grammar if translated, so they stay English. Rare server validation messages that are not in `serverMessages.ts` also stay English.
- **The Russian and Uzbek texts were written without a native review. Please have native speakers proofread them (especially Uzbek) before launch.**
- Not translated: user-generated content (job titles, descriptions, chat messages), skill names, and the demo data.

## Password reset by email
`Forgot password?` emails a one-time link (valid 1 hour, in the user's language). Only a hash of the token is stored; a newer link cancels the older one; at most 3 links per account per hour; the answer never reveals whether an account exists; the link host comes from `APP_URL`, not the request. Using a link changes the password, signs the account out everywhere, unlocks it, and sends a "password changed" email.
- Without SMTP settings, **development** prints the email (with the link) in the server console; **production** disables sending and the page says email isn't set up.
- Delivery is tested against a real local SMTP server (including AUTH and failures), but **not against a real provider**: send yourself a test email after you configure SMTP, and set SPF/DKIM for your domain so messages don't land in spam.

## Known gaps / next steps
- Native-speaker review of the Russian and Uzbek texts; rewrite the sentence fragments that still show English words.
- No email confirmation at sign-up, no email notifications for messages or applications, no file uploads (chat paperclip).
- Employer verification levels are display-only (no workflow to grant them); admin cannot suspend users or edit jobs.
- Analytics charts and landing statistics are demo data.
- Rate limiting is in-memory (one server process); use a shared store if you run several. Back up the SQLite file.
