# Eye preview review log

What is in this folder, how it was made, what was checked and what is not ideal.

## What this is

bloom.cam's `eye` view is for the Raspberry Pi Camera Module 3. The module is on the desk and not wired in yet, so until it sends, the view plays `eye-preview-720.mp4`: a made three-minute loop of the module's point of view from where it lies.

The camera did not take it, and the site does not say it did. The caption under it on the page reads `Raspberry Pi Camera Module 3 pov · preview`. Nothing in the picture says so: an earlier export had `preview` written top right in the video, and it was taken out because it spoiled the picture. The first real frame from `pi/live.py` replaces the loop.

The loop has been made twice. The first was one minute long, with the parts lying loose on the mat and only the editor on the laptop. The second, the one in this folder now, is described under "Second pass" below. The sections before it describe the first pass, and what they say about the view, the lens, the focus, the knocks and the look still holds.

## Access and budget

- Four image generations with Cursor's built-in image generator: three for the still, one in the second pass for the cabling. It returns 1280x720 and does not say which model it runs.
- No video model and nothing paid. Everything after the still is my own renderer and ffmpeg, on this machine.
- The reference photos of the desk were used as inputs with the laptop screen painted over first, because a chat app was open on it when they were taken. They are not in the repo.

## What made what

| part | tool |
| --- | --- |
| The still (the desk from the camera's spot) | The image generator, from two low-angle reference photos and two of the desk loop's stills (the wide one and the parts close-up) |
| Depth | Depth Anything V2 Large (ONNX, on the CPU of this machine) |
| Lens, focus, knocks, exposure | My own renderer (Python, numpy, OpenCV) |
| Laptop screen and Pi LED | Drawn per frame by the same code as the desk loop |
| Look, label, encodes | ffmpeg |

## The still: 3 tries, try 3 kept

| try | asked for | result |
| --- | --- | --- |
| 1 | A new photo from 4 cm above the mat at its front-left corner, looking across the desk at the laptop | Rejected. It came out as the desk loop's view from a little lower: squared up to the laptop, looking down at the mat, no tilt |
| 2 | One of the low reference photos shot again from where the camera module lies, with a wider lens and a 5 degree tilt, the parts laid out as in the desk loop | Right place and height, but the laptop screen ran out of the top and right of the frame, the Pi did not look like a Pi 5, and a cable joined it to the blue board |
| 3 | Try 2 set smaller and tilted on a grey canvas, the generator asked to carry the scene on into the grey, and to redo the Pi 5 and remove the cable | Kept. The whole screen is in frame with wall above it, the PIR domes are close in the foreground, and the tumbler, AirPods case, fan, blue board, Pi 5, ribbon and speaker are where they are in the desk loop |

The plan allowed for close-up plates of single parts. None were made: the user asked not to spend generations that were not needed, and the still held up at output size.

## From the still to the loop

One still view. The camera does not travel, because a camera module lying on a mat does not.

| what | how |
| --- | --- |
| Size | The still is 1280x720, enlarged to 1920x1080 with a little sharpening |
| Headroom | 96 rows added above the top edge, carried up from the top rows of the still (plain wall and the back of the monitor), so that the bent lens still holds the whole laptop lid |
| Lens | A wide one: straight lines bow outward toward the edges, red and blue separate slightly in the corners, and the corners are softer than the middle |
| Haze | A soft green glow around the lit wall, as a small smudged lens gives |
| Focus | Rests on the middle of the desk, so the nearest dome and the far wall are a little soft. Twice a minute (at 21.9 and 35.3 s) it goes looking: runs near, swings back past where it was and settles, in 1.7 s |
| Knocks | Three a minute (at 11.3, 34.8 and 52.2 s): the picture jumps by up to 7 pixels, rings at about 11 times a second and is still again within 3 s. The frames a knock lands in are smeared |
| Exposure | Wanders by up to 3% over the minute and follows the brightness of the laptop screen a little. White balance moves by under 1% |
| Laptop screen | The same drawing as the desk loop, at the same moment of the minute: a Node.js file in an editor that does not move, and a `node` process printing whole lines under it. Nothing is typed. Seen from the side, so a little dimmer, with its glow over the bezel |
| Pi LED | Blinks every 2 s, as in the desk loop |

In the first pass both loops were 60 s long and the site started each one at the point the clock says, so the laptop showed the same log line in both views at any moment. The desk loop is not shown on the site any more, and this loop is now 180 s.

## Second pass: some parts cabled, a split screen, three minutes

Asked for: the same view, placement, shake, focus blur and look, with some of the parts cabled together and to the laptop, the sensor domes a little lit, the laptop showing Node.js on the left and bloom's diary on the right, and a loop of three minutes.

### The still: one generation, part of it used

The current still was given back to the generator with a request to leave everything where it is and add cables and softly lit domes. The result was laid over the current still (SIFT matches and a homography: 496 of 539 matches kept, the two pictures 0.44 px apart on average before aligning), so the screen outline, the depth and the LED position from the first pass were reused as they were.

Only part of the edit was taken, 20.6% of the picture:

| from the edit | taken | why |
| --- | --- | --- |
| Three wires from the nearest-right PIR to a plug on the Pi | yes | |
| The fan's lead to a small plug beside the laptop, a black plug in the laptop's front-left edge, and three wires from there to the Pi's pin header | yes | |
| The camera ribbon seated in the Pi's connector and running out of the bottom of the frame | yes | The loose ribbon and the loose power cable of the first still are gone with it |
| The domes, lit | 55% of it | In the edit they were as bright as lamps |
| Wires from the two left PIRs | no | They ended bare on the mat, connected to nothing. Those two sensors are still not wired |

So one PIR, the fan and the camera ribbon are connected, and the Pi is cabled to the laptop. Two PIRs, the blue board and the speaker are not.

### The laptop screen

Two windows side by side, drawn per frame as before.

| | |
| --- | --- |
| Left, top | The editor with `bloom.js`. Still: no caret, no scrolling |
| Left, bottom | The terminal, `node bloom.js` printing. 89 lines in the three minutes, each one there or not there, 17 of them thoughts that show `thinking` first and then the whole sentence. The 17 thoughts are all different. The other lines are short reports (motion, a frame saved, a voice, fees, the fan) put together by a seeded random script: the longest run of lines that comes twice in the three minutes is 3. No digits |
| Right | A browser window with one address field (`bloomexperiment.tech`, no tabs) on the diary page, as a screenshot of the live site at that width. It does not scroll. It is shown at 62% of its brightness, and its glow over the bezel is spread less, so a white page in a dim room does not burn out |

Checked on the drawing itself, five looks a second for 180 s: the editor and the browser never differ from the first frame; the terminal changes 104 times; one frame after it appears, each of the 89 lines reaches its full width (within 4.5 px), and a thought shows only `thinking` until its sentence is printed.

### The camera

Unchanged: the same lens, focus, knock and exposure code with the same numbers. For three minutes there are nine knocks (at 11.3, 34.8, 52.2, 69.9, 93.4, 112.6, 126.8, 149.3 and 171.0 s) and six focus hunts (at 21.9, 35.3, 70.4, 98.6, 127.3 and 161.8 s), the first minute's being the ones the first pass had. The exposure wanders as it did over one minute, with a slower drift of under 1% across the three.

## Edit (ffmpeg)

- 1920x1080, 30 fps, 5400 frames (1800 in the first pass).
- Look: `gblur=sigma=0.75`, `eq=contrast=0.95:saturation=0.90`, `vignette=angle=PI/4.6`, `noise=c0s=10:c0f=t+u:c1s=6:c1f=t+u:c2s=6:c2f=t+u`. Softer, flatter and darker in the corners than the desk loop, as a small sensor behind a small lens is.
- One label in JetBrains Mono, white at 80%: `bloom.eye` top left, for the whole loop, as the desk loop has `bloom.cam`. No red dot, no REC, no clock, no date. The word "LIVE" does not appear. That it is a preview is said in the caption on the page.
- A keyframe every 300 frames exactly, so the loop point is a keyframe like the 17 others in the file.

Encoder settings: with the first noise setting the 1080p file came to 126 MB at CRF 20, and the 720p file at CRF 28 was blocky. Five pairs of noise strength and CRF were tried on the first 10 s. Kept: the noise above with CRF 22 for 1080p and CRF 25 for 720p. In the second pass the 720p file, the one the site plays, kept CRF 25. The 1080p file went to CRF 24, to keep three minutes at about the size one minute had.

## Final check (second pass)

| check | result |
| --- | --- |
| `eye-preview.mp4` | H.264, 1920x1080, yuv420p, 30 fps, 5400 frames, 180.000000 s, video stream only, faststart, CRF 24, 17.5 MB |
| `eye-preview-720.mp4` (the one the site plays) | H.264, 1280x720, yuv420p, 30 fps, 5400 frames, 180.000000 s, video stream only, faststart, CRF 25, 3.1 MB |
| `eye-preview-poster.jpg` | first frame, 1920x1080 |
| Keyframes | Every 10 s in both files, 18 in all |
| A frame every 15 s (720p) | 12 frames, one view, `bloom.eye` top left in every one and nothing else written in the picture |
| Full frames | A clean frame at 47.0 s and one at 127.6 s (mid focus hunt) before the edit, the 720p export at 104.0 s. Cables, plugs and domes as described above, the screen readable as an editor, a log and the diary |
| Loop point, the last frame against the first | Frame-to-frame change (each frame at 640 px wide and blurred, mean of 255) at 1080p: 0.39 across the loop point, 0.34 to 0.45 at 16 of the 17 other keyframes. At 720p: 0.51 across the loop point, 0.43 to 0.58 at those 16 |
| The seventeenth, at 70 s | 3.4 in both files. It falls a tenth of a second after the knock at 69.9 s, so the change is the knock |
| Largest change in the file | 6.0, at 93.4 s: a knock |
| Screen | See "The laptop screen" above |
| On the page, at 1360 and 390 px wide | The 720p file plays, 180 s long, at the second the clock gives. Caption: `Raspberry Pi Camera Module 3 pov · preview`. Label for screen readers: "a preview of the Raspberry Pi Camera Module 3's point of view". No sideways scroll, no page errors |
| `npm test` | 6 of 6 pass |

## Not ideal, and left as it is

- The still is 1280 px wide and enlarged by half. Small print on the boards is soft at 1080p. The site shows the loop in a panel at most 356 px wide.
- The picture shows the desk as it will be, not as it is: one PIR, the fan and the camera ribbon cabled, the Pi's LED blinking. That is why the caption says preview.
- A real PIR dome has no light inside it. The domes are lit because that was asked for, at about half of what the generator drew.
- The Pi's own power cable is not in the picture any more. The only cable between the Pi and the laptop is the three-wire one to the pin header.
- The diary on the right is a screenshot of the site taken on the day the loop was made. It does not follow new entries, and it does not scroll.
- The Pi 5, the blue board and the PIRs are the generator's drawings of those parts, close to the real ones but not exact.
- Nothing on the desk moves and nobody walks past. The real camera will see more than this.
- The knocks and focus hunts come at the same seconds of every three minutes. Somebody who watches for a long time can learn them.
- At 720p the grain is redrawn every 10 s at a keyframe, as in the desk loop. In the second pass that is also nearly true of the 1080p file (change between ordinary frames 0.04, where it was 0.14 at CRF 22). The site does not play that file.
- I judged the loop from frames and measurements, not from playback.
