import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, isAdminPayload, verifyAdminToken } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const GPT4O_INPUT_COST_PER_M = 2.5
const GPT4O_OUTPUT_COST_PER_M = 10.0
const AVG_INPUT_TOKENS = 1100
const AVG_OUTPUT_TOKENS = 350

const SPORTS = ['Football', 'Basketball', 'Handball', 'Volleyball', 'Tennis']
const PLANS = ['FREE', 'PRO', 'STRUCTURE']

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfPastDays(days: number) {
  const date = startOfToday()
  date.setDate(date.getDate() - days)
  return date
}

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

  const today = startOfToday()
  const weekStart = startOfPastDays(7)
  const chartStart = startOfPastDays(29)

  const [
    totalEntries,
    convertedEntries,
    todayEntries,
    weekEntries,
    recentEntries,
    totalClubs,
    totalOrgs,
    totalMembers,
    totalMatches,
    totalPosts,
    postsThisWeek,
    matchesThisWeek,
    recentClubs,
    // Plans
    countFree,
    countPro,
    countStructure,
    // Sports
    countFootball,
    countBasketball,
    countHandball,
    countVolleyball,
    countTennis,
  ] = await prisma.$transaction([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { converted: true } }),
    prisma.waitlistEntry.count({ where: { createdAt: { gte: today } } }),
    prisma.waitlistEntry.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.waitlistEntry.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.club.count(),
    prisma.organization.count(),
    prisma.organizationMember.count(),
    prisma.matchResult.count(),
    prisma.generatedPost.count(),
    prisma.generatedPost.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.matchResult.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, sport: true, createdAt: true },
    }),
    prisma.organization.count({ where: { plan: 'FREE' } }),
    prisma.organization.count({ where: { plan: 'PRO' } }),
    prisma.organization.count({ where: { plan: 'STRUCTURE' } }),
    prisma.club.count({ where: { sport: 'Football' } }),
    prisma.club.count({ where: { sport: 'Basketball' } }),
    prisma.club.count({ where: { sport: 'Handball' } }),
    prisma.club.count({ where: { sport: 'Volleyball' } }),
    prisma.club.count({ where: { sport: 'Tennis' } }),
  ])

  // Chart data
  const counts = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const date = new Date(chartStart)
    date.setDate(chartStart.getDate() + i)
    counts.set(date.toISOString().slice(0, 10), 0)
  }
  for (const entry of recentEntries) {
    const key = entry.createdAt.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const entriesByDay = Array.from(counts.entries()).map(([date, count]) => ({ date, count }))

  const totalCompletions = Math.round(totalPosts / 3)
  const estimatedCostUsd =
    (totalCompletions * AVG_INPUT_TOKENS * GPT4O_INPUT_COST_PER_M) / 1_000_000 +
    (totalCompletions * AVG_OUTPUT_TOKENS * GPT4O_OUTPUT_COST_PER_M) / 1_000_000

  const planCounts: Record<string, number> = {
    FREE: countFree,
    PRO: countPro,
    STRUCTURE: countStructure,
  }

  const rawSportCounts = [countFootball, countBasketball, countHandball, countVolleyball, countTennis]
  const sportCounts = SPORTS
    .map((sport, i) => ({ sport, count: rawSportCounts[i] }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  void PLANS // used for planCounts

  return NextResponse.json({
    totalEntries,
    convertedEntries,
    todayEntries,
    weekEntries,
    conversionRate: totalEntries === 0 ? 0 : Number(((convertedEntries / totalEntries) * 100).toFixed(1)),
    entriesByDay,
    totalClubs,
    totalOrgs,
    totalMembers,
    planCounts,
    totalMatches,
    totalPosts,
    postsThisWeek,
    matchesThisWeek,
    totalCompletions,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
    sportCounts,
    recentClubs,
  })
}
