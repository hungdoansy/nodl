'use client'

import { useEffect, useState } from 'react'

/**
 * Client-side desktop-platform detection.
 *
 * Uses the modern `navigator.userAgentData.platform` hint when available
 * (Chromium) and falls back to `navigator.platform` / `navigator.userAgent`
 * regex sniffing on Safari/Firefox.
 *
 * `unknown` is returned during SSR and on the very first client render —
 * this keeps the server-rendered HTML and the first hydrated render in
 * sync (no hydration mismatch). Consumers should design their "unknown"
 * fallback to be platform-neutral.
 */

export type Platform = 'mac' | 'windows' | 'linux' | 'unknown'

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'
  const nav = window.navigator
  const uaData = (nav as Navigator & {
    userAgentData?: { platform?: string }
  }).userAgentData
  const platformStr = uaData?.platform || nav.platform || ''
  const ua = nav.userAgent || ''
  const combined = `${platformStr} ${ua}`

  if (/Mac|iPhone|iPad|iPod/i.test(combined)) return 'mac'
  if (/Win/i.test(combined)) return 'windows'
  if (/Linux|X11|CrOS/i.test(combined)) return 'linux'
  return 'unknown'
}

/**
 * SSR-safe hook. Returns `'unknown'` on the server and on the first
 * client render, then the detected platform after mount.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('unknown')
  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])
  return platform
}

/** Human-readable platform name (used in CTAs, pills, system-req copy). */
export const PLATFORM_LABEL: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  unknown: 'desktop'
}

/** Per-platform system requirements shown under the Download CTA. */
export const SYSTEM_REQUIREMENTS_BY_PLATFORM: Record<Platform, string> = {
  mac: 'macOS 12+ · Apple Silicon & Intel',
  windows: 'Windows 10+ · x64',
  linux: 'Linux · x64 (AppImage & .deb)',
  unknown: 'macOS · Windows · Linux'
}
