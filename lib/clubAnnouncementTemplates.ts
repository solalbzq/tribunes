import type { ClubAnnouncementCategory } from '@/lib/prompts/club-announcement'

export type ClubAnnouncementTemplate = {
  key: string
  label: string
  category: ClubAnnouncementCategory
  title: string
  description: string
}

/** Modèles d'annonce : des consignes à compléter, sans aucune donnée inventée. */
export const CLUB_ANNOUNCEMENT_TEMPLATES: ClubAnnouncementTemplate[] = [
  {
    key: 'match-reporte',
    label: 'Match reporté',
    category: 'CLUB_LIFE',
    title: 'Match de [équipe] reporté',
    description:
      "Match de [équipe] reporté : explique la raison et la nouvelle date si elle est connue. Précise ce que les supporters doivent faire (billets, déplacement).",
  },
  {
    key: 'appel-benevoles',
    label: 'Appel à bénévoles',
    category: 'VOLUNTEER',
    title: 'Nous cherchons des bénévoles',
    description:
      "Explique pour quel événement ou quelle mission le club cherche des bénévoles, quand et où, combien de temps cela demande, et comment se faire connaître.",
  },
  {
    key: 'remerciement-sponsor',
    label: 'Merci à un sponsor',
    category: 'THANKS',
    title: 'Merci à [nom du sponsor]',
    description:
      "Remercie [nom du sponsor] et explique concrètement ce que son soutien permet au club (équipement, déplacements, événement…).",
  },
  {
    key: 'inscriptions-ouvertes',
    label: 'Inscriptions ouvertes',
    category: 'RECRUITMENT',
    title: 'Les inscriptions sont ouvertes',
    description:
      "Indique pour quelles catégories ou quels groupes les inscriptions sont ouvertes, jusqu'à quand, les pièces à fournir et où s'inscrire.",
  },
  {
    key: 'assemblee-generale',
    label: 'Assemblée générale',
    category: 'CLUB_LIFE',
    title: 'Assemblée générale du club',
    description:
      "Invite les adhérents à l'assemblée générale : précise la date, l'heure, le lieu et les sujets à l'ordre du jour. Rappelle que tous les membres sont les bienvenus.",
  },
]
