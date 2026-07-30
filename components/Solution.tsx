const features = [
  {
    title: 'Tu entres les résultats',
    description: 'Scores, équipes, quelques infos sur le tournoi. 30 secondes.',
  },
  {
    title: 'Tribunes prépare le contenu',
    description: 'Post Instagram, story, légende Facebook — aux couleurs de ton club.',
  },
  {
    title: 'Tribunes publie pour toi',
    description:
      'Le post est prêt, validé, puis publié sur tes réseaux en quelques instants.',
  },
]

export function Solution() {
  return (
    <section className="bg-[#111827] py-16" id="solution">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl">
          Ce que l&apos;outil fait pour toi
        </h2>
        <div className="relative mt-10">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-white/10 md:left-0 md:right-0 md:top-5 md:h-px md:w-auto" />

          <div className="relative grid gap-8 md:grid-cols-3 md:gap-10">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="relative pl-14 md:pl-0 md:pt-14 md:text-center"
              >
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#2563eb]/30 bg-[#2563eb] text-sm font-bold text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)] md:left-1/2 md:-translate-x-1/2">
                  {index + 1}
                </div>
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#93c5fd]">
                  Étape {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-[1.7] text-white/65">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
