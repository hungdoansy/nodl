import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  GITHUB_URL
} from '@/lib/constants'
import { NO_FLASH_SCRIPT, ThemeProvider } from '@/lib/theme'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  metadataBase: new URL('https://nodl-app.vercel.app'),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME}`
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: 'Hung Doan', url: 'https://github.com/hungdoansy' }],
  creator: 'Hung Doan',
  publisher: 'Hung Doan',
  category: 'developer tools',
  keywords: [
    'nodl',
    'TypeScript scratchpad',
    'JavaScript scratchpad',
    'TypeScript REPL',
    'JavaScript REPL',
    'TypeScript playground',
    'inline output',
    'live evaluation',
    'Node.js scratchpad',
    'desktop REPL',
    'macOS developer tool',
    'Windows developer tool',
    'Linux developer tool',
    'cross-platform scratchpad',
    'Electron app',
    'code playground',
    'TS playground',
    'npm package testing',
    'RunJS alternative',
    'Quokka alternative'
  ],
  alternates: {
    canonical: '/'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    url: '/',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE}`,
        type: 'image/svg+xml'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ['/og-image.svg'],
    creator: '@hungdoansy'
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  },
  other: {
    'app:version': APP_VERSION,
    'app:repository': GITHUB_URL
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' }
  ],
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="bg-bg-void text-text-primary antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
