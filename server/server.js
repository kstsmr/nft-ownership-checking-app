// Minimal server to accept form data, write to checkowner/.env, and run the script
// No external dependencies; uses Node built-ins only.

import http from 'http'
import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  })
  res.end(data)
}

function parseJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {}
        resolve(json)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function findCheckownerEntry(root) {
  // Try common entry points inside checkowner
  const candidates = [
    'whoowns.mjs',
    'index.mjs',
    'index.js',
    'index.cjs',
    'main.js',
    'check.js',
    'checkowner.js',
    'script.js',
    'dist/index.js',
  ]
  for (const file of candidates) {
    const p = resolve(root, file)
    if (existsSync(p)) return p
  }
  // Try package.json scripts
  const pkgPath = resolve(root, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (pkg.scripts) {
        if (pkg.scripts.check) return { npmScript: 'check' }
        if (pkg.scripts.start) return { npmScript: 'start' }
        if (pkg.scripts.run) return { npmScript: 'run' }
      }
    } catch (_) {}
  }
  return null
}

function toncenterUrlForNetwork(network) {
  const n = (network || '').toLowerCase()
  if (n === 'testnet') return 'https://testnet.toncenter.com/api/v2/jsonRPC'
  return 'https://toncenter.com/api/v2/jsonRPC'
}

function writeEnv(checkownerDir, { mnemonic, contract, network, apiKey }) {
  const lines = [
    `MNEMONIC=${mnemonic?.toString().trim() ?? ''}`,
    `NFT_ADDRESS=${contract?.toString().trim() ?? ''}`,
    `NETWORK=${network?.toString().trim() ?? ''}`,
    `TONCENTER_ENDPOINT=${toncenterUrlForNetwork(network)}`,
    `TONCENTER_API_KEY=${apiKey?.toString().trim() ?? ''}`,
  ]
  const envContent = lines.join('\n') + '\n'
  writeFileSync(resolve(checkownerDir, '.env'), envContent, 'utf-8')
}

function runCheckowner(checkownerDir) {
  const entry = findCheckownerEntry(checkownerDir)
  if (!entry) {
    return Promise.resolve({
      ok: false,
      code: 0,
      stdout: '',
      stderr:
        'No entry script found in checkowner. Expected one of index.js/main.js/check.js/checkowner.js/script.js or an npm script "check"/"start".',
    })
  }

  return new Promise((resolve) => {
    let cmd, args, cwd
    cwd = checkownerDir
    if (typeof entry === 'string') {
      cmd = process.execPath // node
      args = [entry]
    } else if (entry.npmScript) {
      cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      args = ['run', entry.npmScript]
    }

    const child = spawn(cmd, args, { cwd, env: process.env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr }))
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, 'ok')

  if (req.method === 'POST' && req.url === '/api/check') {
    try {
      const body = await parseJson(req)
      const { mnemonic, contract, network, apiKey } = body || {}

      if (!mnemonic || !contract || !network) {
        return send(res, 400, {
          error: 'Missing required fields: mnemonic, contract, network',
        })
      }

      // Enforce exactly 24 words mnemonic
      const count = mnemonic.trim().split(/\s+/).filter(Boolean).length
      if (count !== 24) {
        return send(res, 400, { error: 'Mnemonic must be exactly 24 words' })
      }

      const repoRoot = resolve(__dirname, '..')
      let checkownerDir = resolve(repoRoot, 'checkowner')
      if (!existsSync(checkownerDir)) {
        const alt = resolve(repoRoot, 'Nft-proccessing', 'checkowner')
        if (existsSync(alt)) checkownerDir = alt
      }
      if (!existsSync(checkownerDir)) {
        mkdirSync(checkownerDir, { recursive: true })
      }

      writeEnv(checkownerDir, { mnemonic, contract, network, apiKey })

      const result = await runCheckowner(checkownerDir)
      return send(res, 200, {
        success: result.ok,
        exitCode: result.code,
        message: result.ok
          ? 'Script executed successfully.'
          : 'Script did not run or exited with error.',
        stdout: result.stdout,
        stderr: result.stderr,
      })
    } catch (err) {
      return send(res, 500, { error: err?.message || 'Internal error' })
    }
  }

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok' })
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`)
})
