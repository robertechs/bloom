import type { TxResult } from './rpc.js';

export const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * lamports a transaction moved INTO `wallet`. outbound moves count as 0,
 * so the total only ever goes up: spending on parts never lowers what bloom was fed.
 *
 * when the wallet is the fee payer (index 0) the network fee is added back,
 * so a claim of 0.5 SOL counts as 0.5 SOL and not 0.5 minus 5000 lamports.
 */
export function inbound(tx: TxResult, wallet: string): bigint {
  const meta = tx.meta;
  if (!meta || meta.err) return 0n;
  // v0 transactions append lookup-table addresses after the static keys; balances follow the same order
  const keys = [
    ...tx.transaction.message.accountKeys,
    ...(meta.loadedAddresses?.writable ?? []),
    ...(meta.loadedAddresses?.readonly ?? []),
  ];
  const i = keys.indexOf(wallet);
  if (i < 0 || meta.preBalances[i] === undefined || meta.postBalances[i] === undefined) return 0n;
  let delta = BigInt(meta.postBalances[i]) - BigInt(meta.preBalances[i]);
  if (i === 0) delta += BigInt(meta.fee);
  return delta > 0n ? delta : 0n;
}

/** lamports to SOL, floored to 4 decimals for display */
export function toSol(lamports: bigint): number {
  return Number(lamports / 100_000n) / 10_000;
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isAddress = (s: string) => BASE58.test(s);
