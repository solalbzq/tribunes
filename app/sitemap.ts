import type { MetadataRoute } from 'next'
import { SPORT_PAGES } from '@/lib/sportPages'
import { MODEL_PAGES } from '@/lib/modelPages'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const routes = ['', '/login', '/signup', '/calendrier-editorial', '/mentions-legales', '/cgv', '/confidentialite', ...SPORT_PAGES.map((p) => `/sport/${p.slug}`), ...MODEL_PAGES.map((p) => `/modeles/${p.slug}`)]
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }))
}
