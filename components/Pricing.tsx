'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANS, PLAN_KEYS, yearlyAsMonthly, type BillingInterval } from '@/lib/plans'

export function Pricing() {
  const [billing, setBilling] = useState<BillingInterval>('monthly')

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

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-btn border border-line bg-white p-1">
            {(['monthly', 'yearly'] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBilling(i)}
                className={`rounded-btn px-5 py-2 text-sm font-semibold transition ${
                  billing === i ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {i === 'monthly' ? 'Mensuel' : 'Annuel'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLAN_KEYS.map((key) => {
            const plan = PLANS[key]
            const isPaid = plan.price.monthly != null
            const monthlyEq = yearlyAsMonthly(plan)
            return (
              <article
                key={key}
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

                <h3 className="text-lg font-bold text-ink">{plan.label}</h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

                <div className="mt-5 flex items-end gap-1.5">
                  <span className="text-[2.6rem] font-black leading-none tracking-[-0.03em] text-ink">
                    {isPaid ? plan.priceDisplay[billing] : 'Gratuit'}
                  </span>
                  {isPaid && (
                    <span className="pb-1.5 text-sm font-medium text-muted">
                      {billing === 'monthly' ? '/mois' : '/an'}
                    </span>
                  )}
                </div>
                <p className="mt-1 h-5 text-[13px] font-medium text-muted">
                  {isPaid && billing === 'yearly' && monthlyEq ? `soit ${monthlyEq}/mois` : ''}
                </p>

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
            )
          })}
        </div>
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
