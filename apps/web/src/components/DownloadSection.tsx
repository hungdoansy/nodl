import { ArrowRight, Download } from 'lucide-react'
import {
  APP_VERSION,
  DOWNLOAD_SIZE_APPROX,
  DOWNLOAD_URL,
  RELEASES_URL,
  SYSTEM_REQUIREMENTS
} from '@/lib/constants'
import { GridBackground } from './effects/GridBackground'
import { RadialGlow } from './effects/RadialGlow'
import { RevealOnScroll } from './RevealOnScroll'

export function DownloadSection() {
  return (
    <section
      id="download"
      className="relative isolate overflow-hidden border-y border-border-subtle bg-bg-primary px-6 py-28 md:py-36"
    >
      <GridBackground cellSize={48} />
      <RadialGlow
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        size={620}
        intensity={0.16}
      />

      <RevealOnScroll className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
          Download
        </p>
        <h2 className="mt-3 text-balance text-[36px] font-semibold leading-tight tracking-tight text-text-bright sm:text-[48px]">
          Start scratching.
        </h2>
        <p className="mt-4 max-w-md text-balance text-[16px] leading-relaxed text-text-secondary">
          Free, open-source, and a single-click install. Be running code in
          under a minute.
        </p>

        <a
          href={DOWNLOAD_URL}
          className="group mt-10 inline-flex h-14 w-full max-w-md items-center justify-center gap-2.5 rounded-md border border-accent/40 bg-accent px-6 text-[15px] font-semibold text-bg-void shadow-[0_12px_32px_-8px_rgba(167,139,250,0.55)] transition-all hover:bg-accent-bright hover:shadow-[0_14px_36px_-8px_rgba(167,139,250,0.75)]"
        >
          <Download size={17} strokeWidth={2.4} />
          <span>Download for macOS</span>
          <ArrowRight
            size={15}
            strokeWidth={2.4}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </a>

        <p className="mt-5 font-mono text-[12px] text-text-tertiary">
          v{APP_VERSION} · {DOWNLOAD_SIZE_APPROX} · {SYSTEM_REQUIREMENTS}
        </p>

        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1 text-[13px] text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
        >
          Or browse all releases on GitHub
          <ArrowRight size={12} className="opacity-60" />
        </a>
      </RevealOnScroll>
    </section>
  )
}
