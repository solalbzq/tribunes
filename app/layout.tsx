import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tribunes — Votre club communique. Automatiquement.',
  description:
    'Tribunes génère automatiquement les publications réseaux sociaux de votre club sportif après chaque match, résultat ou programme. Votre communication est prête en quelques secondes.',
}

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><g fill='%232563eb'><rect x='15' y='7' width='27' height='9.5' rx='4.75'/><rect x='23.5' y='7' width='9.5' height='31' rx='4.75'/><rect x='6' y='20.5' width='13' height='6' rx='3' opacity='0.9'/><rect x='2' y='30.5' width='17' height='6' rx='3' opacity='0.55'/></g></svg>"

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
        <link rel="icon" href={FAVICON} />
      </head>
      <body>{children}</body>
    </html>
  )
}
