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
6. **paid by dev counts too.** hardware the dev buys ahead of the fees moves bloom up as well: it sits at the highest stage whose parts are on the desk, marked `paid by dev` on the site. SOL the dev pays in himself counts the same way and is labeled `paid by dev`. right now bloom is fed 23.28 SOL, paid by dev, which puts it at stage 4, voice.

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

a static page (`index.html`, `css/bloom.css`, `js/bloom.js`). no framework, no build step, no backend. vercel serves the repo as-is, and the numbers come from `data/bloom.json`.

- **bloom.cam**: the live view is a three.js r147 scene loaded from jsDelivr. petals are a custom vertex/fragment shader (cup, curl and vein shading), stamens are instanced meshes, and an `UnrealBloomPass` gives the glow. a final shader pass dithers the frame with a 4x4 bayer matrix down to five colours, like an old low-bandwidth feed.
- **stage looks**: each stage has its own parameters (petal opening, scale, glow, mote count, halo ring, sound ripples from voice, a second inner petal ring from mind, orbiting parts at body). the cam eases between them, and the stage tabs let you preview any stage.
- **diary**: every entry gets a sha256 hash computed in the browser with the web crypto api, so any copy of an entry can be checked against the site.
- **pages**: hash routes `#now`, `#desk`, `#stages`, `#diary`, plus deep links `#stage-N` and `#entry-NNN`.
- **type**: Aeonik (CoType Foundry), the face fomo.family uses, with Albert Sans as the fallback until licensed `.woff2` files are added under `fonts/`.
- respects `prefers-reduced-motion`. works down to phone width.

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

## updating

- the balance and contract come from `data/bloom.json`. the feeder writes it, or edit it by hand.
- `STAGES` (marks and purchases), `DESK` (parts in hand) and `DIARY` (entries, newest first) are at the top of `js/bloom.js`. the `BLOOM` block there holds the fallback numbers if `data/bloom.json` can't be read.
- build-log posts are plain html in the `#desk` section of `index.html`.

push to `main` and vercel deploys it.

## files

```
index.html                  page markup
css/bloom.css               styles
js/bloom.js                 stages, desk, diary, router, and the three.js cam with its shaders
data/bloom.json             live numbers, written by the feeder
feeder/                     typescript: reads the fee wallet over solana json-rpc
.github/workflows/fees.yml  runs the feeder every 15 minutes
pi/                         python + shell for the pi 5: camera and PIR sensors
img/                        desk photos (webp)
favicon.svg                 the seed glyph
```
