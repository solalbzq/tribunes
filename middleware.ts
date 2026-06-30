import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, isAdminPayload, verifyAdminToken } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get(getAdminCookieName())?.value

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  try {
    const payload = await verifyAdminToken(token)

    if (!isAdminPayload(payload)) {
      throw new Error('Invalid admin payload')
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
