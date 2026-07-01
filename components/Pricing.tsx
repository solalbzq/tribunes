import Link from 'next/link'

type Plan = {
  name: string
  price: string
  period: string
  yearly?: string
  tagline: string
  features: string[]
  cta: string
  highlight?: boolean
}

const plans: Plan[] = [
  {
    name: 'Découverte',
    price: 'Gratuit',
    period: '',
    tagline: 'Pour tester Tribunes sans engagement.',
    features: [
      "Jusqu'à 3 publications par mois",
      'Génération IA incluse',
      'Publication manuelle',
      'Personnalisation limitée',
      'Logo Tribunes sur les visuels',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    name: 'Club',
    price: '9,90 €',
    period: '/mois',
    yearly: 'ou 99 €/an',
    tagline: 'Le meilleur rapport qualité/prix.',
    highlight: true,
    features: [
      'Publications IA illimitées',
      "Génération d'affiches de match",
      'Instagram, Facebook, LinkedIn',
      'Personnalisation complète',
      'Calendrier & synchronisation Ten’Up',
      'Historique & médias illimités',
      'Support prioritaire',
    ],
    cta: 'Choisir Club',
  },
  {
    name: 'Pro',
    price: '19,90 €',
    period: '/mois',
    yearly: 'ou 199 €/an',
    tagline: 'Pour les clubs structurés.',
    features: [
      'Tout de l’offre Club',
      'Plusieurs administrateurs & sections',
      'Validation avant publication',
      'Planification avancée',
      'Statistiques & analyses',
      'Support premium & accès anticipé',
    ],
    cta: 'Choisir Pro',
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-subtle py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Offres</span>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-[-0.03em] text-ink">
            Un tarif simple, pensé pour les clubs
          </h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-muted">
            Accessible à tous les clubs amateurs. Changez ou annulez quand vous voulez.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-card bg-white p-7 ${
                plan.highlight
                  ? 'border-2 border-brand shadow-lift'
                  : 'border border-line shadow-card'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                  ★ Recommandé
                </span>
              )}

              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-[2.6rem] font-black leading-none tracking-[-0.03em] text-ink">
                  {plan.price}
                </span>
                {plan.period && <span className="pb-1.5 text-sm font-medium text-muted">{plan.period}</span>}
              </div>
              <p className="mt-1 h-5 text-[13px] font-medium text-muted">{plan.yearly ?? ''}</p>

              <Link
                href="/signup"
                className={`mt-6 w-full rounded-btn px-5 py-3 text-center text-sm font-semibold transition ${
                  plan.highlight
                    ? 'bg-brand text-white hover:bg-brand-hover'
                    : 'border border-line bg-white text-ink hover:bg-subtle'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-7 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-muted">
          Les prix affichés sont pensés pour rester accessibles aux clubs amateurs.
        </p>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
