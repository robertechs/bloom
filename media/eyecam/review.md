# Eye preview review log

What is in this folder, how it was made, what was checked and what is not ideal.

## What this is

bloom.cam's `eye` view is for the Raspberry Pi Camera Module 3. The module is on the desk and not wired in yet, so until it sends, the view plays `eye-preview-720.mp4`: a made one-minute loop of the module's point of view from where it lies.

The camera did not take it, and the site does not say it did. The caption under it on the page reads `Raspberry Pi Camera Module 3 pov`. An earlier export had `preview` written top right in the video, and it was taken out because it spoiled the picture. The first real frame from `pi/live.py` replaces it.

## Access and budget

- Three image generations with Cursor's built-in image generator. It returns 1280x720 and does not say which model it runs.
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

Both loops are 60 s long and the site starts each one at the point the clock says, so the laptop shows the same log line in both views at any moment.

## Edit (ffmpeg)

- 1920x1080, 30 fps, 1800 frames.
- Look: `gblur=sigma=0.75`, `eq=contrast=0.95:saturation=0.90`, `vignette=angle=PI/4.6`, `noise=c0s=10:c0f=t+u:c1s=6:c1f=t+u:c2s=6:c2f=t+u`. Softer, flatter and darker in the corners than the desk loop, as a small sensor behind a small lens is.
- One label in JetBrains Mono, white at 80%: `bloom.eye` top left, for the whole loop, as the desk loop has `bloom.cam`. No red dot, no REC, no clock, no date. The word "LIVE" does not appear. The caption on the page reads `Raspberry Pi Camera Module 3 pov`.
- A keyframe every 300 frames exactly, so the loop point is a keyframe like the five others in the file.

Encoder settings: with the first noise setting the 1080p file came to 126 MB at CRF 20, and the 720p file at CRF 28 was blocky. Five pairs of noise strength and CRF were tried on the first 10 s. Kept: the noise above with CRF 22 for 1080p and CRF 25 for 720p.

## Final check

| check | result |
| --- | --- |
| `eye-preview.mp4` | H.264, 1920x1080, yuv420p, 30 fps, 1800 frames, 60.000000 s, video stream only, faststart, CRF 22, 17.7 MB |
| `eye-preview-720.mp4` (the one the site plays) | H.264, 1280x720, yuv420p, 30 fps, 1800 frames, 60.000000 s, video stream only, faststart, CRF 25, 1.0 MB |
| `eye-preview-poster.jpg` | first frame, 1920x1080 |
| A frame every 5 s | 12 frames, one view, `bloom.eye` top left in every one. The top right corner, where `preview` was, compared in each against the export that had it: nothing is written there |
| Full frames at 24.9 s (720p) and 35.5 s (1080p) | Parts recognisable, screen readable as code and a log |
| Loop point, the last frame against the first | Frame-to-frame change (each frame at 640 px wide and blurred, mean of 255) at 1080p: 0.34 across the loop point, 0.30 to 0.31 at the other keyframes, 0.14 between ordinary frames. At 720p: 0.52 across the loop point, 0.43 to 0.52 at the other keyframes |
| Largest change in the file | 5.3, at 11.3 s: the first knock |
| Screen | The same drawing as the desk loop; its check is in `media/deskcam/review.md`, pass 6 |

## Not ideal, and left as it is

- The still is 1280 px wide and enlarged by half. Small print on the boards is soft at 1080p. The site shows the loop in a panel at most 356 px wide.
- In the picture the Pi has its power cable in and its LED blinking, and the camera's ribbon runs out of the bottom of the frame. The picture shows the desk as it will be. The caption only names the view.
- The Pi 5, the blue board and the PIRs are the generator's drawings of those parts, close to the real ones but not exact.
- Nothing on the desk moves and nobody walks past. The real camera will see more than this.
- The knocks and focus hunts come at the same seconds of every minute. Somebody who watches for several minutes can learn them.
- At 720p the grain is redrawn every 10 s at a keyframe, as in the desk loop.
- I judged the loop from frames and measurements, not from playback.
