// Contenu des pages publiques /sport/[sport] (référencement). Statique : aucun appel base de données.
// Les posts sont des exemples fictifs, sans nom de joueur ni de club réels.

export type SportPage = {
  slug: string
  sport: string
  emoji: string
  title: string
  description: string
  hook: string
  examples: { label: string; text: string }[]
}

export const SPORT_PAGES: SportPage[] = [
  {
    slug: 'football',
    sport: 'Football',
    emoji: '⚽',
    title: 'Posts de résultats et de matchs pour votre club de football',
    description:
      'Résultat, annonce de match, convocation : Tribunes prépare vos publications de club de football en quelques secondes, prêtes pour vos réseaux.',
    hook: 'Un score, une mi-temps, quelques buteurs : votre publication de club de football est prête sans y passer la soirée.',
    examples: [
      { label: 'Résultat de match', text: '⚽ Belle victoire 3-1 de nos seniors ce dimanche ! Merci aux supporters venus nombreux. Prochain rendez-vous la semaine prochaine. #Football' },
      { label: 'Annonce de match', text: '⚽ Rendez-vous samedi à 15h au stade pour le match de nos U15. Venez les encourager ! #Football' },
      { label: 'Remerciements', text: '⚽ Merci à tous les bénévoles qui ont rendu cette journée de tournoi possible. Le club est fier de vous. #Football' },
    ],
  },
  {
    slug: 'tennis',
    sport: 'Tennis',
    emoji: '🎾',
    title: 'Posts d’interclubs et de tournois pour votre club de tennis',
    description:
      'Rencontre d’interclubs, tournoi, animation : Tribunes prépare les publications de votre club de tennis en quelques secondes, à relire avant de publier.',
    hook: 'Une rencontre d’interclubs, un tournoi interne : racontez-les à vos adhérents sans perdre de temps.',
    examples: [
      { label: 'Résultat d’interclubs', text: '🎾 Belle rencontre de notre équipe 1 : victoire 4 matchs à 2 ! Bravo à toute l’équipe et à son capitaine. #Tennis #Interclubs' },
      { label: 'Annonce de tournoi', text: '🎾 Notre tournoi interne approche ! Les inscriptions sont ouvertes au club-house. Tous niveaux bienvenus. #Tennis' },
      { label: 'Vie du club', text: '🎾 Les cours reprennent lundi pour les jeunes. Retrouvez les horaires au club ou en message privé. #Tennis' },
    ],
  },
  {
    slug: 'basketball',
    sport: 'Basketball',
    emoji: '🏀',
    title: 'Posts de résultats et de matchs pour votre club de basket',
    description:
      'Score par quart-temps, annonce de match, remerciements : Tribunes prépare les publications de votre club de basket en quelques secondes.',
    hook: 'Vos quarts-temps, votre score final, l’ambiance de la salle : une publication de basket prête en quelques secondes.',
    examples: [
      { label: 'Résultat de match', text: '🏀 Victoire 68-61 après un dernier quart-temps solide ! Merci au public pour l’ambiance dans la salle. #Basketball' },
      { label: 'Annonce de match', text: '🏀 Match à domicile samedi à 20h ! Venez soutenir nos seniors, entrée libre. #Basketball' },
      { label: 'Entraînement', text: '🏀 Séance ouverte aux nouveaux joueurs mercredi soir. Venez essayer, prêt de ballon assuré ! #Basketball' },
    ],
  },
  {
    slug: 'volleyball',
    sport: 'Volleyball',
    emoji: '🏐',
    title: 'Posts de résultats et de matchs pour votre club de volley',
    description:
      'Score en sets, annonce de match, tournoi : Tribunes prépare les publications de votre club de volley-ball en quelques secondes.',
    hook: 'Trois sets à deux, un tie-break à suspense : racontez vos matchs de volley sans perdre de temps.',
    examples: [
      { label: 'Résultat de match', text: '🏐 Victoire 3 sets à 2 au tie-break ! Un match plein de suspense. Bravo à toute l’équipe. #Volleyball' },
      { label: 'Annonce de match', text: '🏐 Match à domicile vendredi soir. Venez nombreux pour pousser l’équipe ! #Volleyball' },
      { label: 'Tournoi', text: '🏐 Notre tournoi de volley mixte revient. Inscrivez votre équipe auprès du club. #Volleyball' },
    ],
  },
  {
    slug: 'handball',
    sport: 'Handball',
    emoji: '🤾',
    title: 'Posts de résultats et de matchs pour votre club de handball',
    description:
      'Résultat, mi-temps, annonce de match : Tribunes prépare les publications de votre club de handball en quelques secondes, prêtes pour vos réseaux.',
    hook: 'Un score, une mi-temps, un gardien en forme : votre publication de handball est prête en quelques secondes.',
    examples: [
      { label: 'Résultat de match', text: '🤾 Victoire 27-22 à domicile ! Une défense solide et un gardien en grande forme. Merci au public. #Handball' },
      { label: 'Annonce de match', text: '🤾 Rendez-vous samedi à 18h au gymnase pour le match de nos seniors. Venez les encourager ! #Handball' },
      { label: 'Vie du club', text: '🤾 Les inscriptions sont ouvertes pour la nouvelle saison, de l’école de hand aux seniors. #Handball' },
    ],
  },
]

export function getSportPage(slug: string): SportPage | undefined {
  return SPORT_PAGES.find((p) => p.slug === slug)
}
