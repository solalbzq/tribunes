import type { JWTPayload } from 'jose'
import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE_NAME = 'admin_token'
const ADMIN_TOKEN_DURATION = '24h'

function getAdminSecret() {
  const secret = process.env.ADMIN_SECRET

  if (!secret) {
    throw new Error('ADMIN_SECRET is not configured.')
  }

  return new TextEncoder().encode(secret)
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME
}

export async function createAdminToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_DURATION)
    .sign(getAdminSecret())
}

export async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, getAdminSecret())

  return payload
}

export function isAdminPayload(payload: JWTPayload) {
  return payload.role === 'admin'
}

export async function ensureAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value
  if (!token) return false

  try {
    const payload = await verifyAdminToken(token)
    return isAdminPayload(payload)
  } catch {
    return false
  }
}
