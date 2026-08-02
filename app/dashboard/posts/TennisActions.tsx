'use client'

import { useState } from 'react'
import { Icon } from '../icons'
import PublishPanel from '../PublishPanel'

type Posts = { instagram: string; facebook: string }

/**
 * Barre d'actions partagée pour tout contenu tennis :
 * Télécharger · Copier l'image · (légende IA optionnelle) · Publier.
 * La priorité est le visuel ; l'IA texte reste optionnelle.
 */
export default function TennisActions({
  getImageBlob,
  defaultCaption,
  aiPosts,
  onGenerateCaption,
  generatingCaption,
  filename = 'tribunes-tennis',
}: {
  getImageBlob: () => Promise<Blob | null>
  defaultCaption: string
  aiPosts?: Posts | null
  onGenerateCaption?: () => void
  generatingCaption?: boolean
  filename?: string
}) {
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  async function download() {
    const blob = await getImageBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${Date.now()}.png`
    link.click()
    URL.revokeObjectURL(url)
    setDownloaded(true); setTimeout(() => setDownloaded(false), 2000)
  }

  async function copyImage() {
    const blob = await getImageBlob()
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { download() }
  }

  const posts: Posts = aiPosts ?? { instagram: defaultCaption, facebook: defaultCaption }

  return (
    <div className="space-y-4">
      {/* Actions visuel */}
      <div className="flex flex-wrap gap-2">
        <button onClick={download}
          className="inline-flex items-center gap-2 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90">
          <Icon name={downloaded ? 'check' : 'download'} className="h-4 w-4" /> {downloaded ? 'Téléchargé' : 'Télécharger'}
        </button>
        <button onClick={copyImage}
          className="inline-flex items-center gap-2 rounded-btn border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle">
          <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" /> {copied ? 'Image copiée' : "Copier l'image"}
        </button>
        {onGenerateCaption && (
          <button onClick={onGenerateCaption} disabled={generatingCaption}
            className="inline-flex items-center gap-2 rounded-btn border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle disabled:opacity-60">
            <Icon name="sparkles" className={`h-4 w-4 ${generatingCaption ? 'animate-spin' : ''}`} />
            {generatingCaption ? 'Rédaction…' : aiPosts ? 'Régénérer la légende' : 'Générer une légende'}
          </button>
        )}
      </div>

      {/* Légende générée (aperçu + copie) */}
      {aiPosts && (
        <div className="rounded-card border border-line bg-white p-4 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">Légende</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{aiPosts.instagram}</p>
        </div>
      )}

      {/* Publication réseaux */}
      <PublishPanel posts={posts} getImageBlob={getImageBlob} />
    </div>
  )
}
