// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { plural, setLang, t } from '../src/i18n'
import ru from '../src/i18n/ru'
import uz from '../src/i18n/uz'
import { NOTIFICATION_TEMPLATES, notificationText } from '../src/i18n/notifications'
import { relativeTime } from '../src/utils/time'
import catalog from '../scripts/i18n-strings.json'

afterEach(() => setLang('en', { reload: false }))
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join()
const opp = { one: '{n} opportunity', few: '{n} opportunities', many: '{n} opportunities', other: '{n} opportunities' }

describe('translation lookup', () => {
  it('translates known text, falls back to English for unknown text, fills placeholders', () => {
    expect(t('Log in')).toBe('Log in'); setLang('ru', { reload: false })
    expect(t('Log in')).toBe('Войти'); expect(t('Some brand-new sentence nobody translated')).toBe('Some brand-new sentence nobody translated')
    expect(t('New message from {name}.', { name: 'Алина' })).toBe('Новое сообщение от Алина.'); expect(t('New message from {name}.')).toBe('Новое сообщение от {name}.')
    setLang('uz', { reload: false }); expect(t('Log in')).toBe('Kirish'); expect(t('Messages')).toBe('Xabarlar')
  })
  it('uses the right plural form: Russian has three, Uzbek one, English two', () => {
    setLang('ru', { reload: false }); const f = (n: number) => plural(n, opp)
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(f)).toEqual(['1 вакансия', '2 вакансии', '4 вакансии', '5 вакансий', '11 вакансий', '12 вакансий', '14 вакансий', '21 вакансия', '22 вакансии', '25 вакансий', '101 вакансия', '111 вакансий'])
    setLang('uz', { reload: false }); expect(plural(1, opp)).toBe('1 ta vakansiya'); expect(plural(5, opp)).toBe('5 ta vakansiya')
    setLang('en', { reload: false }); expect(plural(1, opp)).toBe('1 opportunity'); expect(plural(2, opp)).toBe('2 opportunities')
  })
  it('relative times follow the language (including Russian declension)', () => {
    const now = Date.parse('2026-10-07T12:00:00Z'), ago = (m: number) => new Date(now - m * 60_000).toISOString()
    setLang('ru', { reload: false }); expect([relativeTime(ago(0), now), relativeTime(ago(5), now), relativeTime(ago(60), now), relativeTime(ago(180), now), relativeTime(ago(300), now), relativeTime(ago(1500), now), relativeTime(ago(4000), now), relativeTime(ago(7500), now)])
      .toEqual(['Только что', '5 мин. назад', '1 час назад', '3 часа назад', '5 часов назад', '1 день назад', '2 дня назад', '5 дней назад'])
    setLang('uz', { reload: false }); expect(relativeTime(ago(180), now)).toBe('3 soat oldin')
  })
  it('notifications render from kind + params in each language (word order and names are the translator\'s call)', () => {
    const n = { id: '1', userId: 'u', category: 'applications' as const, kind: 'application.shortlisted', params: { company: 'Osh Markaz', job: 'Restaurant assistant' }, body: 'Your application for Restaurant assistant was shortlisted.', createdAt: '', read: false }
    expect(notificationText(n)).toBe(n.body)
    setLang('ru', { reload: false }); expect(notificationText(n)).toBe('Ваш отклик на вакансию «Restaurant assistant» добавлен в шорт-лист.')
    setLang('uz', { reload: false }); expect(notificationText(n)).toBe('“Restaurant assistant” vakansiyasiga arizangiz qisqa roʻyxatga kiritildi.')
    expect(notificationText({ ...n, kind: 'unknown.kind' })).toBe(n.body)   // unknown kinds keep the server's English text
    for (const k of Object.keys(NOTIFICATION_TEMPLATES)) { setLang('ru', { reload: false }); expect(ru[NOTIFICATION_TEMPLATES[k]], `ru ${k}`).toBeTruthy(); expect(uz[NOTIFICATION_TEMPLATES[k]], `uz ${k}`).toBeTruthy() }
  })
})

describe('dictionary quality', () => {
  const strings = catalog as string[]
  for (const [name, dict] of [['ru', ru], ['uz', uz]] as const) {
    it(`${name}: placeholders match the English text, no empty values, plural entries are complete`, () => {
      for (const [k, v] of Object.entries(dict)) {
        expect(v.trim(), `${name} empty: ${k}`).not.toBe('')
        for (const part of v.split('|')) expect(ph(part), `${name} placeholders in "${k}"`).toBe(ph(k))
      }
      if (name === 'ru') for (const k of ['{n} hours ago', '{n} days ago', '{n} opportunities']) expect(ru[k].split('|'), k).toHaveLength(3)
    })
    it(`${name}: at least 95% of the interface strings are translated, and every key is still used by the code`, () => {
      const have = strings.filter(s => dict[s] !== undefined).length
      expect(have / strings.length, `${name} coverage`).toBeGreaterThanOrEqual(0.95)
      const unused = Object.keys(dict).filter(k => !strings.includes(k)); expect(unused, `${name} keys the code no longer uses`).toEqual([])
    })
  }
})
