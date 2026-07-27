'use client'

import { useEffect, useRef, useState } from 'react'
import {
  loadImage, textColor, parsePostVisualConfig, drawPostVisualElements, drawPostVisualBackground,
  postVisualCanvasSizeFor, type PostVisualContext, type VisualFormat,
} from '@/lib/visualLayout'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  postVisualConfigs?: unknown
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Visuel "joueur à l'honneur" — rendu générique (lib/visualLayout.ts)
 * piloté par Club.postVisualConfigs, personnalisable depuis
 * Personnalisation > Visuel Joueur à l'honneur.
 */
export default function PlayerSpotlightVisualGenerator({
  club,
  playerName,
  achievement,
  photoFiles,
  format = 'post',
  onCanvasReady,
}: {
  club: Club
  playerName: string
  achievement: string
  /** Jusqu'à plusieurs photos, dans l'ordre des éléments 'photo' du calque (le premier = photo principale). */
  photoFiles?: (File | null)[]
  format?: VisualFormat
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const onReadyRef = useRef(onCanvasReady)
  onReadyRef.current = onCanvasReady
  const { w: W, h: H } = postVisualCanvasSizeFor(format)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = W
      canvas.height = H
      setReady(false)

      const { elements, background } = parsePostVisualConfig(club.postVisualConfigs, 'playerSpotlight', format)
      let bgImg: HTMLImageElement | null = null
      if (background?.type === 'image' && background.imageUrl) {
        try { bgImg = await loadImage(background.imageUrl) } catch {}
      }
      if (cancelled) return
      drawPostVisualBackground(ctx, W, H, background, club.primaryColor, bgImg)

      if (cancelled) return

      let logoImg: HTMLImageElement | null = null
      if (club.logoUrl) {
        try { logoImg = await loadImage(club.logoUrl) } catch {}
      }
      const fallbackText = initials(playerName || '?')
      const files = photoFiles?.filter(Boolean) as File[] | undefined
      const photos = files && files.length
        ? await Promise.all(files.map(async file => {
            const url = URL.createObjectURL(file)
            try { return { img: await loadImage(url), fallbackText } }
            catch { return { img: null, fallbackText } }
            finally { URL.revokeObjectURL(url) }
          }))
        : [{ img: null, fallbackText }]
      if (cancelled) return

      const context: PostVisualContext = {
        clubName: club.name, sport: club.sport,
        textColor: textColor(club.primaryColor), secondaryColor: club.secondaryColor,
        logoImg,
        badge: "⭐ À L'HONNEUR",
        heading: playerName,
        paragraph: achievement,
        photo: photos[0],
        photos,
      }
      drawPostVisualElements(ctx, elements, context)

      if (!cancelled) {
        setReady(true)
        onReadyRef.current?.(canvas)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [club, playerName, achievement, photoFiles, format, W, H])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `joueur-honneur-${club.name.toLowerCase().replace(/\s/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copyImage() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { download() }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-[#1a1a2e]">⭐ Visuel joueur généré</span>
        <div className="flex gap-2">
          <button
            onClick={copyImage} disabled={!ready || !playerName}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ background: copied ? '#10b981' : club.secondaryColor }}
          >
            {copied ? '✓ Copié !' : '📋 Copier'}
          </button>
          <button
            onClick={download} disabled={!ready || !playerName}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#1a1a2e] text-white transition disabled:opacity-40"
          >
            ⬇ Télécharger
          </button>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="w-full max-w-[360px] rounded-xl shadow-lg"
          style={{ aspectRatio: `${W}/${H}` }}
        />
      </div>
      {!playerName && (
        <p className="text-xs text-gray-400 text-center mt-2">Renseigne le nom du joueur pour générer le visuel</p>
      )}
      {playerName && !ready && (
        <p className="text-xs text-gray-400 text-center mt-2">Génération...</p>
      )}
    </div>
  )
}
