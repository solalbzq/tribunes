type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

export function canShareFiles(nav: ShareNavigator | undefined | null, files: File[]): boolean {
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false
  try {
    return nav.canShare({ files })
  } catch {
    return false
  }
}
