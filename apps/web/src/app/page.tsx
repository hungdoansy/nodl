export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '100px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>nodl</h1>
      <p style={{ fontSize: 18, color: '#666', marginTop: 8 }}>
        A fast, lightweight desktop scratchpad for writing and running JS/TS code.
      </p>
      <a
        href="https://github.com/hungdoansy/nodl/releases"
        style={{ display: 'inline-block', marginTop: 32, padding: '12px 24px', background: '#a78bfa', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
      >
        Download
      </a>
    </main>
  )
}
