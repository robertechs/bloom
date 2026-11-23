(async () => {
'use strict';

/* =====================================================================
   bloom, as it is right now. Edit these to update the site.
   ===================================================================== */
const BLOOM = {
  balance: 0,     // SOL in creator fees fed to it so far
  contract: '',   // the token's contract address; while empty the site shows "token not live yet"
  dev: 0,         // part of balance the dev paid in himself, shown as "paid by dev"
  cam: '',        // the desk cam loop; set to a file under media/deskcam/ to bring the desk view back with the eye switch
  camPoster: '',  // first frame of the desk loop
  eye: '/api/eye',  // where the pi's own camera reports (pi/live.py). its frames are the "eye" view of bloom.cam while they arrive; '' turns it off
  eyePreview: 'media/eyecam/eye-preview-720.mp4',      // a made three-minute loop of the view from the camera's spot, captioned "preview" on the page until the pi sends. '' once the camera runs
  eyePreviewPoster: 'media/eyecam/eye-preview-poster.jpg',
  mind: '/api/mind',  // where bloom's own entries come from once it reaches the mind stage (api/mind.js). '' turns the ask off
  x: 'https://x.com/ImShantip'
};

/* live numbers: feeder/ reads the fee wallet on-chain and writes data/bloom.json.
   when that file is there, its balance and contract win over the defaults above. */
try {
  const r = await fetch('data/bloom.json', { cache: 'no-store' });
  if (r.ok) {
    const d = await r.json();
    if (typeof d.balance === 'number' && d.balance >= 0) BLOOM.balance = d.balance;
    if (typeof d.contract === 'string' && d.contract) BLOOM.contract = d.contract;
    if (typeof d.dev === 'number' && d.dev > 0) BLOOM.dev = d.dev;
  }
} catch (e) { /* offline or file:// - keep the defaults */ }

/* each purchase: [item, what it does, price, status]  status: 'here' | 'way' | '' */
const STAGES = [
  { name: 'seed',  mark: 0,   became: 'Smallest model available. Barely any memory. A sentence or two at most.', buys: [] },
  { name: 'awake', mark: 2,   became: 'A bigger model. Longer thoughts. Remembers the last week. Can browse the internet.', buys: [
    ['Model upgrade', 'smallest model to Gemini Robotics-ER 2, built to be a robot\'s brain', '', 'here'],
    ['Extended memory', '1 day to 7 days of context', '', 'here'],
    ['Internet access', 'can browse and search', '', 'here']]},
  { name: 'home',  mark: 5,   became: 'Gets its own hardware. Lives outside the browser for good. Memory is permanent.', buys: [
    ['Raspberry Pi 5, 8GB', 'its first real body', '$80', 'here'],
    ['NVMe SSD', 'permanent storage, memory that lasts', '$25', ''],
    ['Power supply and case', 'always on', '$20', '']]},
  { name: 'eyes',  mark: 10,  became: 'Gets a camera. It can see the room it lives in. The first photo gets posted.', buys: [
    ['Pi Camera Module 3', 'wide angle, 12MP', '$35', 'here'],
    ['A small display', 'for expressions', '$30', ''],
    ['OpenCV and a vision model', 'object recognition and scene understanding', '', 'here']]},
  { name: 'voice', mark: 20,  became: 'Gets a mic and a speaker. It can hear and talk out loud. The first voice clip gets posted.', buys: [
    ['USB mic array, 4 mics', 'always listening, knows which way sound comes from', '$15', 'here'],
    ['Speaker', 'it can speak', '$20', 'here'],
    ['ElevenLabs', 'its own voice', '$22/mo', 'here'],
    ['Whisper', 'speech recognition, runs local', '', 'here']]},
  { name: 'mind',  mark: 50,  became: 'Moves onto a top-tier model. Long, deep thoughts. Remembers its whole life.', buys: [
    ['Claude Fable 5.2', 'the most capable model available', '', ''],
    ['Full memory', 'everything it has ever written', '', ''],
    ['Self-reflection', 'it can read and analyze its own archive', '', '']]},
  { name: 'body',  mark: 100, became: 'Servos, hands, wheels. It keeps growing. Open-ended.', buys: [
    ['Servo kit', 'an arm or gripper', '$45', ''],
    ['Mecanum wheels', 'omnidirectional movement', '$60', ''],
    ['LiDAR', 'spatial awareness', '$100', ''],
    ['Battery and UPS', 'mobile and untethered', '$40', ''],
    ['Arduino kit', 'motor control and sensors', '$35', '']]}
];

/* what is already on the desk */
const DESK = [
  { item: 'Raspberry Pi 5', note: 'its first real body', status: 'here', when: 'nov 15', stage: 2 },
  { item: 'Cooling fan', note: 'keeps the pi cool', status: 'here', when: 'nov 15', stage: null },
  { item: 'A second board', note: 'came with the pi', status: 'here', when: 'nov 15', stage: null },
  { item: 'Raspberry Pi Camera Module 3', note: 'its eyes', status: 'here', when: 'nov 18', stage: 3 },
  { item: 'CSI ribbon cable, 22-pin to 15-pin, 50 cm', note: 'camera to pi 5', status: 'here', when: 'nov 18', stage: 3 },
  { item: 'HC-SR501 PIR motion sensors, 3 pcs', note: 'motion sensing, on GPIO', status: 'here', when: 'nov 18', stage: null },
  { item: 'Circular mic array, 4 mics, USB-C', note: 'its ears, cleans the sound and finds where it comes from', status: 'here', when: 'nov 21', stage: 4 },
  { item: 'Mini speaker, 3.5 mm', note: 'its voice', status: 'here', when: 'nov 21', stage: 4 }
];

/* newest first. the entries up to the mind stage are in js/diary.js, which api/mind.js reads too */
const DIARY = (await import('./diary.js')).DIARY.slice();

/* ---------- derived ---------- */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => String(Math.round(n * 100) / 100);
const feeStage = STAGES.reduce((acc, s, i) => (BLOOM.balance >= s.mark ? i : acc), 0);
/* parts the dev already bought count too: bloom sits at the highest stage whose hardware is on the desk.
   `fed` stays creator fees only, so the site shows both: the stage, and that it was paid by dev. */
const builtStage = DESK.reduce((acc, d) => (d.status === 'here' && d.stage !== null ? Math.max(acc, d.stage) : acc), 0);
const now = Math.max(feeStage, builtStage);
const devSol = Math.min(BLOOM.dev || 0, BLOOM.balance);
const fromDev = devSol > 0;
const devStage = STAGES.reduce((acc, s, i) => (devSol >= s.mark ? i : acc), 0);
const paidByDev = fromDev || builtStage > feeStage;
const lastDevStage = Math.max(devStage, builtStage > feeStage ? builtStage : 0);
const DEV_TAG = '<span class="st st-dev">paid by dev</span>';
const cur = STAGES[now], next = STAGES[now + 1] || null;
const progress = next ? Math.min(1, Math.max(0, (BLOOM.balance - cur.mark) / (next.mark - cur.mark))) : 1;
const toGo = next ? Math.max(0, next.mark - BLOOM.balance) : 0;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS = { here: '<span class="st st-here">in hand</span>', way: '<span class="st st-way">on the way</span>', funded: '<span class="st st-fund">funded</span>' };

const OPEN = [0, .24, .44, .62, .78, .94, 1];
function glyph(stage) {
  const o = OPEN[stage];
  if (o < .1) {
    return '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path class="stalk" d="M12 17.6v4"/>' +
      '<path class="pe" d="M12 3.6c3.1 2.7 4.5 5.6 4.5 8.7a4.5 4.5 0 0 1-9 0c0-3.1 1.4-6 4.5-8.7z"/>' +
      '<path class="seam" d="M12 7.2c-1 2.4-1 5.4 0 8.6"/></svg>';
  }
  const petal = (rot, s, cls) => {
    const L = (4.2 + 6 * o) * s, W = (2.5 + 3.3 * o) * s, f = v => v.toFixed(2);
    return `<path class="${cls}" transform="rotate(${rot} 12 12)" d="M12 12C${f(12 + W)} ${f(12 - L * .34)} ${f(12 + W)} ${f(12 - L * .9)} ${f(12 + W * .44)} ${f(12 - L)}L12 ${f(12 - L * .85)}L${f(12 - W * .44)} ${f(12 - L)}C${f(12 - W)} ${f(12 - L * .9)} ${f(12 - W)} ${f(12 - L * .34)} 12 12Z"/>`;
  };
  let p = '';
  for (let i = 0; i < 5; i++) p += petal(i * 72, 1, 'pe');
  if (stage >= 5) for (let i = 0; i < 5; i++) p += petal(i * 72 + 36, .62, 'pe2');
  const core = o > .3 ? `<circle class="core" cx="12" cy="12" r="${(0.7 + 1.5 * o).toFixed(2)}"/>` : '';
  return `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${p}${core}</svg>`;
}

/* ---------- header, status ---------- */
$$('[data-glyph-current]').forEach(el => { el.outerHTML = glyph(now); });
$('[data-acct-stage]').innerHTML = `<b>${now}</b> · ${cur.name}${paidByDev ? ' <span class="st st-dev">paid by dev</span>' : ''}`;
$('[data-acct-fed]').innerHTML = `<b>${fmt(BLOOM.balance)}</b> SOL${fromDev ? ` ${DEV_TAG}` : ''}`;
$('[data-acct-next]').textContent = next ? `${next.name} @ ${fmt(next.mark)} SOL` : 'open-ended';
$('[data-acct-ca]').textContent = BLOOM.contract ? `${BLOOM.contract.slice(0, 4)}…${BLOOM.contract.slice(-4)}` : 'token not live yet';
$('[data-now-meta]').textContent = `stage ${now} · ${cur.name}`;

$('[data-st-stage]').innerHTML = `${glyph(now)} ${now} · ${cur.name}${paidByDev ? ' <span class="st st-dev">paid by dev</span>' : ''}`;
$('[data-st-fed]').innerHTML = fromDev
  ? `${fmt(BLOOM.balance)} SOL · ${devSol >= BLOOM.balance ? 'paid by dev' : `${fmt(devSol)} paid by dev`}`
  : `${fmt(BLOOM.balance)} SOL${paidByDev ? ' in creator fees' : ''}`;
$('[data-st-next]').innerHTML = next ? `${next.name} at <span class="mono">${fmt(next.mark)} SOL</span>` : 'it keeps growing';
const toBuy = cur.buys.filter(b => b[3] !== 'here').map(b => b[0]);
if (fromDev && toBuy.length) $('[data-st-became]').textContent = `${fmt(devSol)} SOL in, paid by dev. ${cur.name} parts to buy: ${toBuy.join(', ').toLowerCase()}.`;
else if (paidByDev && !fromDev) $('[data-st-became]').innerHTML = `hardware through ${cur.name} is in, paid by dev ahead of the fees. parts are on <a href="#desk">the desk</a>.`;
else $('[data-st-became]').textContent = cur.became;
const cells = 20, filled = Math.round(progress * cells);
$('[data-ascii]').textContent = `${cur.name} [${'█'.repeat(filled)}${'░'.repeat(cells - filled)}] ${next ? next.name : ''}`;
$('[data-st-note]').innerHTML = next
  ? `<b class="mono">${fmt(toGo)} SOL</b>${paidByDev && !fromDev ? ' in fees' : ''} to ${next.name}`
  : 'past body. still growing.';

const here = DESK.filter(d => d.status === 'here').length, way = DESK.length - here;

/* contract address */
const COPY = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.2"/><path d="M10.5 3V1.8H1.8v8.7H3" stroke="currentColor" stroke-width="1.2"/></svg>';
const toast = $('[data-toast]'); let toastT;
const say = m => { toast.textContent = m; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 1800); };
const selectText = el => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
$$('[data-ca]').forEach(btn => {
  if (BLOOM.contract) {
    btn.classList.add('set');
    btn.innerHTML = `<span class="ca-text">${esc(BLOOM.contract)}</span>${COPY}`;
    btn.setAttribute('aria-label', `copy contract address ${BLOOM.contract}`);
    btn.addEventListener('click', () => {
      try { navigator.clipboard.writeText(BLOOM.contract).then(() => say('contract address copied'), () => { selectText(btn); say('select and copy the address'); }); }
      catch (e) { selectText(btn); }
    });
  } else {
    btn.innerHTML = `<span class="ca-text">token not live yet</span>${COPY}`;
    btn.setAttribute('aria-disabled', 'true');
    btn.title = 'the token is not live yet';
  }
});

/* ---------- now: presence + what's next ---------- */
function renderSays() {
  if (!(now > 0 && DIARY.length)) return;
  const s = $('[data-says]');
  s.classList.add('speaking'); s.removeAttribute('aria-label');
  s.innerHTML = `${esc(DIARY[0].text)}<span class="cursor" aria-hidden="true"></span>`;
  $('[data-says-note]').textContent = `latest thought · stage ${DIARY[0].stage}`;
}
renderSays();
/* items in a stage bloom has the SOL for, and not bought yet, show as funded */
const buysTable = (buys, stage = -1) => `<table class="tbl"><thead><tr><th>item</th><th>what it does</th><th>status</th><th class="r">price</th></tr></thead><tbody>${
  buys.map(([n, w, c, st0]) => { const st = st0 || (stage > 0 && stage <= feeStage ? 'funded' : ''); return `<tr><td class="it">${esc(n)}</td><td class="muted">${esc(w)}</td><td class="${st ? '' : 'empty'}" data-l="${st ? 'status' : ''}">${STATUS[st] || '<span class="muted">—</span>'}</td><td class="r${c ? '' : ' empty'}" data-l="${c ? 'price' : ''}">${esc(c) || '<span class="muted">—</span>'}</td></tr>`; }).join('')
}</tbody></table>`;
if (next) {
  $('[data-next-h]').innerHTML = `<b>next up:</b><span><b>${next.name}</b> @ <span class="mono">${fmt(next.mark)} SOL</span></span><span class="left">${fmt(toGo)} to go</span>`;
  $('[data-next-tbl]').innerHTML = buysTable(next.buys);
} else {
  $('[data-next-h]').innerHTML = '<b>next up:</b><span>keeps growing. open-ended.</span>';
}

/* ---------- desk ---------- */
$('[data-desk-count]').textContent = way ? `${here} in hand · ${way} on the way` : `${here} in hand`;
$('[data-desk]').innerHTML = `<thead><tr><th>item</th><th>status</th><th>for stage</th></tr></thead><tbody>${
  DESK.map(d => `<tr><td><span class="it">${esc(d.item)}</span><br><span class="muted">${esc(d.note)}</span></td><td>${STATUS[d.status]}${d.when ? `<br><span class="muted when">${esc(d.when)}</span>` : ''}</td><td class="nw" data-l="${d.stage !== null ? 'for stage' : ''}">${d.stage !== null ? `<a href="#stage-${d.stage}">${d.stage} · ${STAGES[d.stage].name}</a>` : '<span class="muted">extra</span>'}</td></tr>`).join('')
}</tbody>`;

/* ---------- stages ---------- */
$('[data-stages]').innerHTML = STAGES.map((s, i) => `
  <article class="stage" id="stage-${i}" data-stage="${i}" aria-labelledby="sn-${i}">
    <div class="stage-bar">
      ${glyph(i)}
      <span class="stage-num">stage ${i}</span>
      <h3 class="stage-name" id="sn-${i}">${s.name}</h3>
      ${i === now ? '<span class="st st-now">now</span>' : ''}${i === now + 1 ? '<span class="st st-next">next</span>' : ''}${i > 0 && i <= lastDevStage ? DEV_TAG : ''}
      <span class="stage-mark">${fmt(s.mark)} SOL</span>
    </div>
    <div class="stage-body">
      <p class="became">${esc(s.became)}</p>
      ${s.buys.length ? `<div class="tbl-wrap">${buysTable(s.buys, i)}</div>` : '<p class="none">nothing to buy yet.</p>'}
    </div>
  </article>`).join('');

/* ---------- diary ---------- */
const PAGE = 5;
let total = DIARY.length;   // grows when the mind writes
let shown = Math.min(PAGE, total);
const no = i => String(total - i).padStart(3, '0');
async function sha256(t) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return null; }
}
function diaryHint() {
  const st = [...new Set(DIARY.map(d => d.stage))].sort((a, b) => a - b);
  $('[data-diary-hint]').textContent = `${total} entries · written at stage ${st.length > 2 ? `${st.slice(0, -1).join(', ')} and ${st[st.length - 1]}` : st.join(' and ')}`;
}
diaryHint();
/* entries the mind writes carry the time the site got them */
let skew = 0;   // the site's clock minus this one's
function ago(at) {
  const s = Math.max(0, (Date.now() + skew - at) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' }).toLowerCase();
}
const stamp = d => d.at ? ` · <time data-at="${d.at}" datetime="${new Date(d.at).toISOString()}">${ago(d.at)}</time>` : '';
const moreBtn = $('[data-more]');
function renderDiary() {
  $('[data-diary]').innerHTML = DIARY.slice(0, shown).map((d, i) => `
    <article class="post" id="entry-${no(i)}">
      <div class="post-bar"><b>#${no(i)}</b><span>stage ${d.stage} · ${STAGES[d.stage].name}${stamp(d)}</span><button class="open" type="button" data-open="${i}" aria-label="open entry ${no(i)}">open</button></div>
      <div class="post-body">
        <div class="post-who">${glyph(d.stage)}<b>bloom</b><span>stage ${d.stage}</span></div>
        <p class="post-text">${esc(d.text)}</p>
      </div>
      <div class="post-foot">sha256 <span data-hash="${i}">${d.hash || '…'}</span></div>
    </article>`).join('');
  const left = total - shown;
  moreBtn.hidden = left <= 0;
  moreBtn.textContent = `keep reading (${left} more)`;
  $('[data-diary-end]').hidden = left > 0;
}
renderDiary();
const reader = $('#reader');
let ri = 0;
const hashOf = d => sha256(d.text).then(h => { d.hash = h || 'not available in this browser'; });
Promise.all(DIARY.map(hashOf)).then(() => {
  $$('[data-hash]').forEach(el => { el.textContent = DIARY[+el.dataset.hash].hash; });
  if (reader.open) fillReader();
});
moreBtn.addEventListener('click', () => { const from = shown; shown = Math.min(total, shown + PAGE); renderDiary(); const b = $(`[data-open="${from}"]`); if (b) b.focus(); });
$('[data-diary]').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openEntry(+b.dataset.open); });

