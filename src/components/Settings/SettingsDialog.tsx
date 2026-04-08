import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '../../store/settings'
import type { ThemeMode } from '../../../shared/types'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const settings = useSettingsStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md mx-4 animate-slide-down"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-dialog)',
          border: '1px solid var(--border-default)',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ opacity: 0.4 }}>[</span> config <span style={{ opacity: 0.4 }}>]</span>
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 14 }}>×</button>
        </div>

        <div className="px-4 py-3 space-y-4">
          <Section title="editor">
            <SliderRow label="font_size" value={settings.fontSize} min={10} max={24} step={1}
              onChange={(v) => settings.setSetting('fontSize', v)} />
            <SelectRow label="tab_size" value={String(settings.tabSize)}
              options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]}
              onChange={(v) => settings.setSetting('tabSize', Number(v))} />
            <ToggleRow label="word_wrap" checked={settings.wordWrap}
              onChange={(v) => settings.setSetting('wordWrap', v)} />
            <ToggleRow label="minimap" checked={settings.minimap}
              onChange={(v) => settings.setSetting('minimap', v)} />
          </Section>

          <Section title="execution">
            <ToggleRow label="auto_run" checked={settings.autoRunEnabled}
              onChange={(v) => settings.setSetting('autoRunEnabled', v)} />
            <SliderRow label="auto_delay" value={settings.autoRunDelay} min={100} max={2000} step={100} unit="ms"
              onChange={(v) => settings.setSetting('autoRunDelay', v)} />
            <SliderRow label="timeout" value={settings.executionTimeout} min={1} max={30} step={1} unit="s"
              onChange={(v) => settings.setSetting('executionTimeout', v)} />
          </Section>

          <Section title="display">
            <SelectRow label="theme" value={settings.theme}
              options={[
                { value: 'dark', label: 'DRK' },
                { value: 'light', label: 'LGT' },
                { value: 'system', label: 'SYS' }
              ]}
              onChange={(v) => settings.setTheme(v as ThemeMode)} />
          </Section>

          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 10 }}>
            <button onClick={settings.resetToDefaults} className="btn">RESET DEFAULTS</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{
        color: 'var(--text-muted)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        <span style={{ color: 'var(--accent)', opacity: 0.3 }}>├──</span> {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, unit, onChange
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 80, accentColor: 'var(--accent)' }}
        />
        <span style={{ color: 'var(--accent)', fontSize: 11, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {value}{unit ?? ''}
        </span>
      </div>
    </div>
  )
}

function ToggleRow({
  label, checked, onChange
}: {
  label: string; checked: boolean; onChange: (value: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</label>
      <button
        onClick={() => onChange(!checked)}
        style={{
          fontSize: 10,
          padding: '2px 8px',
          border: `1px solid ${checked ? 'var(--accent-mid)' : 'var(--border-default)'}`,
          background: checked ? 'var(--accent-dim)' : 'transparent',
          color: checked ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          letterSpacing: '0.06em',
          fontFamily: 'inherit',
          transition: 'all 120ms',
        }}
      >
        {checked ? '[ON]' : '[OFF]'}
      </button>
    </div>
  )
}

function SelectRow({
  label, value, options, onChange
}: {
  label: string; value: string; options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 11,
          padding: '2px 6px',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
