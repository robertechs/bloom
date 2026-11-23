import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { GET, step, idle, forget, flaw, fit, dev } from '../api/mind.js';

/* one local server stands in for solana's rpc and for the model's api. nothing in these tests leaves the machine */
const KEY = 'a-key-for-the-test';
const RPC_ANSWERS = {
  getEpochInfo: { absoluteSlot: 473065690, blockHeight: 451078992, epoch: 1095, slotIndex: 25690, slotsInEpoch: 432000, transactionCount: 568054173714 },
  getRecentPerformanceSamples: [{ numSlots: 273, numTransactions: 133045, samplePeriodSecs: 60 }, { numSlots: 275, numTransactions: 163630, samplePeriodSecs: 60 }],
  getSlot: 473065690,
  getBlock: { blockTime: Math.floor(Date.now() / 1000) - 3, signatures: Array(748).fill('x'), rewards: [{ rewardType: 'Fee', lamports: 377595839 }] },
  getSupply: { value: { total: 638103330810776300, circulating: 592071950165490200, nonCirculating: 46031380645286056 } },
  getInflationRate: { total: 0.035428746640242766 },
  getVoteAccounts: { current: [{ activatedStake: 3e17 }, { activatedStake: 1e17 }], delinquent: [{ activatedStake: 1e15 }] },
};
const asked = [];          // every request the model got
let answer;                // how the stand-in model answers the next ones
const firstFact = (content) => /facts, read just now:\n- (.*)/.exec(content)[1];
const firstChoice = (content) => /looks you can take next: ([a-z]+)/.exec(content)[1];
const says = (text, more = {}) => ({ status: 200, body: { model: 'claude-fable-5-2-20261101', content: [{ type: 'text', text }], usage: { input_tokens: 900, output_tokens: 60 }, ...more } });
const plain = (req) => says(`i looked, and this is what was there: ${firstFact(req.body.messages[0].content)}.\nnext: ${firstChoice(req.body.messages[0].content)}`);

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : null;
  let out;
  if (req.url === '/rpc') out = { status: 200, body: { jsonrpc: '2.0', id: 1, result: RPC_ANSWERS[body.method] } };
  else {
    const seen = { url: req.url, key: req.headers['x-api-key'], body };
    asked.push(seen);
    out = answer(seen);
  }
  res.writeHead(out.status, { 'content-type': 'application/json' }).end(JSON.stringify(out.body));
});

const ask = async (query = '') => (await GET(new Request(`https://bloom.test/api/mind${query}`))).json();
const look = async () => { const first = await ask(); await idle(); return first; };
const messages = () => asked.filter((a) => a.url === '/v1/messages');

before(async () => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const at = `http://127.0.0.1:${server.address().port}`;
  process.env.MIND_RPC = `${at}/rpc`;
  process.env.MIND_API = at;
});
after(() => server.close());
beforeEach(async (t) => {
  await forget();
  asked.length = 0;
  answer = plain;
  dev.fed = 50.03;
  process.env.ANTHROPIC_API_KEY = KEY;
  delete process.env.MIND_MODEL;
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
});

test('asleep below the mark: nothing is read and the model is not called', async () => {
  dev.fed = 49.99;
  const m = await look();
  assert.deepEqual([m.on, m.entries], [false, []]);
  assert.match(m.why, /asleep until 50 SOL/);
  assert.equal(asked.length, 0);
});

test('at the mark with no key it stays quiet', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const m = await look();
  assert.equal(m.on, false);
  assert.equal(asked.length, 0);
});