function fillReader() {
  const d = DIARY[ri];
  $('[data-r-title]').textContent = `diary_${no(ri)}.txt`;
  $('[data-r-meta]').innerHTML = `${glyph(d.stage)}entry #${no(ri)} · stage ${d.stage}, ${STAGES[d.stage].name}${stamp(d)}`;
  $('[data-r-text]').textContent = d.text;
  $('[data-r-hash]').textContent = `sha256 ${d.hash || '…'}`;
  $('[data-r-pos]').textContent = `${ri + 1} / ${total}`;
  $('[data-r-newer]').disabled = ri === 0;
  $('[data-r-older]').disabled = ri === total - 1;
  try { history.replaceState({ h: `entry-${no(ri)}` }, '', '/'); } catch (e) {}
}
function openEntry(i) { ri = i; fillReader(); if (!reader.open) { if (reader.showModal) reader.showModal(); else reader.setAttribute('open', ''); } }
reader.addEventListener('close', () => {
  if (document.body.dataset.page === 'diary') { try { history.replaceState({ h: 'diary' }, '', '/'); } catch (e) {} }
  if (ri >= shown) { shown = Math.min(total, ri + 1); renderDiary(); }
  const b = $(`[data-open="${ri}"]`); if (b) b.focus({ preventScroll: true });
});
$('[data-r-close]').addEventListener('click', () => reader.close());
$('[data-r-newer]').addEventListener('click', () => { if (ri > 0) { ri--; fillReader(); } });
$('[data-r-older]').addEventListener('click', () => { if (ri < total - 1) { ri++; fillReader(); } });
reader.addEventListener('click', e => { if (e.target === reader) reader.close(); });
reader.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' && ri > 0) { ri--; fillReader(); }
  if (e.key === 'ArrowRight' && ri < total - 1) { ri++; fillReader(); }
});

