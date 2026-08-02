// Génération pseudo-aléatoire déterministe — la variation du Design Engine ne doit
// jamais sembler aléatoire : une même graine (dérivée du contenu) doit toujours
// reproduire la même composition, deux contenus différents doivent en produire des
// différentes. Cf. docs/design-engine-plan.md §5.5.

/** Hash simple d'une chaîne en entier 32 bits — pour dériver une graine d'un id de contenu. */
export function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** mulberry32 — PRNG rapide, déterministe, suffisant pour des choix de composition (pas de la crypto). */
export function createRng(seed: number): () => number {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Choisit un élément dans une liste via le rng fourni — évite de refaire `arr[Math.floor(rng()*arr.length)]` partout. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}
