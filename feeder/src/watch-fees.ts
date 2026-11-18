// bloom feeder: sums every lamport that reached the fee wallet and writes data/bloom.json,
// which the site reads on load. runs from the github action every 15 minutes, or by hand:
//
//   FEE_WALLET=<address> CONTRACT=<mint> npm run sync
//
// env
//   FEE_WALLET  the wallet creator fees are claimed into (required)
//   CONTRACT    the token mint, shown on the site once set (optional)
//   RPC_URL     a solana rpc endpoint (optional, defaults to the public mainnet one)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Rpc, sleep, type SignatureInfo, type TxResult } from './rpc.js';
import { inbound, isAddress, toSol } from './lamports.js';

interface BloomData {
  balance: number; // SOL fed, what the site shows
  lamports: string; // the exact total, as a string so it survives json
  contract: string;
  wallet: string;
  cursor: string | null; // newest signature already counted
  updated: string | null; // when the numbers last changed
}

const DATA_FILE = fileURLToPath(new URL('../../data/bloom.json', import.meta.url));
const PAGE = 1000;

const wallet = (process.env.FEE_WALLET ?? '').trim();
const contract = (process.env.CONTRACT ?? '').trim();
const rpc = new Rpc((process.env.RPC_URL ?? '').trim() || 'https://api.mainnet-beta.solana.com');

async function load(): Promise<BloomData> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as BloomData;
  } catch {
    return { balance: 0, lamports: '0', contract: '', wallet: '', cursor: null, updated: null };
  }
}

/** every signature newer than `until`, oldest first */
async function signaturesSince(until: string | null): Promise<SignatureInfo[]> {
  const all: SignatureInfo[] = [];
  let before: string | undefined;
  for (;;) {
    const page = await rpc.call<SignatureInfo[]>('getSignaturesForAddress', [
      wallet,
      { limit: PAGE, before, until: until ?? undefined, commitment: 'finalized' },
    ]);
    all.push(...page);
    if (page.length < PAGE) break;
    before = page[page.length - 1]!.signature;
  }
  return all.reverse();
}

async function main() {
  if (!isAddress(wallet)) throw new Error('FEE_WALLET is missing or not a solana address');
  if (contract && !isAddress(contract)) throw new Error('CONTRACT is not a solana address');

  const prev = await load();
  const data: BloomData = { ...prev };
  if (data.wallet !== wallet) {
    // new or changed fee wallet: count it from the start
    Object.assign(data, { wallet, lamports: '0', cursor: null });
  }

  const sigs = await signaturesSince(data.cursor);
  let total = BigInt(data.lamports);
  for (const s of sigs) {
    if (!s.err) {
      const tx = await rpc.call<TxResult | null>('getTransaction', [
        s.signature,
        { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'finalized' },
      ]);
      if (!tx) break; // not served yet; pick it up next run
      const got = inbound(tx, wallet);
      if (got > 0n) {
        total += got;
        console.log(`+${toSol(got)} SOL  ${s.signature}`);
      }
      await sleep(120);
    }
    data.cursor = s.signature;
  }

  data.lamports = total.toString();
  data.balance = toSol(total);
  if (contract) data.contract = contract;

  const keys = ['balance', 'lamports', 'contract', 'wallet', 'cursor'] as const;
  if (keys.some((k) => data[k] !== prev[k])) {
    data.updated = new Date().toISOString();
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`fed ${data.balance} SOL (${sigs.length} new transactions)`);
  } else {
    console.log(`no change, fed ${data.balance} SOL`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