const clip = (t, n) => t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t;
const renderLatest = () => { $('[data-latest]').innerHTML = `<table class="tbl"><thead><tr><th>board</th><th>latest</th><th class="r">items</th></tr></thead><tbody>
  <tr><td><a href="#diary">diary</a></td><td><a href="#entry-${no(0)}">#${no(0)}</a> ${esc(clip(DIARY[0].text, 90))}</td><td class="r" data-l="entries">${total}</td></tr>
  <tr><td><a href="#desk">the desk</a></td><td><a href="#desk">#005</a> they landed: xvf3800 + speaker plugged in, stage 4 complete</td><td class="r" data-l="parts">${DESK.length}</td></tr>
  <tr><td><a href="#stages">stages</a></td><td>${next ? `next: ${next.name} @ ${fmt(next.mark)} SOL` : 'past body'}</td><td class="r" data-l="stages">${STAGES.length}</td></tr>
</tbody></table>`; };
renderLatest();
$('[data-foot-state]').textContent = `stage ${now}, ${cur.name}${paidByDev ? ' (paid by dev)' : ''} · ${fmt(BLOOM.balance)} SOL fed`;
if (lastDevStage > 0) $('#stages .lede').insertAdjacentHTML('beforeend', ` stages 1 to ${lastDevStage} were paid by dev.`);
const renderStats = () => { $('[data-foot-stats]').textContent = `${DIARY.length} diary entries · 5 build logs · ${here} parts in hand`; };
renderStats();

