import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PRICE_IDS: Record<string, string> = {
  PRO: process.env.STRIPE_PRICE_PRO ?? '',
  STRUCTURE: process.env.STRIPE_PRICE_STRUCTURE ?? '',
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, plan } = await req.json() // action: 'checkout' | 'portal'

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    include: { org: true },
  })
  if (!membership) return NextResponse.json({ error: 'Not an owner' }, { status: 403 })

  const org = membership.org
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  if (action === 'portal' && org.stripeCustomerId) {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/account`,
    })
    return NextResponse.json({ url: session.url })
  }

  if (action === 'checkout' && plan) {
    const priceId = PRICE_IDS[plan]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

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
