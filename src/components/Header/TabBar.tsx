import { useState, useRef, useCallback } from 'react'
import { useTabsStore } from '../../store/tabs'

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const setActiveTab = useTabsStore((s) => s.setActiveTab)
  const createTab = useTabsStore((s) => s.createTab)
  const closeTab = useTabsStore((s) => s.closeTab)
  const renameTab = useTabsStore((s) => s.renameTab)
  const reorderTabs = useTabsStore((s) => s.reorderTabs)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ index: number } | null>(null)

  const startEditing = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditValue(name)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, renameTab])

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          draggable
          onDragStart={() => {
            dragRef.current = { index }
          }}
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={() => {
            if (dragRef.current && dragRef.current.index !== index) {
              reorderTabs(dragRef.current.index, index)
            }
            dragRef.current = null
          }}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => startEditing(tab.id, tab.name)}
          className={`group flex items-center gap-1 px-3 py-1 text-xs rounded-t cursor-pointer transition-colors shrink-0 ${
            tab.id === activeTabId
              ? 'bg-zinc-900 text-zinc-100'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
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
              className="bg-transparent border-b border-zinc-500 outline-none text-xs w-20"
              autoFocus
            />
          ) : (
            <span className="truncate max-w-[120px]">{tab.name}</span>
          )}
          <span className="text-zinc-600 text-[10px]">
            {tab.language === 'typescript' ? '.ts' : '.js'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
            className="ml-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Close tab"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={createTab}
        className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
        title="New tab"
      >
        +
      </button>
    </div>
  )
}