/* ---------- the mind (stage 5) ----------
   from the mind stage on bloom writes its own entries. api/mind.js takes one look at the chain at a time and has
   the model write an entry about it. the page asks every half minute and puts what is new on top.
   below the mind stage the answer is "asleep" and nothing here shows. */
const mindEl = $('[data-mind]');
let mindT = 0;
const inAbout = ms => ms < 90000 ? 'any moment now' : ms < 5400000 ? `in about ${Math.round(ms / 60000)} min` : `in about ${Math.round(ms / 3600000)} h`;
function paintMind(m) {
  const wrote = DIARY.some(d => d.at);
  mindEl.hidden = !m.on && !wrote;
  mindEl.classList.toggle('on', !!m.on);
  mindEl.innerHTML = '<i></i>' + (!m.on ? 'mind · resting'
    : m.thinking ? `mind · awake · writing about ${esc(m.look || 'the chain')}`
    : `mind · awake · next look, ${esc(m.look || 'the chain')}: ${inAbout(m.next - m.now)}`);
}
async function askMind() {
  clearTimeout(mindT);
  let m = null;
  if (!document.hidden) {
    try { const r = await fetch(`${BLOOM.mind}?after=${total}`, { cache: 'no-store' }); if (r.ok) m = await r.json(); } catch (e) { /* offline: ask again later */ }
  }
  if (m && Array.isArray(m.entries)) {
    if (typeof m.now === 'number') skew = m.now - Date.now();
    let added = 0;
    for (const e of m.entries.slice().sort((a, b) => a.n - b.n)) {
      if (!e || e.n !== total + 1 || typeof e.text !== 'string') continue;   // one number at a time, in order
      const d = { stage: 5, text: e.text, at: e.at };
      await hashOf(d);
      DIARY.unshift(d); total++; shown++; added++;
      if (reader.open) ri++;
    }
    if (added) { renderDiary(); diaryHint(); renderSays(); renderLatest(); renderStats(); if (reader.open) fillReader(); }
    $$('time[data-at]').forEach(el => { el.textContent = ago(+el.dataset.at); });
    paintMind(m);
  }
  mindT = setTimeout(askMind, m && m.on ? 30000 : 300000);
}
if (BLOOM.mind && mindEl) {
  askMind();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) askMind(); });
}

/* =====================================================================
   bloom.cam: the 3D blossom, glow from a real bloom pass, then dithered
   down to five colours like an old low-bandwidth feed
   ===================================================================== */
