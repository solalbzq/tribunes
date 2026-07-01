'use client'

import { useEffect, useRef, useState } from 'react'
import { parseVisualConfig, loadImage, SIZE, drawElements } from '@/lib/visualLayout'
import { getSportVocab, getDetailLines, getScoreLabel } from '@/lib/sports'
import { Icon } from './icons'

type Club = {
  name: string; sport: string
  primaryColor: string; secondaryColor: string
  logoUrl: string | null; visualConfig?: unknown
}
type MatchData = {
  opponent: string; homeScore: number; awayScore: number; isHome: boolean; competition: string
  extraData?: Record<string, unknown>
}

export default function VisualGenerator({ club, match, photoFile, onCanvasReady }: {
  club: Club; match: MatchData; photoFile: File | null
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const onReadyRef = useRef(onCanvasReady)
  onReadyRef.current = onCanvasReady

  const clubScore = match.isHome ? match.homeScore : match.awayScore
  const oppScore  = match.isHome ? match.awayScore : match.homeScore
  const vocab = getSportVocab(club.sport)
  const result =
    clubScore > oppScore ? vocab.winWord.toUpperCase() :
    clubScore < oppScore ? vocab.lossWord.toUpperCase() :
    vocab.drawWord.toUpperCase()
  const detailLines = match.extraData ? getDetailLines(club.sport, match.extraData) : []
  const scoreLabel = getScoreLabel(club.sport)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = SIZE; canvas.height = SIZE
      setReady(false)

      const { bgOpacity, elements } = parseVisualConfig(club.visualConfig)

      // ── Background solid
      ctx.fillStyle = club.primaryColor
      ctx.fillRect(0, 0, SIZE, SIZE)
      const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
      grad.addColorStop(0, 'rgba(255,255,255,0.03)')
      grad.addColorStop(1, 'rgba(0,0,0,0.15)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, SIZE, SIZE)

      // ── Background photo (with saved opacity)
      if (photoFile) {
        const photoUrl = URL.createObjectURL(photoFile)
        try {
          const photo = await loadImage(photoUrl)
          const ratio = Math.max(SIZE / photo.width, SIZE / photo.height)
          const pw = photo.width * ratio, ph = photo.height * ratio
          ctx.save()
          ctx.globalAlpha = bgOpacity
          ctx.drawImage(photo, (SIZE - pw) / 2, (SIZE - ph) / 2, pw, ph)
          ctx.globalAlpha = 1 - bgOpacity * 0.4
          ctx.fillStyle = club.primaryColor
          ctx.fillRect(0, 0, SIZE, SIZE)
          ctx.globalAlpha = 1
          ctx.restore()
        } catch {
          ctx.fillStyle = club.primaryColor
          ctx.fillRect(0, 0, SIZE, SIZE)
        } finally { URL.revokeObjectURL(photoUrl) }
      }

      if (cancelled) return

      // ── Logo
      let logoImg: HTMLImageElement | null = null
      if (club.logoUrl) { try { logoImg = await loadImage(club.logoUrl) } catch {} }

      if (cancelled) return

      // ── Draw all elements using shared lib
      drawElements(ctx, elements, {
        clubName: club.name, sport: club.sport,
        secondaryColor: club.secondaryColor,
        logoImg,
        opponent: match.opponent,
        clubScore, oppScore, result,
        competition: match.competition,
        detailLines,
        scoreLabel,
      })

      if (!cancelled) {
        setReady(true)
        onReadyRef.current?.(canvas)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [club, match, photoFile, clubScore, oppScore, result])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `tribunes-${club.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copyImage() {
    const canvas = canvasRef.current; if (!canvas) return
    try {
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { download() }
  }

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold text-ink"><Icon name="image" className="h-[18px] w-[18px] text-brand" /> Visuel généré</span>
        <div className="flex gap-2">
          <button onClick={copyImage} disabled={!ready}
            className="inline-flex items-center gap-1.5 rounded-btn px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: copied ? '#22c55e' : '#2563eb' }}>
            <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" /> {copied ? 'Copié' : 'Copier'}
          </button>
          <button onClick={download} disabled={!ready}
            className="inline-flex items-center gap-1.5 rounded-btn bg-ink px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50">
            <Icon name="download" className="h-4 w-4" /> Télécharger
          </button>
        </div>
      </div>
      <div className="flex justify-center rounded-btn bg-subtle p-4">
        <canvas ref={canvasRef} className="w-full max-w-[420px] aspect-square rounded-xl shadow-lg" />
      </div>
      {!ready && <p className="mt-2 text-center text-xs text-muted">Génération…</p>}
    </div>
  )
}
