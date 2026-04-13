import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  GITHUB_URL
} from '@/lib/constants'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  metadataBase: new URL('https://nodl.app'),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME}`
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: 'Hung Doan', url: 'https://github.com/hungdoansy' }],
  keywords: [
    'JavaScript',
    'TypeScript',
    'scratchpad',
    'REPL',
    'Node.js',
    'desktop',
    'macOS',
    'developer tools',
    'IDE',
    'code editor'
  ],
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE}`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png']
  },
  icons: {
    icon: '/favicon.svg'
  },
  other: {
    'app:version': APP_VERSION,
    'app:repository': GITHUB_URL
  }
}

export const viewport: Viewport = {
  themeColor: '#171717',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-bg-void text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
