import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Hero } from '@/components/Hero'
import { MockupPost } from '@/components/MockupPost'
import { Pricing } from '@/components/Pricing'
import { Problems } from '@/components/Problems'
import { Solution } from '@/components/Solution'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problems />
        <Solution />
        <MockupPost />
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
