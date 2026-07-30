import { resolvePlanForClub } from './org'
import { PLANS } from './plans'
import { publishGeneratedPost } from './services/publish-service'
import { notifyPendingReview } from './services/telegram-notify'

export type AutomationMode = 'MANUAL' | 'AUTO_REVIEW' | 'FULL_AUTO'
export const AUTOMATION_MODES: AutomationMode[] = ['MANUAL', 'AUTO_REVIEW', 'FULL_AUTO']

type ClubForAutomation = {
  id: string
  automationMode: string
  orgId: string | null
  userId: string
  telegramChatId: string | null
}

export async function checkAutomationAllowed(club: { orgId: string | null; userId: string }): Promise<boolean> {
  const { plan } = await resolvePlanForClub(club)
  return PLANS[plan].quotas.automationEnabled
}

/**
 * Mode effectif d'un club : retombe sur MANUAL si le plan ne permet plus
 * l'automatisation (ex: rétrogradation) même si Club.automationMode est resté
 * sur une valeur automatisée — défense en profondeur, en plus du contrôle à
 * l'écriture dans app/api/clubs/automation/route.ts.
 */
export async function resolveEffectiveMode(club: ClubForAutomation): Promise<AutomationMode> {
  if (club.automationMode !== 'AUTO_REVIEW' && club.automationMode !== 'FULL_AUTO') return 'MANUAL'
  const allowed = await checkAutomationAllowed(club)
  return allowed ? (club.automationMode as AutomationMode) : 'MANUAL'
}

/** Statut initial à utiliser à la création d'un GeneratedPost, selon le mode effectif du club. */
export async function resolveInitialStatus(club: ClubForAutomation): Promise<'DRAFT' | 'PENDING_REVIEW'> {
  const mode = await resolveEffectiveMode(club)
  return mode === 'AUTO_REVIEW' ? 'PENDING_REVIEW' : 'DRAFT'
}

/**
 * Effets de bord à déclencher juste après la création des GeneratedPost d'une
 * génération, une fois leurs id connus. À appeler dans chaque route de
 * génération après le(s) create/createMany, avec les lignes fraîchement créées.
 *
 * - MANUAL : rien, statu quo (relecture dans le dashboard).
 * - AUTO_REVIEW : envoie l'aperçu Telegram (Publier/Rejeter) pour chaque post
 *   publiable (facebook/instagram) ; les posts whatsapp restent en attente,
 *   visibles/rejetables dans le dashboard mais pas notifiés (pas de bouton
 *   Publier possible pour eux, aucune API de publication whatsapp).
 * - FULL_AUTO : publie immédiatement chaque post publiable.
 */
export async function runAutomationSideEffects(
  club: ClubForAutomation,
  posts: Array<{ id: string; platform: string; content: string; imageUrl: string | null }>
): Promise<void> {
  const mode = await resolveEffectiveMode(club)
  if (mode === 'MANUAL') return

  const publishable = posts.filter(p => p.platform === 'facebook' || p.platform === 'instagram')

  if (mode === 'FULL_AUTO') {
    for (const post of publishable) {
      await publishGeneratedPost({ clubId: club.id, generatedPostId: post.id })
    }
    return
  }

  // mode === 'AUTO_REVIEW'
  for (const post of publishable) {
    await notifyPendingReview(club, post)
  }
}

/**
 * Variante de resolveInitialStatus/runAutomationSideEffects pour un contenu
 * moins contraint qu'un type structuré (CUSTOM_POST : texte libre sans les
 * garde-fous factuels d'un formulaire — score, adversaire, enum fermé...).
 * FULL_AUTO y est traité comme AUTO_REVIEW : jamais de publication
 * automatique sans relecture humaine pour ce type de contenu, quel que soit
 * le mode d'automatisation du club. Cf. analyse assistant conversationnel —
 * risque de contenu ambigu ou sensible publié sans revue.
 */
export async function resolveInitialStatusUnconstrained(club: ClubForAutomation): Promise<'DRAFT' | 'PENDING_REVIEW'> {
  const mode = await resolveEffectiveMode(club)
  return mode === 'MANUAL' ? 'DRAFT' : 'PENDING_REVIEW'
}

export async function runAutomationSideEffectsUnconstrained(
  club: ClubForAutomation,
  posts: Array<{ id: string; platform: string; content: string; imageUrl: string | null }>
): Promise<void> {
  const mode = await resolveEffectiveMode(club)
  if (mode === 'MANUAL') return

  const publishable = posts.filter(p => p.platform === 'facebook' || p.platform === 'instagram')
  for (const post of publishable) {
    await notifyPendingReview(club, post)
  }
}
