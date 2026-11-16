import Link from 'next/link'
import type { Metadata } from 'next'
import HashtagTool from './HashtagTool'

export const metadata: Metadata = {
  title: 'Générateur de hashtags pour club sportif — Tribunes',
  description:
    'Choisissez votre sport et le type de publication : obtenez des hashtags prêts à copier pour votre club ou association. Gratuit, sans inscription.',
}

export default function HashtagsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">← Retour à l&apos;accueil</Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Des hashtags pour les publications de votre club
        </h1>
        <p className="mt-3 text-[15px] leading-[1.7] text-[#374151]">
          Gratuit, sans inscription. Rien n&apos;est enregistré : tout se calcule sur votre écran.
        </p>
        <HashtagTool />
        <div className="mt-10 rounded-xl border border-[#e5e7eb] bg-white p-4">
          <p className="font-semibold text-[#111827]">Envie d&apos;un post complet ?</p>
          <p className="mt-1 text-sm text-[#374151]">Tribunes prépare le texte de vos publications en quelques secondes.</p>
          <Link href="/signup" className="mt-3 inline-block rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
            Essayer Tribunes
          </Link>
        </div>
      </div>
    </main>
  )
}