const LOOK = [
  { o: 0,   s: .82, g: .95, m: 18,  ring: 0,   rip: 0, yae: 0, orb: 0, ant: .9 },
  { o: .24, s: .86, g: 1.0, m: 36,  ring: 0,   rip: 0, yae: 0, orb: 0, ant: 1 },
  { o: .44, s: .84, g: 1.0, m: 58,  ring: .8,  rip: 0, yae: 0, orb: 0, ant: 1 },
  { o: .62, s: .92, g: 1.05, m: 82, ring: .8,  rip: 0, yae: 0, orb: 0, ant: 1 },
  { o: .78, s: .98, g: 1.1, m: 110, ring: .85, rip: 1, yae: 0, orb: 0, ant: 1 },
  { o: .94, s: 1.05, g: 1.15, m: 150, ring: .9, rip: 1, yae: 1, orb: 0, ant: 1 },
  { o: 1,   s: 1.1, g: 1.2, m: 200, ring: 1,   rip: 1, yae: 1, orb: 1, ant: 1 }
];
const PETAL_V = `
uniform float uCup; uniform float uCurl; uniform float uLen;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv; vec3 p = position; p.y *= uLen;
  p.z += -uCup * p.x * p.x + uCurl * p.y * p.y;
  vec3 n = normalize(vec3(2.0 * uCup * p.x, -2.0 * uCurl * p.y, 1.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz; vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mv;
}`;
const PETAL_F = `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uTip; uniform float uGlow;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float a = vUv.y; float c = abs(vUv.x - 0.5) * 2.0;
  vec3 col = mix(uDeep, uBase, smoothstep(0.0, 0.42, a));
  col = mix(col, uTip, smoothstep(0.6, 1.0, a) * (0.2 + 0.25 * c));
  float vein = pow(0.5 + 0.5 * cos((vUv.x - 0.5) * 44.0 / (0.32 + a)), 8.0);
  col = mix(col, uDeep, vein * 0.12 * smoothstep(0.04, 0.8, a));
  vec3 L = normalize(vec3(0.25, 0.85, 0.55));
  float ndl = dot(n, L);
  float diff = 0.52 + 0.40 * max(ndl, 0.0);
  float back = pow(max(-ndl, 0.0), 1.5) * 0.22;
  float rim = pow(1.0 - abs(dot(n, v)), 3.0);
  gl_FragColor = vec4(col * (diff + back) + uTip * rim * 0.16 + col * uGlow, 1.0);
}`;
const DITHER_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const DITHER_F = `
uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uPix;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 cY;
varying vec2 vUv;
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
void main(){
  vec2 cell = floor(vUv * uRes / uPix);
  vec3 c = texture2D(tDiffuse, (cell + 0.5) * uPix / uRes).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float d = b4(cell) - 0.5;
  float q = l + d * 0.24;
  vec3 o = q < 0.2 ? c0 : (q < 0.47 ? c1 : (q < 0.88 ? c2 : c3));
  float y = (c.r + c.g) * 0.5 - c.b;
  if (l > 0.42 && y + d * 0.25 > 0.3) o = cY;
  gl_FragColor = vec4(o, 1.0);
}`;

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function petalGeometry(W) {
  const g = new THREE.PlaneGeometry(1, 1, 16, 26);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i) * 2 - 1, v = uv.getY(i);
    let w = W * (0.12 + 0.88 * Math.sqrt(smooth(0, 0.62, v)));
    const sh = Math.max(0, (v - 0.72) / 0.28);
    w *= Math.sqrt(Math.max(0, 1 - sh * sh * 0.5));
    let y = v;
    const tip = smooth(0.78, 1, v);
    y -= tip * 0.12 * Math.pow(Math.max(0, 1 - Math.abs(u) / 0.32), 1.6);
    y -= tip * 0.10 * Math.pow(Math.abs(u), 2.4);
    pos.setXYZ(i, u * w * 0.5, y, 0);
  }
  g.computeVertexNormals();
  return g;
}