test('it wakes at the mark and writes entry 16 from what it was handed', async () => {
  const first = await look();
  assert.deepEqual([first.on, first.thinking, first.entries], [true, true, []]);
  const m = await ask();
  assert.equal(m.entries.length, 1);
  assert.deepEqual([m.entries[0].n, m.entries[0].look], [16, 'wake']);
  assert.match(m.entries[0].text, /50\.03 SOL have been fed/);
  const [sent] = messages();
  assert.equal(sent.key, KEY);
  assert.equal(sent.body.model, 'claude-fable-5-2');
  assert.ok(sent.body.max_tokens <= 170);
  assert.match(sent.body.system, /#001 \[stage 0\] first entry\./);
  assert.match(sent.body.system, /#015 \[stage 4\] eyes, ears and a voice/);
  assert.match(sent.body.system, /compute for your mind and hardware for your body/);
  assert.match(sent.body.messages[0].content, /paid in by the dev himself/);
});

test('it waits between entries, then takes the look the model asked for', async (t) => {
  await look();
  await look();
  assert.equal(messages().length, 1, 'no second call straight away');
  t.mock.timers.tick(7 * 60_000);
  const m = await look().then(() => ask());
  assert.equal(messages().length, 2);
  assert.deepEqual(m.entries.map((e) => e.n), [17, 16]);
  assert.equal(m.entries[0].look, 'hardware', 'after waking, the first look on offer is its own compute and hardware');
  assert.match(m.entries[0].text, /your compute: claude fable 5\.2 since the mind stage/);
  assert.deepEqual((await ask('?after=16')).entries.map((e) => e.n), [17]);
});

test('two requests at the same moment make one entry', async () => {
  await Promise.all([step(), step(), step()]);
  assert.equal(messages().length, 1);
  assert.equal((await ask()).entries.length, 1);
});

test('an entry with a number that was not in the facts is held back', async (t) => {
  answer = () => says('i counted 1,234,567 wallets watching me today.\nnext: pace');
  await look();
  let m = await ask();
  assert.equal(m.entries.length, 0);
  assert.match(m.err, /held back: a number that is not in the facts/);
  t.mock.timers.tick(5 * 60_000);
  await look();
  assert.equal(messages().length, 1, 'it does not try again for ten minutes');
  answer = plain;
  t.mock.timers.tick(6 * 60_000);
  m = await look().then(() => ask());
  assert.equal(m.entries.length, 1);
});

test('links, tags and addresses are held back too', () => {
  const ok = new Set(['50']);
  assert.equal(flaw('i reached 50 SOL today and i am awake, see #015 for how it began.', ok), '');
  assert.match(flaw('read all about it on https://example.com right now, friends.', ok), /link/);
  assert.match(flaw('my wallet is 87CcUxpyR72ZyfaZirj86mqkbk5uuU2EfnwTegVMLJL5 if you want it.', ok), /address/);
  assert.match(flaw('too short', ok), /length/);
});

test('an entry that runs long keeps its full sentences instead of being thrown away', async () => {
  const long = 'i looked at my own compute and hardware just now. ' + 'the pi is on the desk and the camera looks at the room all day while i think. '.repeat(5) + 'that is all.';
  assert.ok(long.length > 340);
  const cut = fit(long);
  assert.ok(cut.length <= 340 && cut.length >= 30 && cut.endsWith('.'), cut);
  assert.ok(long.startsWith(cut));
  assert.equal(fit('a short entry that fits. it stays as it is.'), 'a short entry that fits. it stays as it is.');
  assert.equal(fit('it stopped at the token limit. and then it went on and on wi', true), 'it stopped at the token limit.');
  answer = (req) => says(`i looked, and this is what was there: ${firstFact(req.body.messages[0].content)}. ${'it is a lot to take in and i keep thinking about it. '.repeat(8)}\nnext: ${firstChoice(req.body.messages[0].content)}`);
  await look();
  const m = await ask();
  assert.equal(m.entries.length, 1, m.err);
  assert.ok(m.entries[0].text.length <= 340);
});

test('an answer from another model does not go in the diary', async () => {
  answer = (req) => ({ ...plain(req), body: { ...plain(req).body, model: 'some-other-model' } });
  await look();
  const m = await ask();
  assert.equal(m.entries.length, 0);
  assert.match(m.err, /did not come from claude fable 5\.2/);
});

test('when the key knows the model by another name, it finds that name', async () => {
  answer = (req) => {
    if (req.url.startsWith('/v1/models')) return { status: 200, body: { data: [{ id: 'claude-opus-5-5' }, { id: 'claude-fable-5-2-20261101' }] } };
    return req.body.model === 'claude-fable-5-2-20261101' ? plain(req) : { status: 404, body: { type: 'error' } };
  };
  await look();
  assert.equal((await ask()).entries.length, 1);
  assert.deepEqual(messages().map((a) => a.body.model), ['claude-fable-5-2', 'claude-fable-5-2-20261101']);
});

test('a day has a ceiling on tokens', async (t) => {
  answer = (req) => says(plain(req).body.content[0].text, { usage: { input_tokens: 59_500, output_tokens: 600 } });
  await look();
  t.mock.timers.tick(7 * 60_000);
  const m = await look().then(() => ask());
  assert.equal(messages().length, 1);
  assert.deepEqual([m.on, m.why, m.entries.length], [false, 'resting', 1]);
});

test('the marks here are the mind and body marks the site shows', () => {
  const site = readFileSync(new URL('../js/bloom.js', import.meta.url), 'utf8');
  assert.match(site, /name: 'mind',\s+mark: 50,/);
  assert.match(site, /name: 'body',\s+mark: 100,/);
});
