import type { User } from '@supabase/supabase-js'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type LogAdminActionParams = {
  admin: Pick<User, 'id' | 'email'>
  action: string
  resourceType: string
  resourceId?: string | null
  beforeValue?: Prisma.InputJsonValue | null
  afterValue?: Prisma.InputJsonValue | null
  result?: 'success' | 'failure'
  errorMessage?: string
}

/**
 * Écrit une ligne d'audit pour une action admin sensible. Best-effort :
 * une erreur d'écriture ne doit jamais faire échouer l'action métier
 * elle-même, mais elle est journalisée côté serveur pour ne pas passer
 * inaperçue.
 */
export async function logAdminAction({
  admin,
  action,
  resourceType,
  resourceId,
  beforeValue,
  afterValue,
  result = 'success',
  errorMessage,
}: LogAdminActionParams) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email ?? null,
        action,
        resourceType,
        resourceId: resourceId ?? null,
        beforeValue: beforeValue ?? undefined,
        afterValue: afterValue ?? undefined,
        result,
        errorMessage,
      },
    })
  } catch (err) {
    console.error('[adminAudit] échec d\'écriture du journal d\'audit', { action, resourceType, resourceId }, err)
  }
}
