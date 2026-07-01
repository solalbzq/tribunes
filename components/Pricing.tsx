'use client'

const benefits = [
  'Posts illimités',
  'Tous les sports',
  'Visuels aux couleurs du club',
  'Instagram, Facebook, WhatsApp',
  'Accès aux nouvelles fonctionnalités en priorité',
]

export function Pricing() {
  function handleReservePricing() {
    document.getElementById('hero-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-[#f8fafc] py-16" id="pricing">
      <div className="mx-auto max-w-2xl px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[#111827]">
            Tarif early adopter
          </h2>
          <p className="mt-3 text-base leading-[1.7] text-[#6b7280]">
            Pour les clubs qui rejoignent avant le lancement officiel
          </p>
        </div>

        <div className="mt-8 rounded-[12px] border-2 border-[#2563eb] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <span className="inline-flex rounded-full bg-[#fff0f3] px-3 py-1 text-[12px] font-semibold text-[#2563eb]">
            🔒 Tarif garanti a vie pour les early adopters
          </span>
          <div className="mt-6 flex items-end gap-2">
            <p className="text-[3rem] font-extrabold tracking-[-0.03em] text-[#111827]">10€</p>
            <p className="pb-2 text-sm font-medium text-[#6b7280]">/mois</p>
          </div>
          <p className="mt-2 text-sm text-[#6b7280]">
            Au lieu de 25€/mois après lancement · à vie
          </p>

          <ul className="mt-8 grid gap-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-[#111827]">
                <span className="text-[#22c55e]">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleReservePricing}
            className="mt-8 w-full rounded-[8px] bg-[#2563eb] px-5 py-3 font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Réserver mon tarif early adopter →
          </button>
          <p className="mt-3 text-[13px] leading-5 text-[#6b7280]">
            Aucun paiement aujourd&apos;hui. On te contacte avant le lancement pour confirmer
            ton abonnement a ce tarif.
          </p>
        </div>
      </div>
    </section>
  )
}
