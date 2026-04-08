import { useEffect, useCallback } from 'react'
import { X, RotateCcw } from 'lucide-react'
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
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md mx-4 animate-slide-down"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-dialog)',
          borderRadius: 'var(--radius-lg)',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
            Settings
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 3 }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Section title="Editor">
            <SliderRow label="Font Size" value={settings.fontSize} min={10} max={24} step={1}
              onChange={(v) => settings.setSetting('fontSize', v)} />
            <SelectRow label="Tab Size" value={String(settings.tabSize)}
              options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]}
              onChange={(v) => settings.setSetting('tabSize', Number(v))} />
            <ToggleRow label="Word Wrap" checked={settings.wordWrap}
              onChange={(v) => settings.setSetting('wordWrap', v)} />
            <ToggleRow label="Minimap" checked={settings.minimap}
              onChange={(v) => settings.setSetting('minimap', v)} />
          </Section>

          <Section title="Execution">
            <ToggleRow label="Auto-run" checked={settings.autoRunEnabled}
              onChange={(v) => settings.setSetting('autoRunEnabled', v)} />
            <SliderRow label="Auto-run Delay" value={settings.autoRunDelay} min={100} max={2000} step={100} unit="ms"
              onChange={(v) => settings.setSetting('autoRunDelay', v)} />
            <SliderRow label="Timeout" value={settings.executionTimeout} min={1} max={30} step={1} unit="s"
              onChange={(v) => settings.setSetting('executionTimeout', v)} />
          </Section>

          <Section title="Appearance">
            <SelectRow label="Theme" value={settings.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' }
              ]}
              onChange={(v) => settings.setTheme(v as ThemeMode)} />
          </Section>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <button onClick={settings.resetToDefaults} className="btn">
              <RotateCcw size={11} />
              Reset Defaults
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
      <h3 style={{
        color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500,
        marginBottom: 10,
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, unit, onChange
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string
  onChange: (value: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 80, height: 14, display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute', height: 3, left: 0, right: 0,
            background: 'var(--border-default)', borderRadius: 2,
          }} />
          <div style={{
            position: 'absolute', height: 3, left: 0, width: `${pct}%`,
            background: 'var(--accent)', borderRadius: 2,
          }} />
          <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ position: 'relative', width: '100%', zIndex: 1 }}
          />
        </div>
        <span style={{
          color: 'var(--text-primary)', fontSize: 12, width: 40, textAlign: 'right',
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
        }}>
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
      <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</label>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--accent)' : 'var(--border-default)',
          position: 'relative', transition: 'background 150ms',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white', transition: 'left 150ms var(--ease)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
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
      <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 12,
          padding: '4px 8px',
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
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
