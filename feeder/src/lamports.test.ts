import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inbound, isAddress, toSol } from './lamports.js';
import type { TxResult } from './rpc.js';

const WALLET = 'BLoom1111111111111111111111111111111111111';
const OTHER = 'So11111111111111111111111111111111111111112';

const tx = (keys: string[], pre: number[], post: number[], fee = 5000, err: unknown = null): TxResult => ({
  slot: 1,
  blockTime: 0,
  meta: { err, fee, preBalances: pre, postBalances: post },
  transaction: { message: { accountKeys: keys } },
});

test('a claim paid by the wallet counts in full', () => {
  // wallet claims 0.5 SOL and pays the 5000 lamport fee itself
  assert.equal(inbound(tx([WALLET, OTHER], [1_000_000, 900_000_000], [500_995_000, 400_000_000]), WALLET), 500_000_000n);
});

test('a deposit from someone else counts', () => {
  assert.equal(inbound(tx([OTHER, WALLET], [3_000_000_000, 0], [999_995_000, 2_000_000_000]), WALLET), 2_000_000_000n);
});

test('spending counts as zero', () => {
  assert.equal(inbound(tx([WALLET, OTHER], [2_000_000_000, 0], [1_499_995_000, 500_000_000]), WALLET), 0n);
});

test('failed transactions and unrelated ones count as zero', () => {
  assert.equal(inbound(tx([OTHER, WALLET], [10, 0], [5, 5], 5000, { InstructionError: [0, 'Custom'] }), WALLET), 0n);
  assert.equal(inbound(tx([OTHER], [10], [5]), WALLET), 0n);
});

test('lookup-table addresses are matched after the static keys', () => {
  const t = tx([OTHER], [1_000_000_000, 0], [0, 999_995_000]);
  t.meta!.loadedAddresses = { writable: [WALLET], readonly: [] };
  assert.equal(inbound(t, WALLET), 999_995_000n);
});

test('display rounding and address check', () => {
  assert.equal(toSol(2_123_456_789n), 2.1234);
  assert.equal(isAddress(OTHER), true);
  assert.equal(isAddress('not-an-address'), false);
});
