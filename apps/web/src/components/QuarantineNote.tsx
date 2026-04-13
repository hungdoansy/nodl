'use client'

import { Check, Copy, Heart, ShieldAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { QUARANTINE_BYPASS_CMD } from '@/lib/constants'

/**
 * Apple's Gatekeeper flags un-notarised apps with the quarantine
 * attribute, which produces a "damaged and can't be opened" or
 * "unidentified developer" dialog on first launch. nodl isn't notarised
 * (and likely won't be — see the highlighted line), so this card walks
 * the user through the one-time bypass.
 */
export function QuarantineNote() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(QUARANTINE_BYPASS_CMD).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="mt-8 w-full max-w-md rounded-lg border border-border-subtle bg-bg-surface/60 p-5 text-left shadow-sm backdrop-blur">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-warn/10 text-warn">
          <ShieldAlert size={14} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold text-text-primary">
            macOS may say &ldquo;app is damaged&rdquo; on first launch
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
            Gatekeeper warns you before opening apps it doesn&rsquo;t
            recognise. Walk through the one-time bypass below and you&rsquo;re
            in.
          </p>
        </div>
      </div>

      {/* Highlighted open-source / not-notarised note */}
      <div className="mt-4 flex items-start gap-2.5 rounded-md border border-accent/25 bg-accent/[0.07] px-3 py-2.5 text-[12.5px] leading-relaxed text-text-primary">
        <Heart
          size={13}
          strokeWidth={2}
          className="mt-0.5 flex-shrink-0 text-accent-bright"
        />
        <p>
          <span className="font-semibold text-accent-bright">
            nodl is open-source and free.
          </span>{' '}
          It isn&rsquo;t Apple-notarised yet, and probably won&rsquo;t be
          anytime soon — code-signing and notarisation cost money and time
          this side project doesn&rsquo;t have. The five steps below are
          how you tell macOS you trust it.
        </p>
      </div>

      {/* Steps */}
      <ol className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-text-secondary">
        <Step n={1}>
          Download the <Code>.dmg</Code> file from GitHub Releases.
        </Step>
        <Step n={2}>
          Right-click the <Code>.dmg</Code> file and choose{' '}
          <Em>Open</Em>.
        </Step>
        <Step n={3}>
          Drag <Code>nodl.app</Code> into your <Em>Applications</Em>{' '}
          folder.
        </Step>
        <Step n={4}>
          Run this once in Terminal to clear the quarantine flag:
          <div className="mt-2 flex items-stretch gap-2">
            <code className="flex-1 truncate rounded-md border border-border-subtle bg-bg-void px-3 py-2 font-mono text-[12px] text-accent-bright">
              {QUARANTINE_BYPASS_CMD}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy command'}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-void text-text-tertiary transition-all hover:border-border-default hover:text-text-primary"
            >
              {copied ? (
                <Check size={13} strokeWidth={2.4} className="text-ok" />
              ) : (
                <Copy size={13} strokeWidth={2} />
              )}
            </button>
          </div>
        </Step>
        <Step n={5}>
          Right-click <Code>nodl.app</Code> in <Em>Applications</Em> and
          pick <Em>Open</Em>. Confirm the prompt.
        </Step>
      </ol>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-void font-mono text-[10.5px] font-semibold text-text-tertiary">
        {n}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-bg-void px-1.5 py-px font-mono text-[11.5px] text-accent-bright">
      {children}
    </code>
  )
}

function Em({ children }: { children: ReactNode }) {
  return <span className="font-medium text-text-primary">{children}</span>
}
