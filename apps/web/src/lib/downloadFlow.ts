'use client'

import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'

/**
 * Tracks whether the user has clicked any Download button this session.
 *
 * On macOS, the *first* click anywhere on the site is intercepted —
 * `preventDefault` stops the navigation and reveals the Quarantine note
 * so the user can see the install instructions before hitting the DMG
 * download. Subsequent clicks (after the note is already shown) navigate
 * normally.
 *
 * Non-macOS visitors bypass the intercept entirely — the note is
 * macOS-specific so there's nothing to surface.
 */

const STORAGE_KEY = 'nodl.downloadClicked'

let clicked = false
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function hydrateFromStorage() {
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) === '1') clicked = true
  } catch {}
}

export function markDownloadClicked() {
  if (clicked) return
  clicked = true
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {}
  emit()
}

export function useDownloadClicked(): boolean {
  const [value, setValue] = useState(false)

  useEffect(() => {
    hydrateFromStorage()
    setValue(clicked)
    const fn = () => setValue(true)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  return value
}

function isMacPlatform(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator
  const uaData = (nav as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData
  if (uaData?.platform) return /mac/i.test(uaData.platform)
  return /Mac|iPhone|iPad|iPod/i.test(nav.platform || nav.userAgent || '')
}

/**
 * Shared click handler for every Download <a> in the tree.
 *
 * Behaviour matrix (macOS only — non-Mac visitors always navigate):
 *
 *   ┌────────────────────┬───────────────┬────────────────────────────┐
 *   │ Button             │ First click   │ Subsequent clicks          │
 *   ├────────────────────┼───────────────┼────────────────────────────┤
 *   │ Hero (main)        │ scroll + note │ scroll only (note visible) │
 *   │ DownloadSection    │ scroll + note │ navigate (download DMG)    │
 *   └────────────────────┴───────────────┴────────────────────────────┘
 *
 * Pass `{ alwaysIntercept: true }` for the Hero button — it should
 * never trigger the actual download, only point the user at the
 * DownloadSection where they can read the install note in context.
 * The DownloadSection button uses the default behaviour: intercept
 * once to surface the note, then navigate normally.
 */
export interface HandleDownloadOptions {
  /** Always preventDefault and scroll-to-section, even after the note is
   *  shown. Use for upstream buttons (e.g. the Hero CTA) that exist to
   *  funnel the user to the real download instead of triggering it. */
  alwaysIntercept?: boolean
}

function scrollToDownloadSection() {
  // Next tick so the AnimatePresence enter animation has a target.
  window.requestAnimationFrame(() => {
    const target = document.getElementById('download')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export function handleDownloadClick(
  e: MouseEvent<HTMLAnchorElement>,
  opts: HandleDownloadOptions = {}
): void {
  hydrateFromStorage()

  if (!isMacPlatform()) {
    // Non-Mac: no quarantine note to surface, navigate directly.
    return
  }

  if (opts.alwaysIntercept) {
    // Hero / upstream button: never download, always send the user to
    // the DownloadSection. Mark clicked so the note is rendered there.
    e.preventDefault()
    markDownloadClicked()
    scrollToDownloadSection()
    return
  }

  if (clicked) {
    // DownloadSection button, note already shown — navigate normally.
    return
  }

  // First click on DownloadSection button: surface the note before
  // navigating. The user will tap again to actually download.
  e.preventDefault()
  markDownloadClicked()
  scrollToDownloadSection()
}
