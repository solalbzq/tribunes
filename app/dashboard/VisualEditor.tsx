'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LayoutElement, VisualConfig, VisualConfigByFormat, ElementType, VisualFormat, SnapGuide,
  parseVisualConfigByFormat, defaultElementsFor, canvasSizeFor,
  textColor, loadImage, roundRect, drawElements, computeSnap, drawSnapGuides,
  DEFAULT_FONT_FAMILIES, VISUAL_THEMES, applyThemeFontFamily,
} from '@/lib/visualLayout'

type Club = {
  name: string; sport: string
  primaryColor: string; secondaryColor: string
  logoUrl: string | null; visualConfig: unknown
}

const HANDLE = 18
const LABELS: Record<ElementType, string> = {
  sport: 'Sport', clubName: 'Nom du club', logo: 'Logo',
  scoreBlock: 'Carte score', footer: 'Bandeau bas',
  text: 'Texte', rect: 'Rectangle', circle: 'Cercle', line: 'Séparateur',
}
const LOCKED = new Set<ElementType>(['sport', 'clubName', 'logo', 'scoreBlock', 'footer'])

type Drag = { id: string; mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number }

function newElement(type: ElementType, primary: string, secondary: string): LayoutElement {
  const defaults: Partial<Record<ElementType, Partial<LayoutElement>>> = {
    text:   { x: 200, y: 300, w: 500, h: 60,  color: '#ffffff', text: 'Mon texte', fontSize: 1, borderRadius: 0 },
    rect:   { x: 200, y: 300, w: 400, h: 150, color: secondary, opacity: 0.8, borderRadius: 16, strokeWidth: 0 },
    circle: { x: 400, y: 300, w: 200, h: 200, color: secondary, opacity: 0.8, strokeWidth: 0 },
    line:   { x: 64,  y: 380, w: 952, h: 20,  color: secondary, strokeWidth: 4 },
  }
  return {
    id: `${type}_${Date.now()}`,
    type,
    x: 200, y: 300, w: 300, h: 80,
    visible: true, fontSize: 1, opacity: 1, color: secondary,
    logoShowBg: true,
    ...(defaults[type] ?? {}),
  }
}

