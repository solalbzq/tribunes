import Link from 'next/link'

export const metadata = {
  title: 'Politique de confidentialité — Tribunes',
}

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">← Retour à l'accueil</Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">Dernière mise à jour : juillet 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-[1.7] text-[#374151]">
          <section>
            <h2 className="text-lg font-bold text-[#111827]">1. Qui sommes-nous</h2>
            <p className="mt-2">
              Tribunes est un service édité pour aider les clubs sportifs à générer et publier leurs
              contenus réseaux sociaux. Pour toute question relative à vos données, vous pouvez nous
              contacter à <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]">tribunes@bzq.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">2. Données que nous collectons</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li><strong>Compte</strong> : adresse email et mot de passe (géré par notre prestataire d'authentification Supabase).</li>
              <li><strong>Club</strong> : nom, sport, couleurs, logo, et toute information optionnelle que vous renseignez (ville, effectifs, réseaux, etc.).</li>
              <li><strong>Contenus</strong> : résultats de matchs, programmes, textes et visuels générés, historique de publication.</li>
              <li><strong>Facturation</strong> : gérée par Stripe ; nous ne stockons pas vos coordonnées bancaires.</li>
              <li><strong>Réseaux sociaux connectés</strong> : si vous connectez une Page Facebook et/ou un compte Instagram professionnel, nous stockons un jeton d'accès permettant de publier en votre nom, uniquement sur les comptes que vous avez explicitement autorisés.</li>
              <li><strong>Telegram</strong> : si vous activez la validation par Telegram, nous stockons l'identifiant du salon de discussion lié à votre club.</li>
              <li><strong>Usage</strong> : compteurs de génération IA et de récupérations Ten'Up, pour appliquer les quotas de votre offre.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">3. Pourquoi nous les utilisons</h2>
            <p className="mt-2">
              Ces données servent uniquement à faire fonctionner le service : générer vos contenus,
              les publier sur les comptes que vous connectez, gérer votre abonnement et vous
              contacter au sujet de votre compte. Nous ne vendons aucune donnée à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">4. Prestataires utilisés</h2>
            <p className="mt-2">Pour fonctionner, Tribunes fait appel aux prestataires suivants, qui traitent les données strictement nécessaires à leur mission :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Supabase (authentification et base de données)</li>
              <li>Stripe (paiement et facturation)</li>
              <li>OpenAI (génération des textes de publication)</li>
              <li>Meta / Facebook (publication sur Facebook Pages et Instagram, à votre demande)</li>
              <li>Telegram (notifications de validation, si activées)</li>
              <li>Resend (envoi d'emails transactionnels)</li>
              <li>ScrapingBee (récupération des programmes Ten'Up FFT, pour les clubs de tennis/padel)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">5. Durée de conservation</h2>
            <p className="mt-2">
              Les brouillons non traités et les publications échouées ou rejetées sont supprimés
              automatiquement après 30 jours. Les données de votre compte et de votre club sont
              conservées tant que votre compte est actif, puis supprimées sur demande ou après une
              période d'inactivité prolongée.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">6. Vos droits</h2>
            <p className="mt-2">
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression
              et de portabilité de vos données. Vous pouvez également révoquer à tout moment l'accès
              de Tribunes à vos comptes Facebook/Instagram depuis les paramètres de votre club, ou
              depuis les paramètres de votre compte Meta. Pour exercer ces droits, contactez-nous à
              <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]"> tribunes@bzq.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">7. Cookies</h2>
            <p className="mt-2">
              Nous utilisons uniquement des cookies techniques nécessaires au fonctionnement du
              service (maintien de votre session de connexion). Aucun cookie publicitaire ou de
              tracking tiers n'est utilisé.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
