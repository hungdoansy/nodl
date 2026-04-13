import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mirror desktop app design tokens (apps/desktop/src/index.css :root)
        'bg-void': '#171717',
        'bg-primary': '#1e1e1e',
        'bg-surface': '#252525',
        'bg-elevated': '#2d2d2d',
        'bg-input': '#333333',

        'border-subtle': 'rgba(255, 255, 255, 0.06)',
        'border-default': 'rgba(255, 255, 255, 0.10)',
        'border-strong': 'rgba(255, 255, 255, 0.16)',

        accent: '#a78bfa',
        'accent-bright': '#c4b5fd',
        'accent-dim': 'rgba(167, 139, 250, 0.10)',
        'accent-glow': 'rgba(167, 139, 250, 0.05)',

        'text-primary': '#e5e5e5',
        'text-secondary': '#999999',
        'text-tertiary': '#666666',
        'text-bright': '#f5f5f5',

        danger: '#ef4444',
        warn: '#f59e0b',
        info: '#60a5fa',
        ok: '#22c55e',

        // Monaco vs-dark token colors (for code showcase)
        'type-string': '#ce9178',
        'type-number': '#b5cea8',
        'type-boolean': '#569cd6',
        'type-function': '#ffe082',
        'type-keyword': '#569cd6',
        'type-comment': '#6a9955'
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
        sm: '0 1px 4px rgba(0, 0, 0, 0.3)',
        dialog:
          '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)'
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
