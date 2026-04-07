import { useState, useEffect, useRef } from 'react'
import { usePackagesStore } from '../../store/packages'
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

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const r = await bridge.searchPackages(query)
      setResults(r)
      setSearching(false)
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50" onClick={onClose}>
      <div
        className="bg-zinc-800 border border-zinc-700 rounded-lg w-[480px] max-h-[400px] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-zinc-700">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search npm packages..."
            className="w-full bg-zinc-900 border border-zinc-600 rounded px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div className="px-3 py-2 text-xs text-zinc-500">Searching...</div>
          )}
          {!searching && results.length === 0 && query && (
            <div className="px-3 py-2 text-xs text-zinc-500">No results</div>
          )}
          {results.map((pkg) => (
            <div
              key={pkg.name}
              className="flex items-center justify-between px-3 py-2 hover:bg-zinc-700/50 border-b border-zinc-700/50"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-sm text-zinc-100 font-medium truncate">{pkg.name}</div>
                <div className="text-xs text-zinc-500 truncate">{pkg.description}</div>
                <div className="text-xs text-zinc-600">{pkg.version}</div>
              </div>
              <button
                onClick={() => install(pkg.name)}
                disabled={installing !== null}
                className="px-3 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shrink-0"
              >
                {installing === pkg.name ? 'Installing...' : 'Install'}
              </button>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-zinc-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
