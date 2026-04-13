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
import { FEATURES, type Feature } from '@/lib/constants'
import { RevealOnScroll } from './RevealOnScroll'

const ICON_MAP: Record<Feature['icon'], LucideIcon> = {
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
    <article className="group relative flex flex-col gap-3 bg-bg-primary p-7 transition-colors hover:bg-bg-surface">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-secondary transition-colors group-hover:border-accent/40 group-hover:bg-accent-dim group-hover:text-accent-bright">
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <h3 className="text-[15.5px] font-semibold leading-tight text-text-bright">
        {feature.title}
      </h3>
      <p className="text-[14px] leading-relaxed text-text-secondary">
        {feature.blurb}
      </p>
    </article>
  )
}
