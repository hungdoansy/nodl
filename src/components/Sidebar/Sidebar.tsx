import { useState, useRef, useCallback } from 'react'
import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'

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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ index: number } | null>(null)

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
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: collapsed ? 40 : 180,
        minWidth: collapsed ? 40 : 180,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-subtle)',
        transition: 'width 180ms var(--ease), min-width 180ms var(--ease)',
      }}
    >
      {/* Label */}
      {!collapsed && (
        <div style={{
          padding: '8px 10px 4px',
          color: 'var(--text-secondary)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          files
        </div>
      )}
      {collapsed && <div style={{ height: 8 }} />}

      {/* Tabs */}
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
                gap: 5,
                background: active ? 'var(--bg-hover)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--text-bright)' : 'var(--text-secondary)',
                fontSize: 11,
                transition: 'all 100ms',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {collapsed ? (
                <span style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }}>
                  {tab.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <>
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
                      style={{ fontSize: 11, color: 'var(--text-bright)', borderBottom: '1px solid var(--accent)' }}
                      autoFocus
                    />
                  ) : (
                    <span className="truncate flex-1">{tab.name}</span>
                  )}
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>
                    {tab.language === 'typescript' ? '.ts' : '.js'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-tertiary)', fontSize: 10 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div style={{
        display: 'flex',
        alignItems: collapsed ? 'center' : 'center',
        flexDirection: collapsed ? 'column' : 'row',
        padding: '4px 3px',
        borderTop: '1px solid var(--border-subtle)',
        gap: 2,
      }}>
        <button onClick={createTab} className="btn-ghost" style={{ fontSize: 11 }} title="New file">+</button>
        <div style={{ flex: 1 }} />
        <button onClick={toggleSidebar} className="btn-ghost" style={{ fontSize: 8 }}>
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </div>
  )
}
