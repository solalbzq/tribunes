import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { scrapeTenup, mondayOf, QueueItBlockedError } from '@/lib/services/tenup-scraper'
import { logScrapeUsage, logAiUsage } from '@/lib/usage'
import { checkAiQuota } from '@/lib/quota'
import { resolveEffectiveMode, resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { tournamentSchedulePromptAll } from '@/lib/prompts/tennis-posts'
import { padelTournamentSchedulePromptAll } from '@/lib/prompts/padel-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import type { Sport } from '@prisma/client'

/**
 * Automatise ce qui aujourd'hui exige un clic manuel dans l'onglet Programme
 * (TennisProgrammeSection) : scrape la semaine en cours depuis Ten'Up pour
 * chaque club tennis/padel ayant un tenupUrl, met en cache (TenupSchedule,
 * comme la route manuelle app/api/clubs/tenup/scrape). Si le club est en mode
 * Auto + validation / Automatique, génère aussi les légendes IA une seule fois
 * par semaine (pas de doublon si le cron retourne plusieurs fois sur la même
 * semaine).
 *
 * Limite connue, non traitée ici : le parsing DOM de tenup-scraper.ts est un
 * stub qui renvoie toujours [] sans SCRAPINGBEE_API_KEY, et Ten'Up bloque
 * souvent les requêtes directes (Queue-it) même avec une clé — ce cron sera
 * donc largement un no-op tant que ça n'est pas traité séparément.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clubs = await prisma.club.findMany({
    where: { sport: { in: ['Tennis', 'Padel'] }, tenupUrl: { not: null }, suspended: false },
  })

  const weekStart = mondayOf(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const sportEnum: Record<string, Sport> = { Tennis: 'TENNIS', Padel: 'PADEL' }

  const summary: Array<{ clubId: string; status: string; matches?: number }> = []

  for (const club of clubs) {
    try {
      const result = await scrapeTenup(club.tenupUrl!, { kind: 'week', weekStart, weekEnd })

      await prisma.tenupSchedule.upsert({
        where: { clubId_weekStart: { clubId: club.id, weekStart } },
        update: { matches: result.matches as unknown as never, clubName: result.clubName, scrapedAt: new Date() },
        create: { clubId: club.id, weekStart, matches: result.matches as unknown as never, clubName: result.clubName },
      })
      await logScrapeUsage(club.id, undefined, { weekStart: weekStart.toISOString(), source: 'cron' })

      if (result.matches.length === 0) {
        summary.push({ clubId: club.id, status: 'no_matches' })
        continue
      }

      const mode = await resolveEffectiveMode(club)
      if (mode === 'MANUAL') {
        summary.push({ clubId: club.id, status: 'scraped_manual_mode', matches: result.matches.length })
        continue
      }

      // Évite de regénérer les mêmes légendes à chaque passage du cron sur la semaine.
      const alreadyGenerated = await prisma.weeklySchedule.findFirst({
        where: { clubId: club.id, weekStart, sport: sportEnum[club.sport] },
      })
      if (alreadyGenerated) {
        summary.push({ clubId: club.id, status: 'already_generated', matches: result.matches.length })
        continue
      }

      const quota = await checkAiQuota(club)
      if (!quota.allowed) {
        summary.push({ clubId: club.id, status: 'quota_exceeded' })
        continue
      }

      const isPadel = club.sport === 'Padel'
      const prompt = isPadel
        ? padelTournamentSchedulePromptAll(club.name, 'Programme de la semaine', '', weekStart, '', result.matches, club.contentTone)
        : tournamentSchedulePromptAll(club.name, 'Programme de la semaine', weekStart, '', result.matches, club.contentTone)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      })
      await logAiUsage(club.id, completion, 'gpt-4o', { route: 'cron/tenup-scrape' })

      const posts = splitPlatformPosts(completion.choices[0].message.content ?? '')
      const initialStatus = await resolveInitialStatus(club)

      const weekly = await prisma.weeklySchedule.create({
        data: {
          clubId: club.id,
          sport: sportEnum[club.sport],
          weekStart,
          weekEnd,
          matches: result.matches as unknown as never,
          posts: {
            create: Object.entries(posts).map(([platform, content]) => ({
              platform,
              content,
              postType: 'WEEKLY_SCHEDULE',
              status: initialStatus,
            })),
          },
        },
        include: { posts: true },
      })

      await runAutomationSideEffects(club, weekly.posts)
      summary.push({ clubId: club.id, status: 'generated', matches: result.matches.length })
    } catch (err) {
      if (err instanceof QueueItBlockedError) {
        summary.push({ clubId: club.id, status: 'blocked_by_queueit' })
      } else {
        console.error('[cron/tenup-scrape] error for club', club.id, err)
        summary.push({ clubId: club.id, status: 'error' })
      }
    }
  }

  return NextResponse.json({ ok: true, clubsProcessed: clubs.length, summary })
}
