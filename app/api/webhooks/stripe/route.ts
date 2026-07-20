import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { getStripe, planFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ message: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    return NextResponse.json({ message: `Invalid signature: ${(err as Error).message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.orgId
      const plan = session.metadata?.plan
      if (orgId && (plan === 'CLUB' || plan === 'PRO')) {
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan,
            stripeSubId: typeof session.subscription === 'string' ? session.subscription : null,
          },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

      const org = await prisma.organization.findFirst({ where: { stripeCustomerId: customerId } })
      if (!org) break

      if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        await prisma.organization.update({
          where: { id: org.id },
          data: { plan: 'FREE', stripeSubId: null },
        })
        break
      }

      // On n'applique le plan que pour un abonnement réellement actif ;
      // les états transitoires (past_due, incomplete…) ne changent rien,
      // Stripe retente et subscription.deleted gère le cas terminal.
      const active = subscription.status === 'active' || subscription.status === 'trialing'
      const plan = planFromPriceId(subscription.items.data[0]?.price.id)
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeSubId: subscription.id, ...(active && plan ? { plan } : {}) },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

      const org = await prisma.organization.findFirst({ where: { stripeCustomerId: customerId } })
      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { plan: 'FREE', stripeSubId: null },
        })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
