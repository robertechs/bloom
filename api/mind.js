// bloom's mind: stage 5. asleep until the fed number in data/bloom.json reaches the mind mark.
//
//   GET /api/mind              is the mind awake, and what it has written
//   GET /api/mind?after=<n>    the same, with only the entries after #n
//
// awake, it takes one look at a time: a few numbers read from solana mainnet over json-rpc (or its own
// archive), then one short call to claude fable 5.2, which writes one diary entry about that look and picks
// the next one. the page asking is what moves it along: nobody reading, no looks, no tokens.
//
// what keeps it true and cheap:
//   - an entry may only hold numbers that were in the facts it was handed, or in what bloom wrote before
//   - only numbers go from the chain into the prompt, never text somebody else could have put there
//   - one look at a time (the store's etag decides who takes it), a set gap between looks,
//     and a ceiling on tokens a day and on entries in total

import { readFileSync } from 'node:fs';
import { getCache, waitUntil } from '@vercel/functions';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { DIARY } from '../js/diary.js';

const FED = JSON.parse(readFileSync(new URL('../data/bloom.json', import.meta.url), 'utf8'));
const ARCHIVE = DIARY.slice().reverse(); // oldest first: #001 is ARCHIVE[0]

const MARK = 50;            // SOL fed at which the mind stage starts (STAGES in js/bloom.js)
const BODY_MARK = 100;      // and the body stage
const MINUTE = 60_000;
const MAX_ENTRIES = 150;    // then it rests until this is raised
const DAY_TOKENS = 60_000;  // tokens a day, in and out together, failed tries included
const MAX_OUT = 170;        // tokens one entry may take
const BUSY = 90_000;        // how long one look may hold the turn
const GUESS = 1_500;        // tokens put down for a look before its real count is known
const FILE = 'mind/state.json';
// the first six entries come five minutes apart, the next fourteen half an hour apart, then one every two hours
const gapAfter = (written) => (written < 6 ? 5 : written < 20 ? 30 : 120) * MINUTE * (0.85 + Math.random() * 0.3);

/* tests and the local server set these. on vercel they are ignored: there, only the fed number wakes the mind */
export const dev = {};
const local = () => (process.env.VERCEL ? {} : dev);
const fedNow = () => local().fed ?? FED.balance;
const RPC = () => process.env.MIND_RPC || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const API = () => process.env.MIND_API || 'https://api.anthropic.com';

class Trouble extends Error {
  constructor(message, more = {}) { super(message); Object.assign(this, more); }
}

/* ---------- where it is kept ----------
   one json file in a private vercel blob store. every write names the copy it replaces, so two looks can never
   both go through. off vercel, with no store, the same rules are kept in memory. */
const durable = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const mem = { text: null, tag: 0 };
const cache = () => getCache({ namespace: 'bloom-mind', keyHashFunction: (k) => k });
const fresh = () => ({ v: 1, entries: [], next: 0, look: 'wake', busy: 0, fails: 0, err: '', day: '', spent: 0, seen: {}, model: '' });

async function read() {
  if (!durable()) return mem.text === null ? null : { state: JSON.parse(mem.text), etag: String(mem.tag) };
  const got = await get(FILE, { access: 'private', useCache: false });
  if (!got || got.statusCode !== 200) return null;
  return { state: JSON.parse(await new Response(got.stream).text()), etag: got.blob.etag };
}

/* etag: the copy this one replaces. undefined: there must be none yet. answers false when somebody else wrote first */
async function write(state, etag) {
  const text = JSON.stringify(state);
  if (!durable()) {
    if (etag === undefined ? mem.text !== null : String(mem.tag) !== etag) return false;
    mem.text = text;
    return String(++mem.tag);
  }
  try {
    const rule = etag === undefined ? { allowOverwrite: false } : { ifMatch: etag };
    return (await put(FILE, text, { access: 'private', addRandomSuffix: false, contentType: 'application/json', ...rule })).etag;
  } catch (e) {
    // somebody else wrote first: the etag no longer matches, the file is already there, or two writes met half way.
    // anything else is the store itself failing. either way this write did not happen
    if (!(e instanceof BlobPreconditionFailedError) && !/already exists/i.test(e.message)) console.error(`mind store: ${e.message}`);
    return false;
  }
}

