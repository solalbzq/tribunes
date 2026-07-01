import Logo from '@/components/Logo'

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo size={28} />
            <p className="mt-4 text-[14px] leading-[1.7] text-muted">
              L&apos;assistant de communication des clubs sportifs amateurs.
              Votre communication est prête en quelques secondes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol
              title="Produit"
              links={[
                { label: 'Comment ça marche', href: '#solution' },
                { label: 'Offres', href: '#pricing' },
                { label: 'Exemple', href: '#mockup' },
              ]}
            />
            <FooterCol
              title="Compte"
              links={[
                { label: 'Se connecter', href: '/login' },
                { label: 'Créer un club', href: '/signup' },
              ]}
            />
            <FooterCol
              title="Légal"
              links={[
                { label: 'Mentions légales', href: '#' },
                { label: 'Confidentialité', href: '#' },
              ]}
            />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-muted sm:flex-row">
          <p>© 2026 Tribunes. Tous droits réservés.</p>
          <p className="font-semibold text-brand">Votre club communique. Automatiquement.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">{title}</p>
      <ul className="mt-3 space-y-2 text-[14px] text-muted">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="transition hover:text-ink">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
