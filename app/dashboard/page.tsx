import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { checkAutomationAllowed } from '@/lib/automation'
import { clubOwnershipOr } from '@/lib/postTypes'
import { resolvePlanForClub } from '@/lib/org'
import DashboardClient from './DashboardClient'

/** Sérialise les dates des relations cross-type communes à drafts et historyPosts. */
function serializeSharedRelations<
  TS extends { matchDate: Date } | null | undefined,
  WS extends { weekStart: Date; weekEnd: Date } | null | undefined,
  SR extends { periodStart: Date; periodEnd: Date } | null | undefined,
  MA extends { matchDate: Date } | null | undefined,
>(post: { tournamentSchedule?: TS; weeklySchedule?: WS; seasonRecap?: SR; matchAnnouncement?: MA }) {
  return {
    tournamentSchedule: post.tournamentSchedule
      ? { ...post.tournamentSchedule, matchDate: post.tournamentSchedule.matchDate.toISOString() }
      : null,
    weeklySchedule: post.weeklySchedule
      ? { ...post.weeklySchedule, weekStart: post.weeklySchedule.weekStart.toISOString(), weekEnd: post.weeklySchedule.weekEnd.toISOString() }
      : null,
    seasonRecap: post.seasonRecap
      ? { ...post.seasonRecap, periodStart: post.seasonRecap.periodStart.toISOString(), periodEnd: post.seasonRecap.periodEnd.toISOString() }
      : null,
    matchAnnouncement: post.matchAnnouncement
      ? { ...post.matchAnnouncement, matchDate: post.matchAnnouncement.matchDate.toISOString() }
      : null,
  }
}

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
          matchAnnouncement: {
            select: {
              id: true,
              opponent: true,
              matchDate: true,
              competition: true,
              isHome: true,
            },
          },
          playerSpotlight: {
            select: {
              id: true,
              playerName: true,
              achievement: true,
            },
          },
          clubAnnouncement: {
            select: {
              id: true,
              category: true,
              title: true,
            },
          },
          engagementPoll: {
            select: {
              id: true,
              question: true,
            },
          },
          customPost: {
            select: {
              id: true,
              objective: true,
              subject: true,
              suggestedCategory: true,
            },
          },
        },
      })
    : []

  // Publications déjà traitées (hors DRAFT/PENDING_REVIEW), tous types hors
  // match — les posts liés à un match apparaissent déjà via club.matches[].posts
  // dans l'Historique ; ceux-ci couvrent les autres types (tournoi, programme,
  // bilan, avant-match, joueur à l'honneur, annonce, sondage, post libre), qui
  // n'ont sinon aucune vue "historique" une fois publiés/rejetés/échoués.
  const historyPosts = club
    ? await prisma.generatedPost.findMany({
        where: {
          status: { in: ['PUBLISHED', 'PARTIAL', 'FAILED', 'REJECTED'] },
          matchId: null,
          OR: clubOwnershipOr(club.id) as Prisma.GeneratedPostWhereInput[],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          tournamentSchedule: { select: { id: true, tournamentName: true, matchDate: true } },
          weeklySchedule: { select: { id: true, weekStart: true, weekEnd: true } },
          seasonRecap: { select: { id: true, periodStart: true, periodEnd: true, wins: true, draws: true, losses: true } },
          matchAnnouncement: { select: { id: true, opponent: true, matchDate: true, competition: true, isHome: true } },
          playerSpotlight: { select: { id: true, playerName: true, achievement: true } },
          clubAnnouncement: { select: { id: true, category: true, title: true } },
          engagementPoll: { select: { id: true, question: true } },
          customPost: { select: { id: true, objective: true, subject: true, suggestedCategory: true } },
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
    ...serializeSharedRelations(draft),
    playerSpotlight: draft.playerSpotlight ?? null,
    clubAnnouncement: draft.clubAnnouncement ?? null,
    engagementPoll: draft.engagementPoll ?? null,
    customPost: draft.customPost ?? null,
  }))

  const serializedHistoryPosts = historyPosts.map(post => ({
    id: post.id,
    platform: post.platform,
    postType: post.postType,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    match: null,
    ...serializeSharedRelations(post),
    playerSpotlight: post.playerSpotlight ?? null,
    clubAnnouncement: post.clubAnnouncement ?? null,
    engagementPoll: post.engagementPoll ?? null,
    customPost: post.customPost ?? null,
  }))

  return (
    <DashboardClient
      club={serialized}
      drafts={serializedDrafts}
      historyPosts={serializedHistoryPosts}
      userEmail={user.email ?? ''}
    />
  )
}
