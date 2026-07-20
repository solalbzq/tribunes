// Source de vérité unique des plans Tribunes : clés, libellés, prix, features
// marketing et quotas. Client-safe : aucun env, aucun Prisma.
// Les price IDs Stripe vivent côté serveur dans lib/stripe.ts.

export type PlanKey = 'FREE' | 'CLUB' | 'PRO'
export type BillingInterval = 'monthly' | 'yearly'

export type PlanDef = {
  key: PlanKey
  label: string
  tagline: string
  /** Prix en euros ; null = gratuit. */
  price: { monthly: number | null; yearly: number | null }
  priceDisplay: { monthly: string; yearly: string }
  features: string[]
  quotas: {
    /** Générations IA par mois calendaire ; null = illimité. */
    aiGenerationsPerMonth: number | null
    /** Comptes membres de l'organisation ; null = illimité. */
    maxMembers: number | null
    /** Logo Tribunes apposé sur les visuels générés. */
    watermark: boolean
    /** Modes Auto + validation / Automatique (cf. "Validation avant publication"). */
    automationEnabled: boolean
  }
  highlight?: boolean
  cta: string
}

export const PLAN_KEYS: PlanKey[] = ['FREE', 'CLUB', 'PRO']

export const PLANS: Record<PlanKey, PlanDef> = {
  FREE: {
    key: 'FREE',
    label: 'Découverte',
    tagline: 'Pour tester Tribunes sans engagement.',
    price: { monthly: null, yearly: null },
    priceDisplay: { monthly: 'Gratuit', yearly: 'Gratuit' },
    features: [
      "Jusqu'à 3 publications par mois",
      'Génération IA incluse',
      'Publication manuelle',
      'Personnalisation limitée',
      'Logo Tribunes sur les visuels',
    ],
    quotas: { aiGenerationsPerMonth: 3, maxMembers: 1, watermark: true, automationEnabled: false },
    cta: 'Commencer gratuitement',
  },
  CLUB: {
    key: 'CLUB',
    label: 'Club',
    tagline: 'Le meilleur rapport qualité/prix.',
    price: { monthly: 9.9, yearly: 99 },
    priceDisplay: { monthly: '9,90 €', yearly: '99 €' },
    features: [
      'Publications IA illimitées',
      "Génération d'affiches de match",
      'Instagram, Facebook, LinkedIn',
      'Personnalisation complète',
      'Calendrier & synchronisation Ten’Up',
      'Historique & médias illimités',
      'Support prioritaire',
    ],
    quotas: { aiGenerationsPerMonth: null, maxMembers: 1, watermark: false, automationEnabled: false },
    highlight: true,
    cta: 'Choisir Club',
  },
  PRO: {
    key: 'PRO',
    label: 'Pro',
    tagline: 'Pour les clubs structurés.',
    price: { monthly: 19.9, yearly: 199 },
    priceDisplay: { monthly: '19,90 €', yearly: '199 €' },
    features: [
      'Tout de l’offre Club',
      'Plusieurs administrateurs & sections',
      'Validation avant publication',
      'Planification avancée',
      'Statistiques & analyses',
      'Support premium & accès anticipé',
    ],
    quotas: { aiGenerationsPerMonth: null, maxMembers: null, watermark: false, automationEnabled: true },
    cta: 'Choisir Pro',
  },
}

/** Plans payants, dans l'ordre d'affichage. */
export const PAID_PLAN_KEYS: Exclude<PlanKey, 'FREE'>[] = ['CLUB', 'PRO']

/** Toute valeur inconnue (ancien schéma, données en transit) retombe sur FREE. */
export function normalizePlan(raw: string | null | undefined): PlanKey {
  return raw === 'CLUB' || raw === 'PRO' ? raw : 'FREE'
}

/** Équivalent mensuel d'un prix annuel, formaté ("8,25 €"). */
export function yearlyAsMonthly(plan: PlanDef): string | null {
  if (plan.price.yearly == null) return null
  return (plan.price.yearly / 12).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}
