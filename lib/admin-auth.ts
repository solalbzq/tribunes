import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Un admin est un compte Supabase normal dont app_metadata.role === 'admin'.
 * app_metadata n'est modifiable que via l'API service-role (jamais par le
 * client authentifié lui-même) — cf. scripts/promote-admin.mjs pour en
 * attribuer un. supabase.auth.getUser() revalide le JWT côté serveur Supabase
 * (contrairement à getSession()), donc ce champ est fiable une fois vérifié.
 */
export function isAdminUser(user: Pick<User, 'app_metadata'> | null | undefined) {
  return user?.app_metadata?.role === 'admin'
}

/**
 * Signature volontairement compatible avec l'ancien ensureAdmin(request) —
 * la session admin vit dans les cookies Supabase lus via next/headers, pas
 * besoin de l'objet request, mais ça évite de toucher chaque route appelante.
 */
export async function ensureAdmin(_request?: unknown) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user)
}
