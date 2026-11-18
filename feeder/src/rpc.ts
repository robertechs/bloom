// minimal solana json-rpc client. plain fetch, no sdk, retries on rate limits.

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface RpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export class Rpc {
  private id = 0;

  constructor(private readonly url: string) {}

  async call<T>(method: string, params: unknown[], tries = 6): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params }),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < tries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`${method}: http ${res.status}`);
      const body = (await res.json()) as RpcResponse<T>;
      if (body.error) throw new Error(`${method}: ${body.error.code} ${body.error.message}`);
      return body.result as T;
    }
  }
}

/* shapes of the two calls the feeder makes */

export interface SignatureInfo {
  signature: string;
  slot: number;
  err: unknown | null;
  blockTime: number | null;
}

export interface TxResult {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    loadedAddresses?: { writable: string[]; readonly: string[] };
  } | null;
  transaction: { message: { accountKeys: string[] } };
}
