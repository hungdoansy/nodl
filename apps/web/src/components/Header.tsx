'use client'

import { APP_NAME } from '@/lib/constants'
import { GithubStars } from './GithubStars'
import { Logomark } from './Logomark'
import { ThemeToggle } from './ThemeToggle'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#download', label: 'Download' }
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-void/70 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
        {/* Wordmark (left) */}
        <a
          href="#top"
          title="nodl — pronounced like noodle"
          className="group z-10 flex items-center gap-2 text-text-bright transition-colors"
        >
          <Logomark size={20} />
          <span className="font-mono text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </a>

        {/* Nav — truly centered via absolute positioning (desktop only) */}
        <nav
          className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center md:flex"
          aria-label="Primary"
        >
          <div className="pointer-events-auto flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-sm px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Right cluster */}
        <div className="z-10 ml-auto flex items-center gap-1">
          <ThemeToggle />
          <GithubStars />
        </div>
      </div>
    </header>
  )
}
