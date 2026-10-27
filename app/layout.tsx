import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

const TITLE = 'Tribunes — Votre club communique. Automatiquement.'
const DESCRIPTION =
  'Tribunes génère automatiquement les publications réseaux sociaux de votre club sportif après chaque match, résultat ou programme. Votre communication est prête en quelques secondes.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: 'fr_FR',
    siteName: 'Tribunes',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
