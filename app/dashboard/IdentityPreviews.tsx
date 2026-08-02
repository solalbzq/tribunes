'use client'

import { useEffect, useRef, useState } from 'react'
import ClubAnnouncementVisualGenerator from './ClubAnnouncementVisualGenerator'
import MatchAnnouncementVisualGenerator from './MatchAnnouncementVisualGenerator'
import PlayerSpotlightVisualGenerator from './PlayerSpotlightVisualGenerator'
import VisualGenerator from './VisualGenerator'
import { matchingPresetLabel } from '@/lib/brandPresets'
import { resolveCustomPostVisualKind } from '@/lib/visualLayout'
import { Icon } from './icons'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  postVisualConfigs?: unknown
  contentTone: string
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
}

type Section = 'overview' | 'brand' | 'tone' | 'types' | 'references' | 'previews' | 'history'

const TONE_LABELS: Record<string, string> = { STANDARD: 'Standard', FUN: 'Fun et décontractée', SOBER: 'Sobre et factuelle' }

type SynthesisItem = { text: string; source: string; onEdit: () => void }

type BrandAssetSummary = {
  kind: 'REFERENCE' | 'CHARTER'
  status: string
  analysis: { mood?: string | null; toneIndications?: string | null } | null
}

function useSynthesis(club: Club, onNavigate: (s: Section) => void): SynthesisItem[] {
  const [assets, setAssets] = useState<BrandAssetSummary[]>([])

  useEffect(() => {
    fetch('/api/clubs/brand-assets')
      .then(res => res.ok ? res.json() : null)
      .then(data => setAssets(data?.assets ?? []))
      .catch(() => setAssets([]))
  }, [])

  const items: SynthesisItem[] = []
  items.push({ text: `Ton ${TONE_LABELS[club.contentTone] ?? club.contentTone}`, source: 'Ton et vocabulaire', onEdit: () => onNavigate('tone') })

  const preset = matchingPresetLabel(club.primaryColor, club.secondaryColor)
  if (preset) items.push({ text: `Palette du preset "${preset}"`, source: 'Logo et couleurs', onEdit: () => onNavigate('brand') })

  if (club.signaturePhrase) items.push({ text: `Signature : "${club.signaturePhrase}"`, source: 'Ton et vocabulaire', onEdit: () => onNavigate('tone') })

  const bannedCount = (club.bannedWords ?? '').split(',').map(w => w.trim()).filter(Boolean).length
  if (bannedCount > 0) items.push({ text: `${bannedCount} expression${bannedCount > 1 ? 's' : ''} à éviter`, source: 'Ton et vocabulaire', onEdit: () => onNavigate('tone') })

  if (club.customInstructions) {
    const short = club.customInstructions.length > 90 ? club.customInstructions.slice(0, 90) + '…' : club.customInstructions
    items.push({ text: `Consignes : ${short}`, source: 'Ton et vocabulaire', onEdit: () => onNavigate('tone') })
  }

  for (const asset of assets) {
    if (asset.status !== 'ANALYZED' || !asset.analysis) continue
    if (asset.kind === 'REFERENCE' && asset.analysis.mood) {
      items.push({ text: `Ambiance inspirée de vos références : ${asset.analysis.mood}`, source: 'Références', onEdit: () => onNavigate('references') })
    }
    if (asset.kind === 'CHARTER' && asset.analysis.toneIndications) {
      items.push({ text: `Indication de charte : ${asset.analysis.toneIndications}`, source: 'Charte graphique', onEdit: () => onNavigate('references') })
    }
  }

  return items
}

const FIXTURE_MATCH_RESULT = { opponent: 'AS Rivière', homeScore: 3, awayScore: 1, isHome: true, competition: 'Championnat' }
const FIXTURE_MATCH_ANNOUNCEMENT = { opponent: 'AS Rivière', matchDate: '2026-09-13', time: '15h00', venue: 'Stade municipal', isHome: true }
const FIXTURE_PLAYER = { playerName: 'Julie Martin', achievement: 'Buteuse du mois avec 8 réalisations, décisive lors des 3 derniers matchs.' }
const FIXTURE_CLUB_ANNOUNCEMENT = { title: 'Rejoignez notre section jeunes !', description: "Le club recrute des licenciés U13-U15 pour la saison prochaine. Entraînements les mercredis et samedis, encadrement diplômé." }
const FIXTURE_CUSTOM_POST = { title: 'Buvette du tournoi ce week-end', description: "Venez nombreux ce week-end pour la buvette et la restauration du tournoi, au profit de l'école de sport." }

function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <div className="scale-90 origin-top-left w-[111%]">{children}</div>
    </div>
  )
}

export default function IdentityPreviews({ club, onNavigate }: { club: Club; onNavigate: (s: Section) => void }) {
  const items = useSynthesis(club, onNavigate)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualKind = resolveCustomPostVisualKind(club.postVisualConfigs)

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h3 className="font-bold text-ink mb-1">Votre club communique de manière :</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Configurez votre identité pour voir apparaître une synthèse ici.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-subtle px-4 py-2.5 text-sm">
                <span className="text-ink">{item.text}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted">{item.source}</span>
                  <button onClick={item.onEdit} className="text-xs font-semibold text-brand hover:underline">Modifier</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-ink">Aperçus</h3>
          <p className="text-xs text-muted">Données d&apos;exemple stables, rendu avec le vrai moteur de templates.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <PreviewCard label="Résultat de match">
            <VisualGenerator club={{ ...club }} match={FIXTURE_MATCH_RESULT} photoFile={null} onCanvasReady={c => { canvasRef.current = c }} />
          </PreviewCard>
          <PreviewCard label="Avant-match">
            <MatchAnnouncementVisualGenerator club={club} {...FIXTURE_MATCH_ANNOUNCEMENT} />
          </PreviewCard>
          <PreviewCard label="Joueur à l'honneur">
            <PlayerSpotlightVisualGenerator club={club} {...FIXTURE_PLAYER} />
          </PreviewCard>
          <PreviewCard label="Annonce du club">
            <ClubAnnouncementVisualGenerator club={club} category="CLUB_LIFE" title={FIXTURE_CLUB_ANNOUNCEMENT.title} description={FIXTURE_CLUB_ANNOUNCEMENT.description} />
          </PreviewCard>
          <PreviewCard label="Publication libre">
            <ClubAnnouncementVisualGenerator club={club} category="CLUB_LIFE" title={FIXTURE_CUSTOM_POST.title} description={FIXTURE_CUSTOM_POST.description} visualKind={visualKind} />
          </PreviewCard>
        </div>
      </div>

      <button onClick={() => onNavigate('overview')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition">
        <Icon name="arrowLeft" className="h-4 w-4" /> Retour à la vue d&apos;ensemble
      </button>
    </div>
  )
}
