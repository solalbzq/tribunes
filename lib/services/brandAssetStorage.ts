import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stockage des fichiers importés pour la personnalisation complète (charte,
 * références) — Lot 5. Contrairement à `club-assets` (logo, fonds — publics,
 * consommés par les API de publication), ce bucket est PRIVÉ : ces fichiers
 * peuvent contenir une charte interne non destinée à diffusion publique.
 * Toute lecture passe par une URL signée à courte durée, jamais `getPublicUrl`.
 */
const BUCKET = 'club-brand-assets'
const SIGNED_URL_TTL_SECONDS = 5 * 60

let bucketEnsured = false

/** Crée le bucket privé s'il n'existe pas encore — idempotent, sans effet si déjà présent. */
async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return
  const admin = createAdminClient()
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  // "already exists" n'est pas une erreur : un autre appel concurrent (ou un
  // déploiement précédent) a pu déjà créer le bucket.
  if (error && !/already exists/i.test(error.message)) {
    throw error
  }
  bucketEnsured = true
}

export async function uploadBrandAsset(path: string, bytes: ArrayBuffer, contentType: string): Promise<void> {
  await ensureBucket()
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false })
  if (error) throw error
}

/** URL signée à courte durée — jamais stockée telle quelle, régénérée à chaque consultation. */
export async function signedBrandAssetUrl(path: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteBrandAsset(path: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([path])
}

/** Téléchargement serveur — uniquement pour l'extraction de texte PDF (pdf-parse), qui a besoin des octets bruts. */
export async function downloadBrandAsset(path: string): Promise<ArrayBuffer> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) throw error ?? new Error('Téléchargement impossible')
  return data.arrayBuffer()
}
