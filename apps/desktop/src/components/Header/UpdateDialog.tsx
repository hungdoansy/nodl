import { useCallback } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import * as bridge from '../../ipc/bridge'
import type { UpdateInfo } from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  update: UpdateInfo
}

const isMac = window.navigator.platform.includes('Mac')

export function UpdateDialog({ open, onClose, update }: Props) {
  const { mounted, visible, close } = useDialogTransition(open)
  const handleClose = useCallback(() => close(onClose), [close, onClose])

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
        className="relative w-full max-w-sm mx-4"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-dialog)',
          borderRadius: 'var(--radius-lg)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'transform 150ms var(--ease), opacity 150ms ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
            Update Available
          </h2>
          <button onClick={handleClose} className="btn-ghost" title="Close (Esc)" style={{ padding: 3 }}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '2px 8px',
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
              color: 'var(--accent-bright)',
              background: 'var(--accent-dim)',
              borderRadius: 'var(--radius-sm)',
            }}>
              v{update.version}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              is ready to download
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>To update:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Click the download button below to get the latest version from GitHub.',
                isMac
                  ? 'Open the .dmg and drag nodl to Applications, replacing the old version.'
                  : 'Run the installer — it will replace the current version automatically.',
                'Relaunch the app. Your settings and files will be preserved.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, fontStyle: 'italic' }}>
            nodl is free and open-source. Auto-update requires code signing, which costs money
            — so for now, manual download is the way. Thanks for your patience!
          </p>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', gap: 8 }}>
            <button
              onClick={() => bridge.openExternal(update.url)}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <ExternalLink size={12} />
              Download v{update.version}
            </button>
            <button
              onClick={handleClose}
              className="btn"
              style={{ fontSize: 12, padding: '5px 14px' }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
