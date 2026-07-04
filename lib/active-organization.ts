import { cookies } from 'next/headers'

export const ACTIVE_ORG_COOKIE = 'active_org_id'

export function getActiveOrganizationId() {
  return cookies().get(ACTIVE_ORG_COOKIE)?.value ?? null
}

export function setActiveOrganizationId(orgId: string) {
  cookies().set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