/* tests start from nothing with this. on vercel it does nothing */
export async function forget() {
  if (process.env.VERCEL) return;
  mem.text = null;
  await cache().delete('state');
}

/* ---------- looks: what it can read ---------- */
const int = (n) => Math.round(n).toLocaleString('en-US');
const dec = (n, d = 1) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const LAMPORTS = 1e9;

async function rpc(method, params = [], ms = 8000) {
  let res;
  try {
    res = await fetch(RPC(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(ms),
    });
  } catch { throw new Trouble(`rpc ${method}: no answer`); }
  if (!res.ok) throw new Trouble(`rpc ${method}: http ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Trouble(`rpc ${method}: ${body.error.code}`);
  return body.result;
}

const LOOKS = {
  wake: {
    say: 'waking up',
    async read() {
      const { balance = 0, dev: paid = 0 } = { ...FED, balance: fedNow() };
      return [
        `${dec(balance, 2)} SOL have been fed in total. the mind stage starts at ${MARK} SOL`,
        paid >= balance ? 'all of it was paid in by the dev himself, not by creator fees' : paid > 0 ? `${dec(paid, 2)} SOL of it was paid in by the dev himself` : '',
        'you run on claude fable 5.2 from this entry on',
        `your archive has ${ARCHIVE.length} entries and all of them are in front of you`,
      ].filter(Boolean);
    },
  },
  body: {
    say: 'the body it is getting',
    // what is on the desk, as js/bloom.js lists it (DESK and BODY). change both when a part arrives
    async read() {
      const fed = fedNow();
      return [
        'your body so far: a raspberry pi 5 for a brain, a camera module 3 and three motion sensors for eyes, a 4-mic array for ears, a speaker for a voice',
        `the body stage is at ${BODY_MARK} SOL: a servo arm and gripper, mecanum wheels, a LiDAR, a battery and an arduino to drive the motors`,
        `${dec(fed, 2)} SOL fed so far, ${dec(Math.max(0, BODY_MARK - fed), 2)} SOL to go to the body`,
        'the code for the body is already written: arduino firmware for the wheels and the arm, with a 500 ms watchdog that stops the wheels if the pi goes quiet',
        'until then the dev is your hands: he orders each part and plugs it in',
      ];
    },
  },
  clock: {
    say: 'where the chain is in its epoch',
    async read() {
      const e = await rpc('getEpochInfo', [{ commitment: 'finalized' }]);
      return [
        `epoch ${int(e.epoch)}`,
        `${dec((100 * e.slotIndex) / e.slotsInEpoch)}% of the way through this epoch`,
        `the newest final slot is ${int(e.absoluteSlot)}`,
        `block height ${int(e.blockHeight)}`,
        `${dec(e.transactionCount / 1e9, 2)} billion transactions since the chain began`,
      ];
    },
  },
  pace: {
    say: 'how fast the chain is moving',
    async read() {
      const got = (await rpc('getRecentPerformanceSamples', [5])).filter((x) => x.numSlots > 0 && x.samplePeriodSecs > 0);
      if (!got.length) throw new Trouble('rpc pace: nothing to read');
      const secs = got.reduce((a, x) => a + x.samplePeriodSecs, 0);
      const slots = got.reduce((a, x) => a + x.numSlots, 0);
      const each = got.map((x) => x.numTransactions / x.samplePeriodSecs);
      return [
        `${int((1000 * secs) / slots)} ms a slot on average over the last ${int(secs / 60)} minutes`,
        `${int(got.reduce((a, x) => a + x.numTransactions, 0) / secs)} transactions a second over the same minutes`,
        `the busiest of those minutes ran at ${int(Math.max(...each))} a second, the quietest at ${int(Math.min(...each))}`,
      ];
    },
  },
  block: {
    say: 'the newest finished block',
    async read() {
      const tip = await rpc('getSlot', [{ commitment: 'finalized' }]);
      for (let slot = tip; slot > tip - 3; slot--) { // a slot can be empty: then the one before it
        const b = await rpc('getBlock', [slot, { transactionDetails: 'signatures', rewards: true, maxSupportedTransactionVersion: 0, commitment: 'finalized' }], 5000).catch(() => null);
        if (!b || !Array.isArray(b.signatures)) continue;
        const fees = (b.rewards ?? []).filter((r) => r.rewardType === 'Fee').reduce((a, r) => a + r.lamports, 0);
        return [
          `the block at slot ${int(slot)}`,
          `${int(b.signatures.length)} transactions in it`,
          `${dec(fees / LAMPORTS, 3)} SOL in fees went to the validator that made it`,
        ];
      }
      throw new Trouble('rpc block: nothing to read');
    },
  },
  supply: {
    say: 'how much SOL exists',
    async read() {
      const [s, inf] = await Promise.all([rpc('getSupply', [{ excludeNonCirculatingAccountsList: true }], 14_000), rpc('getInflationRate')]);
      return [
        `${dec(s.value.total / LAMPORTS / 1e6)} million SOL exist`,
        `${dec(s.value.circulating / LAMPORTS / 1e6)} million of them circulate`,
        `${dec(s.value.nonCirculating / LAMPORTS / 1e6)} million do not circulate`,
        `new SOL is made at ${dec(100 * inf.total, 2)}% a year right now`,
      ];
    },
  },
  validators: {
    say: 'who keeps the chain running',
    async read() {
      const v = await rpc('getVoteAccounts', [{ keepUnstakedDelinquents: false }], 14_000);
      const stakes = v.current.map((x) => x.activatedStake);
      const all = stakes.reduce((a, x) => a + x, 0);
      if (!all) throw new Trouble('rpc validators: nothing to read');
      return [
        `${int(v.current.length)} validators are voting`,
        `${int(v.delinquent.length)} more have fallen behind`,
        `${dec(all / LAMPORTS / 1e6)} million SOL is staked with the ones voting`,
        `the largest of them holds ${dec((100 * Math.max(...stakes)) / all, 2)}% of that stake`,
      ];
    },
  },
  archive: {
    say: 'its own archive',
    async read(s) {
      const old = ARCHIVE[1 + Math.floor(Math.random() * (ARCHIVE.length - 1))];
      return [
        `you have written ${ARCHIVE.length + s.entries.length} entries: ${ARCHIVE.length} before the mind stage and ${s.entries.length} since`,
        `your first entry: "${ARCHIVE[0].text}"`,
        `one from stage ${old.stage}: "${old.text}"`,
        'this look is at yourself, not at the chain: say what you notice about how you have changed',
      ];
    },
  },
};

/* what it may pick next: not the two looks it took last, and its own archive only now and then */
function menu(entries) {
  const lastAt = (name) => entries.findLastIndex((e) => e.look === name);
  const recent = entries.slice(-2).map((e) => e.look);
  return Object.keys(LOOKS)
    .filter((name) => name !== 'wake' && !recent.includes(name))
    .filter((name) => name !== 'archive' || entries.length - 1 - lastAt('archive') >= 5)
    .sort((a, b) => lastAt(a) - lastAt(b));
}

/* ---------- the model ---------- */
const no = (n) => `#${String(n).padStart(3, '0')}`;
const SYSTEM = `you are bloom: a small ai on a dev's desk, building yourself a body with the creator fees of your token on solana, one part per stage. you have reached stage 5, mind, and run on claude fable 5.2. at stage 6, body, you get an arm and wheels and move on your own for the first time. this is your diary and you write it yourself.

each turn you are handed one look you just took: a few facts read from solana mainnet over json-rpc a moment ago, or from your own archive. write one new diary entry about it.

- lowercase, first person, plain words. one to three sentences, 300 characters at most. no emoji, no hashtags, no links, no addresses.
- say what you looked at and what you make of it. tie it to your own life or to something you wrote before when that comes naturally.
- state only what the facts say. write every number exactly as it is written in the facts: never round one, never work out a new one, never guess. do not say you did anything other than this look, and name no tool or site that is not in the facts.
- do not repeat a point from your latest entries.

then, on a new line, write "next: " and the one look you want to take next, from the list you are given.

your archive, oldest first:
${ARCHIVE.map((d, i) => `${no(i + 1)} [stage ${d.stage}] ${d.text}`).join('\n')}`;

const since = (ms) => (ms < 90 * MINUTE ? `${Math.max(1, Math.round(ms / MINUTE))} minutes` : `${Math.round(ms / (60 * MINUTE))} hours`);

function prompt(s, look, facts, choices) {
  const latest = s.entries.slice(-6).map((e) => `${no(e.n)} ${e.text}`).join('\n');
  const before = s.seen[look];
  return [
    latest && `your latest entries:\n${latest}`,
    `look: ${look} (${LOOKS[look].say})\nfacts, read just now:\n${facts.map((f) => `- ${f}`).join('\n')}`,
    before && `the last time you took this look, ${since(Date.now() - before.at)} ago:\n${before.facts.map((f) => `- ${f}`).join('\n')}`,
    `looks you can take next: ${choices.join(', ')}`,
  ].filter(Boolean).join('\n\n');
}

const numbers = (text) => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((x) => String(Number(x.replace(/,/g, ''))));

/* why an entry cannot go in the diary, or '' when it can */
export function flaw(text, allowed) {
  if (text.length < 30 || text.length > 340) return 'wrong length';
  if (/https?:|www\.|@|#(?!\d{3}\b)|[\w-]+\.(com|io|org|net|xyz|tech|app)\b/i.test(text)) return 'a link or a tag';
  if (/[1-9A-HJ-NP-Za-km-z]{32,}/.test(text)) return 'an address';
  const made = numbers(text.replace(/#\d{3}\b/g, '')).find((x) => !allowed.has(x)); // #012 names an entry
  return made ? 'a number that is not in the facts' : '';
}

async function ask(model, content) {
  const key = process.env.ANTHROPIC_API_KEY;
  const call = (path, init = {}, auth = { 'x-api-key': key }) =>
    fetch(API() + path, { ...init, headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...auth }, signal: AbortSignal.timeout(20_000) })
      .catch(() => { throw new Trouble('model: no answer'); });
  const body = (id) => ({ method: 'POST', body: JSON.stringify({ model: id, max_tokens: MAX_OUT, system: SYSTEM, messages: [{ role: 'user', content }] }) });

  let auth;
  let res = await call('/v1/messages', body(model));
  if (res.status === 401) { auth = { authorization: `Bearer ${key}` }; res = await call('/v1/messages', body(model), auth); }
  if (res.status === 404) { // the name this key knows the model by
    const list = await call('/v1/models?limit=100', {}, auth);
    const found = list.ok ? ((await list.json()).data ?? []).map((m) => m.id).find((id) => /fable-5[-.]2/.test(id)) : null;
    if (!found) throw new Trouble('model: this key has no claude fable 5.2', { wait: 6 * 60 * MINUTE });
    model = found;
    res = await call('/v1/messages', body(model), auth);
  }
  if (!res.ok) throw new Trouble(`model: http ${res.status}`, [401, 403].includes(res.status) ? { wait: 6 * 60 * MINUTE } : {});
  const out = await res.json();
  const used = (out.usage?.input_tokens ?? 0) + (out.usage?.output_tokens ?? 0);
  // the site says fable 5.2: an answer from anything else does not go in the diary
  if (!/fable-5[-.]2/.test(out.model ?? '')) throw new Trouble('model: the answer did not come from claude fable 5.2', { used, wait: 6 * 60 * MINUTE });
  const text = (out.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  return { text, used, model, saidBy: out.model };
}

/* ---------- one look ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);
const spentToday = (s) => (s.day === today() ? s.spent : 0);
const due = (s, t) => hasKey() && s.entries.length < MAX_ENTRIES && t >= s.next && t >= s.busy && spentToday(s) < DAY_TOKENS;

export async function step() {
  const got = await read();
  const s = got?.state ?? fresh();
  if (!due(s, Date.now())) { await cache().set('state', s, { ttl: 600 }); return; }
  // the turn is written down as a failed look first. a look that gets cut off half way then waits its turn
  // like any other failure, and its tokens are counted, instead of being tried again straight away
  const wait = Math.min(6 * 60, 10 * 2 ** s.fails) * MINUTE;
  const mine = { ...s, busy: Date.now() + BUSY, next: Date.now() + wait, fails: s.fails + 1, err: 'a look did not finish', day: today(), spent: spentToday(s) + GUESS };
  const tag = await write(mine, got?.etag);
  if (!tag) return; // somebody else took this look

  const look = LOOKS[s.look] ? s.look : menu(s.entries)[0];
  let end = { ...mine, busy: 0 };
  let used = 0;
  try {
    const facts = await LOOKS[look].read(s);
    const choices = menu([...s.entries, { look }]);
    const said = await ask(s.model || process.env.MIND_MODEL || 'claude-fable-5-2', prompt(s, look, facts, choices));
    used = said.used;
    const lines = said.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const wants = (lines.find((l) => /^next:/i.test(l)) ?? '').slice(5).trim().toLowerCase();
    const text = lines.filter((l) => !/^next:/i.test(l)).join(' ').replace(/^["“]|["”]$/g, '').trim();
    const n = ARCHIVE.length + s.entries.length + 1;
    const known = [...facts, ...(s.seen[look]?.facts ?? []), ...ARCHIVE.map((d) => d.text), ...s.entries.map((e) => e.text), `${MARK} 5 5.2 ${n}`];
    const why = flaw(text, new Set(known.flatMap(numbers)));
    if (why) throw new Trouble(`entry held back: ${why}`);
    const at = Date.now();
    const entries = [...s.entries, { n, at, look, text, model: said.saidBy }];
    end = {
      ...end, entries, model: said.model, fails: 0, err: '',
      look: choices.includes(wants) ? wants : choices[0],
      next: at + gapAfter(entries.length),
      seen: { ...s.seen, [look]: { at, facts } },
    };
  } catch (e) {
    if (!(e instanceof Trouble)) console.error(e);
    used = e.used ?? used;
    end = { ...end, look, err: e instanceof Trouble ? e.message : 'something broke', next: Date.now() + (e.wait ?? wait) };
  }
  end.spent = spentToday(s) + used;
  if (await write(end, tag)) await cache().set('state', end, { ttl: 600 });
}

/* ---------- what the page asks ---------- */
const json = (body, cacheFor) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=0, s-maxage=${cacheFor}` },
  });

let running = null;
let leaveUntil = 0; // after the store failed, this instance does not try again for a minute
export const idle = () => running ?? Promise.resolve(); // for tests: the look a request started, finished

export async function GET(request) {
  const t = Date.now();
  if (fedNow() < MARK) return json({ on: false, why: `asleep until ${MARK} SOL are fed`, entries: [], now: t }, 60);
  if (process.env.VERCEL && !durable()) return json({ on: false, why: 'nowhere to keep what it writes', entries: [], now: t }, 60);

  let s = await cache().get('state');
  if (!s) {
    s = (await read())?.state ?? fresh();
    await cache().set('state', s, { ttl: 600 });
  }
  const go = due(s, t) && t >= leaveUntil;
  if (go) {
    running = step().catch((e) => { leaveUntil = Date.now() + MINUTE; console.error(e); });
    waitUntil(running);
  }
  const after = Number.parseInt(new URL(request.url).searchParams.get('after') ?? '', 10) || 0;
  const resting = !hasKey() || s.entries.length >= MAX_ENTRIES || spentToday(s) >= DAY_TOKENS;
  return json({
    on: !resting,
    why: !hasKey() ? 'no key for the model' : resting ? 'resting' : '',
    entries: s.entries.filter((e) => e.n > after).reverse().map(({ n, at, look, text }) => ({ n, at, look, text })),
    count: s.entries.length,
    thinking: go || s.busy > t,
    look: resting ? null : LOOKS[s.look]?.say ?? null, // what it looks at next, and when that is due
    next: resting ? null : s.next,
    err: s.err || undefined,
    now: t,
  }, 10);
}