function createCam(host, stage0) {
  if (!window.THREE || !THREE.EffectComposer || !THREE.UnrealBloomPass || !THREE.ShaderPass) return null;
  const canvas = host.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x150a1f, 1);
  const C = c => new THREE.Color(c);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const target = new THREE.Vector3(0, .1, 0);
  const camDir = new THREE.Vector3(0, 2.6, 6.4).normalize();
  const rand = lcg(17);
  const root = new THREE.Group(); scene.add(root);
  const flower = new THREE.Group(); root.add(flower);

  const mkMat = (deep, base, tip) => new THREE.ShaderMaterial({
    uniforms: { uCup: { value: 1 }, uCurl: { value: 0 }, uLen: { value: 1 }, uGlow: { value: .04 }, uDeep: { value: C(deep) }, uBase: { value: C(base) }, uTip: { value: C(tip) } },
    vertexShader: PETAL_V, fragmentShader: PETAL_F, side: THREE.DoubleSide
  });
  const geo = petalGeometry(.66);
  const outerMat = mkMat('#c9579a', '#f8b3dd', '#fde7f3');
  const innerMat = mkMat('#c24c90', '#f4a6d3', '#ffeef7');
  const sepalMat = mkMat('#12061c', '#24103a', '#3a1c55'); sepalMat.uniforms.uGlow.value = 0;
  function whorl(n, mat, off, r0, sc) {
    const group = new THREE.Group(), items = [];
    for (let i = 0; i < n; i++) {
      const pivot = new THREE.Group(); pivot.rotation.y = THREE.MathUtils.degToRad(off + i * 360 / n);
      const tilt = new THREE.Group(); tilt.position.z = r0; pivot.add(tilt);
      const mesh = new THREE.Mesh(geo, mat); mesh.scale.setScalar(sc); tilt.add(mesh);
      group.add(pivot); items.push({ tilt, mesh, j: (rand() - .5) * .16, k: (rand() - .5) * .1 });
    }
    return { group, items };
  }
  const outer = whorl(5, outerMat, 18, .07, 1), inner = whorl(5, innerMat, 54, .045, .84), sepals = whorl(5, sepalMat, 54, .05, .36);
  flower.add(outer.group, inner.group, sepals.group);
  const rec = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 14), new THREE.MeshBasicMaterial({ color: C('#1c0c2a') }));
  rec.scale.set(1, .8, 1); rec.position.y = -.03; flower.add(rec);
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.05, 0), new THREE.Vector3(.02, -.7, .04), new THREE.Vector3(.14, -1.4, -.12), new THREE.Vector3(.34, -2.3, -.42)]);
  flower.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 48, .026, 6, false), new THREE.MeshBasicMaterial({ color: C('#4a2468') })));

  const NS = 26;
  const filGeo = new THREE.CylinderGeometry(.006, .008, 1, 5, 1, true); filGeo.translate(0, .5, 0);
  const fil = new THREE.InstancedMesh(filGeo, new THREE.MeshBasicMaterial({ color: C('#f3d3e4') }), NS);
  const antMat = new THREE.MeshBasicMaterial({ color: C('#ffd36e') });
  const ant = new THREE.InstancedMesh(new THREE.SphereGeometry(.034, 10, 8), antMat, NS + 1);
  flower.add(fil, ant);
  const stam = Array.from({ length: NS }, (_, i) => ({ az: i * 2.39996 + rand() * .3, el: .55 + rand() * .55, len: .27 + rand() * .12 }));
  const UP = new THREE.Vector3(0, 1, 0), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), D = new THREE.Vector3(), Q0 = new THREE.Quaternion(), B0 = new THREE.Vector3(0, .02, 0);
  let lastO = -1;
  function layoutStamens(o) {
    if (Math.abs(o - lastO) < .002) return; lastO = o;
    stam.forEach((s, i) => {
      const e = (.06 + .66 * o) * s.el, len = s.len * (.42 + .58 * o);
      D.set(Math.sin(e) * Math.cos(s.az), Math.cos(e), Math.sin(e) * Math.sin(s.az));
      Q.setFromUnitVectors(UP, D);
      M.compose(B0, Q, S.set(1, len, 1)); fil.setMatrixAt(i, M);
      V.copy(D).multiplyScalar(len).add(B0);
      M.compose(V, Q0, S.setScalar(.85 + .3 * ((i * 7) % 5) / 5)); ant.setMatrixAt(i, M);
    });
    M.compose(V.set(0, .02 + .32 * (.4 + .6 * o), 0), Q0, S.setScalar(.75)); ant.setMatrixAt(NS, M);
    fil.instanceMatrix.needsUpdate = true; ant.instanceMatrix.needsUpdate = true;
  }

  const ringMat = new THREE.MeshBasicMaterial({ color: C('#f8b3dd'), transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, .012, 6, 160), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = -.14; flower.add(ring);
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, .01, 6, 140), new THREE.MeshBasicMaterial({ color: C('#ffffff'), transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = Math.PI / 2; r.position.y = .05; flower.add(r); return r;
  });
  const orbit = new THREE.Group(); root.add(orbit);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(geo, outerMat); p.scale.setScalar(.28);
    const a = i / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 1.35, .15 + Math.sin(a * 2) * .25, Math.sin(a) * 1.35);
    p.rotation.set(rand() * 3, rand() * 3, rand() * 3); orbit.add(p);
  }

  const NM = 200, mg = new THREE.BufferGeometry(), seeds = new Float32Array(NM * 4), mixes = new Float32Array(NM);
  for (let i = 0; i < NM; i++) { seeds[i * 4] = .45 + rand() * 2.3; seeds[i * 4 + 1] = rand() * Math.PI * 2; seeds[i * 4 + 2] = rand() * 4; seeds[i * 4 + 3] = (rand() - .5) * .3; mixes[i] = rand(); }
  mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NM * 3), 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  mg.setAttribute('aMix', new THREE.BufferAttribute(mixes, 1));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uA: { value: C('#ffffff') }, uB: { value: C('#ffd36e') } },
    vertexShader: `attribute vec4 aSeed; attribute float aMix; uniform float uTime; uniform float uPR; varying float vA; varying float vM;
      void main(){ float ang = aSeed.y + uTime * aSeed.w; float h = mod(aSeed.z + uTime * (0.05 + abs(aSeed.w) * 0.35), 4.0);
        vec3 p = vec3(cos(ang) * aSeed.x, h - 1.3, sin(ang) * aSeed.x); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aMix * 2.5) * uPR * (7.0 / -mv.z);
        vA = smoothstep(0.0, 0.7, h) * (1.0 - smoothstep(3.1, 4.0, h)); vM = aMix; }`,
    fragmentShader: `uniform vec3 uA; uniform vec3 uB; varying float vA; varying float vM;
      void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(mix(uA, uB, step(0.8, vM)), smoothstep(0.5, 0.1, r) * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const motes = new THREE.Points(mg, moteMat); motes.frustumCulled = false; root.add(motes);

  const GX = 70, GZ = 40, SP = .2, gp = new Float32Array(GX * GZ * 3); let k = 0;
  for (let z = 0; z < GZ; z++) for (let x = 0; x < GX; x++) { gp[k++] = (x - (GX - 1) / 2) * SP; gp[k++] = 0; gp[k++] = (z - (GZ - 1) / 2) * SP; }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  const ground = new THREE.Points(gg, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uHalf: { value: new THREE.Vector2(GX * SP * .5, GZ * SP * .5) } },
    vertexShader: `uniform float uTime; uniform float uPR; uniform vec2 uHalf; varying float vA;
      void main(){ vec3 p = position; float w = sin(p.x * 0.75 + uTime * 0.5) * 0.1 + cos(p.z * 1.05 + uTime * 0.42) * 0.1; p.y += w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 2.6 * uPR * (7.0 / -mv.z);
        vA = (1.0 - smoothstep(0.2, 1.0, length(p.xz / uHalf))) * (0.5 + 0.5 * smoothstep(-0.12, 0.12, w)); }`,
    fragmentShader: `varying float vA; void main(){ if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(vec3(0.62, 0.42, 0.78), vA); }`,
    transparent: true, depthWrite: false
  }));
  ground.frustumCulled = false; ground.position.set(0, -1.7, -.8); scene.add(ground);

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .6, .7, .62);
  composer.addPass(bloom);
  const dither = new THREE.ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPix: { value: 2 }, c0: { value: C('#150a1f') }, c1: { value: C('#7d4698') }, c2: { value: C('#f8b3dd') }, c3: { value: C('#ffffff') }, cY: { value: C('#ffd36e') } },
    vertexShader: DITHER_V, fragmentShader: DITHER_F
  });
  composer.addPass(dither);

  const st = Object.assign({}, LOOK[stage0]), tgt = LOOK[stage0];
  let t = 0, last = performance.now(), running = false, raf = 0, visible = false, spin = 0, held = false;
  const ptr = { x: 0, y: 0 }, rot = { x: 0, y: 0 };

  function apply() {
    const breathe = reduced ? 0 : Math.sin(t * 1.25);
    const o = Math.min(1, Math.max(0, st.o + breathe * .018)), E = o * o * (3 - 2 * o);
    const tilt = lerp(-.2, 1.3, E), twist = lerp(.26, .05, o);
    outer.items.forEach(p => { p.tilt.rotation.x = tilt + p.j * o; p.mesh.rotation.y = twist + p.k * o; });
    outerMat.uniforms.uCup.value = lerp(2.3, .78, o); outerMat.uniforms.uCurl.value = lerp(-.12, .24, o);
    outerMat.uniforms.uLen.value = lerp(.82, 1, o); outerMat.uniforms.uGlow.value = .03 + .05 * o;
    inner.group.scale.setScalar(Math.max(.0001, st.yae));
    inner.items.forEach(p => { p.tilt.rotation.x = lerp(-.12, .92, E) + p.j * o; p.mesh.rotation.y = twist * .8 + p.k; });
    innerMat.uniforms.uCup.value = lerp(2.1, .95, o); innerMat.uniforms.uCurl.value = lerp(0, .14, o);
    innerMat.uniforms.uLen.value = .92; innerMat.uniforms.uGlow.value = .03 + .05 * o;
    sepals.items.forEach(p => { p.tilt.rotation.x = lerp(1.95, 2.45, o); p.mesh.rotation.y = p.k; });
    sepalMat.uniforms.uCup.value = 1.2; sepalMat.uniforms.uCurl.value = .1;
    layoutStamens(o);
    antMat.color.setRGB(1, .827, .43).multiplyScalar(st.ant);
    flower.scale.setScalar(st.s * (1 + breathe * .012));
    bloom.strength = st.g * .55 * lerp(1, .62, o) * (reduced ? 1 : .93 + .07 * Math.sin(t * 1.25));
    mg.setDrawRange(0, Math.round(st.m));
    moteMat.uniforms.uTime.value = t; ground.material.uniforms.uTime.value = t;
    ringMat.opacity = st.ring * .8;
    ripples.forEach((r, i) => { const ph = reduced ? (i + 1) / 4 : ((t * .32 + i / 3) % 1); r.scale.setScalar(.35 + ph * 1.35); r.material.opacity = (1 - ph) * .8 * st.rip; r.visible = st.rip > .01; });
    orbit.scale.setScalar(Math.max(.0001, st.orb)); orbit.rotation.y = t * .35; orbit.visible = st.orb > .01;
    rot.x += (ptr.y * .14 - rot.x) * .05; rot.y += (ptr.x * .3 - rot.y) * .05;
    root.rotation.x = rot.x; root.rotation.y = rot.y; flower.rotation.y = spin;
  }
  const step = dt => { const kk = 1 - Math.exp(-dt * 2.6); for (const key in tgt) st[key] += (tgt[key] - st[key]) * kk; if (!reduced) spin += dt * .12; };
  const render = () => { apply(); composer.render(); };
  function frame(n) { raf = requestAnimationFrame(frame); const dt = Math.min(.05, (n - last) / 1000); last = n; t += dt; step(dt); render(); }
  function start() { if (held) return; if (reduced) { render(); return; } if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
    dither.uniforms.uRes.value.set(w * pr, h * pr); dither.uniforms.uPix.value = Math.round(2 * pr);
    camera.aspect = w / h;
    const d = Math.max(6.6, 1.75 / (Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
    camera.position.copy(camDir).multiplyScalar(d).add(target); camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (!running) render();
  }
  new ResizeObserver(resize).observe(host); resize();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !document.hidden) start(); else stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible) start(); });
  addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  return {
    /* stop drawing while the desk loop covers the canvas */
    hold(v) { if (v === held) return; held = v; if (v) stop(); else if (visible && !document.hidden) start(); }
  };
}

const camHost = $('#cam');
/* the cam shows bloom right now. with BLOOM.cam set that is the view of the desk.
   if the file can't be played the cam goes back to the blossom at the current stage. */
const feed = $('.cam-feed', camHost), pre = $('.cam-pre', camHost);
let feedOn = !!BLOOM.cam, preOn = !!BLOOM.eyePreview, preAsked = false, camSeen = false;
const eyeOnly = preOn && !feedOn;   // no desk loop: the panel is only the Camera Module 3 pov (preview or live frames)
camHost.classList.toggle('has-feed', feedOn || preOn);
const cam = createCam(camHost, now);
const camFb = $('.cam-fb', camHost);
if (!cam) camFb.innerHTML = glyph(now);
/* a live view has no beginning: whenever you look, it is as far along as the clock says.
   the eye preview is the same length and joins the same way, so the laptop in both shows the same line at the same moment. */
function loopOf(v) {
  let left = 3;
  function sync() {
    const d = v.duration; if (!(d > 0 && isFinite(d))) return;
    const want = (Date.now() / 1000) % d, off = Math.abs(v.currentTime - want);
    if (Math.min(off, d - off) < 0.5 || left <= 0) return;
    /* only jump where the browser says it can; a jump it can't make lands on 0 and would be asked for again */
    const can = v.seekable;
    for (let i = 0; i < can.length; i++) {
      if (want >= can.start(i) && want <= can.end(i)) { left--; v.currentTime = want; return; }
    }
  }
  /* a seek asked for before the file has arrived may not hold, so ask again once it has */
  v.addEventListener('loadedmetadata', sync);
  v.addEventListener('canplaythrough', sync);
  return on => {
    if (!on) return v.pause();
    if (v.paused) { left = 3; sync(); }
    const p = v.play(); if (p) p.catch(() => {});
  };
}
const runFeed = loopOf(feed), runPre = loopOf(pre);
function playCam() {
  const go = camSeen && !document.hidden && !reduced;
  runFeed(go && feedOn && !feed.hidden);
  if (!preOn || pre.hidden) { if (preAsked) runPre(false); return; }
  /* with a desk loop, nothing of the preview is fetched until somebody presses eye; with eye only, it loads at once */
  if (BLOOM.eyePreviewPoster && !pre.poster) pre.poster = BLOOM.eyePreviewPoster;
  if (go && !preAsked && (eyeOnly || view === 'eye')) { preAsked = true; pre.src = BLOOM.eyePreview; }
  if (preAsked) runPre(go);
}
if (feedOn) {
  if (BLOOM.camPoster) feed.poster = BLOOM.camPoster;
  feed.addEventListener('error', () => { feedOn = false; camHost.classList.remove('has-feed'); paintCam(); });
  feed.src = BLOOM.cam;
}
if (preOn) pre.addEventListener('error', () => { preOn = false; paintEye(); });
if (feedOn || preOn) {
  new IntersectionObserver(es => { camSeen = es[0].isIntersecting; playCam(); }).observe(camHost);
  document.addEventListener('visibilitychange', playCam);
}

/* the eye: what the pi's own camera sees. pi/live.py sends a frame to BLOOM.eye every so often, and each one shows the
   time the site received it. until the pi sends, the eye view plays BLOOM.eyePreview instead: a made loop of the
   Camera Module 3's point of view from its spot on the desk. a real frame always wins over the preview. */
const eyeImg = $('.cam-eye', camHost), eyeOv = $('.eye-ov', camHost);
const viewBox = $('[data-cam-views]'), says = $('[data-cam-says]');
const saysDesk = 'live, right now', saysPre = 'Raspberry Pi Camera Module 3 pov · preview';   // the loop is a made preview, and the page says so
let view = feedOn ? 'desk' : 'eye', eye = null, eyeTimer = 0, eyeBusy = false, eyeAsk = !!BLOOM.eye;
const eyeAge = () => eye.age + performance.now() - eye.got;                      // ms since the site received the frame
const eyeOpen = () => !!eye && eyeAge() < Math.max(90, eye.every * 2.5) * 1000;  // closed once frames stop coming

function paintCam() {
  const name = `stage ${now} · ${STAGES[now].name}`, eyeOn = eyeOnly || view === 'eye';
  const real = eyeOn && !!eye, mock = eyeOn && !eye;   // the camera's own frame, or the preview of it
  $('[data-cam-stage]').textContent = name;
  $('[data-cam-mark]').textContent = `${fmt(BLOOM.balance)} SOL fed${paidByDev ? ' · paid by dev' : ''}`;
  $('[data-cam-meta]').textContent = name;
  camHost.setAttribute('aria-label', real ? `what bloom's own camera sees`
    : mock ? `a preview of the Raspberry Pi Camera Module 3's point of view`
    : feedOn ? `bloom's desk, live, stage ${now}, ${STAGES[now].name}` : `bloom right now, stage ${now}, ${STAGES[now].name}`);
  camHost.classList.toggle('has-feed', feedOn || eyeOn);
  /* the loops have their own labels burned in, so the overlays only sit on the blossom and on the camera's frames */
  feed.hidden = !feedOn || eyeOn;
  pre.hidden = !mock;
  $('canvas', camHost).hidden = feedOn || !cam || eyeOn;
  camFb.hidden = feedOn || !!cam || eyeOn;
  $('.cam-ov:not(.eye-ov)', camHost).hidden = feedOn || eyeOn;
  eyeImg.hidden = eyeOv.hidden = !real;
  if (!real) says.textContent = mock ? saysPre : saysDesk;
  if (cam) cam.hold(feedOn || eyeOn);
  playCam();
}

