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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-zinc-800 dark:bg-zinc-800 light:bg-white rounded-lg border border-zinc-700 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Editor Section */}
          <Section title="Editor">
            <SliderRow
              label="Font Size"
              value={settings.fontSize}
              min={10}
              max={24}
              step={1}
              onChange={(v) => settings.setSetting('fontSize', v)}
            />
            <SelectRow
              label="Tab Size"
              value={String(settings.tabSize)}
              options={[
                { value: '2', label: '2 spaces' },
                { value: '4', label: '4 spaces' }
              ]}
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

          {/* Execution Section */}
          <Section title="Execution">
            <ToggleRow
              label="Auto-run"
              checked={settings.autoRunEnabled}
              onChange={(v) => settings.setSetting('autoRunEnabled', v)}
            />
            <SliderRow
              label="Auto-run Delay"
              value={settings.autoRunDelay}
              min={100}
              max={2000}
              step={100}
              unit="ms"
              onChange={(v) => settings.setSetting('autoRunDelay', v)}
            />
            <SliderRow
              label="Execution Timeout"
              value={settings.executionTimeout}
              min={1}
              max={30}
              step={1}
              unit="s"
              onChange={(v) => settings.setSetting('executionTimeout', v)}
            />
          </Section>

          {/* Appearance Section */}
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
          <div className="pt-2 border-t border-zinc-700">
            <button
              onClick={settings.resetToDefaults}
              className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
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
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-zinc-300 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 accent-emerald-500"
        />
        <span className="text-xs text-zinc-400 w-12 text-right tabular-nums">
          {value}{unit ?? ''}
        </span>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-zinc-300">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-emerald-600' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function SelectRow({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-600 focus:outline-none focus:border-emerald-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
