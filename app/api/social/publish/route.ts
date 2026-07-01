import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const form = await req.formData()
  const text = (form.get('text') as string) ?? ''
  const targetsRaw = (form.get('targets') as string) ?? '[]'
  const generatedPostId = (form.get('generatedPostId') as string) || null
  const image = form.get('image') as File | null

  let targetIds: string[]
  try {
    targetIds = JSON.parse(targetsRaw)
  } catch {
    return NextResponse.json({ error: 'targets invalide' }, { status: 400 })
  }
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return NextResponse.json({ error: 'Sélectionne au moins un réseau.' }, { status: 400 })
  }

  const connections = await prisma.socialConnection.findMany({
    where: { clubId: club.id, id: { in: targetIds } },
  })
  if (connections.length === 0) {
    return NextResponse.json({ error: 'Aucun réseau connecté trouvé.' }, { status: 404 })
  }

  // Upload du visuel (URL publique nécessaire pour Instagram)
  let imageUrl: string | undefined
  if (image) {
    const path = `published/${club.id}/${Date.now()}.png`
    const bytes = await image.arrayBuffer()
    const { error: upErr } = await supabase.storage
      .from('club-assets')
      .upload(path, bytes, { contentType: 'image/png', upsert: true })
    if (upErr) {
      return NextResponse.json({ error: `Upload du visuel échoué : ${upErr.message}` }, { status: 500 })
    }
    imageUrl = supabase.storage.from('club-assets').getPublicUrl(path).data.publicUrl
  }

  const results: Array<{ id: string; provider: string; accountName: string; ok: boolean; error?: string; postId?: string }> = []

  for (const c of connections) {
    try {
      if (c.provider === 'instagram') {
        if (!imageUrl) throw new Error('Instagram nécessite un visuel.')
        const postId = await publishToInstagram(c.providerAccountId, c.accessToken, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      } else {
        const postId = await publishToFacebook(c.providerAccountId, c.accessToken, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      }
    } catch (err) {
      results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: false, error: (err as Error).message })
    }
  }

  const allOk = results.every(r => r.ok)
  if (generatedPostId) {
    const post = await prisma.generatedPost.findFirst({
      where: {
        id: generatedPostId,
        match: { clubId: club.id },
      },
      select: { id: true },
    })

    if (post) {
      const status = allOk ? 'PUBLISHED' : results.some(r => r.ok) ? 'PARTIAL' : 'FAILED'
      await prisma.generatedPost.update({
        where: { id: post.id },
        data: { status },
      })
    }
  }

  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
