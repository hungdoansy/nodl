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
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md mx-4 overflow-hidden animate-scale-in"
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-dialog)',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <button onClick={onClose} className="btn-ghost text-lg leading-none">
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Editor */}
          <Section title="Editor">
            <SliderRow
              label="Font Size"
              value={settings.fontSize}
              min={10} max={24} step={1}
              onChange={(v) => settings.setSetting('fontSize', v)}
            />
            <SelectRow
              label="Tab Size"
              value={String(settings.tabSize)}
              options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]}
              onChange={(v) => settings.setSetting('tabSize', Number(v))}
            />
            <ToggleRow
              label="Word Wrap"
              checked={settings.wordWrap}
              onChange={(v) => settings.setSetting('wordWrap', v)}
            />
            <ToggleRow
              label="Minimap"
              checked={settings.minimap}
              onChange={(v) => settings.setSetting('minimap', v)}
            />
          </Section>

          {/* Execution */}
          <Section title="Execution">
            <ToggleRow
              label="Auto-run"
              checked={settings.autoRunEnabled}
              onChange={(v) => settings.setSetting('autoRunEnabled', v)}
            />
            <SliderRow
              label="Auto-run Delay"
              value={settings.autoRunDelay}
              min={100} max={2000} step={100} unit="ms"
              onChange={(v) => settings.setSetting('autoRunDelay', v)}
            />
            <SliderRow
              label="Timeout"
              value={settings.executionTimeout}
              min={1} max={30} step={1} unit="s"
              onChange={(v) => settings.setSetting('executionTimeout', v)}
            />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <SelectRow
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' }
              ]}
              onChange={(v) => settings.setTheme(v as ThemeMode)}
            />
          </Section>

          {/* Reset */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <button onClick={settings.resetToDefaults} className="btn btn-secondary">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
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
    <div className="flex items-center justify-between gap-4">
      <label className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24"
          style={{ accentColor: 'var(--accent)' }}
        />
        <span
          className="text-[11px] w-10 text-right font-mono tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
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
    <div className="flex items-center justify-between">
      <label className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-8 h-[18px] rounded-full transition-all duration-200"
        style={{
          background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        }}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
        />
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
    <div className="flex items-center justify-between">
      <label className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[12px] rounded px-2 py-1 outline-none"
        style={{
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
