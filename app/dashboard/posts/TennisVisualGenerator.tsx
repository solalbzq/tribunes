'use client'

import { useEffect, useRef, useState } from 'react'
import { loadImage, roundRect } from '@/lib/visualLayout'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'

const SIZE = 1080

// ── Types ──────────────────────────────────────────────────────────────────

export type TennisPreset = 'sobre' | 'pro' | 'neon' | 'glass' | 'magazine' | 'classique'

export type TennisVisualConfig = {
  preset: TennisPreset
  fontScale: number
  matchesPerPage: number
  namesFormat: 'upper' | 'smart' | 'as-is'
  showTime: boolean
  showCategory: boolean
  showGrid: boolean
  showFooter: boolean
  logoSize: 'hidden' | 'sm' | 'md' | 'lg'
  logoPosition: 'top-right' | 'top-left' | 'watermark'
  logoBubble: boolean
  gradientAngle: number
  neonColor: string
  neonIntensity: number
  footerTag: string
  // VS & rankings
  vsSize: number                             // 0.8 – 3.0, multiplier sur 24px
  vsStyle: 'text' | 'lines'                 // 'lines' ajoute ──── de chaque côté
  rankingStyle: 'pill' | 'text' | 'hidden'  // pill = badge coloré, text = muted, hidden
}

export const DEFAULT_TENNIS_CONFIG: TennisVisualConfig = {
  preset: 'pro',
  fontScale: 1.0,
  matchesPerPage: 7,
  namesFormat: 'smart',
  showTime: true,
  showCategory: true,
  showGrid: true,
  showFooter: true,
  logoSize: 'md',
  logoPosition: 'top-right',
  logoBubble: true,
  gradientAngle: 135,
  neonColor: '#00f0ff',
  neonIntensity: 1.0,
  footerTag: '',
  vsSize: 1.8,
  vsStyle: 'text',
  rankingStyle: 'pill',
}

// ── Color helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  }
}

export function textColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function darkenHex(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `#${[r, g, b]
    .map(c => Math.max(0, Math.round(c * (1 - factor))).toString(16).padStart(2, '0'))
    .join('')}`
}

// ── Name formatting ────────────────────────────────────────────────────────

