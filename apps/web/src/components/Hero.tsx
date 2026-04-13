'use client'

import { ArrowRight, Download, Sparkles } from 'lucide-react'
import {
  APP_VERSION,
  DOWNLOAD_URL,
  GITHUB_URL,
  RELEASES_URL
} from '@/lib/constants'
import { handleDownloadClick } from '@/lib/downloadFlow'
import { GridBackground } from './effects/GridBackground'
import { RadialGlow } from './effects/RadialGlow'
import { GithubIcon } from './icons/GithubIcon'
import { Kbd } from './Kbd'

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pt-24 pb-12 md:pt-32 md:pb-20"
    >
      {/* Background layers */}
      <GridBackground />
      <RadialGlow
        className="left-1/2 top-32 -translate-x-1/2"
        size={820}
        intensity={0.22}
        pulse
      />

      {/* Content */}
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        {/* Release pill */}
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface/60 py-1 pl-1 pr-3 text-[12px] text-text-secondary backdrop-blur transition-all hover:border-border-strong hover:text-text-primary"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent-bright">
            <Sparkles size={11} className="animate-sparkle-spin" />
            v{APP_VERSION}
          </span>
          <span>Now available for macOS</span>
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </a>

        {/* Headline */}
        <h1 className="mt-8 max-w-3xl text-balance text-[44px] font-semibold leading-[1.05] tracking-tight text-text-bright sm:text-[60px] md:text-[72px]">
          A scratchpad
          <br />
          for{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-br from-accent-bright via-accent to-[#7c3aed] bg-clip-text text-transparent">
              TypeScript
            </span>
            <span
              aria-hidden="true"
              className="absolute -inset-x-2 -bottom-1 -z-10 h-[12px] bg-accent/15 blur-xl"
            />
          </span>
          .
        </h1>

        {/* Pronunciation */}
        <p className="mt-5 inline-flex items-center gap-2.5 font-mono text-[14px] text-text-tertiary">
          <span className="rounded-md border border-border-subtle bg-bg-surface/60 px-2 py-0.5 text-accent-bright backdrop-blur">
            /ˈnuː.dəl/
          </span>
          <span className="italic">rhymes with <span className="not-italic text-text-primary">noodle</span></span>
        </p>

        {/* Subhead */}
        <p className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-text-secondary md:text-[19px]">
          Instant inline output. Full TypeScript. Real npm packages.
          <br className="hidden sm:inline" />
          Native desktop speed — no browser tab attached.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-3">
          <a
            href={DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleDownloadClick(e, { alwaysIntercept: true })}
            className="group inline-flex h-11 items-center gap-2 rounded-md border border-accent/40 bg-accent px-5 text-[14px] font-medium text-bg-void shadow-[0_8px_24px_-8px_rgba(167,139,250,0.6)] transition-all hover:bg-accent-bright hover:shadow-[0_10px_28px_-8px_rgba(167,139,250,0.8)]"
          >
            <Download size={15} strokeWidth={2.4} />
            <span>Download for macOS</span>
            <ArrowRight
              size={14}
              strokeWidth={2.4}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border-default bg-bg-surface/40 px-5 text-[14px] font-medium text-text-primary backdrop-blur transition-all hover:border-border-strong hover:bg-bg-surface"
          >
            <GithubIcon size={15} />
            <span>View on GitHub</span>
          </a>
        </div>

        {/* Keyboard hint */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[12px] text-text-tertiary">
          <Kbd k="mod" />
          <Kbd k="enter" />
          <span className="font-mono">to run</span>
          <span className="text-text-tertiary/40">·</span>
          <Kbd k="mod" />
          <Kbd k="S" />
          <span className="font-mono">to save</span>
        </div>
      </div>
    </section>
  )
}
