import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative overflow-hidden brand-gradient-soft">
      {/* halo décoratif subtil */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Pour les clubs sportifs amateurs
        </span>

        <h1 className="mt-6 text-[clamp(2.2rem,5.5vw,4rem)] font-black leading-[1.03] tracking-[-0.035em] text-ink">
          Votre club communique.
          <br />
          <span className="text-brand">Automatiquement.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-muted">
          Un résultat, un match, un programme — et votre publication est prête en
          quelques secondes, aux couleurs de votre club, pour tous vos réseaux.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-hover sm:w-auto"
          >
            Commencer gratuitement
          </Link>
          <a
            href="#pricing"
            className="w-full rounded-btn border border-line bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-subtle sm:w-auto"
          >
            Voir les offres
          </a>
        </div>

        <p className="mt-4 text-[13px] text-muted">
          Gratuit pour démarrer · sans carte bancaire · prêt en 2 minutes
        </p>
      </div>
    </section>
  )
}
