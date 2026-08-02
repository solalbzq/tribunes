// Chiffre en place les tokens Meta stockés en clair avant l'introduction du
// chiffrement au repos (cf. lib/social/token-crypto.ts). Idempotent : ignore
// les valeurs déjà préfixées enc:v1:. À exécuter une seule fois après
// déploiement, pour ne pas dépendre du cycle naturel de reconnexion/refresh.
//
// Usage :
//   DATABASE_URL=... SOCIAL_TOKEN_ENCRYPTION_KEY=... \
//     node scripts/encrypt-existing-tokens.mjs

import { PrismaClient } from '@prisma/client'
import { createCipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_LENGTH = 12

function encryptionKey() {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY
  if (!key) {
    console.error('SOCIAL_TOKEN_ENCRYPTION_KEY manquant.')
    process.exit(1)
  }
  const buf = Buffer.from(key, 'base64')
  if (buf.length !== 32) {
    console.error('SOCIAL_TOKEN_ENCRYPTION_KEY invalide — doit encoder 32 octets en base64.')
    process.exit(1)
  }
  return buf
}

function encryptSecret(plain, key) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

const key = encryptionKey()
const prisma = new PrismaClient()

let connectionsEncrypted = 0
let clubsEncrypted = 0

const connections = await prisma.socialConnection.findMany({ select: { id: true, accessToken: true } })
for (const c of connections) {
  if (c.accessToken.startsWith(PREFIX)) continue
  await prisma.socialConnection.update({ where: { id: c.id }, data: { accessToken: encryptSecret(c.accessToken, key) } })
  connectionsEncrypted++
}

const clubs = await prisma.club.findMany({
  where: { metaUserAccessToken: { not: null } },
  select: { id: true, metaUserAccessToken: true },
})
for (const c of clubs) {
  if (c.metaUserAccessToken.startsWith(PREFIX)) continue
  await prisma.club.update({ where: { id: c.id }, data: { metaUserAccessToken: encryptSecret(c.metaUserAccessToken, key) } })
  clubsEncrypted++
}

console.log(`SocialConnection chiffrées : ${connectionsEncrypted}/${connections.length}`)
console.log(`Club.metaUserAccessToken chiffrés : ${clubsEncrypted}/${clubs.length}`)

await prisma.$disconnect()
