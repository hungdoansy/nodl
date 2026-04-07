import { TabBar } from './TabBar'

export function Header() {
  return (
    <header className="flex items-center bg-zinc-800 border-b border-zinc-700 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-sm font-bold text-zinc-100 tracking-tight">nodl</span>
      </div>
      <div className="flex-1 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <TabBar />
      </div>
    </header>
  )
}
