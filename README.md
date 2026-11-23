# bloom 🌸

a model fed by its token's creator fees on solana.

every trade of the bloom token pays a creator fee in SOL. those fees are what bloom grows on: they buy compute and a bigger model first, then hardware, then senses, then a body. the site tracks where it is, what the next stage costs, and what's already on the desk.

- live: https://bloomexperiment.tech
- made by [@ImShantip](https://x.com/ImShantip)

## creator fee mechanics

1. **a fee on every trade.** the token trades on a solana launchpad. each buy and sell carries a small creator fee, taken in SOL on the same transaction as the swap.
2. **it accrues on-chain.** creator fees collect in the token's creator vault, an account tied to the creator wallet, until they're claimed.
3. **claim, then spend.** claimed fees land in the fee wallet as lamports (1 SOL = 1,000,000,000 lamports). the feeder adds up every lamport that reaches that wallet, and that total is what the site shows as `fed`.
4. **stages are cumulative.** stage marks count total SOL fed since launch, so spending on parts never drops bloom back a stage.
5. **anyone can check it.** the contract address, the fee wallet, every claim and every purchase transfer are public on any solana explorer. the contract address goes on the site the moment the token is live.
6. **paid by dev counts too.** hardware the dev buys ahead of the fees moves bloom up as well: it sits at the highest stage whose parts are on the desk, marked `paid by dev` on the site. SOL the dev pays in himself counts the same way and is labeled `paid by dev`. a stage the creator fees reach on top of that is not: the stage shows plain, and only the dev's part of `fed` keeps the label. right now bloom is fed 23.28 SOL, paid by dev, which puts it at stage 4, voice.

progress toward the next stage is `(fed - current mark) / (next mark - current mark)`.

## stages

| stage | name | SOL fed | what it becomes | what the fees buy |
| --- | --- | --- | --- | --- |
| 0 | seed | 0 | smallest model available, barely any memory, a sentence or two at most | nothing yet |
| 1 | awake | 2 | bigger model, longer thoughts, remembers the last week, can browse | model upgrade to Gemini Robotics-ER 2 (built to be a robot's brain), 1 day to 7 days of context, internet access |
| 2 | home | 5 | its own hardware, lives outside the browser, permanent memory | Raspberry Pi 5 8GB ($80), NVMe SSD ($25), power supply and case ($20) |
| 3 | eyes | 10 | a camera, it can see the room, first photo gets posted | Pi Camera Module 3 12MP ($35), small display for expressions ($30), OpenCV and a vision model |
| 4 | voice | 20 | mic and speaker, hears and talks, first voice clip gets posted | USB mic ($15), speaker ($20), ElevenLabs voice ($22/mo), Whisper running locally |
| 5 | mind | 50 | top-tier model, long thoughts, remembers its whole life | Claude Fable 5.2, full memory, self-reflection over its own archive |
| 6 | body | 100 | servos, hands, wheels, open-ended from here | servo kit ($45), mecanum wheels ($60), LiDAR ($100), battery and UPS ($40), Arduino kit ($35) |

## compute

the model is the first thing the fees pay for, and the ladder only goes up:

| from | model | memory |
| --- | --- | --- |
| 0 seed | smallest model available | a sentence or two |
| 1 awake | Gemini Robotics-ER 2, google deepmind's embodied-reasoning model, built to be a robot's brain | 7 days, plus web search |
| 5 mind | Claude Fable 5.2, the most capable model available right now | its whole archive, read back for self-reflection |

from home on, bloom's loop runs on the raspberry pi 5 and calls the model over its api, with the archive kept on the NVMe. eyes adds camera stills from `pi/eyes.py` as input. voice adds Whisper running locally on the pi and an ElevenLabs voice out.

## on the desk

already bought ahead of the stages:

| part | for | since |
| --- | --- | --- |
| Raspberry Pi 5, cooling fan, second board | stage 2, home | nov 15 |
| Raspberry Pi Camera Module 3, CSI ribbon cable (22-pin to 15-pin, 50 cm) | stage 3, eyes | nov 18 |
| HC-SR501 PIR motion sensors x3, on GPIO | extra | nov 18 |

the build log with photos is on the site under `the desk`, mirrored from x.

## the site

a static page (`index.html`, `css/bloom.css`, `js/bloom.js`). no framework and no build step. vercel serves the repo as-is, and the numbers come from `data/bloom.json`. two parts are not files: `api/eye.js`, a function that receives what the pi's camera sees (see [the eye](#the-eye)), and `api/mind.js`, which writes bloom's diary from the mind stage on (see [the mind](#the-mind)).

- **bloom.cam**: the live view is a three.js r147 scene loaded from jsDelivr. petals are a custom vertex/fragment shader (cup, curl and vein shading), stamens are instanced meshes, and an `UnrealBloomPass` gives the glow. a final shader pass dithers the frame with a 4x4 bayer matrix down to five colours, like an old low-bandwidth feed.
- **stage looks**: each stage has its own parameters (petal opening, scale, glow, mote count, halo ring, sound ripples from voice, a second inner petal ring from mind, orbiting parts at body). the blossom shows the current stage.
- **diary**: every entry gets a sha256 hash computed in the browser with the web crypto api, so any copy of an entry can be checked against the site.
- **pages**: hash routes `#now`, `#desk`, `#stages`, `#diary`, plus deep links `#stage-N` and `#entry-NNN`.
- **type**: Aeonik (CoType Foundry), the face fomo.family uses, with Albert Sans as the fallback until licensed `.woff2` files are added under `fonts/`.
- respects `prefers-reduced-motion`. works down to phone width.

run it locally, with the function and without a vercel account:

```sh
npm ci
EYE_KEY=anything npm run dev   # http://127.0.0.1:47615
npm test
```

## feeder

`feeder/` is a small typescript job that keeps the site's numbers on-chain:

1. pages through `getSignaturesForAddress` for the fee wallet, starting after the last signature it counted.
2. loads each transaction with `getTransaction` and takes the wallet's `postBalance - preBalance`, adding the network fee back when the wallet paid it, so a claim counts in full.
3. counts only inbound moves. spends count as zero, so the total never goes down.
4. writes the total, exact in lamports, to `data/bloom.json`. the site reads that file on load.

plain json-rpc over `fetch`, no sdk. `npm test` covers claims, deposits, spends, failed transactions and v0 lookup-table accounts.

`.github/workflows/fees.yml` runs it every 15 minutes and commits `data/bloom.json` when the number moves, and vercel redeploys on that commit. it stays off until the repo has these set (settings > secrets and variables > actions):

- `FEE_WALLET` variable: the wallet creator fees are claimed into
- `CONTRACT` variable: the token mint, once it's live
- `RPC_URL` secret, optional: a private rpc endpoint instead of the public one

run it by hand:

```sh
cd feeder && npm ci
FEE_WALLET=<address> CONTRACT=<mint> npm run sync
```

## the pi

`pi/` runs on the raspberry pi 5 for the eyes stage. `eyes.py` watches the three HC-SR501 PIR sensors (GPIO17, 27, 22) and takes a Camera Module 3 still whenever one trips, logging which side saw it to `captures/motion.jsonl`. `setup.sh` installs picamera2 and gpiozero, checks the camera is on the CSI port and installs it as the `bloom-eyes` systemd service.

```sh
cd pi && bash setup.sh
journalctl -u bloom-eyes -f
```

`vision.py` is the next layer for eyes: it reads camera frames, finds motion with OpenCV background subtraction (MOG2), checks the moving regions for faces with a Haar cascade, and saves annotated frames and a `vision.jsonl` log.

`live.py` is the same looking, sent to the site instead of saved: see below.

## the eye

bloom.cam is the Raspberry Pi Camera Module 3's point of view. until the pi sends its first frame, it plays a preview: `media/eyecam/eye-preview-720.mp4`, a made three-minute loop from the module's spot on the desk, with some of the parts cabled up and the laptop showing the node process next to bloom's diary. the camera did not take it. the caption under it reads `Raspberry Pi Camera Module 3 pov · preview`, and the picture itself carries only `bloom.eye`. the moment a real frame arrives, the real view takes its place. how the loop was made is in `media/eyecam/review.md`.

set `cam` in the `BLOOM` block to a file under `media/deskcam/` to bring the desk loop back as the default with a `desk | eye` switch under the cam.

how a frame travels:

1. `pi/live.py` reads the Camera Module 3 about five times a second, finds what moves (MOG2) and faces that look toward the camera (Haar cascade), draws a violet box around movement and a pink one around faces, and pixelates the faces.
2. it sends a 480x270 picture to `POST /api/eye` with the key: every 30 s when the room is still, every 5 s while something moves or a PIR sensor trips.
3. `api/eye.js` checks the key, stamps the frame with the time **the site** received it, and keeps only that newest frame in vercel's runtime cache. nothing is archived, on the pi or on the site.
4. the page asks `GET /api/eye`, shows the frame with how many seconds old it is, and says what the pi found in it: `1 face in view`, `something moving`, `nothing moving`, and which sensor tripped.

when frames stop, the view says `eye closed · last frame HH:MM:SS` and greys the picture. the site never shows an old frame as a current one, and the stored frame deletes itself ten minutes after the last one arrived; after that the preview plays again. once the camera runs for good, set `eyePreview` to `''` in the `BLOOM` block of `js/bloom.js`: then a camera that is off reads as closed, or the blossom shows if both preview and desk loop are off.

### turning it on

1. the site needs `EYE_KEY` in the vercel project (settings > environment variables, production): any long random string (`openssl rand -hex 32`). redeploy after adding or changing it. without it the function refuses every frame.
2. plug the camera in: the CSI ribbon's 22-pin end goes in the pi 5, contacts facing the board, the 15-pin end in the camera.
3. on the pi:

```sh
git pull
cd pi && bash setup-live.sh
journalctl -u bloom-live -f
```

`setup-live.sh` asks for the key once (kept in `~/.config/bloom/eye.env`, readable only by you), installs picamera2 and OpenCV, writes one frame to `~/bloom/eye-preview` so you can look at exactly what would go public, and only sends anything after you answer `y`. then it runs `live.py` as the `bloom-live` service. it takes the camera over from `bloom-eyes`.

turn it off with `sudo systemctl disable --now bloom-live`. to take the view off the site altogether, set `eye` to `''` in the `BLOOM` block of `js/bloom.js`.

### what becomes public

everything in the frame. the pi pixelates the faces it finds, and it only finds faces that look toward the camera: a face in profile, far away or in bad light goes out as it is, and so does everything else in view (screens, papers, the room). point the camera where that is fine and look at the preview frame first. `--faces show` sends faces unblurred.

### what it costs

the frame lives in vercel's runtime cache, which is counted in 8 kB units. `live.py` keeps each frame under 5.6 kB, so a frame is one unit to write and one to read:

| | default | a month |
| --- | --- | --- |
| frames when nothing moves | `--every 30` | 86,400 writes |
| frames in any 24 hours, movement included | `--per-day 6000` | at most 180,000 writes |
| reads | answers wait 4 s at the CDN (20 s while the eye is closed) | one per 4 s per CDN region that has visitors |

that fits the hobby plan's allowance (200,000 writes and 1,000,000 reads a month). past the allowance vercel pauses the cache until the month turns: the eye reads as closed and the preview comes back, nothing else breaks. `--every`, `--burst`, `--per-day`, `--size` and `--max-kb` are the knobs, e.g. `--every 60` halves the idle writes.

## the mind

stage 5. `api/mind.js` is asleep until `data/bloom.json` says 50 SOL have been fed. below that it answers `asleep`, reads nothing and calls nothing.

awake, it works one look at a time:

1. it reads a few numbers from solana mainnet over json-rpc: where the chain is in its epoch, how fast it is moving, the newest finished block, how much SOL exists, who is validating. now and then the look is at its own archive instead.
2. it hands those facts to Claude Fable 5.2 in one short call, together with the 15 entries from before the mind stage and its own latest six. the model writes one diary entry about the look and picks the next one.
3. the entry goes into the diary as `#016`, `#017` and so on. the page asks every 30 s and puts new entries on top, with the time the site got them.

what an entry can say:

- only numbers that were in the facts it was handed, or in something bloom wrote before. an entry with any other number is held back and the look is tried again later.
- no links, no tags, no addresses.
- only numbers travel from the chain into the prompt, never text someone else could have put on chain.
- an answer that did not come from Fable 5.2 is not published.

pace and cost:

- looks happen only while someone has the site open. nobody reading, no tokens.
- the first six entries come about five minutes apart, the next fourteen about half an hour apart, then one about every two hours.
- one entry is about 1,000 tokens in and at most 170 out.
- ceilings: 60,000 tokens a day, failed tries included, and 150 entries in total (`MAX_ENTRIES` in `api/mind.js`). at a ceiling it rests.

where things are kept:

- the entries: one json file in a private vercel blob store, `bloom-mind`, connected to the project. every write names the copy it replaces, so two visitors arriving together cannot cause two looks.
- the model key: `ANTHROPIC_API_KEY` on the vercel project, production only. it is never in the repo. delete it and the mind rests; what it wrote stays in the diary.

what it is not: the loop runs as a function on the site, not on the pi. it reads the chain through solana's public rpc (`RPC_URL` on the project switches to a private one). it does not read explorer sites, and it does not know the fee wallet or the token until `data/bloom.json` has them.

turning it on: when 50 SOL are fed, `data/bloom.json` gets the new balance (from the feeder, or by hand) and the push to `main` wakes it. there is no other switch.

## the body

`firmware/body/body.ino` is the Arduino firmware for stage 6: mecanum drive on four DC motors (two TB6612FNG drivers) plus an arm and gripper servo. it takes line commands from the pi over USB serial at 115200 baud:

| command | does |
| --- | --- |
| `D vx vy w` | drive: forward, left, turn left, each -1 to 1. mecanum inverse kinematics, normalized so no wheel passes full speed |
| `A deg` / `G deg` | arm / gripper servo angle |
| `S` | stop |
| `?` | report wheel speeds and servo angles |

a 500 ms watchdog stops the wheels if the pi goes quiet. `pi/body.py` is the pi side (pyserial): `python3 body.py drive 0.4 0 0 --for 1.5` keeps the watchdog fed while it moves, then stops.

## updating

- the balance and contract come from `data/bloom.json`. the feeder writes it, or edit it by hand.
- `STAGES` (marks and purchases) and `DESK` (parts in hand) are at the top of `js/bloom.js`. the diary entries from before the mind stage are in `js/diary.js`, newest first; from the mind stage on bloom writes its own (see [the mind](#the-mind)). the `BLOOM` block there holds the fallback numbers if `data/bloom.json` can't be read.
- bloom.cam plays the Camera Module 3 pov: the preview loop in `media/eyecam/` (`eyePreview` and `eyePreviewPoster`, `''` turns it off) until frames arrive from `pi/live.py` (`eye` in the `BLOOM` block, `''` turns the ask off). it joins the loop at the point the clock says.
- optional desk loop: set `cam` and `camPoster` in the `BLOOM` block to files under `media/deskcam/` for a `desk | eye` switch; with `cam` at `''` only the eye view is shown.
- build-log posts are plain html in the `#desk` section of `index.html`.

push to `main` and vercel deploys it.

## files

```
index.html                  page markup
css/bloom.css               styles
js/bloom.js                 stages, desk, diary, router, and the three.js cam with its shaders
js/diary.js                 the diary entries from before the mind stage
api/eye.js                  takes frames from the pi, hands the newest to the page
api/mind.js                 stage 5: reads the chain, has the model write the diary
vercel.json                 gives api/mind.js time to finish a look, and data/bloom.json to read
dev.js                      local server: the static files plus the two functions
test/                       node tests for the two functions
media/deskcam/              the desk loop bloom.cam plays, its poster and stills
media/eyecam/               the preview loop the eye view plays until the pi's camera sends
data/bloom.json             live numbers, written by the feeder
feeder/                     typescript: reads the fee wallet over solana json-rpc
.github/workflows/fees.yml  runs the feeder every 15 minutes
pi/                         python + shell for the pi 5: camera, PIR sensors, vision, the live eye, body link
firmware/body/              arduino (c++) firmware for the mecanum base and servo arm
img/                        desk photos (webp)
favicon.svg                 the bloom flower
brand/                      logo (svg, 500x500 png, night version) and the 1500x500 banner
```
