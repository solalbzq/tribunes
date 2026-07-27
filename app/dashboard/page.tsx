import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { checkAutomationAllowed } from '@/lib/automation'
import { clubOwnershipOr } from '@/lib/postTypes'
import { resolvePlanForClub } from '@/lib/org'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const club = await prisma.club.findUnique({
    where: { userId: user.id },
    include: {
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { posts: true },
      },
    },
  })

  const drafts = club
    ? await prisma.generatedPost.findMany({
        where: {
          status: { in: ['DRAFT', 'PENDING_REVIEW'] },
          OR: clubOwnershipOr(club.id) as Prisma.GeneratedPostWhereInput[],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          match: {
            select: {
              id: true,
              opponent: true,
              competition: true,
              date: true,
            },
          },
          tournamentSchedule: {
            select: {
              id: true,
              tournamentName: true,
              matchDate: true,
            },
          },
          weeklySchedule: {
            select: {
              id: true,
              weekStart: true,
              weekEnd: true,
            },
          },
          seasonRecap: {
            select: {
              id: true,
              periodStart: true,
              periodEnd: true,
              wins: true,
              draws: true,
              losses: true,
            },
          },
        },
      })
    : []

  const automationEnabled = club ? await checkAutomationAllowed(club) : false
  const { plan } = club ? await resolvePlanForClub(club) : { plan: 'FREE' as const }

  // Sérialise les dates en string pour le passage server→client
  const serialized = club ? {
    ...club,
    automationEnabled,
    plan,
    matches: club.matches.map(m => ({
      ...m,
      date: m.date.toISOString(),
    })),
  } : null

  const serializedDrafts = drafts.map(draft => ({
    ...draft,
    createdAt: draft.createdAt.toISOString(),
    match: draft.match
      ? {
          ...draft.match,
          date: draft.match.date.toISOString(),
        }
      : null,
    tournamentSchedule: draft.tournamentSchedule
      ? {
          ...draft.tournamentSchedule,
          matchDate: draft.tournamentSchedule.matchDate.toISOString(),
        }
      : null,
    weeklySchedule: draft.weeklySchedule
      ? {
          ...draft.weeklySchedule,
          weekStart: draft.weeklySchedule.weekStart.toISOString(),
          weekEnd: draft.weeklySchedule.weekEnd.toISOString(),
        }
      : null,
    seasonRecap: draft.seasonRecap
      ? {
          ...draft.seasonRecap,
          periodStart: draft.seasonRecap.periodStart.toISOString(),
          periodEnd: draft.seasonRecap.periodEnd.toISOString(),
        }
      : null,
  }))

  return (
    <DashboardClient
      club={serialized}
      drafts={serializedDrafts}
      userEmail={user.email ?? ''}
    />
  )
}
