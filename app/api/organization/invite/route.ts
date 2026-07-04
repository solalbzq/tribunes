import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

const PLAN_LIMITS: Record<string, number> = {
  FREE: 1, PRO: 1, STRUCTURE: 999,
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  // Get org where caller is OWNER
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    include: { org: { include: { members: true } } },
  })
  if (!membership) return NextResponse.json({ error: 'Not an owner' }, { status: 403 })

  const org = membership.org
  const limit = PLAN_LIMITS[org.plan] ?? 1
  if (org.members.length >= limit) {
    return NextResponse.json({
      error: `Votre plan ${org.plan} est limité à ${limit} compte(s). Passez au plan Structure pour en ajouter plus.`,
      upgrade: true,
    }, { status: 403 })
  }

  // Find invited user by email via Supabase admin
  const supabaseAdmin = createAdminClient()
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const invited = users.find(u => u.email === email)
  if (!invited) return NextResponse.json({ error: 'Utilisateur introuvable. Il doit créer un compte Tribunes d\'abord.' }, { status: 404 })

  // Add as MEMBER
  const member = await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: invited.id } },
    update: {},
    create: { orgId: org.id, userId: invited.id, role: 'MEMBER' },
  })

  return NextResponse.json(member)
}
