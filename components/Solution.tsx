const features = [
  {
    title: 'Tu entres les résultats',
    description: 'Scores, équipes, quelques infos sur le tournoi. 30 secondes.',
  },
  {
    title: "L'IA génère le contenu",
    description: 'Post Instagram, story, légende Facebook — aux couleurs de ton club.',
  },
  {
    title: 'Tu publies en un clic',
    description:
      "Directement depuis l'outil ou tu télécharges pour publier toi-même.",
  },
  {
    title: 'Tous les sports',
    description: 'Rugby, basket, handball, badminton, padel... peu importe le sport.',
  },
]

export function Solution() {
  return (
    <section className="bg-[#111827] py-16" id="solution">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-white">
          Ce que l&apos;outil fait pour toi
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="rounded-[12px] border border-white/10 bg-white/5 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <span className="inline-flex rounded-full bg-[#fff0f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#2563eb]">
                Étape {index + 1}
              </span>
              <div className="mt-4 h-9 w-9 rounded-full bg-[#2563eb]/10 text-center text-lg leading-9 text-[#2563eb]">
                {index + 1}
              </div>
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
    </section>
  )
}
