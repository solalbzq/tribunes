import Link from 'next/link'

export const metadata = {
  title: 'Conditions générales de vente et d’utilisation — Tribunes',
}

export default function CgvPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">← Retour à l'accueil</Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Conditions générales de vente et d&apos;utilisation
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">Dernière mise à jour : juillet 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-[1.7] text-[#374151]">
          <section>
            <h2 className="text-lg font-bold text-[#111827]">1. Objet</h2>
            <p className="mt-2">
              Les présentes conditions générales de vente et d&apos;utilisation (« CGV ») régissent l&apos;accès
              et l&apos;utilisation du service Tribunes, édité par MiouKi (voir nos <Link href="/mentions-legales" className="text-[#2563eb]">mentions légales</Link>).
              Tribunes est un service en ligne qui génère et permet de publier des contenus réseaux
              sociaux pour des clubs sportifs amateurs, à partir des résultats, programmes et
              informations fournis par le club.
            </p>
            <p className="mt-2">
              Toute création de compte ou souscription à une offre payante implique l&apos;acceptation
              pleine et entière des présentes CGV.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">2. Offres et tarifs</h2>
            <p className="mt-2">Tribunes propose trois offres, sans engagement de durée :</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li><strong>Découverte (gratuit)</strong> : jusqu&apos;à 3 publications par mois, publication manuelle, logo Tribunes apposé sur les visuels.</li>
              <li><strong>Club</strong> : 9,90&nbsp;€/mois ou 99&nbsp;€/an, publications illimitées, sans marque Tribunes, personnalisation complète.</li>
              <li><strong>Pro</strong> : 19,90&nbsp;€/mois ou 199&nbsp;€/an, multi-comptes pour le même club.</li>
            </ul>
            <p className="mt-2">
              Les tarifs sont indiqués en euros. En tant qu&apos;entrepreneur individuel bénéficiant du
              régime de la micro-entreprise, la TVA n&apos;est pas applicable (article 293 B du Code général
              des impôts), sauf évolution du statut ou dépassement du seuil de franchise en base, auquel
              cas les tarifs affichés seraient ajustés en conséquence pour les nouveaux abonnements.
            </p>
            <p className="mt-2">
              Tribunes se réserve le droit de faire évoluer ses tarifs. Toute évolution tarifaire sera
              communiquée aux abonnés en cours avant son application et ne s&apos;appliquera qu&apos;au
              renouvellement suivant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">3. Souscription et paiement</h2>
            <p className="mt-2">
              La souscription à une offre payante et le paiement sont gérés par notre prestataire
              Stripe. En souscrivant, vous autorisez Tribunes à prélever, via Stripe, le montant de
              l&apos;abonnement choisi de façon récurrente (mensuelle ou annuelle) jusqu&apos;à résiliation.
              Tribunes ne stocke aucune donnée bancaire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">4. Durée, résiliation et changement d&apos;offre</h2>
            <p className="mt-2">
              Les abonnements Club et Pro sont sans engagement : vous pouvez résilier à tout moment
              depuis l&apos;espace « Compte » (portail de facturation Stripe). La résiliation prend effet à
              la fin de la période déjà payée (mensuelle ou annuelle) ; aucun remboursement au prorata
              n&apos;est effectué pour la période en cours. Vous pouvez également changer d&apos;offre (upgrade
              ou downgrade) à tout moment depuis le même espace.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">5. Droit de rétractation</h2>
            <p className="mt-2">
              Conformément à l&apos;article L221-18 du Code de la consommation, vous disposez en principe
              d&apos;un délai de 14 jours pour exercer votre droit de rétractation sur un service souscrit
              à distance. Toutefois, s&apos;agissant d&apos;un service numérique dont l&apos;exécution commence
              immédiatement après souscription à votre demande expresse, vous reconnaissez, en validant
              votre abonnement, renoncer à votre droit de rétractation une fois le service pleinement
              exécuté (article L221-28 13° du Code de la consommation). Tant que l&apos;exécution n&apos;est pas
              complète, vous pouvez exercer ce droit en nous contactant à{' '}
              <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]">tribunes@bzq.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">6. Disponibilité et responsabilité</h2>
            <p className="mt-2">
              Tribunes met en œuvre les moyens raisonnables pour assurer un service accessible et
              fiable, sans garantie de disponibilité continue. Certaines fonctionnalités (publication
              Facebook/Instagram, récupération automatique des programmes Ten&apos;Up FFT) dépendent de
              services tiers (Meta, fédérations sportives) sur lesquels Tribunes n&apos;a pas de contrôle :
              Tribunes ne saurait être tenu responsable d&apos;une indisponibilité, d&apos;un changement de
              règles ou d&apos;une suspension d&apos;accès imputable à ces tiers.
            </p>
            <p className="mt-2">
              Le club reste seul responsable du contenu qu&apos;il choisit de publier sur ses comptes
              réseaux sociaux via Tribunes, y compris lorsque ce contenu est généré automatiquement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">7. Propriété intellectuelle et données</h2>
            <p className="mt-2">
              Voir nos <Link href="/mentions-legales" className="text-[#2563eb]">mentions légales</Link> pour
              la propriété intellectuelle et notre{' '}
              <Link href="/confidentialite" className="text-[#2563eb]">politique de confidentialité</Link>{' '}
              pour le traitement de vos données personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">8. Réclamations et litiges</h2>
            <p className="mt-2">
              Pour toute réclamation, contactez-nous d&apos;abord à{' '}
              <a href="mailto:tribunes@bzq.fr" className="text-[#2563eb]">tribunes@bzq.fr</a>. À défaut de
              résolution amiable, les présentes CGV sont soumises au droit français et les tribunaux
              français seront seuls compétents, sous réserve des dispositions d&apos;ordre public protectrices
              du consommateur.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
