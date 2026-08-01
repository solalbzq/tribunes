import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateImageUpload } from '@/lib/uploads'

// Upload d'une photo de fond pour un type de post générique (Personnalisation).
// Validation centralisée dans lib/uploads.ts, partagée avec app/api/clubs/logo/route.ts.
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const validation = await validateImageUpload(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const path = `backgrounds/${club.id}/${Date.now()}.${validation.ext}`

  const { error: uploadError } = await supabase.storage
    .from('club-assets')
    .upload(path, validation.bytes, { contentType: validation.contentType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('club-assets').getPublicUrl(path)

  return NextResponse.json({ imageUrl: publicUrl })
}
