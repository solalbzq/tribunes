import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { AbsoluteInset, Composition, CompositionNode } from '../types'
import { loadFonts } from './fonts'

type SatoriNode = {
  type: string
  props: Record<string, unknown> & { children?: SatoriNode | SatoriNode[] | string; style?: Record<string, unknown> }
}

function insetStyle(inset?: AbsoluteInset): Record<string, unknown> {
  if (!inset) return {}
  const style: Record<string, unknown> = { position: 'absolute' }
  if (inset.top !== undefined) style.top = inset.top
  if (inset.left !== undefined) style.left = inset.left
  if (inset.right !== undefined) style.right = inset.right
  if (inset.bottom !== undefined) style.bottom = inset.bottom
  return style
}

/**
 * Traduit l'arbre de Composition (vocabulaire du Design Engine) en arbre satori
 * (CSS/flexbox). Aucune décision de design ne doit être prise ici — uniquement de la
 * traduction mécanique. Cf. plan §5.6.
 */
function toSatoriNode(node: CompositionNode): SatoriNode {
  switch (node.kind) {
    case 'frame': {
      return {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: node.direction,
            alignItems: node.align === 'start' ? 'flex-start' : node.align === 'end' ? 'flex-end' : node.align,
            justifyContent:
              node.justify === 'start' ? 'flex-start'
                : node.justify === 'end' ? 'flex-end'
                : node.justify === 'space-between' ? 'space-between'
                : node.justify,
            gap: node.gap,
            padding: node.padding,
            flexGrow: node.grow,
            ...(node.width !== undefined ? { width: node.width } : {}),
            ...(node.height !== undefined ? { height: node.height } : {}),
            ...(node.background ? { backgroundColor: node.background.color, opacity: node.background.opacity ?? 1 } : {}),
            ...(node.borderRadius ? { borderRadius: node.borderRadius } : {}),
            ...(node.border ? { border: `${node.border.width}px solid ${node.border.color}` } : {}),
            ...(node.rotation ? { transform: `rotate(${node.rotation}deg)` } : {}),
            ...insetStyle(node.absolute),
          },
          children: node.children.map(toSatoriNode),
        },
      }
    }
    case 'text': {
      const text = node.uppercase ? node.text.toUpperCase() : node.text
      return {
        type: 'div',
        props: {
          style: {
            fontFamily: 'Inter',
            fontSize: node.size,
            fontWeight: node.weight,
            color: node.color,
            ...(node.letterSpacing ? { letterSpacing: node.letterSpacing } : {}),
            ...(node.lineHeight ? { lineHeight: node.lineHeight } : {}),
            ...(node.rotation ? { transform: `rotate(${node.rotation}deg)` } : {}),
          },
          children: text,
        },
      }
    }
    case 'image': {
      return {
        type: 'img',
        props: {
          src: node.src,
          width: node.width,
          height: node.height,
          style: {
            ...(node.borderRadius ? { borderRadius: node.borderRadius } : {}),
            ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
          },
        },
      }
    }
    case 'shape': {
      return {
        type: 'div',
        props: {
          style: {
            width: node.width,
            height: node.height,
            backgroundColor: node.color,
            opacity: node.opacity ?? 1,
            ...(node.shape === 'dot' ? { borderRadius: node.width } : {}),
            ...(node.rotation ? { transform: `rotate(${node.rotation}deg)` } : {}),
            ...insetStyle(node.absolute),
          },
        },
      }
    }
  }
}

/** Rend une Composition en PNG (Buffer) — Satori → SVG → resvg, entièrement côté serveur. */
export async function renderCompositionToPng(composition: Composition): Promise<Buffer> {
  const root = toSatoriNode(composition.root)
  root.props.style = {
    ...root.props.style,
    width: composition.width,
    height: composition.height,
    position: 'relative',
  }

  const svg = await satori(root as unknown as Parameters<typeof satori>[0], {
    width: composition.width,
    height: composition.height,
    fonts: loadFonts(),
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: composition.width } })
  return resvg.render().asPng()
}
