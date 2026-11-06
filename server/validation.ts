export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const validateEmail = (value: string) =>
  !value.trim() ? 'Enter your email address.' : EMAIL_RE.test(value.trim()) ? '' : 'Enter a valid email address.'

export const validatePassword = (value: string) =>
  value.length < 8 ? 'Use at least 8 characters.' : /\d/.test(value) ? '' : 'Include at least one number.'
