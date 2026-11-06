import type { MetadataRoute } from 'next'
import { SPORT_PAGES } from '@/lib/sportPages'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const routes = ['', '/login', '/signup', '/aide', '/mentions-legales', '/cgv', '/confidentialite', ...SPORT_PAGES.map((p) => `/sport/${p.slug}`)]
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }))
}
