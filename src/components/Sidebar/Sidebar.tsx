import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, X, Package, FileCode } from 'lucide-react'
import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'
import { usePackagesStore } from '../../store/packages'
import { PackageDialog } from '../Packages/PackageDialog'

export function Sidebar() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const setActiveTab = useTabsStore((s) => s.setActiveTab)
  const createTab = useTabsStore((s) => s.createTab)
  const closeTab = useTabsStore((s) => s.closeTab)
  const renameTab = useTabsStore((s) => s.renameTab)
  const reorderTabs = useTabsStore((s) => s.reorderTabs)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const { packages, loadPackages, remove, removing } = usePackagesStore()
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false)
  const [pkgSectionOpen, setPkgSectionOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ index: number } | null>(null)

  useEffect(() => { loadPackages() }, [loadPackages])

  const startEditing = useCallback((id: string, name: string) => {
    if (collapsed) return
    setEditingId(id)
    setEditValue(name)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [collapsed])

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) renameTab(editingId, editValue.trim())
    setEditingId(null)
  }, [editingId, editValue, renameTab])

  return (
    <>
      <div
        className="flex flex-col h-full select-none"
        style={{
          width: collapsed ? 40 : 200,
          minWidth: collapsed ? 40 : 200,
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-subtle)',
          transition: 'width 180ms var(--ease), min-width 180ms var(--ease)',
        }}
      >
        {/* Files section */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <span style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Files
            </span>
            <button onClick={createTab} className="btn-ghost" title="New file" style={{ padding: 2 }}>
              <Plus size={12} />
            </button>
          </div>
        )}
        {collapsed && <div style={{ height: 8 }} />}

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 3px' }}>
          {tabs.map((tab, index) => {
            const active = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                draggable
                onDragStart={() => { dragRef.current = { index } }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragRef.current && dragRef.current.index !== index) reorderTabs(dragRef.current.index, index)
                  dragRef.current = null
                }}
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => startEditing(tab.id, tab.name)}
                className="group flex items-center cursor-pointer"
                style={{
                  padding: collapsed ? '5px 0' : '4px 7px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 6,
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 100ms',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {collapsed ? (
                  <FileCode size={13} style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                ) : (
                  <>
                    <FileCode size={12} style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)', flexShrink: 0 }} />
                    {editingId === tab.id ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="bg-transparent outline-none w-full"
                        style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', borderBottom: '1px solid var(--accent)' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} className="truncate flex-1">{tab.name}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                      style={{ padding: 1 }}
                    >
                      <X size={11} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Packages section */}
        {!collapsed && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div
              className="flex items-center justify-between px-3 py-1.5 cursor-pointer"
              onClick={() => setPkgSectionOpen(!pkgSectionOpen)}
              style={{ background: 'var(--bg-surface)' }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Package size={11} />
                Packages ({packages.length})
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setPkgDialogOpen(true) }}
                className="btn-ghost" style={{ padding: 2 }}
                title="Add package"
              >
                <Plus size={12} />
              </button>
            </div>
            {pkgSectionOpen && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {packages.length === 0 && (
                  <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-tertiary)' }}>
                    No packages
                  </div>
                )}
                {packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="group flex items-center justify-between"
                    style={{ padding: '3px 12px', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }} className="truncate">
                      {pkg.name}
                      <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>@{pkg.version}</span>
                    </span>
                    <button
                      onClick={() => remove(pkg.name)}
                      disabled={removing !== null}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                      style={{ padding: 1 }}
                    >
                      <X size={10} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom: collapse toggle */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '4px 3px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {collapsed && (
            <button onClick={createTab} className="btn-ghost" title="New file" style={{ padding: 3, marginBottom: 2 }}>
              <Plus size={13} />
            </button>
          )}
          <button onClick={toggleSidebar} className="btn-ghost" title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </div>
      <PackageDialog open={pkgDialogOpen} onClose={() => setPkgDialogOpen(false)} />
    </>
  )
}
