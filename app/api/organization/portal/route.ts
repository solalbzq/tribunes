import { NextResponse } from 'next/server'
import { getActiveOrganizationId } from '@/lib/active-organization'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStripe, getPriceId } from '@/lib/stripe'
import { getOrCreateOrgForUser } from '@/lib/org'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, plan, interval } = await req.json() as {
    action: 'checkout' | 'portal'
    plan?: 'CLUB' | 'PRO'
    interval?: 'monthly' | 'yearly'
  }

  const { org, role } = await getOrCreateOrgForUser(
    user.id,
    user.email?.split('@')[0] ?? 'Mon club',
    getActiveOrganizationId(),
  )
  if (role !== 'OWNER') {
    return NextResponse.json({ error: 'Seul le propriétaire de l’organisation peut gérer la facturation.' }, { status: 403 })
  }

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  if (action === 'portal' && org.stripeCustomerId) {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/account`,
    })
    return NextResponse.json({ url: session.url })
  }

  if (action === 'checkout') {
    if (plan !== 'CLUB' && plan !== 'PRO') {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }
    const priceId = getPriceId(plan, interval === 'yearly' ? 'yearly' : 'monthly')
    if (!priceId) {
      return NextResponse.json({ error: 'Prix non configuré pour ce plan.' }, { status: 500 })
    }

    // Create or reuse Stripe customer
    let customerId = org.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email!, metadata: { orgId: org.id } })
      customerId = customer.id
      await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account?upgraded=1`,
      cancel_url: `${baseUrl}/account`,
      metadata: { orgId: org.id, plan },
    })
    return NextResponse.json({ url: session.url })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
