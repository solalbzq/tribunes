import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, isAdminPayload, verifyAdminToken } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { aiCostUsd, scrapeCostUsd, TENUP_SCRAPE_CREDITS } from '@/lib/pricing'

async function ensureAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value
  if (!token) return false
  try {
    return isAdminPayload(await verifyAdminToken(token))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const events = await prisma.usageEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { clubId: true, kind: true, model: true, tokensIn: true, tokensOut: true, credits: true },
  })

  let aiCalls = 0
  let scrapes = 0
  let tokensIn = 0
  let tokensOut = 0
  let aiCost = 0
  let scrapeCost = 0
  const perClub = new Map<string, { aiCalls: number; scrapes: number; costUsd: number }>()

  for (const e of events) {
    const bucket = perClub.get(e.clubId) ?? { aiCalls: 0, scrapes: 0, costUsd: 0 }
    if (e.kind === 'ai_generation') {
      aiCalls++
      tokensIn += e.tokensIn ?? 0
      tokensOut += e.tokensOut ?? 0
      const c = aiCostUsd(e.model ?? 'gpt-4o', e.tokensIn ?? 0, e.tokensOut ?? 0)
      aiCost += c
      bucket.aiCalls++
      bucket.costUsd += c
    } else if (e.kind === 'tenup_scrape') {
      scrapes++
      const c = scrapeCostUsd(e.credits ?? TENUP_SCRAPE_CREDITS)
      scrapeCost += c
      bucket.scrapes++
      bucket.costUsd += c
    }
    perClub.set(e.clubId, bucket)
  }

  const activeClubs = perClub.size
  const totalCost = aiCost + scrapeCost

  // Détail par club (avec nom), trié par coût décroissant.
  const clubIds = [...perClub.keys()]
  const clubs = clubIds.length
    ? await prisma.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, name: true } })
    : []
  const nameById = new Map(clubs.map(c => [c.id, c.name]))
  const byClub = clubIds
    .map(id => ({ clubId: id, name: nameById.get(id) ?? '—', ...perClub.get(id)! }))
    .sort((a, b) => b.costUsd - a.costUsd)

  return NextResponse.json({
    windowDays: 30,
    aiCalls,
    scrapes,
    tokensIn,
    tokensOut,
    aiCostUsd: aiCost,
    scrapeCostUsd: scrapeCost,
    totalCostUsd: totalCost,
    activeClubs,
    avgCostPerClubUsd: activeClubs ? totalCost / activeClubs : 0,
    avgCostPerAiCallUsd: aiCalls ? aiCost / aiCalls : 0,
    byClub,
  })
}
