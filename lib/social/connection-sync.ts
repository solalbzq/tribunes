import { prisma } from '@/lib/prisma'
import { getPagesWithInstagram } from '@/lib/social/meta'
import { encryptSecret } from '@/lib/social/token-crypto'

/**
 * Synchronise les SocialConnection d'un club à partir d'un token utilisateur
 * Meta long-lived valide : upsert des Pages Facebook + comptes IG business
 * liés, suppression des connexions devenues obsolètes (Page retirée côté
 * Meta), et levée du flag `invalid` sur les connexions resynchronisées.
 * Utilisé par le callback OAuth (première connexion) et par le cron
 * social-token-refresh (rafraîchissement périodique, mêmes clubs déjà connectés).
 */
export async function syncSocialConnectionsForClub(
  clubId: string,
  userToken: string,
  expiresAt: Date
): Promise<{ connectedCount: number }> {
  const pages = await getPagesWithInstagram(userToken)
  const validAccountKeys = new Set<string>()

  await prisma.$transaction(async tx => {
    for (const page of pages) {
      const encryptedPageToken = encryptSecret(page.pageToken)
      validAccountKeys.add(`facebook:${page.pageId}`)
      await tx.socialConnection.upsert({
        where: { clubId_provider_providerAccountId: { clubId, provider: 'facebook', providerAccountId: page.pageId } },
        update: { accountName: page.pageName, accessToken: encryptedPageToken, avatarUrl: page.avatarUrl, igUserId: page.igUserId, tokenExpiresAt: expiresAt, invalid: false },
        create: { clubId, provider: 'facebook', providerAccountId: page.pageId, accountName: page.pageName, accessToken: encryptedPageToken, avatarUrl: page.avatarUrl, igUserId: page.igUserId, tokenExpiresAt: expiresAt },
      })

      if (page.igUserId) {
        validAccountKeys.add(`instagram:${page.igUserId}`)
        await tx.socialConnection.upsert({
          where: { clubId_provider_providerAccountId: { clubId, provider: 'instagram', providerAccountId: page.igUserId } },
          update: { accountName: page.igUsername ?? page.pageName, accessToken: encryptedPageToken, avatarUrl: page.avatarUrl, tokenExpiresAt: expiresAt, meta: { pageId: page.pageId }, invalid: false },
          create: { clubId, provider: 'instagram', providerAccountId: page.igUserId, accountName: page.igUsername ?? page.pageName, accessToken: encryptedPageToken, avatarUrl: page.avatarUrl, tokenExpiresAt: expiresAt, meta: { pageId: page.pageId } },
        })
      }
    }

    const existing = await tx.socialConnection.findMany({
      where: { clubId, provider: { in: ['facebook', 'instagram'] } },
      select: { id: true, provider: true, providerAccountId: true },
    })
    const staleIds = existing
      .filter(conn => !validAccountKeys.has(`${conn.provider}:${conn.providerAccountId}`))
      .map(conn => conn.id)

    if (staleIds.length > 0) {
      await tx.socialConnection.deleteMany({ where: { id: { in: staleIds } } })
    }
  })

  return { connectedCount: validAccountKeys.size }
}
