'use client'

import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { detectPlatform } from './platform'

/**
 * Tracks whether the user has clicked any Download button this session.
 *
 * The Hero button always intercepts — it funnels the user down to the
 * DownloadSection where the full CTA, system requirements, and (on
 * macOS) the Gatekeeper bypass note live.
 *
 * The DownloadSection button's first click on macOS is intercepted once
 * to surface the QuarantineNote, then subsequent clicks navigate
 * normally. Non-macOS visitors download immediately — there's no
 * platform-specific note to surface for Windows or Linux yet.
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

/**
 * Shared click handler for every Download <a> in the tree.
 *
 * Behaviour matrix:
 *
 *   ┌─────────────────────┬────────────────────┬────────────────────────┐
 *   │ Button              │ First click        │ Subsequent clicks      │
 *   ├─────────────────────┼────────────────────┼────────────────────────┤
 *   │ Hero (any platform) │ scroll + mark seen │ scroll (never nav)     │
 *   │ DownloadSection mac │ scroll + show note │ navigate (download)    │
 *   │ DownloadSection Win │ navigate           │ navigate               │
 *   │ DownloadSection Lnx │ navigate           │ navigate               │
 *   └─────────────────────┴────────────────────┴────────────────────────┘
 *
 * Pass `{ alwaysIntercept: true }` for the Hero button — it should
 * never trigger the actual download, only point the user at the
 * DownloadSection.
 */
export interface HandleDownloadOptions {
  /** Always preventDefault and scroll-to-section. Use for upstream
   *  buttons (e.g. the Hero CTA) that exist to funnel the user to the
   *  real download instead of triggering it. */
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

  if (opts.alwaysIntercept) {
    // Hero / upstream button: never download, always send the user to
    // the DownloadSection. Mark clicked so the macOS quarantine note is
    // rendered there (no-op for other platforms — the note is gated on
    // platform === 'mac' at the render site).
    e.preventDefault()
    markDownloadClicked()
    scrollToDownloadSection()
    return
  }

  // DownloadSection button.
  if (detectPlatform() !== 'mac') {
    // Windows / Linux / unknown: no Gatekeeper-style note to surface,
    // navigate directly to the releases page.
    return
  }

  if (clicked) {
    // macOS, note already shown — navigate normally.
    return
  }

  // First macOS click on DownloadSection button: surface the note
  // before navigating. The user will tap again to actually download.
  e.preventDefault()
  markDownloadClicked()
  scrollToDownloadSection()
}
