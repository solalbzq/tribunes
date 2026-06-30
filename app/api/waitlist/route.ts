import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { WaitlistConfirmation } from '@/emails/WaitlistConfirmation'
import { prisma } from '@/lib/prisma'
import { getResend } from '@/lib/resend'

const waitlistSchema = z.object({
  email: z.string().trim().email(),
  clubName: z.string().trim().max(120).optional().or(z.literal('')),
  sport: z.string().trim().max(120).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown
    const parsed = waitlistSchema.safeParse(json)

    if (!parsed.success) {
      return Response.json(
        { success: false, message: 'Adresse email invalide.' },
        { status: 400 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const fromEmail = process.env.RESEND_FROM_EMAIL

    if (!baseUrl || !fromEmail) {
      return Response.json(
        { success: false, message: 'Configuration serveur incomplète.' },
        { status: 500 },
      )
    }

    const { email, clubName, sport } = parsed.data

    await prisma.waitlistEntry.create({
      data: {
        email,
        clubName: clubName || null,
        sport: sport || null,
      },
    })

    await getResend().emails.send({
      from: fromEmail,
      to: email,
      subject: 'Tu es sur la liste — on te contacte bientôt 🏆',
      react: WaitlistConfirmation({ baseUrl }),
    })

    return Response.json({ success: true, message: 'Inscription confirmée' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return Response.json({ success: true, alreadyRegistered: true }, { status: 200 })
    }

    return Response.json(
      { success: false, message: 'Une erreur est survenue. Reessaie plus tard.' },
      { status: 500 },
    )
  }
}
