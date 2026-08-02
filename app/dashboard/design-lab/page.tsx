import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

/**
 * Page interne au prototype "Design Engine" — jamais liée dans la navigation du
 * dashboard, accessible uniquement en connaissant l'URL. Sert uniquement à comparer
 * visuellement le nouveau moteur (Satori, cf. lib/designEngine/) au moteur actuel, sans
 * aucun impact sur le parcours utilisateur normal. Cf. docs/design-engine-plan.md §7.
 */
export default async function DesignLabPage({ searchParams }: { searchParams: { matchId?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) redirect('/dashboard')

  const matches = await prisma.matchResult.findMany({
    where: { clubId: club.id },
    orderBy: { date: 'desc' },
    take: 10,
  })

  const selected = matches.find(m => m.id === searchParams.matchId) ?? matches[0]

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-black text-ink">Design Engine — prototype interne</h1>
        <p className="mt-1 text-sm text-muted">
          Comparaison du nouveau moteur de composition (serveur, Satori) — n&apos;affecte aucun visuel réel du club.
          Voir <code>docs/design-engine-plan.md</code>.
        </p>
      </div>

      {matches.length === 0 || !selected ? (
        <p className="text-sm text-muted">Aucun match enregistré pour ce club — génère au moins un résultat pour tester.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {matches.map(m => (
              <a
                key={m.id}
                href={`/dashboard/design-lab?matchId=${m.id}`}
                className={`rounded-btn border px-3 py-1.5 text-sm font-semibold transition ${
                  m.id === selected.id ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:border-gray-300'
                }`}
              >
                {m.opponent} · {m.homeScore}-{m.awayScore}
              </a>
            ))}
          </div>

          {(['minimal', 'editorial', 'bold', 'premium', 'dynamic'] as const).map(family => (
            <div key={family} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Famille — {family}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map(seed => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={seed}
                    src={`/api/design-lab/render?matchId=${selected.id}&family=${family}&seed=${seed}`}
                    alt={`${family} variante ${seed}`}
                    className="w-full rounded-lg border border-line shadow-sm"
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
