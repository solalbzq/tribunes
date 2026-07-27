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

function daysUntil(date: Date): number {
  const ms = date.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.max(0, Math.round(ms / 86400000))
}

/**
 * Visuel "avant-match / teaser" — rendu générique (lib/visualLayout.ts)
 * piloté par Club.postVisualConfigs, personnalisable depuis
 * Personnalisation > Visuel Avant-match.
 */
export default function MatchAnnouncementVisualGenerator({
  club,
  opponent,
  matchDate,
  time,
  venue,
  isHome,
  format = 'post',
  onCanvasReady,
}: {
  club: Club
  opponent: string
  matchDate: string
  time?: string
  venue?: string
  isHome: boolean
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

      const { elements, background } = parsePostVisualConfig(club.postVisualConfigs, 'matchAnnouncement', format)
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
      if (cancelled) return

      const d = matchDate ? new Date(matchDate) : null
      const days = d ? daysUntil(new Date(d)) : null
      const badgeLabel = days === null ? 'PROCHAIN MATCH' : days === 0 ? "C'EST AUJOURD'HUI" : `DANS ${days} JOUR${days > 1 ? 'S' : ''}`
      const dateLabel = d
        ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
        : ''

      const context: PostVisualContext = {
        clubName: club.name, sport: club.sport,
        textColor: textColor(club.primaryColor), secondaryColor: club.secondaryColor,
        logoImg,
        badge: badgeLabel,
        vs: { left: club.name, right: opponent || 'Adversaire', badge: isHome ? 'À DOMICILE' : "À L'EXTÉRIEUR" },
        infoLines: [time ? `${dateLabel} · ${time}` : dateLabel, venue || ''].filter(Boolean),
      }
      drawPostVisualElements(ctx, elements, context)

      if (!cancelled) {
        setReady(true)
        onReadyRef.current?.(canvas)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [club, opponent, matchDate, time, venue, isHome, format, W, H])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `avant-match-${club.name.toLowerCase().replace(/\s/g, '-')}.png`
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
        <span className="font-bold text-[#1a1a2e]">📣 Visuel avant-match généré</span>
        <div className="flex gap-2">
          <button
            onClick={copyImage} disabled={!ready || !opponent}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ background: copied ? '#10b981' : club.secondaryColor }}
          >
            {copied ? '✓ Copié !' : '📋 Copier'}
          </button>
          <button
            onClick={download} disabled={!ready || !opponent}
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
      {!opponent && (
        <p className="text-xs text-gray-400 text-center mt-2">Renseigne l&apos;adversaire pour générer le visuel</p>
      )}
      {opponent && !ready && (
        <p className="text-xs text-gray-400 text-center mt-2">Génération...</p>
      )}
    </div>
  )
}
