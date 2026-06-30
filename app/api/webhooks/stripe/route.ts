import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO ?? '']: 'PRO',
  [process.env.STRIPE_PRICE_STRUCTURE ?? '']: 'STRUCTURE',
}

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
      if (orgId && plan) {
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
      const priceId = subscription.items.data[0]?.price.id
      const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined

      const org = await prisma.organization.findFirst({ where: { stripeCustomerId: customerId } })
      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { stripeSubId: subscription.id, ...(plan ? { plan } : {}) },
        })
      }
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
