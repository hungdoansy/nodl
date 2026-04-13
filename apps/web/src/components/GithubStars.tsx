'use client'

import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GITHUB_URL } from '@/lib/constants'
import { GithubIcon } from './icons/GithubIcon'

const REPO_API = 'https://api.github.com/repos/hungdoansy/nodl'

async function fetchStars(): Promise<number | null> {
  try {
    const res = await fetch(REPO_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'default'
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number'
      ? data.stargazers_count
      : null
  } catch {
    return null
  }
}

function formatStars(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return n.toLocaleString('en-US')
}

/**
 * Repo star count badge shown in the sticky header. Fetches once on
 * mount and caches in sessionStorage so a subsequent route change
 * doesn't re-hit the API. Gracefully renders nothing on failure
 * (the GitHub icon link stays as the source-code affordance).
 */
export function GithubStars() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    try {
      const cached = window.sessionStorage.getItem('nodl.stars')
      if (cached !== null) {
        const n = Number(cached)
        if (!Number.isNaN(n)) setStars(n)
      }
    } catch {}

    fetchStars().then((n) => {
      if (cancelled) return
      if (n === null) return
      setStars(n)
      try {
        window.sessionStorage.setItem('nodl.stars', String(n))
      } catch {}
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        stars === null
          ? 'View source on GitHub'
          : `View source on GitHub — ${stars.toLocaleString()} stars`
      }
      className="group inline-flex h-8 items-center gap-1.5 rounded-sm border border-border-default bg-bg-surface/40 px-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-bg-surface hover:text-text-primary"
    >
      <GithubIcon size={13} className="text-text-tertiary group-hover:text-text-primary" />
      {stars !== null ? (
        <>
          <span className="h-3 w-px bg-border-default" aria-hidden="true" />
          <Star
            size={12}
            strokeWidth={2}
            className="text-text-tertiary group-hover:text-accent-bright group-hover:fill-accent-bright transition-colors"
          />
          <span className="font-mono tabular-nums">{formatStars(stars)}</span>
        </>
      ) : null}
    </a>
  )
}
