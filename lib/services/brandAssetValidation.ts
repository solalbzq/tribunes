import { validateImageUpload, MAX_IMAGE_SIZE } from '@/lib/uploads'

export const MAX_REFERENCES = 6
export const MAX_CHARTER_SIZE = 15 * 1024 * 1024 // 15 Mo — un PDF de charte reste raisonnablement borné

export type BrandAssetValidation =
  | { ok: true; ext: string; bytes: ArrayBuffer; contentType: string }
  | { ok: false; error: string }

/** Signature PDF réelle (`%PDF-`) — jamais l'extension ou le Content-Type déclaré par le client. */
function isPdfSignature(bytes: Uint8Array): boolean {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"
  return bytes.length >= header.length && header.every((b, i) => bytes[i] === b)
}

/** Référence visuelle : image uniquement (même contrainte que le reste du Brand Kit — pas de PDF). */
export async function validateReferenceUpload(file: File | null): Promise<BrandAssetValidation> {
  const result = await validateImageUpload(file, MAX_IMAGE_SIZE)
  if (!result.ok) return result
  return { ok: true, ext: result.ext, bytes: result.bytes, contentType: result.contentType }
}

/** Charte graphique : image (analyse visuelle complète) ou PDF (contenu textuel uniquement, cf. lib/services/brandAssetAnalysis.ts). */
export async function validateCharterUpload(file: File | null): Promise<BrandAssetValidation> {
  if (!file) return { ok: false, error: 'Fichier manquant' }
  if (file.size > MAX_CHARTER_SIZE) return { ok: false, error: `Fichier trop lourd (max ${Math.round(MAX_CHARTER_SIZE / (1024 * 1024))} Mo)` }

  if (file.type === 'application/pdf') {
    const bytes = await file.arrayBuffer()
    if (!isPdfSignature(new Uint8Array(bytes))) {
      return { ok: false, error: 'Le contenu du fichier ne correspond pas à un PDF valide' }
    }
    return { ok: true, ext: 'pdf', bytes, contentType: 'application/pdf' }
  }

  const result = await validateImageUpload(file, MAX_CHARTER_SIZE)
  if (!result.ok) return { ok: false, error: 'Format non pris en charge (PDF, PNG, JPG ou WEBP uniquement)' }
  return { ok: true, ext: result.ext, bytes: result.bytes, contentType: result.contentType }
}
