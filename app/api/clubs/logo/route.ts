import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateImageUpload } from '@/lib/uploads'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  const validation = await validateImageUpload(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  // Nom de stockage généré côté serveur (club.id + extension dérivée du contenu réel du
  // fichier) — jamais depuis file.name, qui reste une donnée cliente non fiable.
  const path = `logos/${club.id}.${validation.ext}`

  const { error: uploadError } = await supabase.storage
    .from('club-assets')
    .upload(path, validation.bytes, { contentType: validation.contentType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('club-assets').getPublicUrl(path)

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { logoUrl: publicUrl },
  })

  return NextResponse.json({ logoUrl: updated.logoUrl })
}
