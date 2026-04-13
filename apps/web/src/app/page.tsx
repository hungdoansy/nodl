import { APP_NAME, APP_VERSION } from '@/lib/constants'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-semibold text-text-bright tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-text-secondary mt-2 font-mono text-sm">
          v{APP_VERSION} · setup OK
        </p>
      </div>
    </main>
  )
}
