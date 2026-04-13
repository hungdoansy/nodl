import {
  Command,
  Cpu,
  FileCode,
  Files,
  Layers,
  Package,
  Sparkles,
  Zap,
  type LucideIcon
} from 'lucide-react'
import type { FeatureIcon } from '@/lib/constants'
import { FEATURES, type Feature } from '@/lib/copy'
import { RevealOnScroll } from './RevealOnScroll'

const ICON_MAP: Record<FeatureIcon, LucideIcon> = {
  Zap,
  FileCode,
  Package,
  Files,
  Command,
  Cpu,
  Sparkles,
  Layers
}

export function Features() {
  return (
    <section
      id="features"
      className="relative px-6 py-24 md:py-32"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
              Features
            </p>
            <h2
              id="features-heading"
              className="mt-3 text-balance text-[32px] font-semibold leading-tight tracking-tight text-text-bright sm:text-[40px]"
            >
              Built for thinking out loud, in code.
            </h2>
            <p className="mt-4 text-balance text-[16px] leading-relaxed text-text-secondary">
              Every feature designed to keep the loop tight: write, run, see —
              over and over.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll
          delay={0.05}
          className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle md:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </RevealOnScroll>
      </div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = ICON_MAP[feature.icon]
  return (
    <article className="group relative flex flex-col gap-3 bg-bg-primary p-7 transition-all duration-200 hover:bg-bg-surface hover:shadow-[0_12px_32px_-16px_rgba(167,139,250,0.35)] hover:z-10">
      {/* Accent tint overlay that appears on hover — keeps the effect
          subtle in dark, visibly lifts the card in light where shadow
          alone does most of the work. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[1px] opacity-0 ring-1 ring-accent/30 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-secondary transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent-dim group-hover:text-accent-bright group-hover:-translate-y-0.5">
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <h3 className="relative text-[15.5px] font-semibold leading-tight text-text-bright">
        {feature.title}
      </h3>
      <div className="relative text-[14px] leading-relaxed text-text-secondary">
        {feature.blurb}
      </div>
    </article>
  )
}
