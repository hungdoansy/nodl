import {
  APP_NAME,
  APP_VERSION,
  AUTHOR_URL,
  GITHUB_URL,
  ISSUES_URL,
  LICENSE_URL,
  RELEASES_URL
} from '@/lib/constants'
import { Logomark } from './Logomark'

const PRODUCT_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#download', label: 'Download' },
  { href: RELEASES_URL, label: 'Changelog', external: true }
]

const RESOURCE_LINKS = [
  { href: GITHUB_URL, label: 'Source', external: true },
  { href: ISSUES_URL, label: 'Report an issue', external: true },
  { href: LICENSE_URL, label: 'MIT License', external: true }
]

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-bg-void">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2">
              <Logomark size={18} />
              <span className="font-mono text-[14px] font-semibold tracking-tight text-text-bright">
                {APP_NAME}
              </span>
              <span className="font-mono text-[11px] text-text-tertiary">
                v{APP_VERSION}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-text-secondary">
              A scratchpad for JavaScript and TypeScript. Open-source, MIT licensed.
            </p>
            <p className="mt-4 text-[12px] text-text-tertiary">
              Made by{' '}
              <a
                href={AUTHOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary underline-offset-2 transition-colors hover:text-accent-bright hover:underline"
              >
                Hung Doan
              </a>
              .
            </p>
          </div>

          {/* Product column */}
          <FooterColumn heading="Product" links={PRODUCT_LINKS} />

          {/* Resources column */}
          <FooterColumn heading="Resources" links={RESOURCE_LINKS} />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-border-subtle pt-6 text-[12px] text-text-tertiary md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Hung Doan. All rights reserved.</span>
          <span className="font-mono">
            Built with care · Electron · React · Monaco
          </span>
        </div>
      </div>
    </footer>
  )
}

type FooterColumnProps = {
  heading: string
  links: ReadonlyArray<{ href: string; label: string; external?: boolean }>
}

function FooterColumn({ heading, links }: FooterColumnProps) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        {heading}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a
              href={link.href}
              {...(link.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
