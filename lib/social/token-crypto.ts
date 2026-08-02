// Chiffrement au repos des tokens d'accès réseaux sociaux (AES-256-GCM).
// Clé : SOCIAL_TOKEN_ENCRYPTION_KEY, 32 octets encodés en base64 (ex: openssl rand -base64 32).

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_LENGTH = 12

function encryptionKey(): Buffer {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY
  if (!key) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY manquant — requis pour chiffrer les tokens réseaux sociaux.')
  const buf = Buffer.from(key, 'base64')
  if (buf.length !== 32) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY invalide — doit encoder 32 octets en base64.')
  return buf
}

/** Chiffre une valeur secrète (token) avant stockage en base. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

/**
 * Déchiffre une valeur stockée. Compat descendante : une valeur sans le
 * préfixe enc:v1: est considérée en clair (tokens écrits avant l'introduction
 * du chiffrement) et renvoyée telle quelle, pour ne pas casser les connexions
 * existantes tant qu'elles n'ont pas été rechiffrées (cf. scripts/encrypt-existing-tokens.ts).
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored

  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Valeur chiffrée malformée.')

  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return plain.toString('utf8')
}
