// Contenu des pages publiques /modeles/[type] (référencement). Statique : aucun appel base de données.
// Les exemples sont fictifs, sans nom de joueur ni de club réels.

export type ModelPage = {
  slug: string
  emoji: string
  title: string
  description: string
  hook: string
  tips: string[]
  examples: { label: string; text: string }[]
}

export const MODEL_PAGES: ModelPage[] = [
  {
    slug: 'recrutement-licencies',
    emoji: '🙋',
    title: 'Modèles de posts pour recruter de nouveaux licenciés',
    description:
      'Des exemples de publications pour inviter de nouveaux adhérents à rejoindre votre club ou association sportive, et des conseils pour les écrire.',
    hook: 'Nouvelle saison, portes ouvertes, séance d’essai : donnez envie de rejoindre votre club.',
    tips: [
      'Dites à qui s’adresse le post : enfants, adultes, débutants.',
      'Indiquez où, quand et comment s’inscrire.',
      'Proposez une séance d’essai si le club en offre une.',
    ],
    examples: [
      { label: 'Ouverture des inscriptions', text: '🙋 Les inscriptions sont ouvertes ! Enfants et adultes, débutants ou confirmés, venez essayer lors de nos séances de découverte. Renseignements au club.' },
      { label: 'Portes ouvertes', text: '🎉 Portes ouvertes ce samedi au gymnase : venez rencontrer les entraîneurs et tester l’activité. Entrée libre pour toute la famille.' },
      { label: 'Il reste des places', text: '📣 Il reste quelques places dans nos groupes de jeunes. Un essai est possible : écrivez-nous en message privé.' },
    ],
  },
  {
    slug: 'remerciement-benevoles',
    emoji: '🤝',
    title: 'Modèles de posts pour remercier les bénévoles de votre club',
    description:
      'Des exemples de messages de remerciement pour les bénévoles de votre club ou association, et des conseils pour qu’ils sonnent juste.',
    hook: 'Sans eux, rien ne se fait. Un mot sincère suffit souvent à leur faire plaisir.',
    tips: [
      'Citez l’événement ou la mission concrète.',
      'Restez simple et sincère, sans en faire trop.',
      'Ne nommez une personne que si elle est d’accord.',
    ],
    examples: [
      { label: 'Après un événement', text: '🤝 Un grand merci aux bénévoles qui ont installé, tenu la buvette et rangé après notre journée. Le club ne tourne que grâce à vous.' },
      { label: 'Fin de saison', text: '❤️ Merci à celles et ceux qui donnent de leur temps toute l’année : transport, arbitrage, entraînements. Bonnes vacances bien méritées !' },
      { label: 'Appel aux bonnes volontés', text: '🙌 Merci à nos bénévoles ! Et si l’aventure vous tente, il reste de la place dans l’équipe : parlez-en à un membre du bureau.' },
    ],
  },
  {
    slug: 'annonce-tournoi',
    emoji: '🏆',
    title: 'Modèles de posts pour annoncer un tournoi',
    description:
      'Des exemples d’annonces de tournoi pour votre club ou association sportive, et la liste des informations à ne pas oublier.',
    hook: 'Date, lieu, inscriptions : tout ce qu’il faut pour qu’on vienne nombreux.',
    tips: [
      'Mettez la date, l’heure et le lieu dès la première ligne.',
      'Précisez les catégories et comment s’inscrire.',
      'Annoncez la buvette ou les animations si elles existent.',
    ],
    examples: [
      { label: 'Annonce', text: '🏆 Notre tournoi annuel aura lieu le dernier week-end du mois, au gymnase. Inscriptions ouvertes auprès du club. Venez nombreux !' },
      { label: 'Dernier rappel', text: '⏰ Dernier rappel : les inscriptions au tournoi se terminent bientôt. Il reste quelques places, écrivez-nous vite.' },
      { label: 'Veille de tournoi', text: '📅 C’est demain ! Rendez-vous dès l’ouverture des portes. Buvette sur place, ambiance conviviale garantie.' },
    ],
  },
  {
    slug: 'remerciement-sponsor',
    emoji: '💙',
    title: 'Modèles de posts pour remercier un sponsor ou partenaire',
    description:
      'Des exemples de messages de remerciement pour les sponsors et partenaires de votre club, et des conseils pour valoriser leur soutien.',
    hook: 'Un partenaire qui se sent remercié reste souvent fidèle. Le dire publiquement compte.',
    tips: [
      'Dites concrètement à quoi leur aide a servi.',
      'Mentionnez l’entreprise avec son accord.',
      'Invitez les adhérents à soutenir ce partenaire.',
    ],
    examples: [
      { label: 'Nouveau partenaire', text: '💙 Bienvenue à notre nouveau partenaire, qui rejoint l’aventure du club cette saison. Merci pour votre confiance et votre soutien !' },
      { label: 'Remise d’équipements', text: '👕 Grâce à un partenaire local, nos jeunes ont de nouveaux maillots. Merci pour ce soutien qui fait vraiment plaisir à tous !' },
      { label: 'Fidèle partenaire', text: '🤝 Merci à nos partenaires qui nous accompagnent saison après saison. Pensez à eux lors de vos achats !' },
    ],
  },
  {
    slug: 'annonce-stage',
    emoji: '🏅',
    title: 'Modèles de posts pour annoncer un stage sportif',
    description:
      'Des exemples d’annonces de stage pour votre club ou association sportive, et la liste des informations à ne pas oublier.',
    hook: 'Vacances scolaires, perfectionnement, découverte : donnez envie de s’inscrire au stage.',
    tips: [
      'Indiquez les dates, les horaires et le lieu.',
      'Précisez l’âge ou le niveau concerné.',
      'Donnez le tarif et la façon de s’inscrire, avec le nombre de places.',
    ],
    examples: [
      { label: 'Annonce', text: '🏅 Un stage est organisé pendant les vacances, pour les jeunes de tous niveaux. Places limitées : inscriptions auprès du club.' },
      { label: 'Il reste des places', text: '📣 Il reste quelques places pour notre stage ! Au programme : progrès, jeux et bonne humeur. Écrivez-nous pour réserver.' },
      { label: 'Infos pratiques', text: '🎒 Pour le stage, pensez à votre tenue, une gourde et un pique-nique. Rendez-vous à l’heure indiquée à l’entrée du gymnase.' },
    ],
  },
  {
    slug: 'fermeture-salle',
    emoji: '🚧',
    title: 'Modèles de posts pour annoncer la fermeture d’une salle',
    description:
      'Des exemples de messages pour prévenir vos adhérents de la fermeture d’une salle ou d’un équipement, et des conseils pour bien les écrire.',
    hook: 'Travaux, compétition, jour férié : prévenez vite pour que personne ne se déplace pour rien.',
    tips: [
      'Dites clairement quelle salle est fermée et jusqu’à quand.',
      'Expliquez la raison en une phrase.',
      'Indiquez si les séances sont annulées, déplacées ou maintenues ailleurs.',
    ],
    examples: [
      { label: 'Fermeture ponctuelle', text: '🚧 La salle sera fermée ce week-end. Les séances sont annulées, elles reprennent normalement la semaine suivante.' },
      { label: 'Séances déplacées', text: '📍 Pendant les travaux, les entraînements ont lieu dans une autre salle. Les horaires ne changent pas. Merci de votre compréhension.' },
      { label: 'Réouverture', text: '✅ Bonne nouvelle : la salle rouvre ! On vous retrouve aux horaires habituels dès la reprise.' },
    ],
  },
  {
    slug: 'soiree-loto',
    emoji: '🎟️',
    title: 'Modèles de posts pour annoncer une soirée loto',
    description:
      'Des exemples d’annonces de soirée loto pour votre club ou association, et la liste des informations à ne pas oublier.',
    hook: 'Une soirée loto fait vivre le club : donnez à tous l’envie de venir jouer.',
    tips: [
      'Mettez la date, l’heure d’ouverture des portes et le lieu.',
      'Précisez le prix des cartons et les lots à gagner.',
      'Annoncez la buvette et si la réservation est conseillée.',
    ],
    examples: [
      { label: 'Annonce', text: '🎟️ Soirée loto du club ! Venez tenter votre chance en famille ou entre amis. Buvette sur place, réservation conseillée.' },
      { label: 'Les lots', text: '🎁 De nombreux lots sont à gagner lors de notre loto. Le bénéfice aide à financer les activités des jeunes du club.' },
      { label: 'Veille de loto', text: '📅 C’est demain soir ! Ouverture des portes avant le début des parties. À très vite pour passer un bon moment.' },
    ],
  },
]

export function getModelPage(slug: string): ModelPage | undefined {
  return MODEL_PAGES.find((p) => p.slug === slug)
}
