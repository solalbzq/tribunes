export const WAITLIST_EMAIL_KEY = 'sports-post-email'

export function saveWaitlistEmail(email: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(WAITLIST_EMAIL_KEY, email)
}

export function getWaitlistEmail() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(WAITLIST_EMAIL_KEY) ?? ''
}
