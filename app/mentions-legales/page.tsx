import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Tribunes",
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/" className="text-sm font-semibold text-[#2563eb]">
          ← Retour à l'accueil
        </Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.02em] text-[#111827]">
          Mentions légales
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Dernière mise à jour : juillet 2026
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-[1.7] text-[#374151]">
          <section>
            <h2 className="text-lg font-bold text-[#111827]">
              1. Éditeur du site
            </h2>
            <p className="mt-2">
              Le site et le service Tribunes sont édités par MiouKi.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Nom : MiouKi</li>
              <li>Adresse : 143 Rue des Moulins, 30640 Beauvoisin, France</li>
              <li>
                Email :{" "}
                <a href="mailto:solal@bzq.fr" className="text-[#2563eb]">
                  solal@bzq.fr
                </a>
              </li>
            </ul>
            <p className="mt-2 text-sm text-[#6b7280]">
              Directeur de la publication : Bouzanquet Solal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">2. Hébergement</h2>
            <p className="mt-2">
              Le site est actuellement hébergé et administré par l&apos;éditeur,
              Bouzanquet Solal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">
              3. Propriété intellectuelle
            </h2>
            <p className="mt-2">
              L&apos;ensemble des contenus présents sur le site Tribunes,
              notamment les textes, visuels, logos, éléments graphiques et code,
              est protégé par le droit applicable à la propriété intellectuelle.
              Toute reproduction, représentation ou exploitation, même
              partielle, sans autorisation préalable, est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">
              4. Responsabilité
            </h2>
            <p className="mt-2">
              Tribunes met à disposition un service de création et de
              publication de contenus pour les clubs sportifs. L&apos;éditeur
              s&apos;efforce d&apos;assurer l&apos;exactitude des informations
              présentées sur le site, sans pouvoir en garantir
              l&apos;exhaustivité ni l&apos;absence d&apos;erreur.
              L&apos;utilisateur reste responsable des informations, contenus et
              éléments qu&apos;il transmet, valide ou publie via le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">
              5. Données personnelles
            </h2>
            <p className="mt-2">
              Le traitement des données personnelles est détaillé dans notre{" "}
              <Link href="/confidentialite" className="text-[#2563eb]">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#111827]">6. Contact</h2>
            <p className="mt-2">
              Pour toute question relative au site ou au service, contactez-nous
              à{" "}
              <a href="mailto:solal@bzq.fr" className="text-[#2563eb]">
                solal@bzq.fr
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
