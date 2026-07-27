'use client'

import { useEffect, useRef, useState } from 'react'
import {
  loadImage, textColor, parsePostVisualConfig, drawPostVisualElements,
  POST_VISUAL_SIZE, type PostVisualContext,
} from '@/lib/visualLayout'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  postVisualConfigs?: unknown
}

const { W, H } = POST_VISUAL_SIZE

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
  photoFile,
  onCanvasReady,
}: {
  club: Club
  playerName: string
  achievement: string
  photoFile?: File | null
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const onReadyRef = useRef(onCanvasReady)
  onReadyRef.current = onCanvasReady

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

      ctx.fillStyle = club.primaryColor
      ctx.fillRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, 'rgba(255,255,255,0.04)')
      bg.addColorStop(1, 'rgba(0,0,0,0.2)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      if (cancelled) return

      let logoImg: HTMLImageElement | null = null
      if (club.logoUrl) {
        try { logoImg = await loadImage(club.logoUrl) } catch {}
      }
      let photoImg: HTMLImageElement | null = null
      if (photoFile) {
        const url = URL.createObjectURL(photoFile)
        try { photoImg = await loadImage(url) } catch {} finally { URL.revokeObjectURL(url) }
      }
      if (cancelled) return

      const { elements } = parsePostVisualConfig(club.postVisualConfigs, 'playerSpotlight')
      const context: PostVisualContext = {
        clubName: club.name, sport: club.sport,
        textColor: textColor(club.primaryColor), secondaryColor: club.secondaryColor,
        logoImg,
        badge: "⭐ À L'HONNEUR",
        heading: playerName,
        paragraph: achievement,
        photo: { img: photoImg, fallbackText: initials(playerName || '?') },
      }
      drawPostVisualElements(ctx, elements, context)

      if (!cancelled) {
        setReady(true)
        onReadyRef.current?.(canvas)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [club, playerName, achievement, photoFile])

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
