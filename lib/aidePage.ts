// Contenu de la page publique /aide (FAQ). Statique : aucun appel base de données.
// Chaque réponse s'appuie sur le code indiqué dans `source` (non affiché sur le site).

export type FaqItem = {
  question: string
  answer: string
  source: string
}

export const AIDE_TITLE = 'Aide et questions fréquentes — Tribunes'
export const AIDE_DESCRIPTION =
  'Offre gratuite, connexion Facebook et Instagram, validation avant publication, conservation des données : les réponses aux questions des clubs.'

export const FAQ: FaqItem[] = [
  {
    question: 'Tribunes est-il gratuit ?',
    answer:
      'Oui, l’offre Découverte est gratuite : vous créez vos publications, vous les publiez vous-même et vous disposez de 3 générations par mois. Les offres Club (9,90 € par mois ou 99 € par an) et Pro (19,90 € par mois ou 199 € par an) sont optionnelles.',
    source: 'lib/plans.ts (PLANS)',
  },
  {
    question: 'Que se passe-t-il quand j’ai utilisé mes 3 générations gratuites ?',
    answer:
      'Vous ne pouvez plus générer de nouveau contenu jusqu’au mois suivant. Le compteur repart à zéro au début de chaque mois. L’offre Club n’a pas de limite de générations.',
    source: 'lib/quota.ts (checkAiQuota), lib/plans.ts',
  },
  {
    question: 'Puis-je essayer sans créer de compte ?',
    answer:
      'Oui, la page d’accueil propose un essai sans compte. Pour garder vos publications et celles de votre club, il faut créer un compte.',
    source: 'components/DemoPost.tsx (section #demo), lib/demoPost.ts',
  },
  {
    question: 'Tribunes publie-t-il à ma place sans me demander ?',
    answer:
      'Non, par défaut vous relisez chaque contenu et vous cliquez sur « Publier maintenant ». Seule l’offre Pro propose, si vous l’activez, un mode avec validation sur Telegram et un mode automatique. Même dans ce mode, un contenu qui contient une expression interdite attend votre relecture.',
    source: 'app/dashboard/PublishPanel.tsx, app/dashboard/SocialTab.tsx (AUTOMATION_MODES), lib/automation.ts',
  },
  {
    question: 'Comment connecter Facebook et Instagram ?',
    answer:
      'Dans votre espace, ouvrez l’onglet des réseaux et cliquez sur « Connecter Facebook et Instagram ». Vous devez gérer une Page Facebook. La publication sur Instagram passe par un compte professionnel. Vous choisissez ensuite les comptes sur lesquels publier.',
    source: 'app/dashboard/SocialTab.tsx (STATUS), app/dashboard/PublishPanel.tsx, app/confidentialite/page.tsx',
  },
  {
    question: 'Puis-je publier sur Facebook et Instagram avec l’offre gratuite ?',
    answer:
      'La publication directe sur Facebook et Instagram fait partie de l’offre Club. Avec l’offre gratuite, la publication est manuelle.',
    source: 'lib/plans.ts (features FREE et CLUB)',
  },
  {
    question: 'Comment déconnecter mes réseaux ?',
    answer:
      'Dans l’onglet des réseaux, chaque compte connecté peut être déconnecté. Vous pouvez aussi retirer l’accès depuis les paramètres de votre compte Meta.',
    source: 'app/dashboard/SocialTab.tsx (disconnect), app/confidentialite/page.tsx §6',
  },
  {
    question: 'Combien de temps mes brouillons sont-ils conservés ?',
    answer:
      'Les brouillons non traités, les publications rejetées ou en échec, et les publications déjà publiées sont supprimés automatiquement de l’historique après 30 jours.',
    source: 'app/api/cron/cleanup-posts/route.ts',
  },
  {
    question: 'Mes données sont-elles visibles par les autres clubs ?',
    answer:
      'Non. Chaque appel est vérifié côté serveur : un club n’accède qu’à ses propres comptes connectés et à ses propres publications.',
    source: 'app/api/social/publish/route.ts (clubId), lib/services/publish-service.ts (findClubGeneratedPost)',
  },
  {
    question: 'Quelles informations sur les joueurs sont utilisées ?',
    answer:
      'Pour un post « joueur à l’honneur », vous saisissez un nom et une performance, qui servent à écrire la publication et sont conservés dans votre espace. Ils ne sont jamais montrés à un autre club. Vous n’êtes pas obligé d’utiliser cette fonction.',
    source: 'prisma/schema.prisma (PlayerSpotlight), app/api/posts/player-spotlight/route.ts',
  },
]

export function faqJsonLd(items: FaqItem[] = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
}
