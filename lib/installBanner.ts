export const INSTALL_BANNER_STORAGE_KEY = 'tribunes:install-banner-dismissed'

/** iPhone/iPad avec Safari (les autres navigateurs iOS ne proposent pas « Sur l'écran d'accueil »). */
export function isIosSafari(userAgent: string): boolean {
  const isIos = /iPhone|iPad|iPod/.test(userAgent)
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent)
  return isIos && !isOtherBrowser && /Safari\//.test(userAgent)
}

export function isDismissed(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(INSTALL_BANNER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberDismissal(storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(INSTALL_BANNER_STORAGE_KEY, '1')
  } catch {
    // Stockage indisponible (navigation privée) : le bandeau reviendra à la prochaine visite.
  }
}
