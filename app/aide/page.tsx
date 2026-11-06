import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { AIDE_DESCRIPTION, AIDE_TITLE, FAQ, faqJsonLd } from '@/lib/aidePage'

export const metadata: Metadata = {
  title: AIDE_TITLE,
  description: AIDE_DESCRIPTION,
  alternates: { canonical: '/aide' },
  openGraph: {
    title: AIDE_TITLE,
    description: AIDE_DESCRIPTION,
    locale: 'fr_FR',
    siteName: 'Tribunes',
    type: 'website',
    url: '/aide',
  },
}

export default function AidePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient-soft">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
            <h1 className="text-[clamp(1.8rem,4.5vw,3rem)] font-black leading-[1.1] tracking-[-0.03em] text-ink">
              Aide et questions fréquentes
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.7] text-muted">
              Les réponses aux questions que se posent les clubs avant de commencer.
            </p>
          </div>
        </section>

        <section className="bg-subtle py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <ul className="space-y-4">
              {FAQ.map((item) => (
                <li key={item.question} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 className="text-[17px] font-bold leading-snug text-ink">{item.question}</h2>
                  <p className="mt-2 text-[15px] leading-[1.7] text-muted">{item.answer}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-center text-[15px] text-muted">
              Une autre question ? Écrivez-nous à{' '}
              <a href="mailto:tribunes@bzq.fr" className="font-semibold text-brand">tribunes@bzq.fr</a>.
            </p>
            <div className="mt-6 text-center">
              <Link
                href="/signup"
                className="inline-block rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-hover"
              >
                Créer un club
              </Link>
            </div>
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c') }}
      />
      <Footer />
    </>
  )
}
