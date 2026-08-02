/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    // @resvg/resvg-js embarque un binaire natif (.node) — utilisé uniquement par le
    // prototype Design Engine (lib/designEngine/render), doit rester hors bundle
    // webpack. N'affecte aucune route existante.
    serverComponentsExternalPackages: ['@resvg/resvg-js'],
  },
}

export default nextConfig
