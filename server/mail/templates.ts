export type MailLang = 'en' | 'ru' | 'uz'
export const MAIL_LANGS: MailLang[] = ['en', 'ru', 'uz']
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface Copy { subject: string; hello: string; intro: string; button: string; outro: string; sign: string }
const RESET: Record<MailLang, Copy> = {
  en: { subject: 'Reset your Slotwork password', hello: 'Hi {name},', intro: 'We received a request to reset your password. Open this link to choose a new one. It expires in {minutes} minutes and works only once:', button: 'Choose a new password', outro: "If you didn't ask for this, you can ignore this email. Your password stays the same.", sign: '— Slotwork' },
  ru: { subject: 'Сброс пароля Slotwork', hello: 'Здравствуйте, {name}!', intro: 'Мы получили запрос на сброс пароля. Откройте ссылку, чтобы задать новый пароль. Она действует {minutes} минут и работает только один раз:', button: 'Задать новый пароль', outro: 'Если вы не запрашивали сброс, просто проигнорируйте это письмо. Пароль останется прежним.', sign: '— Slotwork' },
  uz: { subject: 'Slotwork parolini tiklash', hello: 'Salom, {name}!', intro: 'Parolni tiklash soʻrovi qabul qilindi. Yangi parol tanlash uchun havolani oching. U {minutes} daqiqa amal qiladi va faqat bir marta ishlaydi:', button: 'Yangi parol tanlash', outro: 'Agar buni siz soʻramagan boʻlsangiz, bu xatni eʼtiborsiz qoldiring. Parolingiz oʻzgarmaydi.', sign: '— Slotwork' },
}
const CHANGED: Record<MailLang, Copy> = {
  en: { subject: 'Your Slotwork password was changed', hello: 'Hi {name},', intro: 'Your password was just changed, and you were signed out on all devices. If this was you, nothing more is needed. If it was not, reset your password again right away:', button: 'Reset password', outro: '', sign: '— Slotwork' },
  ru: { subject: 'Пароль Slotwork изменён', hello: 'Здравствуйте, {name}!', intro: 'Ваш пароль только что изменён, а на всех устройствах выполнен выход. Если это были вы, больше ничего делать не нужно. Если нет, немедленно сбросьте пароль снова:', button: 'Сбросить пароль', outro: '', sign: '— Slotwork' },
  uz: { subject: 'Slotwork paroli oʻzgartirildi', hello: 'Salom, {name}!', intro: 'Parolingiz hozirgina oʻzgartirildi va barcha qurilmalardan chiqarildingiz. Agar bu siz boʻlsangiz, boshqa amal talab etilmaydi. Aks holda, parolni darhol qayta tiklang:', button: 'Parolni tiklash', outro: '', sign: '— Slotwork' },
}
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''))

/** Plain text + a minimal HTML version (all values are HTML-escaped). */
export function renderEmail(kind: 'reset' | 'changed', lang: MailLang, v: { name: string; link: string; minutes?: number }) {
  const c = (kind === 'reset' ? RESET : CHANGED)[lang], vars = { name: v.name, minutes: v.minutes ?? 60 }
  const hello = fill(c.hello, vars), intro = fill(c.intro, vars)
  const text = [hello, '', intro, '', v.link, ...(c.outro ? ['', c.outro] : []), '', c.sign].join('\n')
  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0B1030">
<p>${esc(hello)}</p><p>${esc(intro)}</p>
<p><a href="${esc(v.link)}" style="display:inline-block;background:#3B5BFF;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${esc(c.button)}</a></p>
<p style="font-size:13px;color:#566377">${esc(v.link)}</p>${c.outro ? `<p>${esc(c.outro)}</p>` : ''}<p>${esc(c.sign)}</p></div>`
  return { subject: c.subject, text, html }
}
