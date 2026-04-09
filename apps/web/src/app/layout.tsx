export const metadata = {
  title: 'nodl — JS/TS Code Scratchpad',
  description: 'A fast, lightweight desktop scratchpad for writing and running JavaScript/TypeScript code with instant inline output.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
