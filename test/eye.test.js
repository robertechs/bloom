import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../api/eye.js';

const URL_ = 'https://bloom.test/api/eye';
const KEY = 'a-key-for-the-test';
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400, 7)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(100, 3)]);

const post = (body, headers = {}, key = KEY) =>
  POST(new Request(URL_, { method: 'POST', body, headers: { authorization: `Bearer ${key}`, 'content-type': 'image/jpeg', ...headers } }));
const get = (query = '') => GET(new Request(URL_ + query));

test('closed until the pi has sent something', async () => {
  const res = await get();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { open: false });
});

test('nothing gets in without the key', async () => {
  delete process.env.EYE_KEY;
  assert.equal((await post(JPEG)).status, 503);
  process.env.EYE_KEY = KEY;
  assert.equal((await post(JPEG, {}, 'not-the-key')).status, 401);
  assert.equal((await post(JPEG, {}, '')).status, 401);
  assert.deepEqual(await (await get()).json(), { open: false });
});

test('only small jpeg or webp frames are taken', async () => {
  process.env.EYE_KEY = KEY;
  assert.equal((await post('<svg/>', { 'content-type': 'image/svg+xml' })).status, 415);
  assert.equal((await post(Buffer.from('<html>hello</html>'))).status, 400);
  assert.equal((await post(Buffer.concat([JPEG, Buffer.alloc(130_000)]))).status, 413);
  assert.equal((await post(JPEG, { 'content-type': 'image/webp' })).status, 400);
  assert.deepEqual(await (await get()).json(), { open: false });
});

test('a frame goes in and comes back out with the time the site received it', async () => {
  process.env.EYE_KEY = KEY;
  const before = Date.now();
  const sent = await (await post(JPEG, { 'x-eye-moving': '2', 'x-eye-faces': '1', 'x-eye-sensor': 'left', 'x-eye-every': '30' })).json();
  assert.equal(sent.ok, true);
  assert.equal(sent.bytes, JPEG.length);

  const res = await get();
  const seen = await res.json();
  assert.equal(seen.open, true);
  assert.equal(seen.id, sent.id);
  assert.ok(seen.at >= before && seen.at <= Date.now() && seen.now >= seen.at);
  assert.deepEqual([seen.moving, seen.faces, seen.sensor, seen.every], [2, 1, 'left', 30]);
  assert.match(res.headers.get('cache-control'), /s-maxage=4/);
  assert.equal(seen.b64, undefined);
  assert.ok(seen.frame.startsWith('data:image/jpeg;base64,'));
  assert.deepEqual(Buffer.from(seen.frame.split(',')[1], 'base64'), JPEG);
});

test('the picture is left out for someone who already has that frame', async () => {
  const first = await (await get()).json();
  const again = await (await get(`?have=${first.id}`)).json();
  assert.equal(again.open, true);
  assert.equal(again.id, first.id);
  assert.equal(again.frame, undefined);
  assert.ok((await (await get('?have=someotherframe')).json()).frame);
});

test('what the sender says about the frame is cleaned up', async () => {
  process.env.EYE_KEY = KEY;
  await post(WEBP, { 'content-type': 'image/webp', 'x-eye-moving': '-4', 'x-eye-faces': '5000', 'x-eye-sensor': '<b>roof</b>', 'x-eye-every': '1', 'x-eye-at': '0' });
  const seen = await (await get()).json();
  assert.deepEqual([seen.moving, seen.faces, seen.sensor, seen.every], [0, 99, '', 5]);
  assert.ok(seen.frame.startsWith('data:image/webp;base64,'));
  assert.ok(Date.now() - seen.at < 5000);
});
