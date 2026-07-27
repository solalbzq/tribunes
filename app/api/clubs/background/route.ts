import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Upload d'une photo de fond pour un type de post générique (Personnalisation).
// Contrairement à app/api/clubs/logo/route.ts, valide explicitement la taille
// et le type MIME avant tout upload — surface plus large (potentiellement
// plusieurs images par club, par type de post x format) que le logo unique.
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'Format non pris en charge (PNG, JPG ou WEBP uniquement)' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Image trop lourde (max 5 Mo)' }, { status: 400 })

  const path = `backgrounds/${club.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('club-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('club-assets').getPublicUrl(path)

  return NextResponse.json({ imageUrl: publicUrl })
}
