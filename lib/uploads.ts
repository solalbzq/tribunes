/**
 * Validation centralisée des uploads d'image (logo, fond, futurs assets du
 * Brand Kit). Ne fait jamais confiance au nom de fichier, à l'extension, ni
 * au `Content-Type` déclaré par le client : le type réel est vérifié par les
 * premiers octets du fichier (magic bytes) avant tout stockage.
 */

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 Mo

export type AllowedImageType = 'image/png' | 'image/jpeg' | 'image/webp'

const ALLOWED_IMAGE_TYPES: Record<AllowedImageType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/** Inspecte les octets réels du fichier pour déterminer son type — ignore le `Content-Type` déclaré. */
function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 // "RIFF"
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) { // "WEBP"
    return 'image/webp'
  }
  return null
}

export type ImageUploadValidation =
  | { ok: true; ext: string; bytes: ArrayBuffer; contentType: AllowedImageType }
  | { ok: false; error: string }

/**
 * Valide un fichier image uploadé : présence, taille, allowlist MIME déclarée,
 * ET contenu réel (magic bytes) cohérent avec cette déclaration. Le nom de
 * stockage doit être généré par l'appelant à partir de `ext` — jamais depuis
 * `file.name`, qui reste une donnée cliente non fiable.
 */
export async function validateImageUpload(file: File | null, maxSize: number = MAX_IMAGE_SIZE): Promise<ImageUploadValidation> {
  if (!file) return { ok: false, error: 'Fichier manquant' }
  if (file.size > maxSize) return { ok: false, error: `Image trop lourde (max ${Math.round(maxSize / (1024 * 1024))} Mo)` }
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    return { ok: false, error: 'Format non pris en charge (PNG, JPG ou WEBP uniquement)' }
  }

  const bytes = await file.arrayBuffer()
  const sniffed = sniffImageType(new Uint8Array(bytes))
  if (!sniffed || sniffed !== file.type) {
    return { ok: false, error: 'Le contenu du fichier ne correspond pas au format déclaré' }
  }

  return { ok: true, ext: ALLOWED_IMAGE_TYPES[sniffed], bytes, contentType: sniffed }
}
