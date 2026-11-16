const PLACEHOLDER = /\[[^\[\]\n]+\]/g

// Vérifie un post avant de le copier ou de le publier.
// V1 : repère seulement les crochets non remplis, ex. « [équipe] ».
// Les alertes ne bloquent jamais : l'utilisateur décide.
export function checkPostBeforePublish(text: string): string[] {
  const found = Array.from(new Set(text.match(PLACEHOLDER) ?? []))
  if (found.length === 0) return []
  const label = found.length === 1 ? 'Il reste un passage à compléter' : `Il reste ${found.length} passages à compléter`
  return [`${label} : ${found.join(', ')}`]
}
