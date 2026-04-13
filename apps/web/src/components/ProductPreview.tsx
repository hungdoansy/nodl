import { WindowChrome } from './WindowChrome'
import { RevealOnScroll } from './RevealOnScroll'

export function ProductPreview() {
  return (
    <section className="relative -mt-8 px-6 md:-mt-12">
      <RevealOnScroll className="relative mx-auto max-w-6xl">
        {/* Soft accent glow behind the frame */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-8 h-2/3 rounded-[40px] bg-accent/10 blur-3xl"
        />

        <WindowChrome
          title="hello.ts — nodl"
          className="relative shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]"
        >
          {/*
            Uses the SVG placeholder by default. To swap in a real PNG,
            drop apps/web/public/screenshots/hero-product.png and change
            the src below — or symlink the SVG name to point at the PNG.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/screenshots/hero-product.svg"
            alt="nodl desktop app showing JavaScript code with inline output"
            width={1600}
            height={1000}
            className="block aspect-[1600/1000] w-full object-cover"
          />
        </WindowChrome>

        {/* Bottom fade — melt the screenshot into the next section */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg-void"
        />
      </RevealOnScroll>
    </section>
  )
}
