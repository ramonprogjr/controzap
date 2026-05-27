import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Technology } from '@/components/landing/Technology'
import { Benefits } from '@/components/landing/Benefits'
import { Security } from '@/components/landing/Security'
import { Pricing } from '@/components/landing/Pricing'
import { Footer } from '@/components/landing/Footer'

export default function Home() {
  return (
    <main className="bg-[#0a0a0a] text-slate-300 min-h-screen">
      <Navbar />
      <Hero />
      <Benefits />
      <Technology />
      <Security />
      <Pricing />
      <Footer />
    </main>
  )
}
