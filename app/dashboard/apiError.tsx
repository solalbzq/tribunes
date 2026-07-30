'use client'

import Link from 'next/link'

export type UiError = { message: string; quota: boolean } | null

/** Transforme le corps JSON d'une réponse API non-OK en erreur affichable. */
export function toUiError(json: unknown, fallback: string): UiError {
  const j = json as { error?: string; code?: string } | null
  return { message: j?.error ?? fallback, quota: j?.code === 'QUOTA_EXCEEDED' || j?.code === 'PLAN_REQUIRED' }
}

/** Affiche une erreur API ; propose l'upgrade quand le quota IA est épuisé. */
export function ErrorNotice({ error }: { error: UiError }) {
  if (!error) return null
  if (error.quota) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-amber-800">{error.message}</p>
        <Link
          href="/account?tab=abonnement"
          className="mt-2 inline-block shrink-0 text-sm font-bold text-[#2563eb] hover:underline sm:ml-4 sm:mt-0"
        >
          Voir les offres →
        </Link>
      </div>
    )
  }
  return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error.message}</p>
}
