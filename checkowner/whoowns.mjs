import 'dotenv/config'
import { TonClient, WalletContractV4, WalletContractV3R2 } from '@ton/ton'
import { Address } from '@ton/core'
import { mnemonicToWalletKey } from '@ton/crypto'

const endpoint = process.env.TONCENTER_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC'
const apiKey = process.env.TONCENTER_API_KEY || undefined
const client = new TonClient(apiKey ? { endpoint, apiKey } : { endpoint })

const MNEMONIC = process.env.MNEMONIC || ''
const CLI_NFT = process.argv[2]
const NFT_ADDR_S = (CLI_NFT && CLI_NFT !== '0') ? CLI_NFT : process.env.NFT_ADDRESS

// ---- helpers for nicer output (no ANSI codes) ----
const hr = (c = '─') => console.log(c.repeat(60))
const section = (title) => { hr('─'); console.log(`■ ${title}`); hr('┄') }
const kv = (k, v) => console.log(`${k.padEnd(14, ' ')}: ${v}`)

function parseAddr(s, label) {
  try { return Address.parse(s) } catch { throw new Error(`Некорректный ${label}: ${s}`) }
}
async function isDeployed(a) { try { return await client.isContractDeployed(a) } catch { return false } }

async function readOwner(nft) {
  const r = await client.runMethod(nft, 'get_nft_data', [])
  const st = r.stack
  st.readBigNumber(); st.readBigNumber(); st.readAddress()
  return st.readAddress()
}

(async () => {
  const words = MNEMONIC.trim().split(/\s+/).filter(Boolean)
  if (words.length !== 24) throw new Error('MNEMONIC должен состоять ровно из 24 слов')
  const { publicKey } = await mnemonicToWalletKey(words)

  // Header
  console.log('TON NFT Ownership Check')
  hr()
  section('Сеть')
  kv('Endpoint', endpoint)
  kv('API Key', apiKey ? '(provided)' : '(none)')

  // Wallet candidates
  section('Адреса из сид‑фразы')
  const v4_default = WalletContractV4.create({ workchain: 0, publicKey })
  const v4_id0 = WalletContractV4.create({ workchain: 0, publicKey, walletId: 0 })
  const v3 = WalletContractV3R2.create({ workchain: 0, publicKey })
  const candidates = [
    { tag: 'V4R2(default)', w: v4_default },
    { tag: 'V4R2(id=0)', w: v4_id0 },
    { tag: 'V3R2', w: v3 },
  ]

  const list = []
  for (const c of candidates) {
    const addr = c.w.address.toString()
    let deployed = false
    try { deployed = await isDeployed(c.w.address) } catch {}
    list.push({ tag: c.tag, address: addr, deployed })
    console.log(`• ${c.tag.padEnd(12)} ${addr}  ${deployed ? '✅ deployed' : '— not deployed'}`)
  }

  // Choose first deployed or default
  let chosen = candidates[0]
  for (let i = 0; i < candidates.length; i++) {
    if (list[i].deployed) { chosen = candidates[i]; break }
  }

  // NFT
  section('NFT контракт')
  const nftAddr = parseAddr(NFT_ADDR_S, 'NFT_ADDRESS')
  const nftDeployed = await isDeployed(nftAddr)
  if (!nftDeployed) {
    kv('NFT', nftAddr.toString())
    console.log('⛔ Контракт NFT не задеплоен (проверь сеть/адрес)')
    process.exit(1)
  }
  kv('NFT', nftAddr.toString())

  let owner
  try { owner = await readOwner(nftAddr) }
  catch (e) {
    console.log('⛔ get_nft_data не сработал (возможен не TIP‑4 айтем)')
    throw e
  }

  // Result
  section('Результаты')
  const ownerStr = owner?.toString() ?? '(пусто)'
  const mineStr = chosen.w.address.toString()
  kv('Owner', ownerStr)
  kv('My wallet', mineStr)
  const match = !!owner && ownerStr === mineStr
  console.log(match ? '✅ Сид‑кошелёк = владелец NFT' : '❌ Владелец отличается от адреса по сид‑фразе')
  hr()

  // End of human-friendly output
  process.exit(0)
})().catch(e => { console.error('⛔ Ошибка:', e?.message ?? e); process.exit(1) })
