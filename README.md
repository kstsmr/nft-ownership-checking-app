TON NFT Ownership Checker – Project Guide

Overview
- React (Vite) UI under `Nft-proccessing/` + a minimal Node server under `server/`.
- UI posts mnemonic, NFT contract, and network to the server; server writes `checkowner/.env` and executes `checkowner/whoowns.mjs`.

Run Locally
- Start the server: `node server/server.js`
- In another terminal, start the UI: `cd Nft-proccessing && npm run dev`
- Open the app (Vite prints a local URL, typically http://localhost:5173).

Script Entrypoint
- This project is wired to `checkowner/whoowns.mjs` (ESM) and includes `checkowner/package.json` with dependencies.

Environment Variables Written
- The server writes `checkowner/.env` with these keys:
  - `MNEMONIC` (exactly 24 words required)
  - `NFT_ADDRESS` (TON address)
  - `NETWORK` (`mainnet` or `testnet`)
  - `TONCENTER_ENDPOINT` (JSON-RPC endpoint derived from network)
  - `TONCENTER_API_KEY`

UI -> Server Contract
- UI POSTs to `/api/check` with JSON: `{ mnemonic, contract, network, apiKey }`.
- Server writes `.env`, runs the script, and returns stdout/stderr + exit code.

Notes
- Server uses only Node built-ins (`http`, `child_process`, `fs`).
- Vite proxies `/api` to `http://localhost:8787` during `npm run dev`.
- `checkowner/.env` is ignored by Git via the root `.gitignore`.

Deploy to GitHub (code hosting)
- Initialize and push:
  1) `git init`
  2) `git add .`
  3) `git commit -m "Initial commit: TON NFT ownership checker"`
  4) `git branch -M main`
  5) `git remote add origin git@github.com:<your-username>/<your-repo>.git`
  6) `git push -u origin main`
- Do NOT commit secrets: `.gitignore` already excludes `checkowner/.env` and other env files.

Production notes
- This app needs a Node server to write `.env` and run the script. GitHub Pages alone won’t work (static only).
- Options to deploy:
  - Host the server on a Node platform (Railway, Render, Fly.io, etc.) and serve the Vite build from the same service or a CDN.
  - Keep running locally and use GitHub just for code hosting.
- Build the UI: `cd Nft-proccessing && npm run build` (outputs `Nft-proccessing/dist`). To serve it from your Node server, add a static file handler.

Node versions
- Use Node 18+ for native ESM and fetch support in the script/server.
