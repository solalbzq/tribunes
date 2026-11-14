import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tribunes',
    short_name: 'Tribunes',
    description: 'La communication de votre club sportif, prête en quelques secondes.',
    lang: 'fr',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icones-app/192', sizes: '192x192', type: 'image/png' },
      { src: '/icones-app/512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
