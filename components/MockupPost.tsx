export type PostPreviewProps = {
  initials: string
  name: string
  subtitle: string
  color: string
  visualEmoji: string
  visualTitle: string
  text: string
}

export function PostPreview({ initials, name, subtitle, color, visualEmoji, visualTitle, text }: PostPreviewProps) {
  return (
    <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-sm text-gray-500">{subtitle}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
              Aperçu social
            </span>
          </div>

          <div className="mt-6 rounded-[12px] p-8 text-white" style={{ backgroundImage: `linear-gradient(135deg, #111827, ${color})` }}>
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 text-center backdrop-blur-sm">
              <div className="text-4xl">{visualEmoji}</div>
              <p className="mt-4 text-lg font-semibold">{visualTitle}</p>
            </div>
          </div>

          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-gray-700">{text}</p>

          <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
            <span>Instagram</span>
            <span>·</span>
            <span>Facebook</span>
          </div>
          <div className="mt-5 flex justify-end">
            <span className="inline-flex rounded-full bg-[#eff4ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#2563eb]">
              Généré par Tribunes
            </span>
          </div>
    </div>
  )
}

export function MockupPost() {
  return (
    <section id="mockup" className="bg-white py-20">
      <div className="mx-auto max-w-2xl px-4">
        <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Exemple</span>
        <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.2rem)] font-black tracking-[-0.03em] text-ink">
          À quoi ça ressemble
        </h2>
        <div className="mt-8">
          <PostPreview
            initials="RC"
            name="Rugby Club Nîmes"
            subtitle="Tournoi des 6 Nations Amateur · 12 équipes"
            color="#2563eb"
            visualEmoji="🏆"
            visualTitle="Visuel généré aux couleurs du club"
            text={'Quelle journée ! Le tournoi des 6 Nations Amateur s’est clôturé hier avec une belle victoire de l’équipe A en finale. Merci à toutes les équipes et à nos bénévoles pour cette organisation impeccable. Rendez-vous l’année prochaine ! 🏆'}
          />
        </div>
      </div>
    </section>
  )
}
