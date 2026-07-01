import Link from 'next/link'

const benefits = [
  'Posts illimités',
  'Tous les sports',
  'Visuels aux couleurs du club',
  'Instagram, Facebook, WhatsApp',
]

export default function MerciPage() {
  return (
    <main className="flex min-h-screen items-center bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-4xl font-extrabold text-[#111827]">⚡</p>
        <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-[#111827]">
          Tu es sur la liste !
        </h1>
        <p className="mt-4 text-base leading-[1.7] text-[#6b7280]">
          On te contacte des que Tribunes est pret au lancement.
        </p>

        <section className="mt-8 rounded-[12px] border-2 border-[#2563eb] bg-white p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-8">
          <p className="text-lg font-bold text-[#2563eb]">🔒 Ton tarif early adopter est reserve</p>
          <p className="mt-5 text-[1.5rem] font-extrabold text-[#111827]">10€/mois a vie</p>
          <p className="mt-2 text-sm text-[#6b7280]">(au lieu de 25€/mois apres lancement)</p>

          <ul className="mt-6 grid gap-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[14px] text-[#111827]">
                <span className="text-[#22c55e]">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-[13px] leading-6 text-[#6b7280]">
          Garde un oeil sur ta boite mail — on t&apos;ecrira avant d&apos;ouvrir les acces pour
          confirmer ton abonnement. Aucun prelevement ne sera effectue sans ton accord.
        </p>

        <Link href="/" className="mt-8 inline-block text-sm text-[#6b7280] hover:text-[#111827]">
          ← Retour a l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
