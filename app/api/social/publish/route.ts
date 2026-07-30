import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { publishToSocialConnections, recordPublishResult, findClubGeneratedPost, claimPostForPublishing } from '@/lib/services/publish-service'

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

  // Réserve le brouillon avant tout appel réseau, pour empêcher qu'un
  // double-clic sur "Publier" ne déclenche deux publications sur Facebook/Instagram.
  let post: Awaited<ReturnType<typeof findClubGeneratedPost>> = null
  if (generatedPostId) {
    post = await findClubGeneratedPost(club.id, generatedPostId)
    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    }
    const claimed = await claimPostForPublishing(post.id)
    if (!claimed) {
      return NextResponse.json({ error: 'Cette publication est déjà en cours ou a déjà été traitée.' }, { status: 409 })
    }
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

  const results = await publishToSocialConnections(connections, text, imageUrl)
  const allOk = results.every(r => r.ok)

  if (post) {
    // Le visuel fraîchement uploadé est conservé sur le post pour être
    // réutilisable (aperçu Telegram, re-publication) sans re-upload.
    if (imageUrl) {
      await prisma.generatedPost.update({ where: { id: post.id }, data: { imageUrl } })
    }
    await recordPublishResult(post.id, results)
  }

  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
