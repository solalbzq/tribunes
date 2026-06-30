'use client'

import { useEffect, useRef, useState } from 'react'
import { textColor, loadImage, roundRect } from '@/lib/visualLayout'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

type UpcomingMatch = {
  id: string
  date: string
  opponent: string
  competition: string
  isHome: boolean
}

const W = 1080
const H = 1350

const MONTHS_FR = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function ScheduleGenerator({ club, matches }: { club: Club; matches: UpcomingMatch[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)

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

      const tc = textColor(club.primaryColor)
      const sc = club.secondaryColor

      // ── Background
      ctx.fillStyle = club.primaryColor
      ctx.fillRect(0, 0, W, H)

      // Subtle gradient
      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, 'rgba(255,255,255,0.04)')
      bg.addColorStop(1, 'rgba(0,0,0,0.2)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      if (cancelled) return

      // ── Logo
      let logoImg: HTMLImageElement | null = null
      if (club.logoUrl) {
        try { logoImg = await loadImage(club.logoUrl) } catch {}
      }

      if (cancelled) return

      // ── Header
      const headerH = 260
      // Logo circle top-center
      const logoSize = 120
      const lx = W / 2 - logoSize / 2
      const ly = 50
      roundRect(ctx, lx, ly, logoSize, logoSize, logoSize / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()
      if (logoImg) {
        ctx.save()
        roundRect(ctx, lx, ly, logoSize, logoSize, logoSize / 2)
        ctx.clip()
        const ratio = Math.min((logoSize - 16) / logoImg.width, (logoSize - 16) / logoImg.height)
        const lw = logoImg.width * ratio
        const lh = logoImg.height * ratio
        ctx.drawImage(logoImg, lx + (logoSize - lw) / 2, ly + (logoSize - lh) / 2, lw, lh)
        ctx.restore()
      } else {
        ctx.fillStyle = tc
        ctx.font = '60px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚡', W / 2, ly + logoSize / 2)
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = tc
      ctx.font = '800 54px Inter, sans-serif'
      ctx.fillText(club.name, W / 2, ly + logoSize + 54)

      ctx.fillStyle = sc
      ctx.font = '600 26px Inter, sans-serif'
      ctx.fillText(club.sport.toUpperCase(), W / 2, ly + logoSize + 90)

      // "Matchs à venir" title
      const titleY = headerH + 40
      roundRect(ctx, W / 2 - 200, titleY - 36, 400, 56, 28)
      ctx.fillStyle = sc
      ctx.fill()
      ctx.fillStyle = textColor(sc)
      ctx.font = '700 26px Inter, sans-serif'
      ctx.fillText('MATCHS À VENIR', W / 2, titleY + 2)

      // ── Match list
      const listY = titleY + 80
      const matchH = 110
      const gap = 18
      const maxMatches = Math.min(matches.length, 6)

      for (let i = 0; i < maxMatches; i++) {
        const m = matches[i]
        const my = listY + i * (matchH + gap)

        // Card background alternating
        roundRect(ctx, 54, my, W - 108, matchH, 20)
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'
        ctx.fill()

        const d = new Date(m.date)
        const dayName = DAYS_FR[d.getDay()]
        const dayNum = d.getDate()
        const monthName = MONTHS_FR[d.getMonth()]

        // Date badge (left)
        roundRect(ctx, 74, my + 15, 80, matchH - 30, 14)
        ctx.fillStyle = sc + '33'
        ctx.fill()
        ctx.fillStyle = sc
        ctx.font = '700 18px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(dayName.toUpperCase(), 114, my + 44)
        ctx.font = '900 32px Inter, sans-serif'
        ctx.fillStyle = tc
        ctx.fillText(String(dayNum), 114, my + 78)
        ctx.font = '500 16px Inter, sans-serif'
        ctx.fillStyle = sc
        ctx.fillText(monthName, 114, my + 98)

        // Opponent (center)
        ctx.textAlign = 'left'
        ctx.fillStyle = tc
        ctx.font = '700 30px Inter, sans-serif'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(m.opponent, 176, my + 58)
        ctx.font = '400 20px Inter, sans-serif'
        ctx.fillStyle = tc + 'aa'
        ctx.fillText(m.competition || 'Match amical', 176, my + 88)

        // Home/Away badge (right)
        const badge = m.isHome ? 'DOMICILE' : 'EXTÉRIEUR'
        const badgeColor = m.isHome ? sc : 'rgba(255,255,255,0.18)'
        ctx.font = '600 16px Inter, sans-serif'
        const bw = ctx.measureText(badge).width + 28
        roundRect(ctx, W - 74 - bw, my + matchH / 2 - 16, bw, 32, 16)
        ctx.fillStyle = badgeColor
        ctx.fill()
        ctx.fillStyle = m.isHome ? textColor(sc) : tc
        ctx.textAlign = 'center'
        ctx.fillText(badge, W - 74 - bw / 2, my + matchH / 2 + 6)
      }

      if (cancelled) return

      // ── Footer
      ctx.fillStyle = sc
      ctx.fillRect(0, H - 80, W, 80)
      ctx.fillStyle = textColor(sc)
      ctx.font = '800 26px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚡ tribunes.app', 60, H - 40)
      ctx.font = '400 20px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`#${club.name.toLowerCase().replace(/\s/g, '')} #${club.sport.toLowerCase()}`, W - 60, H - 40)

      if (!cancelled) setReady(true)
    }
    draw()
    return () => { cancelled = true }
  }, [club, matches])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `programme-${club.name.toLowerCase().replace(/\s/g, '-')}.png`
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
        <span className="font-bold text-[#1a1a2e]">📅 Visuel programme généré</span>
        <div className="flex gap-2">
          <button
            onClick={copyImage} disabled={!ready || matches.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ background: copied ? '#10b981' : club.secondaryColor }}
          >
            {copied ? '✓ Copié !' : '📋 Copier'}
          </button>
          <button
            onClick={download} disabled={!ready || matches.length === 0}
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
      {matches.length === 0 && (
        <p className="text-xs text-gray-400 text-center mt-2">Ajoute au moins un match pour générer le visuel</p>
      )}
      {matches.length > 0 && !ready && (
        <p className="text-xs text-gray-400 text-center mt-2">Génération...</p>
      )}
    </div>
  )
}
