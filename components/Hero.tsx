import { EmailForm } from '@/components/EmailForm'

export function Hero() {
  return (
    <section className="bg-[#f8f8f8] py-16 sm:py-24">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <span className="inline-flex rounded-full bg-[#fff0f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#e94560]">
          ⚡ BIENTÔT DISPONIBLE
        </span>
        <h1 className="mt-6 text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#1a1a2e]">
          Tes résultats sur les réseaux,
          <br />
          en <span className="text-[#e94560]">2 minutes</span> chrono
        </h1>
        <p className="mt-5 text-base leading-[1.7] text-[#6b7280]">
          Tu organises des tournois ou des matchs ? On génère automatiquement les
          posts, visuels et stories — prêts à publier sur Instagram et Facebook.
        </p>
        <div id="hero-form">
          <EmailForm
            placeholder="president@monclub.fr"
            buttonLabel="Je reserve mon tarif →"
            note="Tu reserves le tarif early adopter affiche. Aucun paiement aujourd'hui."
            className="mt-10 text-left"
          />
        </div>
      </div>
    </section>
  )
}
