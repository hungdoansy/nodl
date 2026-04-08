import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Download, X, Plus, Loader2 } from 'lucide-react'
import { usePackagesStore } from '../../store/packages'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import * as bridge from '../../ipc/bridge'
import type { PackageSearchResult } from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function PackageDialog({ open, onClose }: Props) {
  const { packages, loadPackages, install, installing, remove, removing } = usePackagesStore()
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PackageSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { mounted, visible, close } = useDialogTransition(open)

  const handleClose = useCallback(() => close(onClose), [close, onClose])

  useEffect(() => {
    if (open) {
      loadPackages()
      setShowSearch(false)
      setQuery('')
      setResults([])
    }
  }, [open, loadPackages])

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
    if (showSearch) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showSearch])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearch) { setShowSearch(false); setQuery(''); setResults([]) }
        else handleClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mounted, handleClose, showSearch])

  if (!mounted) return null

  const installedNames = new Set(packages.map((p) => p.name))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease',
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
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
            Packages
          </h2>
          <div className="flex items-center gap-1">
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="toolbar-btn"
                title="Add package"
              >
                <Plus size={14} />
              </button>
            )}
            <button onClick={handleClose} className="btn-ghost" style={{ padding: 3 }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search bar — shown when adding */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search npm packages..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={() => { setShowSearch(false); setQuery(''); setResults([]) }}
              className="btn-ghost" style={{ padding: 2 }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search results */}
          {showSearch && (
            <>
              {searching && (
                <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={12} className="animate-spin" />
                  Searching...
                </div>
              )}
              {!searching && query && results.length === 0 && (
                <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-tertiary)' }}>No results</div>
              )}
              {results.map((pkg, i) => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between px-5 py-2"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div className="truncate">
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{pkg.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{pkg.version}</span>
                    </div>
                    {pkg.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }} className="truncate">{pkg.description}</div>
                    )}
                  </div>
                  {installedNames.has(pkg.name) ? (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>Installed</span>
                  ) : (
                    <button
                      onClick={() => install(pkg.name)}
                      disabled={installing !== null}
                      className="btn btn-primary"
                      style={{ padding: '3px 8px', flexShrink: 0, fontSize: 11 }}
                    >
                      <Download size={10} />
                      {installing === pkg.name ? 'Installing...' : 'Install'}
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Installed packages */}
          {!showSearch && (
            <div style={{ padding: '8px 0' }}>
              {packages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No packages installed</span>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="btn"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    <Plus size={11} />
                    Add package
                  </button>
                </div>
              )}
              {packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="group flex items-center justify-between px-5 py-2"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{pkg.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{pkg.version}</span>
                  </div>
                  <button
                    onClick={() => remove(pkg.name)}
                    disabled={removing !== null}
                    className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                    style={{ padding: 2 }}
                    title="Remove package"
                  >
                    {removing === pkg.name
                      ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                      : <X size={12} style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
