import type { Config } from 'tailwindcss'

/**
 * Helper: build a tailwind colour entry that reads from a CSS variable
 * holding an RGB triplet (e.g. `--rgb-bg-void: 23 23 23`). Tailwind's
 * `<alpha-value>` placeholder makes utility opacity modifiers (`bg-x/40`)
 * work the same way they do on built-in colours.
 */
const themed = (varName: string) => `rgb(var(${varName}) / <alpha-value>)`

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces (theme-switchable via CSS var)
        'bg-void': themed('--rgb-bg-void'),
        'bg-primary': themed('--rgb-bg-primary'),
        'bg-surface': themed('--rgb-bg-surface'),
        'bg-elevated': themed('--rgb-bg-elevated'),
        'bg-input': themed('--rgb-bg-input'),

        // Alpha-baked layers — direct CSS var, no alpha modifier support.
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'accent-dim': 'var(--accent-dim)',
        'accent-glow': 'var(--accent-glow)',

        // Brand
        accent: themed('--rgb-accent'),
        'accent-bright': themed('--rgb-accent-bright'),

        // Text
        'text-primary': themed('--rgb-text-primary'),
        'text-secondary': themed('--rgb-text-secondary'),
        'text-tertiary': themed('--rgb-text-tertiary'),
        'text-bright': themed('--rgb-text-bright'),

        // Status
        danger: themed('--rgb-danger'),
        warn: themed('--rgb-warn'),
        info: themed('--rgb-info'),
        ok: themed('--rgb-ok'),

        // Monaco token colours (for the static code displays)
        'type-string': themed('--rgb-type-string'),
        'type-number': themed('--rgb-type-number'),
        'type-boolean': themed('--rgb-type-boolean'),
        'type-keyword': themed('--rgb-type-boolean'),
        'type-function': themed('--rgb-type-function'),
        'type-comment': themed('--rgb-type-comment'),
        'type-tstype': themed('--rgb-type-tstype')
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'var(--font-mono)',
          'JetBrains Mono',
          'SF Mono',
          'Menlo',
          'Monaco',
          'monospace'
        ]
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        dialog: 'var(--shadow-dialog)'
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      animation: {
        'fade-in': 'fadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glowPulse 8s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' }
        }
      }
    }
  },
  plugins: []
}

export default config