function formatPlayerName(raw: string, format: TennisVisualConfig['namesFormat']): string {
  if (format === 'upper') return raw.toUpperCase()
  if (format === 'as-is') return raw
  const words = raw.trim().split(/\s+/)
  if (words.length === 1) return raw.toUpperCase()
  // Un mot est considéré "tout-caps" s'il est ≥2 chars et entièrement en majuscules
  const isUpperWord = (w: string) => w.length >= 2 && /^[A-ZÀÂÉÈÊËÎÏÔÙÛÜÆŒ0-9\-']+$/.test(w)
  // Compte les mots all-caps en tête (= nom de famille en format FFT)
  let lastNameEnd = 0
  for (let i = 0; i < words.length; i++) {
    if (isUpperWord(words[i])) lastNameEnd = i + 1
    else break
  }
  if (lastNameEnd === 0) {
    // Aucun mot tout-caps : "martin thomas" ou "Martin Thomas"
    // → premier mot = nom (uppercase), reste = prénom (title-case)
    return words[0].toUpperCase() + ' ' +
      words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  if (lastNameEnd === words.length) {
    // Tous tout-caps : "MARTIN THOMAS" → "MARTIN Thomas"
    return words.slice(0, -1).join(' ') + ' ' +
      words[words.length - 1].charAt(0).toUpperCase() + words[words.length - 1].slice(1).toLowerCase()
  }
  // Format FFT standard "DUPONT Alice" → garder NOM, title-case prénom
  const lastName = words.slice(0, lastNameEnd).join(' ')
  const firstName = words.slice(lastNameEnd).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ')
  return lastName + ' ' + firstName
}

// ── Pixel-accurate truncation ──────────────────────────────────────────────

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (maxW <= 0 || ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t.length < text.length ? t + '…' : t
}

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
}

// ── Palette & fond partagés (schedule + résultat) ──────────────────────────

type Palette = {
  text: string; textMuted: string
  accent: string
  rowBg: string; rowBorder: string; rowText: string
  timeBg: string; timeText: string; timeBorderOnly: boolean
  vsColor: string; catColor: string
  footerBg: string; footerText: string; topBar: string
  divider: string; dividerW: number
}

function computeTennisPalette(p: string, s: string, onP: string, onS: string, neon: string, cfg: TennisVisualConfig): Palette {
  switch (cfg.preset) {
    case 'sobre': return {
      text: p, textMuted: withAlpha(p, 0.45), accent: s,
      rowBg: withAlpha(p, 0.04), rowBorder: withAlpha(p, 0.1), rowText: p,
      timeBg: p, timeText: onP, timeBorderOnly: false,
      vsColor: s, catColor: withAlpha(p, 0.38),
      footerBg: withAlpha(p, 0.05), footerText: withAlpha(p, 0.55), topBar: s,
      divider: withAlpha(p, 0.1), dividerW: 1,
    }
    case 'pro': return {
      text: '#ffffff', textMuted: withAlpha('#fff', 0.5), accent: s,
      rowBg: withAlpha('#fff', 0.07), rowBorder: 'transparent', rowText: '#ffffff',
      timeBg: s, timeText: onS, timeBorderOnly: false,
      vsColor: withAlpha(s, 0.9), catColor: withAlpha('#fff', 0.45),
      footerBg: s, footerText: onS, topBar: s,
      divider: withAlpha('#fff', 0.14), dividerW: 1,
    }
    case 'neon': return {
      text: '#ffffff', textMuted: withAlpha('#fff', 0.38), accent: neon,
      rowBg: withAlpha(neon, 0.07), rowBorder: withAlpha(neon, 0.28), rowText: '#ffffff',
      timeBg: 'transparent', timeText: neon, timeBorderOnly: true,
      vsColor: neon, catColor: withAlpha(neon, 0.55),
      footerBg: withAlpha(neon, 0.07), footerText: neon, topBar: neon,
      divider: withAlpha(neon, 0.2), dividerW: 1,
    }
    case 'glass': return {
      text: '#ffffff', textMuted: withAlpha('#fff', 0.55), accent: withAlpha('#fff', 0.88),
      rowBg: withAlpha('#fff', 0.1), rowBorder: withAlpha('#fff', 0.22), rowText: '#ffffff',
      timeBg: withAlpha('#fff', 0.22), timeText: '#ffffff', timeBorderOnly: false,
      vsColor: withAlpha('#fff', 0.52), catColor: withAlpha('#fff', 0.48),
      footerBg: withAlpha('#fff', 0.07), footerText: withAlpha('#fff', 0.6), topBar: withAlpha('#fff', 0.42),
      divider: withAlpha('#fff', 0.15), dividerW: 1,
    }
    case 'magazine': return {
      text: '#ffffff', textMuted: withAlpha('#fff', 0.78), accent: '#ffffff',
      rowBg: 'rgba(255,255,255,0.97)', rowBorder: 'rgba(255,255,255,0)', rowText: p,
      timeBg: s, timeText: onS, timeBorderOnly: false,
      vsColor: s, catColor: withAlpha(p, 0.4),
      footerBg: p, footerText: onP === '#000000' ? withAlpha(p, 0.7) : '#ffffff', topBar: p,
      divider: withAlpha('#fff', 0.28), dividerW: 1,
    }
    case 'classique': return {
      text: onP, textMuted: withAlpha(onP, 0.45), accent: s,
      rowBg: 'transparent', rowBorder: withAlpha(s, 0.2), rowText: onP,
      timeBg: s, timeText: onS, timeBorderOnly: false,
      vsColor: s, catColor: withAlpha(onP, 0.38),
      footerBg: s, footerText: onS, topBar: s,
      divider: withAlpha(s, 0.45), dividerW: 2,
    }
  }
}

function paintTennisBackground(ctx: CanvasRenderingContext2D, colors: Palette, p: string, s: string, onP: string, neon: string, cfg: TennisVisualConfig) {
  const angle = cfg.gradientAngle * Math.PI / 180
  const gx1 = SIZE / 2 - Math.cos(angle) * SIZE * 0.85
  const gy1 = SIZE / 2 - Math.sin(angle) * SIZE * 0.85
  const gx2 = SIZE / 2 + Math.cos(angle) * SIZE * 0.85
  const gy2 = SIZE / 2 + Math.sin(angle) * SIZE * 0.85

  switch (cfg.preset) {
    case 'sobre':
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SIZE, SIZE); break
    case 'pro': {
      const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
      grad.addColorStop(0, p); grad.addColorStop(1, withAlpha(s, 0.65))
      ctx.fillStyle = grad; ctx.fillRect(0, 0, SIZE, SIZE)
      if (cfg.showGrid) {
        ctx.strokeStyle = withAlpha('#fff', 0.04); ctx.lineWidth = 1
        for (let x = 0; x < SIZE; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke() }
        for (let y = 0; y < SIZE; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke() }
      }
      break
    }
    case 'neon': {
      ctx.fillStyle = darkenHex(p, 0.9); ctx.fillRect(0, 0, SIZE, SIZE)
      if (cfg.showGrid) {
        ctx.fillStyle = withAlpha(neon, 0.07)
        for (let x = 40; x < SIZE; x += 60) for (let y = 40; y < SIZE; y += 60) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill() }
      }
      break
    }
    case 'glass': {
      const rGrad = ctx.createRadialGradient(SIZE * 0.38, SIZE * 0.28, 0, SIZE / 2, SIZE / 2, SIZE * 0.88)
      rGrad.addColorStop(0, withAlpha(s, 0.38)); rGrad.addColorStop(0.45, p); rGrad.addColorStop(1, darkenHex(p, 0.38))
      ctx.fillStyle = rGrad; ctx.fillRect(0, 0, SIZE, SIZE); break
    }
    case 'magazine': {
      ctx.fillStyle = s; ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.save(); ctx.translate(SIZE * 0.47, 0); ctx.rotate(-13 * Math.PI / 180)
      ctx.fillStyle = p; ctx.fillRect(-80, -200, SIZE * 0.78, SIZE + 400); ctx.restore(); break
    }
    case 'classique': {
      ctx.fillStyle = p; ctx.fillRect(0, 0, SIZE, SIZE)
      if (cfg.showGrid) {
        ctx.strokeStyle = withAlpha(onP, 0.03); ctx.lineWidth = 1
        for (let i = -SIZE; i < SIZE * 2; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + SIZE, SIZE); ctx.stroke() }
      }
      break
    }
  }

  // Barre d'accent haute
  if (cfg.preset === 'neon') { ctx.shadowBlur = 18 * cfg.neonIntensity; ctx.shadowColor = neon }
  ctx.fillStyle = colors.topBar
  ctx.fillRect(0, 0, SIZE, 8)
  ctx.shadowBlur = 0
}

