import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, isAdminPayload, verifyAdminToken } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * Boucle d'évolution produit — agrège les catégories suggérées des
 * publications libres (CUSTOM_POST) pour repérer les demandes récurrentes qui
 * mériteraient de devenir un type officiel Tribunes (prompt + template
 * dédiés). Ne retourne jamais le texte brut d'une demande (objective, subject,
 * keyInformation) — uniquement des compteurs et la catégorie suggérée par le
 * modèle, cohérent avec la consigne "éviter de stocker inutilement le texte
 * brut sensible" de l'analyse assistant conversationnel.
 */

const UNCATEGORIZED = 'non_categorise'

async function ensureAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value
  if (!token) return false
  try {
    const payload = await verifyAdminToken(token)
    return isAdminPayload(payload)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.customPost.findMany({
    select: {
      suggestedCategory: true,
      createdAt: true,
      posts: { select: { status: true } },
    },
  })

  const byCategory = new Map<string, { count: number; validatedCount: number; lastUsedAt: string }>()
  for (const row of rows) {
    const key = row.suggestedCategory?.trim() || UNCATEGORIZED
    const entry = byCategory.get(key) ?? { count: 0, validatedCount: 0, lastUsedAt: row.createdAt.toISOString() }
    entry.count += 1
    if (row.posts.some(p => p.status === 'PUBLISHED' || p.status === 'PARTIAL')) entry.validatedCount += 1
    if (row.createdAt.toISOString() > entry.lastUsedAt) entry.lastUsedAt = row.createdAt.toISOString()
    byCategory.set(key, entry)
  }

  const categories = Array.from(byCategory.entries())
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      validatedCount: stats.validatedCount,
      validationRate: stats.count === 0 ? 0 : Number(((stats.validatedCount / stats.count) * 100).toFixed(1)),
      lastUsedAt: stats.lastUsedAt,
    }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ totalCustomPosts: rows.length, categories })
}
