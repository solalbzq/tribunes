'use client'

import { useEffect, useRef, useState } from 'react'
import {
  loadImage, textColor, parsePostVisualConfig, drawPostVisualElements, drawPostVisualBackground,
  postVisualCanvasSizeFor, type PostVisualContext, type PostVisualStat, type VisualFormat,
} from '@/lib/visualLayout'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  postVisualConfigs?: unknown
}

/**
 * Visuel "bilan de saison" — rendu générique (lib/visualLayout.ts) piloté
 * par Club.postVisualConfigs, personnalisable depuis Personnalisation > Visuel Bilan.
 */
export default function SeasonRecapVisualGenerator({
  club,
  periodLabel,
  wins,
  draws,
  losses,
  rankingNote,
  format = 'post',
  onCanvasReady,
}: {
  club: Club
  periodLabel: string
  wins: number
  draws: number
  losses: number
  rankingNote?: string
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

      const { elements, background } = parsePostVisualConfig(club.postVisualConfigs, 'seasonRecap', format)
      drawPostVisualBackground(ctx, W, H, background, club.primaryColor)

      if (cancelled) return

      let logoImg: HTMLImageElement | null = null
      if (club.logoUrl) {
        try { logoImg = await loadImage(club.logoUrl) } catch {}
      }
      if (cancelled) return

      const total = wins + draws + losses
      const stats: PostVisualStat[] = [
        { label: 'VICTOIRES', value: wins, color: '#22c55e' },
        { label: 'NULS', value: draws, color: 'rgba(255,255,255,0.65)' },
        { label: 'DÉFAITES', value: losses, color: club.secondaryColor },
      ]

      const context: PostVisualContext = {
        clubName: club.name, sport: club.sport,
        textColor: textColor(club.primaryColor), secondaryColor: club.secondaryColor,
        logoImg,
        heading: 'BILAN DE SAISON', subheading: periodLabel || club.name, badge: 'NOS RÉSULTATS',
        stats,
        statsCaption: `${total} match${total > 1 ? 's' : ''} disputé${total > 1 ? 's' : ''}`,
        statsNote: rankingNote || undefined,
      }
      drawPostVisualElements(ctx, elements, context)

      if (!cancelled) {
        setReady(true)
        onReadyRef.current?.(canvas)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [club, periodLabel, wins, draws, losses, rankingNote, format, W, H])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `bilan-${club.name.toLowerCase().replace(/\s/g, '-')}.png`
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
        <span className="font-bold text-[#1a1a2e]">🏆 Visuel bilan généré</span>
        <div className="flex gap-2">
          <button
            onClick={copyImage} disabled={!ready}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ background: copied ? '#10b981' : club.secondaryColor }}
          >
            {copied ? '✓ Copié !' : '📋 Copier'}
          </button>
          <button
            onClick={download} disabled={!ready}
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
      {!ready && (
        <p className="text-xs text-gray-400 text-center mt-2">Génération...</p>
      )}
    </div>
  )
}
