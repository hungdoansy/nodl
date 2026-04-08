import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, X, Package, FileCode, Settings } from 'lucide-react'
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
  const openSettings = useUIStore((s) => s.openSettings)

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
          width: collapsed ? 44 : 200,
          minWidth: collapsed ? 44 : 200,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          transition: 'width 180ms var(--ease), min-width 180ms var(--ease)',
        }}
      >
        {/* Files section */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500 }}>
              Files
            </span>
            <button onClick={createTab} className="btn-ghost" title="New file" style={{ padding: 2 }}>
              <Plus size={13} />
            </button>
          </div>
        )}
        {collapsed && <div style={{ height: 10 }} />}

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: collapsed ? '0 4px' : '0 6px' }}>
          {collapsed && (
            <div className="flex justify-center mb-1">
              <button onClick={createTab} className="btn-ghost" title="New file" style={{ padding: 3 }}>
                <Plus size={14} />
              </button>
            </div>
          )}
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
                  padding: collapsed ? '6px 0' : '5px 8px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 7,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 1,
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 100ms',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--bg-hover)' : 'transparent' }}
              >
                {collapsed ? (
                  <FileCode size={14} style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }} />
                ) : (
                  <>
                    <FileCode size={13} style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)', flexShrink: 0 }} />
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
                        style={{
                          fontSize: 12, color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--accent)',
                          borderRadius: 0,
                        }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontSize: 12 }} className="truncate flex-1">{tab.name}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                      style={{ padding: 1 }}
                    >
                      <X size={12} style={{ color: 'var(--text-tertiary)' }} />
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
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
              onClick={() => setPkgSectionOpen(!pkgSectionOpen)}
            >
              <span style={{
                color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Package size={12} />
                Packages ({packages.length})
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setPkgDialogOpen(true) }}
                className="btn-ghost" style={{ padding: 2 }}
                title="Add package"
              >
                <Plus size={13} />
              </button>
            </div>
            {pkgSectionOpen && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {packages.length === 0 && (
                  <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    No packages
                  </div>
                )}
                {packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="group flex items-center justify-between"
                    style={{ padding: '3px 12px', fontSize: 12 }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }} className="truncate">
                      {pkg.name}
                      <span style={{ color: 'var(--text-tertiary)', marginLeft: 4, fontSize: 11 }}>@{pkg.version}</span>
                    </span>
                    <button
                      onClick={() => remove(pkg.name)}
                      disabled={removing !== null}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                      style={{ padding: 1 }}
                    >
                      <X size={11} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom: settings */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '6px 4px' : '6px 8px',
          borderTop: '1px solid var(--border-subtle)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <button
            onClick={openSettings}
            className="btn-ghost"
            title="Settings"
            style={{
              padding: collapsed ? 4 : '4px 6px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Settings size={14} />
            {!collapsed && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Settings</span>}
          </button>
        </div>
      </div>
      <PackageDialog open={pkgDialogOpen} onClose={() => setPkgDialogOpen(false)} />
    </>
  )
}
