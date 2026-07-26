import Link from 'next/link'

export const metadata = {
  title: 'Mentions légales — Tribunes',
}

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">← Retour à l'accueil</Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Mentions légales
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">Dernière mise à jour : juillet 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-[1.7] text-[#374151]">
          <section>
            <h2 className="text-lg font-bold text-[#111827]">1. Éditeur du site</h2>
            <p className="mt-2">
              Le site et le service Tribunes sont édités par :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>[À COMPLÉTER : Nom et prénom de l'entrepreneur individuel]</li>
              <li>Entreprise individuelle (micro-entrepreneur)</li>
              <li>Adresse : [À COMPLÉTER : adresse du siège / domicile de l'entreprise]</li>
              <li>SIRET : [À COMPLÉTER dès réception du numéro SIRET]</li>
              <li>TVA : [À COMPLÉTER — a priori TVA non applicable, art. 293 B du CGI, sauf dépassement du seuil de franchise en base]</li>
              <li>Email : <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]">tribunes@bzq.fr</a></li>
            </ul>
            <p className="mt-2 text-sm text-[#6b7280]">
              Directeur de la publication : [À COMPLÉTER : nom et prénom].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">2. Hébergement</h2>
            <p className="mt-2">
              Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
              (<a href="https://vercel.com" className="text-[#2563eb]" target="_blank" rel="noopener noreferrer">vercel.com</a>).
              La base de données et l'authentification sont hébergées par Supabase Inc.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">3. Propriété intellectuelle</h2>
            <p className="mt-2">
              L'ensemble des éléments du site Tribunes (textes, logos, visuels, code, marque) est
              protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation,
              totale ou partielle, sans autorisation préalable, est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">4. Contenus générés par les utilisateurs</h2>
            <p className="mt-2">
              Les contenus (textes, visuels) générés via Tribunes à partir des données fournies par un
              club (résultats, programmes, logo) restent la propriété du club qui les a générés. Le club
              est seul responsable de la publication de ces contenus sur ses comptes réseaux sociaux.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">5. Données personnelles</h2>
            <p className="mt-2">
              Le traitement des données personnelles est détaillé dans notre{' '}
              <Link href="/confidentialite" className="text-[#2563eb]">politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">6. Contact</h2>
            <p className="mt-2">
              Pour toute question relative au site ou au service, contactez-nous à{' '}
              <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]">tribunes@bzq.fr</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