export default function VisualEditor({ club, isPremium, onSave }: { club: Club; isPremium: boolean; onSave: (format: VisualFormat, cfg: VisualConfig) => void | Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoRef = useRef<HTMLImageElement | null>(null)
  const [format, setFormat] = useState<VisualFormat>('post')
  const [configs, setConfigs] = useState<VisualConfigByFormat>(() => parseVisualConfigByFormat(club.visualConfig))
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [guides, setGuides] = useState<SnapGuide[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const cfg = configs[format]
  const { w: CW, h: CH } = canvasSizeFor(format)

  useEffect(() => {
    if (!club.logoUrl) return
    loadImage(club.logoUrl).then(img => { logoRef.current = img }).catch(() => {})
  }, [club.logoUrl])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = CW
    canvas.height = CH

    // Background
    ctx.fillStyle = club.primaryColor
    ctx.fillRect(0, 0, CW, CH)
    const grad = ctx.createLinearGradient(0, 0, CW, CH)
    grad.addColorStop(0, 'rgba(255,255,255,0.03)')
    grad.addColorStop(1, 'rgba(0,0,0,0.15)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CW, CH)

    // Draw elements using shared function
    drawElements(ctx, cfg.elements, {
      clubName: club.name, sport: club.sport,
      secondaryColor: club.secondaryColor,
      logoImg: logoRef.current,
      opponent: 'Adversaire', clubScore: 3, oppScore: 1,
      result: 'VICTOIRE', competition: 'Championnat',
    })

    if (guides.length) drawSnapGuides(ctx, guides, CW, CH)

    // Selection overlay
    if (selected) {
      const el = cfg.elements.find(e => e.id === selected)
      if (el) {
        ctx.save()
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 5])
        ctx.strokeRect(el.x - 4, el.y - 4, el.w + 8, el.h + 8)
        // Resize handle
        ctx.fillStyle = '#3b82f6'
        ctx.setLineDash([])
        roundRect(ctx, el.x + el.w - HANDLE / 2, el.y + el.h - HANDLE / 2, HANDLE, HANDLE, 4)
        ctx.fill()
        // Delete handle (top-right)
        ctx.fillStyle = '#ef4444'
        roundRect(ctx, el.x + el.w - HANDLE / 2, el.y - HANDLE / 2, HANDLE, HANDLE, 4)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('×', el.x + el.w, el.y)
        ctx.restore()
      }
    }
  }, [cfg, selected, club, guides, CW, CH])

  useEffect(() => { draw() }, [draw])

  function scale() {
    const c = canvasRef.current!
    return CW / c.clientWidth
  }

  function canvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect()
    const s = scale()
    return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s }
  }

  function hitTest(mx: number, my: number) {
    for (let i = cfg.elements.length - 1; i >= 0; i--) {
      const el = cfg.elements[i]
      if (!el.visible) continue
      if (mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h) return el.id
    }
    return null
  }

  function onHandleDelete(mx: number, my: number, el: LayoutElement) {
    const hx = el.x + el.w, hy = el.y
    return Math.abs(mx - hx) < HANDLE && Math.abs(my - hy) < HANDLE
  }

  function onHandleResize(mx: number, my: number, el: LayoutElement) {
    return mx >= el.x + el.w - HANDLE && mx <= el.x + el.w + HANDLE / 2
      && my >= el.y + el.h - HANDLE && my <= el.y + el.h + HANDLE / 2
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasPos(e)
    const hitId = hitTest(x, y)
    setSelected(hitId)
    if (!hitId) return
    const el = cfg.elements.find(el => el.id === hitId)!
    // Delete handle click
    if (onHandleDelete(x, y, el) && !LOCKED.has(el.type)) {
      deleteEl(hitId); return
    }
    const mode = onHandleResize(x, y, el) ? 'resize' : 'move'
    setDrag({ id: hitId, mode, sx: x, sy: y, ox: el.x, oy: el.y, ow: el.w, oh: el.h })
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drag) return
    const { x, y } = canvasPos(e)
    const dx = x - drag.sx, dy = y - drag.sy
    if (drag.mode === 'resize') {
      updateEl(drag.id, el => ({ ...el, w: Math.max(40, drag.ow + dx), h: Math.max(20, drag.oh + dy) }))
      return
    }
    const el = cfg.elements.find(e => e.id === drag.id)
    if (!el) return
    const rawX = Math.max(0, Math.min(CW - el.w, drag.ox + dx))
    const rawY = Math.max(0, Math.min(CH - el.h, drag.oy + dy))
    const others = cfg.elements.filter(e => e.id !== drag.id && e.visible).map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h }))
    const snapped = computeSnap({ x: rawX, y: rawY, w: el.w, h: el.h }, others, CW, CH)
    setGuides(snapped.guides)
    updateEl(drag.id, e => ({ ...e, x: snapped.x, y: snapped.y }))
  }

  function onMouseUp() { setDrag(null); setGuides([]) }

  // ── Helpers
  function updateEl(id: string, fn: (el: LayoutElement) => LayoutElement) {
    setConfigs(c => ({ ...c, [format]: { ...c[format], elements: c[format].elements.map(e => e.id === id ? fn(e) : e) } }))
  }
  function deleteEl(id: string) {
    setSelected(null)
    setConfigs(c => ({ ...c, [format]: { ...c[format], elements: c[format].elements.filter(e => e.id !== id) } }))
  }
  function addElement(type: ElementType) {
    const el = newElement(type, club.primaryColor, club.secondaryColor)
    setConfigs(c => ({ ...c, [format]: { ...c[format], elements: [...c[format].elements, el] } }))
    setSelected(el.id)
  }
  function moveLayer(id: string, dir: 1 | -1) {
    setConfigs(c => {
      const arr = [...c[format].elements]
      const i = arr.findIndex(e => e.id === id)
      const j = i + dir
      if (j < 0 || j >= arr.length) return c
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...c, [format]: { ...c[format], elements: arr } }
    })
  }
  function duplicateEl(id: string) {
    const el = cfg.elements.find(e => e.id === id)
    if (!el) return
    const copy = { ...el, id: `${el.type}_${Date.now()}`, x: el.x + 30, y: el.y + 30 }
    setConfigs(c => ({ ...c, [format]: { ...c[format], elements: [...c[format].elements, copy] } }))
    setSelected(copy.id)
  }
  function resetFormat() {
    setSelected(null)
    setConfigs(c => ({ ...c, [format]: { bgOpacity: 0.75, elements: defaultElementsFor(format) } }))
  }
  function applyTheme(theme: (typeof VISUAL_THEMES)[number]) {
    setConfigs(c => ({ ...c, [format]: { ...c[format], elements: applyThemeFontFamily(c[format].elements, theme) } }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(format, configs[format])
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function switchFormat(f: VisualFormat) {
    setSelected(null)
    setGuides([])
    setFormat(f)
  }

  const sel = cfg.elements.find(e => e.id === selected) ?? null

  return (
    <div className="space-y-4">
      {/* Format Post / Story */}
      <div className="inline-flex gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
        <button onClick={() => switchFormat('post')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${format === 'post' ? 'bg-white shadow text-[#111827]' : 'text-gray-500'}`}>
          Post carré
        </button>
        <button onClick={() => switchFormat('story')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${format === 'story' ? 'bg-white shadow text-[#111827]' : 'text-gray-500'}`}>
          Story verticale
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-100 rounded-2xl p-3">
        <span className="text-xs font-semibold text-gray-400 mr-1">Ajouter :</span>
        {([['text','✏️ Texte'], ['rect','▭ Rectangle'], ['circle','⬤ Cercle'], ['line','— Ligne']] as [ElementType, string][]).map(([type, label]) => (
          <button key={type} onClick={() => addElement(type)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition">
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={resetFormat}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Réinitialiser
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-60 ${saved ? 'bg-[#22c55e]' : 'bg-[#111827]'}`}>
            {saved ? '✓ Sauvegardé' : saving ? '...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-100 rounded-2xl p-3">
        <span className="text-xs font-semibold text-gray-400 mr-1">Thèmes :</span>
        {VISUAL_THEMES.map(theme => (
          <button key={theme.label} onClick={() => applyTheme(theme)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition">
            {theme.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Canvas */}
        <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-center">
          <div className="w-full" style={{ maxWidth: format === 'story' ? 320 : 520 }}>
            <canvas ref={canvasRef}
              className="w-full rounded-xl cursor-crosshair select-none shadow-2xl"
              style={{ touchAction: 'none', aspectRatio: `${CW}/${CH}` }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            />
          </div>
        </div>

        {/* Panel */}
        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">

          {/* Background photo opacity (global) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo de fond</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16">Opacité</span>
              <input type="range" min="0" max="1" step="0.05"
                value={cfg.bgOpacity}
                onChange={e => setConfigs(c => ({ ...c, [format]: { ...c[format], bgOpacity: Number(e.target.value) } }))}
                className="flex-1 accent-[#2563eb]"
              />
              <span className="text-xs font-mono w-8 text-right">{Math.round(cfg.bgOpacity * 100)}%</span>
            </div>
          </div>

          {/* Selected element controls */}
          {sel ? (
            <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827]">{LABELS[sel.type]}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveLayer(sel.id, -1)} title="Monter" className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs flex items-center justify-center">↑</button>
                  <button onClick={() => moveLayer(sel.id, 1)} title="Descendre" className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs flex items-center justify-center">↓</button>
                  <button onClick={() => duplicateEl(sel.id)} title="Dupliquer" className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs flex items-center justify-center">⊕</button>
                  {!LOCKED.has(sel.type) && (
                    <button onClick={() => deleteEl(sel.id)} title="Supprimer" className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 text-xs flex items-center justify-center">×</button>
                  )}
                </div>
              </div>

              {/* Visibility */}
              {(sel.type !== 'footer' || isPremium) && (
                <Row label="Visible">
                  <Toggle value={sel.visible} onChange={v => updateEl(sel.id, e => ({ ...e, visible: v }))} />
                </Row>
              )}

              {/* Opacity */}
              <Row label="Opacité">
                <input type="range" min="0" max="1" step="0.05" value={sel.opacity}
                  onChange={e => updateEl(sel.id, el => ({ ...el, opacity: Number(e.target.value) }))}
                  className="flex-1 accent-[#2563eb]" />
                <span className="text-xs font-mono w-8 text-right">{Math.round(sel.opacity * 100)}%</span>
              </Row>

              {/* Color */}
              {sel.type !== 'scoreBlock' && (
                <Row label="Couleur">
                  <input type="color" value={sel.color} onChange={e => updateEl(sel.id, el => ({ ...el, color: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                  <input type="text" value={sel.color} onChange={e => updateEl(sel.id, el => ({ ...el, color: e.target.value }))}
                    className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" maxLength={7} />
                </Row>
              )}

              {/* Font size for text elements */}
              {['sport', 'clubName', 'text', 'scoreBlock', 'footer'].includes(sel.type) && (
                <Row label="Taille">
                  <button onClick={() => updateEl(sel.id, e => ({ ...e, fontSize: Math.max(0.4, +(e.fontSize - 0.1).toFixed(1)) }))}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">−</button>
                  <span className="text-xs font-mono w-8 text-center">{Math.round(sel.fontSize * 100)}%</span>
                  <button onClick={() => updateEl(sel.id, e => ({ ...e, fontSize: Math.min(2.5, +(e.fontSize + 0.1).toFixed(1)) }))}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">+</button>
                </Row>
              )}

              {/* Font family for text elements */}
              {['sport', 'clubName', 'text', 'scoreBlock', 'footer'].includes(sel.type) && (
                <Row label="Police">
                  <select value={sel.fontFamily ?? ''} onChange={e => updateEl(sel.id, el => ({ ...el, fontFamily: e.target.value || undefined }))}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                    {DEFAULT_FONT_FAMILIES.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
                  </select>
                </Row>
              )}

              {/* Rotation */}
              <Row label="Rotation">
                <input type="range" min="-45" max="45" step="1" value={sel.rotation ?? 0}
                  onChange={e => updateEl(sel.id, el => ({ ...el, rotation: Number(e.target.value) || undefined }))}
                  className="flex-1 accent-[#2563eb]" />
                <span className="text-xs font-mono w-10 text-right">{sel.rotation ?? 0}°</span>
              </Row>

              {/* Shadow */}
              <Row label="Ombre">
                <input type="range" min="0" max="40" step="2" value={sel.shadowBlur ?? 0}
                  onChange={e => updateEl(sel.id, el => ({ ...el, shadowBlur: Number(e.target.value) || undefined }))}
                  className="flex-1 accent-[#2563eb]" />
                <span className="text-xs font-mono w-8 text-right">{sel.shadowBlur ?? 0}</span>
              </Row>

              {/* Custom text content */}
              {sel.type === 'text' && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Contenu</label>
                  <input type="text" value={sel.text ?? ''} onChange={e => updateEl(sel.id, el => ({ ...el, text: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              )}

              {/* Logo options */}
              {sel.type === 'logo' && (
                <Row label="Fond bulle">
                  <Toggle value={sel.logoShowBg !== false} onChange={v => updateEl(sel.id, e => ({ ...e, logoShowBg: v }))} />
                </Row>
              )}

              {sel.type === 'footer' && (
                isPremium ? (
                  <Row label="Contenu">
                    <select value={sel.footerVariant ?? 'brand'} onChange={e => updateEl(sel.id, el => ({ ...el, footerVariant: e.target.value === 'clubName' ? 'clubName' : undefined }))}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                      <option value="brand">Tribunes + hashtags</option>
                      <option value="clubName">Nom du club (sans hashtags)</option>
                    </select>
                  </Row>
                ) : (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Personnaliser ou masquer ce bandeau est réservé aux plans payants.
                  </p>
                )
              )}

              {/* Shape border radius */}
              {sel.type === 'rect' && (
                <Row label="Arrondi">
                  <input type="range" min="0" max="100" step="2" value={sel.borderRadius ?? 0}
                    onChange={e => updateEl(sel.id, el => ({ ...el, borderRadius: Number(e.target.value) }))}
                    className="flex-1 accent-[#2563eb]" />
                  <span className="text-xs font-mono w-6">{sel.borderRadius ?? 0}</span>
                </Row>
              )}

              {/* Stroke */}
              {['rect', 'circle', 'line'].includes(sel.type) && (
                <>
                  <Row label="Contour">
                    <input type="color" value={sel.strokeColor ?? '#ffffff'} onChange={e => updateEl(sel.id, el => ({ ...el, strokeColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                    <input type="range" min="0" max="20" step="1" value={sel.strokeWidth ?? 0}
                      onChange={e => updateEl(sel.id, el => ({ ...el, strokeWidth: Number(e.target.value) }))}
                      className="flex-1 accent-[#2563eb]" />
                    <span className="text-xs font-mono w-4">{sel.strokeWidth ?? 0}</span>
                  </Row>
                </>
              )}

              {/* Position & size (readout) */}
              <div className="pt-1 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-400">
                <span>X: {Math.round(sel.x)} Y: {Math.round(sel.y)}</span>
                <span>W: {Math.round(sel.w)} H: {Math.round(sel.h)}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-400 text-center">Clique sur un élément pour le modifier</p>
            </div>
          )}

          {/* Layers list */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Couches</p>
            {[...cfg.elements].reverse().map(el => (
              <div key={el.id} onClick={() => setSelected(el.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
                  selected === el.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                }`}>
                <span>{LABELS[el.type]}</span>
                {!el.visible && <span className="ml-auto text-gray-300">caché</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      {children}
    </div>
  )
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition relative ${value ? 'bg-[#22c55e]' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
