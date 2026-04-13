import { DownloadSection } from '@/components/DownloadSection'
import { Features } from '@/components/Features'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { InteractivePreview } from '@/components/preview/InteractivePreview'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <InteractivePreview />
        <Features />
        <HowItWorks />
        <DownloadSection />
      </main>
      <Footer />
    </>
  )
}
