import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { SPORT_PAGES, getSportPage } from '@/lib/sportPages'

export const dynamicParams = false

export function generateStaticParams() {
  return SPORT_PAGES.map((p) => ({ sport: p.slug }))
}

type Props = { params: Promise<{ sport: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport } = await params
  const page = getSportPage(sport)
  if (!page) return {}
  const url = `/sport/${page.slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      locale: 'fr_FR',
      siteName: 'Tribunes',
      type: 'website',
      url,
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  }
}

export default async function SportPage({ params }: Props) {
  const { sport } = await params
  const page = getSportPage(sport)
  if (!page) notFound()

  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient-soft">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
            <p className="text-5xl" aria-hidden="true">{page.emoji}</p>
            <h1 className="mt-6 text-[clamp(1.8rem,4.5vw,3rem)] font-black leading-[1.1] tracking-[-0.03em] text-ink">
              {page.title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-muted">{page.hook}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/#demo"
                className="w-full rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-hover sm:w-auto"
              >
                Essayer sans compte
              </Link>
              <Link
                href="/signup"
                className="w-full rounded-btn border border-line bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-subtle sm:w-auto"
              >
                Créer un club
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-subtle py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-black tracking-[-0.02em] text-ink">
              Trois exemples de posts
            </h2>
            <p className="mt-2 text-center text-[14px] text-muted">
              Textes d’exemple inventés, pour illustrer le style. Les vôtres sont écrits à partir de vos infos.
            </p>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {page.examples.map((ex) => (
                <li key={ex.label} className="rounded-2xl border border-line bg-white p-5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">
                    Exemple · {ex.label}
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.7] text-ink">{ex.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
