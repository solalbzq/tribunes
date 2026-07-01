import Link from 'next/link'
import Logo from '@/components/Logo'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="inline-flex">
          <Logo size={26} />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a href="#solution" className="transition hover:text-ink">Comment ça marche</a>
          <a href="#pricing" className="transition hover:text-ink">Offres</a>
          <a href="#mockup" className="transition hover:text-ink">Exemple</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-btn px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  )
}
