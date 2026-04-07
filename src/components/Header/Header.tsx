export function Header() {
  return (
    <header className="h-10 flex items-center px-4 bg-zinc-800 border-b border-zinc-700 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-sm font-bold text-zinc-100 tracking-tight">nodl</span>
        <span className="text-xs text-zinc-500">v0.1</span>
      </div>
    </header>
  )
}
