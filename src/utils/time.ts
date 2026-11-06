import { locale, plural, t } from '../i18n'
export function relativeTime(iso: string, now = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (min < 1) return t('Just now')
  if (min < 60) return t('{n} min ago', { n: min })
  const h = Math.floor(min / 60); if (h < 24) return plural(h, { one: '{n} hour ago', other: '{n} hours ago', few: '{n} hours ago', many: '{n} hours ago' })
  const d = Math.floor(h / 24); if (d < 7) return plural(d, { one: '{n} day ago', other: '{n} days ago', few: '{n} days ago', many: '{n} days ago' })
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
}
export const greeting = (d = new Date()) => (d.getHours() < 12 ? t('Good morning') : d.getHours() < 18 ? t('Good afternoon') : t('Good evening'))
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