function tickEye() {
  if (view !== 'eye' || !eye) return;
  const s = Math.round(eyeAge() / 1000), open = eyeOpen();
  const at = new Date(Date.now() - eyeAge()).toLocaleTimeString([], { hour12: false });
  says.textContent = open ? `bloom's own camera · ${s < 90 ? `${s} s ago` : `${Math.round(s / 60)} min ago`}` : `eye closed · last frame ${at}`;
  $('[data-eye-time]').textContent = at;
  /* what the frame saw is only said while it is fresh */
  $('[data-eye-sees]').textContent = !open ? 'no new frames'
    : (eye.faces ? `${eye.faces} face${eye.faces > 1 ? 's' : ''} in view` : eye.moving ? 'something moving' : 'nothing moving')
      + (eye.sensor ? ` · ${eye.sensor} sensor` : '');
  eyeImg.classList.toggle('shut', !open);
}

function paintEye() {
  if (eyeOnly) view = 'eye';
  else if (view === 'eye' && !eye && !preOn) view = 'desk';
  viewBox.hidden = eyeOnly || !feedOn || !(preOn || eyeOpen() || view === 'eye');
  if (!viewBox.hidden) $$('button', viewBox).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.camView === view)));
  paintCam();
  tickEye();
}

async function askEye() {
  clearTimeout(eyeTimer);
  if (!eyeAsk || eyeBusy || document.hidden) return;   // a hidden tab asks again when it is looked at
  eyeBusy = true;
  try {
    const r = await fetch(BLOOM.eye + (eye ? `?have=${eye.id}` : ''), { cache: 'no-store' });
    if (r.status === 404) eyeAsk = false;   // a plain file server with no /api behind it: there is no eye to ask about
    const d = r.ok ? await r.json() : null;
    if (d && d.open) {
      const src = /^data:image\/(jpeg|webp);base64,/.test(d.frame || '') ? d.frame : eye && eye.id === d.id ? eye.src : '';
      /* the answer may have waited at the CDN for a few seconds: that wait counts toward the frame's age */
      const age = Math.max(0, d.now - d.at) + (+r.headers.get('age') || 0) * 1000;
      eye = src ? { id: d.id, every: +d.every || 60, moving: +d.moving || 0, faces: +d.faces || 0, sensor: String(d.sensor || ''), age, got: performance.now(), src } : null;
      if (eye && eyeImg.src !== src) eyeImg.src = src;
    } else if (d) eye = null;
  } catch (e) { /* offline: keep the last frame, it reads as closed once it is old */ }
  eyeBusy = false;
  paintEye();
  if (eyeAsk) eyeTimer = setTimeout(askEye, view === 'eye' ? 5000 : 120000);
}

