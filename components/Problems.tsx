const problems = [
  {
    icon: '01',
    title: 'Tu passes des heures sur des trucs qui devraient prendre 5 minutes',
    description:
      'Mettre en forme les résultats, trouver une photo, rédiger le post... pour au final publier deux jours après le tournoi.',
  },
  {
    icon: '02',
    title: "Personne dans le club ne s'occupe des réseaux",
    description:
      'Les bénévoles ont déjà beaucoup à faire. La communication passe souvent à la trappe — et le club reste invisible.',
  },
  {
    icon: '03',
    title: 'Vos posts ne ressemblent pas à grand chose',
    description:
      "Un screenshot de tableau Excel ou un texte brut sans visuel. C'est dommage pour l'image du club.",
  },
]

export function Problems() {
  return (
    <section className="bg-[#f8f8f8] py-16" id="problems">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#1a1a2e]">
          Tu te reconnais là-dedans ?
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-3">
          {problems.map((problem) => (
            <article
              key={problem.title}
              className="flex gap-4 rounded-[12px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0f3] text-sm font-semibold text-[#e94560]">
                {problem.icon}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#1a1a2e]">{problem.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#6b7280]">
                  {problem.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
