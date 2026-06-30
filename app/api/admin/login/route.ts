import { NextRequest, NextResponse } from 'next/server'

import { createAdminToken, getAdminCookieName } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string }

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const token = await createAdminToken()
    const response = NextResponse.json({ success: true })

    response.cookies.set({
      name: getAdminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
