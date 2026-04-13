import { CodeShowcase } from '@/components/CodeShowcase'
import { DownloadSection } from '@/components/DownloadSection'
import { Features } from '@/components/Features'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { ProductPreview } from '@/components/ProductPreview'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProductPreview />
        <Features />
        <HowItWorks />
        <CodeShowcase />
        <DownloadSection />
      </main>
      <Footer />
    </>
  )
}
