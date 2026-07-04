import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      org: {
        include: {
          members: true,
          clubs: { select: { id: true, name: true, sport: true } },
        },
      },
    },
  })

  return NextResponse.json(member?.org ?? null)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  // Create org + add caller as OWNER
  const org = await prisma.organization.create({
    data: {
      name,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  })
  // Link existing club to this org
  await prisma.club.updateMany({ where: { userId: user.id }, data: { orgId: org.id } })

  return NextResponse.json(org)
}
