'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PostPreview } from '@/components/MockupPost'
import { DEMO_TONES, buildDemoText, clubInitials, demoOutcome, type DemoTone } from '@/lib/demoPost'

const field =
  'mt-1 w-full rounded-btn border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-brand focus:outline-none'

export function DemoPost() {
  const [club, setClub] = useState('Rugby Club Nîmes')
  const [opponent, setOpponent] = useState('Alès')
  const [scoreClub, setScoreClub] = useState(24)
  const [scoreOpponent, setScoreOpponent] = useState(17)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [color, setColor] = useState('#2563eb')
  const [tone, setTone] = useState<DemoTone>('enthousiaste')
  const [copied, setCopied] = useState(false)

  const text = buildDemoText({ club, opponent, scoreClub, scoreOpponent, date, tone })
  const outcome = demoOutcome(scoreClub, scoreOpponent)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const num = (v: string) => Math.max(0, Math.min(999, parseInt(v, 10) || 0))

  return (
    <section id="demo" className="bg-subtle py-20">
      <div className="mx-auto max-w-4xl px-4">
        <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Démo</span>
        <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.2rem)] font-black tracking-[-0.03em] text-ink">
          Essayez avec votre club
        </h2>
        <p className="mt-2 text-[15px] text-muted">Sans compte. Rien n’est enregistré.</p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <label className="block text-sm font-semibold text-ink">
              Nom du club
              <input className={field} value={club} maxLength={60} onChange={(e) => setClub(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Adversaire
              <input className={field} value={opponent} maxLength={60} onChange={(e) => setOpponent(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-ink">
                Score du club
                <input className={field} type="number" inputMode="numeric" min={0} value={scoreClub} onChange={(e) => setScoreClub(num(e.target.value))} />
              </label>
              <label className="block text-sm font-semibold text-ink">
                Score adverse
                <input className={field} type="number" inputMode="numeric" min={0} value={scoreOpponent} onChange={(e) => setScoreOpponent(num(e.target.value))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-ink">
                Date
                <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-ink">
                Couleur
                <input className={`${field} h-[46px] p-1`} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Ton</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {DEMO_TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tone === t.id}
                    onClick={() => setTone(t.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      tone === t.id ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:bg-white/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </form>

          <div>
            <PostPreview
              initials={clubInitials(club)}
              name={club.trim() || 'Votre club'}
              subtitle={`${club.trim() || 'Votre club'} ${scoreClub}-${scoreOpponent} ${opponent.trim() || 'Adversaire'}`}
              color={color}
              visualEmoji={outcome === 'victoire' ? '🏆' : outcome === 'nul' ? '🤝' : '💪'}
              visualTitle={`${scoreClub} - ${scoreOpponent}`}
              text={text}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={copy}
                className="w-full rounded-btn border border-line bg-white px-6 py-3 text-[15px] font-semibold text-ink transition hover:bg-subtle sm:w-auto"
              >
                {copied ? 'Copié !' : 'Copier le texte'}
              </button>
              <Link
                href="/signup"
                className="w-full rounded-btn bg-brand px-6 py-3 text-center text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-hover sm:w-auto"
              >
                Créer mon compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