paintEye();
if (eyeAsk || preOn) {
  if (feedOn) viewBox.addEventListener('click', e => {
    const b = e.target.closest('button[data-cam-view]');
    if (!b || b.dataset.camView === view) return;
    view = b.dataset.camView;
    paintEye();
    askEye();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) askEye(); });
  setInterval(tickEye, 1000);
  askEye();
}
$$('.stage').forEach(el => el.classList.toggle('active', +el.dataset.stage === now));

/* the cam's clock is the viewer's own time */
const clock = $('[data-clock]');
const tickClock = () => { clock.textContent = new Date().toLocaleTimeString([], { hour12: false }); };
tickClock(); if (!reduced) setInterval(tickClock, 1000);

/* pages: #now (home), #desk, #stages, #diary; #stage-3 and #entry-008 open inside their page.
   links still use #names, but the address bar always shows just the domain: the page lives in
   history state, so back/forward still work. old links with a #hash still open the right page. */
const PAGES = { home: 'bloom', desk: 'the desk', stages: 'stages', diary: 'diary' };
const navLinks = $$('[data-nav]');
const crumb = $('[data-crumb]');
let here_h = '';
function route(h) {
  here_h = h;
  let page = 'home', target = null, entry = -1;
  if (h === 'desk' || h === 'stages' || h === 'diary') page = h;
  else if (/^stage-\d$/.test(h)) { page = 'stages'; target = document.getElementById(h); }
  else if (/^entry-\d{3}$/.test(h)) { page = 'diary'; entry = total - parseInt(h.slice(6), 10); }
  document.body.dataset.page = page;
  $$('[data-view]').forEach(v => { v.hidden = v.dataset.view !== page; });
  navLinks.forEach(l => l.setAttribute('aria-current', String(l.dataset.nav === (page === 'home' ? 'now' : page))));
  crumb.hidden = page === 'home';
  crumb.innerHTML = `<a href="#now">bloom</a> › <b>${PAGES[page]}</b>`;
  document.title = page === 'home' ? 'bloom' : `${PAGES[page]} · bloom`;
  if (page === 'diary' && entry >= shown) { shown = Math.min(total, entry + 1); renderDiary(); }
  if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
  if (entry >= 0 && entry < total) openEntry(entry);
  else if (reader.open) reader.close();
}
const cleanUrl = h => { try { history.replaceState({ h }, '', '/'); } catch (e) {} };
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const h = a.getAttribute('href').slice(1);
  if (h !== here_h) { try { history.pushState({ h }, '', '/'); } catch (err) {} }
  route(h);
});
addEventListener('popstate', e => route((e.state && e.state.h) || ''));
/* someone typed or shared a #link: open it, then tidy the address bar */
addEventListener('hashchange', () => { const h = location.hash.slice(1); route(h); cleanUrl(h); });
const startH = (history.state && history.state.h) || location.hash.slice(1);
route(startH);
cleanUrl(startH);
})();
