import { useCallback, useMemo } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import * as bridge from '../../ipc/bridge'
import changelogMd from '../../../CHANGELOG.md?raw'

interface Props {
  open: boolean
  onClose: () => void
}

interface Release {
  version: string
  date: string
  changes: string[]
}

function parseChangelog(md: string): Release[] {
  const releases: Release[] = []
  const sections = md.split(/^## /m).slice(1) // split on ## headings, skip preamble
  for (const section of sections) {
    const headerMatch = section.match(/^v?([\d.]+)\s*\((\d{4}-\d{2}-\d{2})\)/)
    if (!headerMatch) continue
    const changes = section
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
    releases.push({ version: headerMatch[1], date: headerMatch[2], changes })
  }
  return releases
}

export function AboutDialog({ open, onClose }: Props) {
  const { mounted, visible, close } = useDialogTransition(open)
  const handleClose = useCallback(() => close(onClose), [close, onClose])
  const CHANGELOG = useMemo(() => parseChangelog(changelogMd), [])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        onClick={handleClose}
      />
      <div
        className="relative w-full max-w-md mx-4"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-dialog)',
          borderRadius: 'var(--radius-lg)',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'transform 150ms var(--ease), opacity 150ms ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
            About nodl
          </h2>
          <button onClick={handleClose} className="btn-ghost" style={{ padding: 3 }}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Description */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A fast, lightweight desktop scratchpad for writing and running JavaScript and TypeScript
              code with instant inline output. Built for developers who want a quick place to
              test ideas, explore APIs, and prototype logic.
            </p>
          </div>

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Made by</span>
            <button
              onClick={() => bridge.openExternal('https://github.com/hungdoansy')}
              style={{
                fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: 0,
              }}
            >
              Hung Doan <ExternalLink size={10} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>, with 🫶</span>
          </div>

          {/* Changelog */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <h3 style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 12 }}>
              Changelog
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CHANGELOG.map((release) => (
                <div key={release.version}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      padding: '1px 6px',
                      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-bright)',
                      background: 'var(--accent-dim)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      v{release.version}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {release.date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {release.changes.map((change, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, fontSize: 12 }}>{i + 1}.</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => bridge.openExternal('https://github.com/hungdoansy/nodl')}
              style={{
                fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              GitHub <ExternalLink size={10} />
            </button>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1 }}>•</span>
            <button
              onClick={() => bridge.openExternal('https://github.com/hungdoansy/nodl/issues')}
              style={{
                fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Report an issue <ExternalLink size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
