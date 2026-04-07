import { useEffect, useState } from 'react'
import { usePackagesStore } from '../../store/packages'
import { PackageDialog } from './PackageDialog'

export function PackageList() {
  const { packages, loadPackages, remove, removing, error, clearError } = usePackagesStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  return (
    <>
      <div className="border-t border-zinc-700">
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 cursor-pointer select-none"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="text-xs font-medium text-zinc-400">
            {collapsed ? '▶' : '▼'} Packages ({packages.length})
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDialogOpen(true)
            }}
            className="px-2 py-0.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
          >
            + Add
          </button>
        </div>
        {!collapsed && (
          <div className="max-h-32 overflow-y-auto">
            {error && (
              <div className="px-3 py-1 text-xs text-red-400 flex items-center justify-between">
                <span className="truncate">{error}</span>
                <button onClick={clearError} className="text-zinc-500 hover:text-zinc-300 ml-1">×</button>
              </div>
            )}
            {packages.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-600">No packages installed</div>
            )}
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className="flex items-center justify-between px-3 py-1 text-xs hover:bg-zinc-800/50"
              >
                <span className="text-zinc-300 truncate">
                  {pkg.name}
                  <span className="text-zinc-600 ml-1">@{pkg.version}</span>
                </span>
                <button
                  onClick={() => remove(pkg.name)}
                  disabled={removing !== null}
                  className="text-zinc-600 hover:text-red-400 transition-colors ml-1"
                  title="Remove package"
                >
                  {removing === pkg.name ? '...' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <PackageDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
