import { Download } from 'lucide-react'
import { APP_NAME, DOWNLOAD_URL, GITHUB_URL } from '@/lib/constants'
import { Logomark } from './Logomark'
import { GithubIcon } from './icons/GithubIcon'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#download', label: 'Download' }
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-void/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Wordmark */}
        <a
          href="#top"
          className="group flex items-center gap-2 text-text-bright transition-colors"
        >
          <Logomark size={20} />
          <span className="font-mono text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </a>

        {/* Nav (desktop only) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-sm px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            <GithubIcon size={15} />
          </a>
          <a
            href={DOWNLOAD_URL}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-accent/30 bg-accent-dim px-3 text-[12.5px] font-medium text-accent-bright transition-colors hover:border-accent/40 hover:bg-accent/15"
          >
            <Download size={13} strokeWidth={2.25} />
            <span>Download</span>
          </a>
        </div>
      </div>
    </header>
  )
}
