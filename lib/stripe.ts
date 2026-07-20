import Stripe from 'stripe'
import type { BillingInterval, PlanKey } from './plans'

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-06-20',
  })
}

// Mapping plan/intervalle ↔ price Stripe. Lu à l'exécution (pas au chargement
// du module) pour ne pas figer un env vide au build.

export function getPriceId(plan: 'CLUB' | 'PRO', interval: BillingInterval): string | null {
  const map: Record<'CLUB' | 'PRO', Record<BillingInterval, string | undefined>> = {
    CLUB: {
      monthly: process.env.STRIPE_PRICE_CLUB_MONTHLY,
      yearly: process.env.STRIPE_PRICE_CLUB_YEARLY,
    },
    PRO: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    },
  }
  return map[plan][interval] || null
}

export function planFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_CLUB_MONTHLY) return 'CLUB'
  if (priceId === process.env.STRIPE_PRICE_CLUB_YEARLY) return 'CLUB'
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'PRO'
  if (priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return 'PRO'
  return null
}