// ── Main draw function ─────────────────────────────────────────────────────

export async function drawTournamentSchedule(
  canvas: HTMLCanvasElement,
  club: Club,
  matches: TournamentMatch[],
  tournamentName: string,
  matchDate: Date,
  cfg: TennisVisualConfig = DEFAULT_TENNIS_CONFIG
) {
  const ctx = canvas.getContext('2d')!
  canvas.width = SIZE
  canvas.height = SIZE

  const p = club.primaryColor
  const s = club.secondaryColor
  const onP = textColor(p)
  const onS = textColor(s)
  const fs = cfg.fontScale
  const footerH = cfg.showFooter ? 80 : 0
  const neon = cfg.neonColor

  // ── Palette + fond (partagés) ──────────────────────────────────────────
  const colors = computeTennisPalette(p, s, onP, onS, neon, cfg)
  paintTennisBackground(ctx, colors, p, s, onP, neon, cfg)

  // ── 3. Logo ────────────────────────────────────────────────────────────

  const logoSizePx = { hidden: 0, sm: 80, md: 120, lg: 160 }[cfg.logoSize]
  let logoImg: HTMLImageElement | null = null
  if (club.logoUrl && cfg.logoSize !== 'hidden') {
    try { logoImg = await loadImage(club.logoUrl) } catch { /* ok */ }
  }

  function placeLogoAt(lx: number, ly: number) {
    if (!logoImg || logoSizePx === 0) return
    if (cfg.logoBubble) {
      roundRect(ctx, lx - 14, ly - 14, logoSizePx + 28, logoSizePx + 28, 22)
      ctx.fillStyle = withAlpha('#ffffff', cfg.preset === 'sobre' ? 0.07 : 0.13)
      ctx.fill()
      if (cfg.preset === 'neon') {
        ctx.shadowBlur = 14 * cfg.neonIntensity
        ctx.shadowColor = neon
        ctx.strokeStyle = withAlpha(neon, 0.35)
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }
    const ratio = Math.min(logoSizePx / logoImg.width, logoSizePx / logoImg.height)
    const dw = logoImg.width * ratio, dh = logoImg.height * ratio
    ctx.drawImage(logoImg, lx + (logoSizePx - dw) / 2, ly + (logoSizePx - dh) / 2, dw, dh)
  }

  // Header-area logo (not watermark)
  let headerTextX = 56
  let headerTextMaxW = SIZE - 112

  if (cfg.logoSize !== 'hidden' && cfg.logoPosition !== 'watermark') {
    if (cfg.logoPosition === 'top-right') {
      placeLogoAt(SIZE - logoSizePx - 48, 40)
      headerTextMaxW = SIZE - logoSizePx - 80 - 56
    } else {
      // top-left
      placeLogoAt(48, 40)
      headerTextX = 48 + logoSizePx + 24
      headerTextMaxW = SIZE - headerTextX - 56
    }
  }

  // ── 4. Header text ─────────────────────────────────────────────────────

  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  // Club name (starts higher now — no sport label above)
  if (cfg.preset === 'neon') { ctx.shadowBlur = 14 * cfg.neonIntensity; ctx.shadowColor = neon }
  ctx.fillStyle = colors.text
  ctx.font = `800 ${Math.round(62 * fs)}px Inter, sans-serif`
  const rawCname = formatPlayerName(club.name, cfg.namesFormat)
  const cname = truncateText(ctx, rawCname, headerTextMaxW)
  ctx.fillText(cname, headerTextX, 36)
  ctx.shadowBlur = 0

  // Tournament name
  if (cfg.preset === 'neon') { ctx.shadowBlur = 8 * cfg.neonIntensity; ctx.shadowColor = neon }
  ctx.fillStyle = cfg.preset === 'sobre' ? s : colors.accent
  ctx.font = `700 ${Math.round(32 * fs)}px Inter, sans-serif`
  const tname = tournamentName.length > 38 ? tournamentName.slice(0, 36) + '…' : tournamentName
  ctx.fillText(tname, headerTextX, 116)
  ctx.shadowBlur = 0

  // Date pill
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  ctx.font = `500 ${Math.round(22 * fs)}px Inter, sans-serif`
  const dateW = Math.min(ctx.measureText(dateStr).width + 40, headerTextMaxW)
  roundRect(ctx, headerTextX, 162, dateW, 40, 20)
  ctx.fillStyle = cfg.preset === 'sobre' ? withAlpha(s, 0.1) : withAlpha(colors.text, 0.1)
  ctx.fill()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = cfg.preset === 'sobre' ? s : withAlpha(colors.text, 0.82)
  ctx.fillText(dateStr, headerTextX + 20, 182)

  // Divider
  ctx.strokeStyle = colors.divider
  ctx.lineWidth = colors.dividerW
  ctx.beginPath(); ctx.moveTo(56, 222); ctx.lineTo(SIZE - 56, 222); ctx.stroke()

  // ── 5. Match rows ─────────────────────────────────────────────────────

  const listTop = 238
  const listBottom = SIZE - footerH - 16
  const rowH = (listBottom - listTop) / matches.length
  const rowPad = 44

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const ry = listTop + i * rowH
    const mid = ry + rowH / 2

    ctx.textBaseline = 'middle'

    // Row bg
    if (cfg.preset === 'sobre') {
      if (i % 2 === 0) {
        roundRect(ctx, rowPad, ry + 5, SIZE - rowPad * 2, rowH - 10, 12)
        ctx.fillStyle = colors.rowBg; ctx.fill()
        ctx.strokeStyle = colors.rowBorder; ctx.lineWidth = 0.5; ctx.stroke()
      }
    } else if (cfg.preset === 'pro') {
      if (i % 2 === 0) {
        roundRect(ctx, rowPad, ry + 5, SIZE - rowPad * 2, rowH - 10, 14)
        ctx.fillStyle = colors.rowBg; ctx.fill()
      }
    } else if (cfg.preset === 'neon' || cfg.preset === 'glass') {
      roundRect(ctx, rowPad, ry + 5, SIZE - rowPad * 2, rowH - 10, 16)
      ctx.fillStyle = colors.rowBg; ctx.fill()
      ctx.strokeStyle = colors.rowBorder; ctx.lineWidth = 1; ctx.stroke()
    } else if (cfg.preset === 'magazine') {
      roundRect(ctx, rowPad, ry + 5, SIZE - rowPad * 2, rowH - 10, 14)
      ctx.fillStyle = colors.rowBg; ctx.fill()
    } else if (cfg.preset === 'classique') {
      ctx.strokeStyle = withAlpha(s, 0.18)
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(56, ry + rowH - 1); ctx.lineTo(SIZE - 56, ry + rowH - 1); ctx.stroke()
    }

    // Time badge
    const badgeW = 92, badgeX = rowPad + 8
    if (cfg.showTime && m.time) {
      if (cfg.preset === 'neon') { ctx.shadowBlur = 12 * cfg.neonIntensity; ctx.shadowColor = neon }
      roundRect(ctx, badgeX, mid - 22, badgeW, 44, 10)
      if (colors.timeBorderOnly) {
        ctx.strokeStyle = colors.timeText; ctx.lineWidth = 1.5; ctx.stroke()
      } else {
        ctx.fillStyle = colors.timeBg; ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.fillStyle = colors.timeText
      ctx.font = `700 ${Math.round(22 * fs)}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(m.time, badgeX + badgeW / 2, mid)
    }

    const playerX = cfg.showTime && m.time ? badgeX + badgeW + 18 : rowPad + 16
    const rightEdge = SIZE - rowPad - 8
    const hasCategory = cfg.showCategory && m.category
    const mutedCol = cfg.preset === 'magazine' ? withAlpha(p, 0.42) : colors.catColor
    const accentCol = cfg.preset === 'magazine' ? s : colors.accent
    const rankingShow = cfg.rankingStyle ?? 'pill'

    // ── Meta line : catégorie seule (rankings maintenant inline) ──────────
    const showMetaLine = hasCategory
    if (showMetaLine) {
      ctx.font = `500 ${Math.round(17 * fs)}px Inter, sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillStyle = mutedCol
      ctx.fillText(m.category, playerX, mid - 14)
    }

    const nameY = showMetaLine ? mid + 10 : mid

    // ── Helper : dessine un ranking pill/text et retourne sa largeur ──────
    function drawRanking(ranking: string, x: number, y: number, align: 'left' | 'right'): number {
      if (!ranking || rankingShow === 'hidden') return 0
      ctx.font = `600 ${Math.round(16 * fs)}px Inter, sans-serif`
      const tw = ctx.measureText(ranking).width
      if (rankingShow === 'pill') {
        const ph = 28, pw = tw + 20, pr = 7
        const px = align === 'left' ? x : x - pw
        roundRect(ctx, px, y - ph / 2, pw, ph, pr)
        ctx.fillStyle = withAlpha(accentCol.startsWith('rgba') ? '#ffffff' : accentCol, 0.18)
        ctx.fill()
        ctx.strokeStyle = withAlpha(accentCol.startsWith('rgba') ? '#ffffff' : accentCol, 0.35)
        ctx.lineWidth = 1
        ctx.stroke()
        if (cfg.preset === 'neon') {
          ctx.shadowBlur = 6 * cfg.neonIntensity; ctx.shadowColor = neon
        }
        ctx.fillStyle = accentCol.startsWith('rgba') ? '#ffffff' : accentCol
        ctx.textAlign = 'center'
        ctx.fillText(ranking, px + pw / 2, y)
        ctx.shadowBlur = 0
        return pw + 10
      } else {
        // text mode
        ctx.fillStyle = mutedCol
        ctx.textAlign = align
        ctx.fillText(ranking, x, y)
        return tw + 10
      }
    }

    // ── Pré-calcul largeurs pour truncate pixel-accurate ──────────────────
    const nameFontSize = Math.round(26 * fs)
    ctx.font = `700 ${nameFontSize}px Inter, sans-serif`
    const rankFontSize = Math.round(16 * fs)

    // Estime largeur ranking pill/text sans dessiner
    function estRankW(ranking: string): number {
      if (!ranking || rankingShow === 'hidden') return 0
      ctx.font = `600 ${rankFontSize}px Inter, sans-serif`
      const tw = ctx.measureText(ranking).width
      ctx.font = `700 ${nameFontSize}px Inter, sans-serif`
      return rankingShow === 'pill' ? tw + 30 : tw + 10
    }

    const vsPx = Math.round(24 * fs * (cfg.vsSize ?? 1.8))
    ctx.font = `800 ${vsPx}px Inter, sans-serif`
    const vsHalfW = ctx.measureText('vs').width / 2 + 24
    ctx.font = `700 ${nameFontSize}px Inter, sans-serif`

    const r1est = estRankW(m.ranking1)
    const r2est = estRankW(m.ranking2)
    const maxP1W = SIZE / 2 - vsHalfW - (playerX + r1est) - 8
    const maxP2W = SIZE / 2 - vsHalfW - (SIZE - rightEdge + r2est) - 8

    const p1name = formatPlayerName(m.player1, cfg.namesFormat)
    const p2name = formatPlayerName(m.player2, cfg.namesFormat)
    const p1disp = truncateText(ctx, p1name, maxP1W)
    const p2disp = truncateText(ctx, p2name, maxP2W)

    // ── Ranking gauche (joueur 1) ──────────────────────────────────────────
    const r1w = m.ranking1 && rankingShow !== 'hidden'
      ? drawRanking(m.ranking1, playerX, nameY, 'left')
      : 0

    // ── Joueur 1 ───────────────────────────────────────────────────────────
    ctx.font = `700 ${nameFontSize}px Inter, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillStyle = cfg.preset === 'magazine' ? p : colors.rowText
    ctx.fillText(p1disp, playerX + r1w, nameY)

    // ── VS ─────────────────────────────────────────────────────────────────
    ctx.font = `800 ${vsPx}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = cfg.preset === 'magazine' ? s : colors.vsColor
    const vsY = showMetaLine ? nameY : mid

    if ((cfg.vsStyle ?? 'text') === 'lines') {
      const vsW = ctx.measureText('vs').width
      const lineGap = 16
      ctx.strokeStyle = withAlpha(cfg.preset === 'magazine' ? s : colors.vsColor, 0.4)
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(playerX + r1w + 8, vsY); ctx.lineTo(SIZE / 2 - vsW / 2 - lineGap, vsY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(SIZE / 2 + vsW / 2 + lineGap, vsY); ctx.lineTo(rightEdge - 8, vsY); ctx.stroke()
    }
    ctx.fillText('vs', SIZE / 2, vsY)

    // ── Ranking droite (joueur 2) ──────────────────────────────────────────
    const r2w = m.ranking2 && rankingShow !== 'hidden'
      ? drawRanking(m.ranking2, rightEdge, nameY, 'right')
      : 0

    // ── Joueur 2 ───────────────────────────────────────────────────────────
    ctx.font = `700 ${nameFontSize}px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillStyle = cfg.preset === 'magazine' ? p : colors.rowText
    ctx.fillText(p2disp, rightEdge - r2w, nameY)
  }

  // ── 6. Watermark logo ─────────────────────────────────────────────────

  if (cfg.logoPosition === 'watermark' && logoSizePx > 0) {
    ctx.globalAlpha = 0.35
    placeLogoAt(SIZE - logoSizePx - 40, SIZE - footerH - logoSizePx - 24)
    ctx.globalAlpha = 1
  }

  // ── 7. Footer ──────────────────────────────────────────────────────────

  if (cfg.showFooter) {
    if (cfg.preset === 'neon') {
      ctx.shadowBlur = 0
      ctx.strokeStyle = withAlpha(neon, 0.32)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, SIZE - 80); ctx.lineTo(SIZE, SIZE - 80); ctx.stroke()
    } else if (cfg.preset === 'sobre') {
      ctx.strokeStyle = withAlpha(p, 0.08)
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, SIZE - 80); ctx.lineTo(SIZE, SIZE - 80); ctx.stroke()
    }

    ctx.fillStyle = colors.footerBg
    ctx.fillRect(0, SIZE - 80, SIZE, 80)

    if (cfg.preset === 'neon') { ctx.shadowBlur = 8 * cfg.neonIntensity; ctx.shadowColor = neon }
    ctx.fillStyle = colors.footerText
    ctx.font = `800 24px Inter, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡ tribunes.app', 56, SIZE - 40)
    ctx.shadowBlur = 0

    const tag = cfg.footerTag || `#${club.name.toLowerCase().replace(/\s+/g, '')} #${club.sport.toLowerCase()}`
    ctx.font = `500 18px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillStyle = cfg.preset === 'neon' ? withAlpha(neon, 0.55) : colors.footerText
    ctx.fillText(tag, SIZE - 56, SIZE - 40)
  }
}

// ── Visuel RÉSULTAT (score global) ──────────────────────────────────────────

export type TennisResultData = {
  teamName: string
  opponent: string
  clubScore: number
  oppScore: number
  division?: string
  journee?: string
}

export async function drawTennisResult(
  canvas: HTMLCanvasElement,
  club: Club,
  data: TennisResultData,
  cfg: TennisVisualConfig = DEFAULT_TENNIS_CONFIG,
) {
  const ctx = canvas.getContext('2d')!
  canvas.width = SIZE
  canvas.height = SIZE

  const p = club.primaryColor
  const s = club.secondaryColor
  const onP = textColor(p)
  const onS = textColor(s)
  const fs = cfg.fontScale
  const neon = cfg.neonColor
  const colors = computeTennisPalette(p, s, onP, onS, neon, cfg)
  paintTennisBackground(ctx, colors, p, s, onP, neon, cfg)

  const isWin = data.clubScore > data.oppScore
  const isLoss = data.clubScore < data.oppScore
  const outcome = isWin ? 'VICTOIRE' : isLoss ? 'DÉFAITE' : 'MATCH NUL'
  const badgeBg = isWin ? '#22c55e' : isLoss ? '#ef4444' : '#6b7280'

  const glow = (on: boolean) => {
    if (cfg.preset === 'neon' && on) { ctx.shadowBlur = 14 * cfg.neonIntensity; ctx.shadowColor = neon }
    else ctx.shadowBlur = 0
  }

  // ── Logo (haut droite, optionnel)
  const logoSizePx = { hidden: 0, sm: 80, md: 120, lg: 160 }[cfg.logoSize]
  if (club.logoUrl && cfg.logoSize !== 'hidden') {
    try {
      const logo = await loadImage(club.logoUrl)
      const ratio = Math.min(logoSizePx / logo.width, logoSizePx / logo.height)
      const dw = logo.width * ratio, dh = logo.height * ratio
      const lx = SIZE - logoSizePx - 56, ly = 48
      if (cfg.logoBubble) {
        roundRect(ctx, lx - 14, ly - 14, logoSizePx + 28, logoSizePx + 28, 22)
        ctx.fillStyle = withAlpha('#ffffff', cfg.preset === 'sobre' ? 0.07 : 0.13)
        ctx.fill()
      }
      ctx.drawImage(logo, lx + (logoSizePx - dw) / 2, ly + (logoSizePx - dh) / 2, dw, dh)
    } catch { /* ok */ }
  }

  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  // ── Nom du club
  glow(true)
  ctx.fillStyle = colors.text
  ctx.font = `800 ${Math.round(56 * fs)}px Inter, sans-serif`
  const cname = truncateText(ctx, formatPlayerName(club.name, cfg.namesFormat), SIZE - 112 - logoSizePx - 24)
  ctx.fillText(cname, 56, 44)
  glow(false)

  // ── Eyebrow "RÉSULTAT · division"
  ctx.fillStyle = colors.accent
  ctx.font = `800 ${Math.round(22 * fs)}px Inter, sans-serif`
  const eyebrow = `RÉSULTAT${data.division ? ` · ${data.division.toUpperCase()}` : ''}`
  ctx.fillText(eyebrow, 56, 44 + Math.round(56 * fs) + 14)

  // ── Bloc central (vertical, centré)
  ctx.textAlign = 'center'
  const cx = SIZE / 2

  // Équipe du club
  glow(true)
  ctx.fillStyle = colors.text
  ctx.font = `800 ${Math.round(52 * fs)}px Inter, sans-serif`
  ctx.fillText(truncateText(ctx, data.teamName, SIZE - 140), cx, SIZE * 0.34)
  glow(false)

  // Score géant
  glow(true)
  ctx.fillStyle = colors.text
  ctx.font = `900 ${Math.round(170 * fs)}px Inter, sans-serif`
  ctx.fillText(`${data.clubScore}`, cx - Math.round(150 * fs), SIZE * 0.42)
  ctx.fillStyle = colors.textMuted
  ctx.fillText('–', cx, SIZE * 0.42)
  ctx.fillStyle = colors.text
  ctx.fillText(`${data.oppScore}`, cx + Math.round(150 * fs), SIZE * 0.42)
  glow(false)

  // Adversaire
  ctx.fillStyle = colors.textMuted
  ctx.font = `600 ${Math.round(40 * fs)}px Inter, sans-serif`
  ctx.fillText(truncateText(ctx, data.opponent, SIZE - 160), cx, SIZE * 0.64)

  // ── Badge résultat (pill)
  ctx.font = `800 ${Math.round(30 * fs)}px Inter, sans-serif`
  const bw = ctx.measureText(outcome).width + 72
  const bh = Math.round(66 * fs)
  const by = SIZE * 0.74
  glow(true)
  roundRect(ctx, cx - bw / 2, by, bw, bh, bh / 2)
  ctx.fillStyle = badgeBg
  ctx.fill()
  glow(false)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(outcome, cx, by + bh / 2 + 2)
  ctx.textBaseline = 'top'

  // ── Journée / date
  if (data.journee) {
    ctx.fillStyle = colors.textMuted
    ctx.font = `600 ${Math.round(26 * fs)}px Inter, sans-serif`
    ctx.fillText(data.journee, cx, by + bh + 26)
  }

  // ── Footer
  if (cfg.showFooter) {
    ctx.fillStyle = colors.footerBg
    ctx.fillRect(0, SIZE - 80, SIZE, 80)
    ctx.fillStyle = colors.footerText
    ctx.textAlign = 'left'
    ctx.font = `700 ${Math.round(24 * fs)}px Inter, sans-serif`
    ctx.fillText(cfg.footerTag || 'tribunes.app', 56, SIZE - 80 + 28)
  }
}

// ── Aperçu du visuel RÉSULTAT (canvas exposé) ───────────────────────────────

export function TennisResultVisual({
  club, data, config = DEFAULT_TENNIS_CONFIG, onCanvasReady,
}: {
  club: Club
  data: TennisResultData
  config?: TennisVisualConfig
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const onReadyRef = useRef(onCanvasReady)
  onReadyRef.current = onCanvasReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    setReady(false)
    drawTennisResult(canvas, club, data, config)
      .then(() => { if (!cancelled) { setReady(true); onReadyRef.current?.(canvas) } })
      .catch(console.error)
    return () => { cancelled = true }
  }, [club, data, config])

  return (
    <div className="flex justify-center rounded-btn bg-subtle p-4">
      <canvas ref={canvasRef} className="w-full max-w-[420px] aspect-square rounded-xl shadow-lg" />
      {!ready && <p className="sr-only">Rendu…</p>}
    </div>
  )
}

// ── Single canvas page ─────────────────────────────────────────────────────

function VisualPage({
  club, matches, tournamentName, matchDate, page, total, config, onCanvasReady,
}: {
  club: Club; matches: TournamentMatch[]; tournamentName: string
  matchDate: Date; page: number; total: number; config: TennisVisualConfig
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const onReadyRef = useRef(onCanvasReady)
  onReadyRef.current = onCanvasReady

  useEffect(() => {
    if (!canvasRef.current || matches.length === 0) return
    let cancelled = false
    setReady(false)
    drawTournamentSchedule(canvasRef.current, club, matches, tournamentName, matchDate, config)
      .then(() => { if (!cancelled) { setReady(true); onReadyRef.current?.(canvasRef.current!) } })
      .catch(console.error)
    return () => { cancelled = true }
  }, [club, matches, tournamentName, matchDate, config])

  function download() {
    const canvas = canvasRef.current; if (!canvas) return
    const link = document.createElement('a')
    link.download = `tribunes-${club.name.toLowerCase().replace(/\s/g, '-')}-${page}-${Date.now()}.png`
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
    <div className="rounded-btn bg-subtle p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted">
          Visuel {page}{total > 1 ? ` / ${total}` : ''}
        </span>
        <div className="flex gap-2">
          <button onClick={copyImage} disabled={!ready}
            className="rounded-btn px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
            style={{ background: copied ? '#22c55e' : '#2563eb' }}>
            {copied ? 'Copié' : "Copier"}
          </button>
          <button onClick={download} disabled={!ready}
            className="rounded-btn bg-ink px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50">
            Télécharger
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="w-full max-w-[380px] aspect-square rounded-xl shadow-md" />
      </div>
      {!ready && <p className="text-center text-xs text-muted animate-pulse">Rendu…</p>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TennisVisualGenerator({
  club, matches, tournamentName, matchDate, label = 'Programme', config, onCanvasReady,
}: {
  club: Club; matches: TournamentMatch[]; tournamentName: string
  matchDate: Date; label?: string; config?: TennisVisualConfig
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}) {
  if (matches.length === 0) return null

  const cfg = config ?? DEFAULT_TENNIS_CONFIG
  const perPage = cfg.matchesPerPage

  const pages: TournamentMatch[][] = []
  for (let i = 0; i < matches.length; i += perPage) pages.push(matches.slice(i, i + perPage))

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-ink">Visuels — {label}</span>
          {pages.length > 1 && (
            <span className="ml-2 rounded-full bg-subtle px-2 py-0.5 text-xs text-muted">
              {pages.length} visuels · {matches.length} matchs
            </span>
          )}
        </div>
        <span className="rounded-full border border-line bg-subtle px-2 py-1 text-xs capitalize text-muted">
          {cfg.preset}
        </span>
      </div>
      <div className={`grid gap-4 ${pages.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {pages.map((pageMatches, i) => (
          <VisualPage key={i} club={club} matches={pageMatches} tournamentName={tournamentName}
            matchDate={matchDate} page={i + 1} total={pages.length} config={cfg}
            onCanvasReady={i === 0 ? onCanvasReady : undefined} />
        ))}
      </div>
    </div>
  )
}
