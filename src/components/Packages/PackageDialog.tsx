import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Download, X } from 'lucide-react'
import { usePackagesStore } from '../../store/packages'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import * as bridge from '../../ipc/bridge'
import type { PackageSearchResult } from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function PackageDialog({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PackageSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const { install, installing } = usePackagesStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { mounted, visible, close } = useDialogTransition(open)

  const handleClose = useCallback(() => close(onClose), [close, onClose])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const r = await bridge.searchPackages(query)
      setResults(r)
      setSearching(false)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mounted, handleClose])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-16 z-50"
      style={{
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease',
      }}
      onClick={handleClose}
    >
      <div
        className="w-[460px] max-h-[400px] flex flex-col"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-dialog)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'transform 150ms var(--ease), opacity 150ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search npm packages..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-primary)',
            }}
          />
          <button onClick={handleClose} className="btn-ghost" style={{ padding: 2 }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
              Searching...
            </div>
          )}
          {!searching && results.length === 0 && query && (
            <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>No results</div>
          )}
          {results.map((pkg) => (
            <div
              key={pkg.name}
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }} className="truncate">{pkg.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }} className="truncate">{pkg.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{pkg.version}</div>
              </div>
              <button
                onClick={() => install(pkg.name)}
                disabled={installing !== null}
                className="btn btn-primary"
                style={{ padding: '4px 10px', flexShrink: 0 }}
              >
                <Download size={11} />
                {installing === pkg.name ? 'Installing' : 'Install'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
