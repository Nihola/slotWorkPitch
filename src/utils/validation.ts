import { t } from '../i18n'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const validateEmail = (v: string) => (!v.trim() ? t('Enter your email address.') : EMAIL_RE.test(v.trim()) ? '' : t('Enter a valid email address.'))
export const validatePassword = (v: string) => (v.length < 8 ? t('Use at least 8 characters.') : /\d/.test(v) ? '' : t('Include at least one number.'))
