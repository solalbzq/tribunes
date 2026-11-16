import Link from 'next/link'
import type { Metadata } from 'next'
import { EDITORIAL_CALENDAR, ideasForMonth } from '@/lib/editorialCalendar'

export const metadata: Metadata = {
  title: 'Calendrier éditorial de saison pour clubs sportifs — Tribunes',
  description:
    'Des idées de posts pour chaque mois de la saison, de septembre à juin. Gratuit, pour tous les clubs et associations sportives.',
}

export default function CalendrierEditorialPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">← Retour à l&apos;accueil</Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Que publier chaque mois de la saison ?
        </h1>
        <p className="mt-3 text-[15px] leading-[1.7] text-[#374151]">
          Un calendrier de septembre à juin pour votre club ou association, quel que soit votre sport.
          Choisissez une idée, Tribunes prépare le post pour vous.
        </p>

        <div className="mt-10 space-y-10">
          {EDITORIAL_CALENDAR.map((month) => (
            <section key={month.name} aria-labelledby={`mois-${month.name}`}>
              <h2 id={`mois-${month.name}`} className="text-xl font-bold text-[#111827]">{month.name}</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{month.moment}</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {ideasForMonth(month).map((idea) => (
                  <li key={idea.id} className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-4">
                    <div>
                      <h3 className="font-semibold text-[#111827]">{idea.label}</h3>
                      <p className="mt-1 text-sm leading-[1.6] text-[#374151]">{idea.objective}.</p>
                    </div>
                    <Link
                      href="/signup"
                      className="mt-4 inline-block self-start rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Créer ce post
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
