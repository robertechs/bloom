// bloom's eye: the one moving part of the site that is not a static file.
//
//   POST /api/eye             the pi sends what its camera sees right now (pi/live.py), with the key
//   GET  /api/eye             what the site asks: is the eye open, and what did it last see
//   GET  /api/eye?have=<id>   the same, without the picture when the asker already has that frame
//
// only the newest frame is kept, in vercel's runtime cache, and it expires by itself:
// ten minutes after the pi stops sending, the eye reads as closed again.
// the time on a frame is the moment this function received it, never a time the sender claims.

import { createHash, timingSafeEqual } from 'node:crypto';
import { getCache } from '@vercel/functions';

const MAX_BYTES = 120_000; // one frame. pi/live.py sends far smaller ones: storage is billed per 8 kB written
const TTL = 600;           // seconds after the last frame until the eye reads as closed
const SENSORS = new Set(['left', 'front', 'right']);
const TYPES = new Set(['image/jpeg', 'image/webp']);

const store = () => getCache({ namespace: 'bloom-eye', keyHashFunction: (k) => k });
const onVercel = () => Boolean(globalThis[Symbol.for('@vercel/request-context')]?.get?.()?.cache);

const json = (body, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  });

const sha = (s) => createHash('sha256').update(s).digest();

function count(value, max, fallback = 0) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
}

function looksLike(type, bytes) {
  if (type === 'image/jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP';
}

export async function GET(request) {
  const seen = await store().get('seen');
  if (!seen || !TYPES.has(seen.type) || typeof seen.b64 !== 'string') {
    return json({ open: false }, 200, 'public, max-age=0, s-maxage=20');
  }
  const { b64, type, ...what } = seen;
  const body = { open: true, ...what, now: Date.now() };
  if (new URL(request.url).searchParams.get('have') !== seen.id) body.frame = `data:${type};base64,${b64}`;
  // a few seconds at the CDN, so a crowd watching costs one read of the store, not one each
  return json(body, 200, 'public, max-age=0, s-maxage=4');
}

export async function POST(request) {
  const key = process.env.EYE_KEY;
  if (!key) return json({ error: 'the eye is not set up: EYE_KEY is missing on the site' }, 503);

  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!given || !timingSafeEqual(sha(given), sha(key))) return json({ error: 'wrong key' }, 401);

  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TYPES.has(type)) return json({ error: 'send a jpeg or a webp' }, 415);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return json({ error: `frames are at most ${MAX_BYTES} bytes` }, 413);

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > MAX_BYTES) return json({ error: `frames are at most ${MAX_BYTES} bytes` }, 413);
  if (!looksLike(type, bytes)) return json({ error: 'that is not the image it says it is' }, 400);

  const at = Date.now();
  const id = at.toString(36) + Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  const sensor = (request.headers.get('x-eye-sensor') ?? '').toLowerCase();
  await store().set('seen', {
    id,
    at,
    every: Math.max(5, count(request.headers.get('x-eye-every'), 3600, 60)), // seconds until the next frame at the latest
    moving: count(request.headers.get('x-eye-moving'), 99),
    faces: count(request.headers.get('x-eye-faces'), 99),
    sensor: SENSORS.has(sensor) ? sensor : '',
    type,
    b64: bytes.toString('base64'),
  }, { ttl: TTL });

  return json({ ok: true, id, at, bytes: bytes.length, store: onVercel() ? 'vercel' : 'memory' });
}
