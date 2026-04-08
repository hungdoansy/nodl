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
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, renameTab])

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: collapsed ? 42 : 192,
        minWidth: collapsed ? 42 : 192,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-default)',
        transition: `width 200ms var(--ease), min-width 200ms var(--ease)`,
      }}
    >
      {/* Section header */}
      {!collapsed && (
        <div
          className="px-3 pt-2.5 pb-1"
          style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <span style={{ color: 'var(--accent)', opacity: 0.4 }}>├──</span> files
        </div>
      )}
      {collapsed && <div className="h-2.5" />}

      {/* Tab list */}
      <div className="flex-1 overflow-y-auto px-1">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => { dragRef.current = { index } }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragRef.current && dragRef.current.index !== index) {
                  reorderTabs(dragRef.current.index, index)
                }
                dragRef.current = null
              }}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => startEditing(tab.id, tab.name)}
              className="group flex items-center cursor-pointer relative"
              style={{
                padding: collapsed ? '5px 0' : '4px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 6,
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text-bright)' : 'var(--text-secondary)',
                fontSize: 11,
                transition: 'all 120ms var(--ease)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {collapsed ? (
                <span style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {tab.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <>
                  {/* Status indicator */}
                  <span style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 8,
                    opacity: isActive ? 1 : 0.4,
                  }}>
                    {isActive ? '▸' : '·'}
                  </span>

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
                        fontSize: 11,
                        color: 'var(--text-bright)',
                        borderBottom: '1px solid var(--accent)',
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="truncate flex-1" style={{ fontSize: 11 }}>
                      {tab.name}
                    </span>
                  )}

                  <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                    {tab.language === 'typescript' ? '.ts' : '.js'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)', fontSize: 11, padding: '0 2px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    title="Close"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom controls */}
      <div
        className="flex items-center py-1.5 px-1.5"
        style={{
          borderTop: '1px solid var(--border-default)',
          flexDirection: collapsed ? 'column' : 'row',
          gap: collapsed ? 4 : 0,
        }}
      >
        <button onClick={createTab} className="btn-ghost" style={{ fontSize: 11 }} title="New file">
          <span style={{ color: 'var(--accent)', opacity: 0.5 }}>[</span>+<span style={{ color: 'var(--accent)', opacity: 0.5 }}>]</span>
        </button>
        <div className="flex-1" />
        <button onClick={toggleSidebar} className="btn-ghost" style={{ fontSize: 9 }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </div>
  )
}
