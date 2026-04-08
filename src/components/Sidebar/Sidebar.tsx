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
      className="flex flex-col h-full border-r select-none transition-[width] duration-200"
      style={{
        width: collapsed ? 40 : 180,
        minWidth: collapsed ? 40 : 180,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-default)'
      }}
    >
      {/* Tab list */}
      <div className="flex-1 overflow-y-auto py-1">
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
              className={`group flex items-center gap-1.5 cursor-pointer transition-colors relative ${
                collapsed ? 'px-0 py-1.5 justify-center' : 'px-2 py-1.5'
              } ${
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-emerald-500" />
              )}

              {collapsed ? (
                <span className="text-[11px] font-mono font-medium w-5 text-center truncate">
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
                      className="bg-transparent border-b border-zinc-500 outline-none text-xs font-mono w-full"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-mono truncate flex-1">{tab.name}</span>
                  )}
                  <span className="text-zinc-600 text-[10px] font-mono shrink-0">
                    {tab.language === 'typescript' ? '.ts' : '.js'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
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

      {/* Bottom bar: new tab + collapse toggle */}
      <div className={`flex items-center border-t py-1 ${collapsed ? 'flex-col gap-1 px-0' : 'px-1'}`}
        style={{ borderColor: 'var(--border-default)' }}
      >
        <button
          onClick={createTab}
          className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded p-1 transition-colors text-xs"
          title="New tab"
        >
          +
        </button>
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded p-1 transition-colors text-[10px]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </div>
    </div>
  )
}
