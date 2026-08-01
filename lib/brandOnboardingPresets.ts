/**
 * Presets de l'onboarding rapide — chaque preset ne combine que des
 * paramètres réellement appliqués par le moteur existant (contentTone,
 * couleurs, consignes injectées dans le prompt). Pas de réglage visuel
 * (densité, formes...) tant que le moteur de rendu ne le permet pas
 * réellement — cf. docs/brand-kit-plan.md §33.
 */
export type OnboardingPreset = {
  key: string
  label: string
  description: string
  contentTone: 'STANDARD' | 'FUN' | 'SOBER'
  primaryColor: string
  secondaryColor: string
  instructions: string
}

export const ONBOARDING_PRESETS: OnboardingPreset[] = [
  {
    key: 'familial',
    label: 'Club familial',
    description: 'Chaleureux, proche des familles et des jeunes',
    contentTone: 'FUN',
    primaryColor: '#6b1a2a',
    secondaryColor: '#f5e6d3',
    instructions: 'Mets en avant la convivialité, les familles et les jeunes du club.',
  },
  {
    key: 'competiteur',
    label: 'Club compétiteur',
    description: 'Factuel, centré sur la performance sportive',
    contentTone: 'SOBER',
    primaryColor: '#111827',
    secondaryColor: '#2563eb',
    instructions: 'Insiste sur la performance sportive et les résultats, reste factuel.',
  },
  {
    key: 'institutionnel',
    label: 'Club institutionnel',
    description: 'Officiel, respectueux, tourné vers les partenaires',
    contentTone: 'SOBER',
    primaryColor: '#0a1628',
    secondaryColor: '#f5a623',
    instructions: 'Adopte un ton officiel et respectueux, mentionne les partenaires institutionnels.',
  },
  {
    key: 'communautaire',
    label: 'Club communautaire',
    description: 'Valorise les bénévoles et la vie associative',
    contentTone: 'FUN',
    primaryColor: '#1a3d2b',
    secondaryColor: '#ffffff',
    instructions: "Valorise les bénévoles, l'entraide et la vie associative du club.",
  },
  {
    key: 'moderne',
    label: 'Club moderne',
    description: 'Dynamique et direct, ton contemporain',
    contentTone: 'STANDARD',
    primaryColor: '#0d0d0d',
    secondaryColor: '#00d4ff',
    instructions: 'Reste dynamique et direct, avec un ton contemporain.',
  },
]
