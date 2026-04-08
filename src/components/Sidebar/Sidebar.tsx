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
        width: collapsed ? 44 : 184,
        minWidth: collapsed ? 44 : 184,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-subtle)',
        transition: `width 200ms var(--ease), min-width 200ms var(--ease)`,
      }}
    >
      {/* Section label */}
      {!collapsed && (
        <div
          className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Files
        </div>
      )}
      {collapsed && <div className="h-2" />}

      {/* Tab list */}
      <div className="flex-1 overflow-y-auto px-1.5 space-y-0.5">
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
              className="group flex items-center cursor-pointer relative rounded-[var(--radius-sm)]"
              style={{
                padding: collapsed ? '6px 0' : '5px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 6,
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all 150ms var(--ease)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Active accent dot */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-r"
                  style={{ background: 'var(--accent)', left: collapsed ? 0 : -6 }}
                />
              )}

              {collapsed ? (
                <span
                  className="font-mono text-[11px] font-medium w-5 text-center"
                  style={{ color: isActive ? 'var(--accent)' : undefined }}
                >
                  {tab.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <>
                  {/* File icon — tiny dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      opacity: isActive ? 1 : 0.5
                    }}
                  />

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
                      className="bg-transparent outline-none text-[12px] font-mono w-full"
                      style={{
                        borderBottom: '1px solid var(--accent)',
                        color: 'var(--text-primary)'
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="text-[12px] font-mono truncate flex-1">{tab.name}</span>
                  )}

                  <span
                    className="text-[10px] font-mono shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {tab.language === 'typescript' ? '.ts' : '.js'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] shrink-0 rounded"
                    style={{ color: 'var(--text-muted)', padding: '0 2px' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f87171'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                    title="Close tab"
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
          borderTop: '1px solid var(--border-subtle)',
          flexDirection: collapsed ? 'column' : 'row',
          gap: collapsed ? 2 : 0,
        }}
      >
        <button
          onClick={createTab}
          className="btn-ghost text-[12px] font-mono"
          title="New tab"
        >
          +
        </button>
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="btn-ghost text-[10px]"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </div>
    </div>
  )
}
