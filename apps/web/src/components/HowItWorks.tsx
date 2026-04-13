import { ArrowRight } from 'lucide-react'
import { HOW_IT_WORKS } from '@/lib/copy'
import { RevealOnScroll } from './RevealOnScroll'

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative px-6 py-24 md:py-32"
      aria-labelledby="how-it-works-heading"
    >
      {/* Subtle top divider via accent line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
              How it works
            </p>
            <h2
              id="how-it-works-heading"
              className="mt-3 text-balance text-[32px] font-semibold leading-tight tracking-tight text-text-bright sm:text-[40px]"
            >
              Three keystrokes from idea to answer.
            </h2>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} className="mt-16">
          <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {HOW_IT_WORKS.map((step, idx) => (
              <li
                key={step.ordinal}
                className="relative flex flex-col gap-3"
              >
                {/* Connector arrow between steps (desktop) */}
                {idx < HOW_IT_WORKS.length - 1 ? (
                  <ArrowRight
                    size={20}
                    className="absolute -right-4 top-3 hidden text-text-tertiary/40 md:block"
                  />
                ) : null}

                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[28px] font-medium leading-none text-text-tertiary/60">
                    {step.ordinal}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-border-subtle bg-bg-elevated px-2 py-0.5 font-mono text-[11.5px] text-text-secondary">
                    {step.hint}
                  </span>
                </div>

                <h3 className="text-[20px] font-semibold tracking-tight text-text-bright">
                  {step.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </RevealOnScroll>
      </div>
    </section>
  )
}
