# Desk cam review log

Every attempt is logged here: shot or segment, try, what I saw, what I changed.

## Access and budget

| date | step | result |
| --- | --- | --- |
| 2026-11-23 | Create a capped AI Gateway key (`bloom-deskcam`, 7 days, $30) on the Vercel team | Refused by Vercel, 403: this connection or team role cannot create AI Gateway keys. No key was created. |
| 2026-11-23 | Read the AI Gateway credit balance | Not possible without a key. Balance unknown. |
| 2026-11-23 | OpenArt | Dropped, as asked. Its connection was not signed in and nothing was sent to it. |

**Spent: $0.** No paid image or video model was called.

## What made what

| part | tool |
| --- | --- |
| Stills (the desk itself) | Cursor's built-in image generator, with the reference photos and crops of them as inputs. It returns 1280x720 and does not say which model it runs. 13 generations in total. |
| Depth | Depth Anything V2 Large (ONNX, on the CPU of this machine) |
| Camera moves, parallax, the five 1920x1080 stills | My own renderer (Python, numpy, OpenCV): one camera flying over one model of the desk |
| Laptop screen and Pi LED | Drawn per frame by the renderer: a Node.js file in an editor with a `node` process printing lines in the terminal below it, and the LED blinking |
| Stream look, overlays, encodes | ffmpeg |

No video model could be reached (no gateway key, OpenArt not signed in), so the loop is not generated video. It is a virtual camera with depth parallax over the generated desk. All five stills and every frame of the loop are views of the same desk model, so nothing on the desk changes between angles.

## Stills

The wide master was made first. The close views were then made as detail plates: a crop of the master plus a crop of the real photo went in, a sharp version of that crop came out, and it was registered back onto the master. The five stills are the renderer's frames at the five view points of the loop.

### Shot 5, wide (the master) — 3 tries, try 3 kept

| try | what I saw | what I changed |
| --- | --- | --- |
| 1 | Layout right: mat, laptop a little right of centre, monitor behind it to the left, boxes back left, tumbler, AirPods case, mouse, three PIRs, camera module and ribbon, fan, blue board, Pi 5, XVF3800 with flex and mic board, speaker. Wrong: invented lettering on the tumbler ("HRO"), "MacBook Pro" printed under the screen, a sidebar with names on the screen like the chat app, one extra loose USB-C cable in front. | Used try 1 as the reference and asked for those things only: plain bezel, editor across the full screen, plain tumbler, no loose cable. |
| 2 | Tumbler plain. Screen is a full-width editor with a terminal and the dock. Wrong: traces of the lettering still under the screen, the XVF3800 board came out short and malformed, a cable ran toward the camera. | Painted the lettering and the cable out by hand, put the result on a larger grey canvas and asked for the same scene from a little further back. |
| 3 | Whole laptop screen, monitor, wall and the right end of the mat in frame. Bezel plain. XVF3800 cable goes to the laptop. Wrong: one cable still ran toward the camera; the right-hand group was soft and missing the speaker's aux loop. | Kept. Painted that cable out by hand. The right-hand group was redone as a detail plate (shot 3). |

### Shot 1, centre — 1 try each for its two plates, both kept

| plate | try | what I saw | what I changed |
| --- | --- | --- | --- |
| fan, blue board, around the Pi | 1 | Fan with its wires and white connector, blue board with gold pads and USB-C end, all where the master has them. | Nothing. |
| laptop | 1 | Regular keys with clean legends, plain bezel under the screen, lid notch. The screen it drew is placeholder code. | Nothing. The screen is replaced by the renderer in every frame. |

### Shot 2, left — 1 try for the parts, 3 for the back of the desk, try 3 kept

| plate | try | what I saw | what I changed |
| --- | --- | --- | --- |
| mouse, three PIRs, camera module, ribbon | 1 | Three domes in a triangle on their boards, camera module lens up, amber ribbon not plugged in. | Nothing. |
| wall, monitor foot, boxes, tumbler | 1 | Fine as a picture, but its window ended halfway down the tumbler and the AirPods case, so the seam with the parts plate would have cut through both. | New window that reaches below the tumbler's base, so both sit wholly inside it. |
| wall, monitor foot, boxes, tumbler | 2 | Would not register onto the master: the model had reframed it, the tumbler sat about 30 px higher, and two extra PIR domes had been pulled in because the prompt named the PIRs. | Prompt without the PIRs, and "do not reframe, things cut by the edge stay cut at the same point". |
| wall, monitor foot, boxes, tumbler | 3 | Registered. Seam invisible against the master. | Nothing. |

### Shot 3, right — 2 tries, try 2 kept

| try | what I saw | what I changed |
| --- | --- | --- |
| 1 | Speaker with mesh top, aux cable looped once, jack plug, white flex with blue ends, round mic board with three buttons: right. Wrong: the XVF3800 was a short board with two silver connectors, not the board in photo C. | Asked for one edit, that board only, with the photo C crop as its reference. |
| 2 | Board has the USB-C port, the square chip, the crystal, the gold pads and the white flex connector. Black USB-C cable runs from it to the laptop's right side. | Nothing. |

### Shot 4, parts close-up — 1 try, kept

| try | what I saw | what I changed |
| --- | --- | --- |
| 1 | Before generating, a stray green dot on the mat beside the board was painted out of the crop. Result: "Raspberry Pi 5" lettering and logo correct, header, heat spreader, USB and Ethernet blocks in the right places, black USB-C power cable seated, green LED lit beside the port. | Nothing. |

This shot is not as low as the brief describes. The camera cannot get that low over a model built from one viewpoint, so the laptop's palm rest and keyboard sit soft behind the Pi instead of the green wall.

### Checklist on the final five stills

- No chat app, names, avatars, messages, wallets or addresses. The screen shows code and terminal lines only, and no line numbers.
- No lettering under the laptop screen. No lettering on the tumbler.
- No tissue, wrapper or trash.
- Pi 5 has its USB-C power cable and the LED is lit in all five.
- All 1920x1080.

## Video

Passes 1 to 4 made a 30 s loop that travelled between five views. Pass 5 replaced it with what is in the folder now: one view, one minute. Both are logged here.

### Passes 1 to 4: the 30 s loop with five views (replaced)

That loop was one continuous render of 900 frames, so the six segments were not made separately. Each full render covers A to F. There were four full renders. After each one I looked at a frame every 0.5 s and at the three frames either side of every boundary (6, 11, 16, 21, 26 s and the loop point).

| pass | where | what I saw | what I changed |
| --- | --- | --- | --- |
| test frames | B, E | Dotted fringes along the outline of the tumbler when the camera slid sideways. | Outlines got a soft edge and a second layer behind them, so the slide shows what is behind a part instead of stretching its edge. |
| 1 | A, and at every view | The camera almost stopped at each of the five views (0.54 px a frame at 3.4 s). The brief says it is always moving. | The six camera axes now reach each view at slightly different times, so one of them is always moving. Slowest point is now about 0.8 px a frame. |
| 1 | all | Line numbers in the editor. The brief says no numbers anywhere. | Removed. The gutter has fold marks and change bars instead. |
| path check before 2 | A, B, F | With the new timing the frame reached past the edge of the desk model in three places (5.2, 10.6, 26.3 s). | Moved the look-at point in a little at those three keys. All 900 frames stay inside in passes 2, 3 and 4. |
| 2 | C | The Pi's LED was dark in the still at 16.0 s. | Blink is now 1.4 s on, 0.6 s off. It is lit at all five stills and fits the loop exactly 15 times. |
| 3 | C, D | "Raspberry Pi 5" on the board looked garbled when the camera was low over it. The lettering itself was clean; steps in the depth at the header and the chips ran through it. | The whole board now lies on one plane just above the mat. |
| 3 | E, B | A comb-like smear on the wall right of the tumbler around 24.5 s, and a thin wobbly dark line beside it around 7.5 s. | Rebuilt the layer behind the parts: on the mat the parts are taken out and the mat filled in; behind the monitor, the stand and the boxes the wall's own colour is carried in. Rays that pass behind an outline always use that layer. |
| 4 (final) | all | All 60 half-second frames and every boundary are clean. Camera moves through every boundary without a stop or a jump. What is left: a soft lighter patch on the wall right of the tumbler's rim around 24 to 25 s, which reads as the wall glow. | Kept. |

Tries per segment: every segment was rendered four times, because the loop is one piece. The table says which segment each fault was in. F had none of its own.

### Pass 5: one still view, one minute (the loop in this folder)

Feedback on the 30 s loop: the zooms and the travelling between views were wrong. The camera should stay where it is, on the Mac and the parts, and move only very slightly and very slowly. The code on the Mac should look like it is running and thinking. It should be about a minute long, and it should feel like a live view, so the loop must not be felt. Nothing new was to be generated.

| what | before | now |
| --- | --- | --- |
| Length | 30 s, 900 frames | 60 s, 1800 frames |
| Camera | Flew between five views, pushed in and pulled back | One view. No zoom, no travel. It sways about 3 cm sideways and under 1 cm up and down over the whole minute, so the angle changes a little and it never fully rests |
| Speed in the picture | 0.8 px a frame at its slowest | 0.18 px a frame at its fastest, usually under 0.07 |
| In frame | Changed with each view | Always: the whole laptop screen, keyboard, tumbler, AirPods case, three PIRs, camera module and ribbon, fan, blue board, Pi 5, XVF3800 board and flex, speaker |
| Laptop screen | Editor scrolling, log lines appearing | The same Node.js file and process. Log lines arrive at uneven gaps. Five times a minute bloom's own line says "thinking" with moving dots for 2.6 s and then types a short thought. A dot beside the process name pulses. The editor glides to another part of the file every 10 s |
| Stills and desk model | | Unchanged. Nothing was generated for this pass |

Checks on this pass:

| check | result |
| --- | --- |
| Path scan, every 30th frame | No part of any frame reaches past the desk model. First framing tried went past its top and right edges by up to 2.5%; moved the view in and made the sway smaller |
| Render | One try, 1800 frames in four parts, each reporting nothing outside the model |
| Frames at 0, 13, 31 and 47 s at full size, and a frame every 5 s on a sheet | Framing the same throughout, parts sharp, overlays in place, screen readable as code and a log |
| Screen at 3.2, 4.6, 6.5, 31, 47 and 58 s | Log grows, "thinking" shows before a thought, the thought is typed out, the editor is at a different part of the file |
| Loop point | Everything that moves repeats in exactly 60 s: the sway, the log (its last line leads into its first), the editor position, the LED (30 blinks) and the REC dot (60 blinks). Last two frames against the first two: no shift in the picture |

### What moves

- The camera, by a few centimetres over the minute.
- The Pi's LED.
- The laptop screen: the log, the thoughts being typed, the pulsing dot, the editor gliding.
- The red REC dot.
- Nothing else. No hands, nothing on the desk shifts.

## Edit (ffmpeg)

- 1920x1080, 30 fps, 1800 frames.
- Look: `gblur=sigma=0.55`, `vignette=angle=PI/6.5`, `noise=alls=7:allf=t+u`.
- Overlays in JetBrains Mono, white at 80%: "bloom.cam" top left; red dot and "REC" top right, the dot on for the first half of every second; the view name "center" bottom left for the whole loop, since there is one view now. No clock. The word "LIVE" does not appear.
- A keyframe every 300 frames exactly (`keyint=300:min-keyint=300:scenecut=0`), so the loop point is a keyframe like the five others in the file.

Encoder tests for the loop point, on the first 12 s: at 720p and CRF 28 the encoder holds the grain almost still between keyframes and refreshes it at each one. Nine settings were tried (`ipratio`/`pbratio`, `no-mbtree`, `qcomp`, `-tune grain`, a fixed grain pattern, a keyframe every 2 s) and none removed that refresh, so the choice was to make the loop point one of the regular refreshes instead of the only one. CRF stays at 20 and 28 as the brief says.

## Final check

| check | result |
| --- | --- |
| `deskcam-loop.mp4` | H.264, 1920x1080, yuv420p, 30 fps, 1800 frames, 60.000000 s, video stream only, faststart, CRF 20, 27.9 MB |
| `deskcam-loop-720.mp4` | H.264, 1280x720, yuv420p, 30 fps, 1800 frames, 60.000000 s, video stream only, faststart, CRF 28, 1.2 MB |
| `deskcam-poster.jpg` | first frame, 1920x1080 |
| `shot-1-center.png` to `shot-5-wide.png` | 1920x1080, unchanged from pass 4 |
| Contact sheet, a frame every 5 s | 12 frames, one view, overlays in place |
| Loop point, last second then first second | Camera, screen and LED carry on. Frame-to-frame change (blurred, mean of 255) at 1080p: 0.89 across the loop point, 0.82 to 0.87 at the other keyframes, 0.30 between ordinary frames. At 720p: 1.33 across the loop point, 1.00 to 1.15 at the other keyframes, 0.07 between ordinary frames |

Not ideal, and left as it is:

- At 720p the grain refreshes every 10 s, and the refresh at the loop point is a little stronger than the others (1.33 against 1.15 at most). Nothing in the picture moves at it; the texture is redrawn. Scaled to the bloom.cam panel (356 px wide) it comes to 1.2 brightness levels of 255 on average at a keyframe and 1.5 at the loop point, with one pixel in a hundred changing by 6 or 7. I measured it; I could not judge by eye whether it shows in playback.
- The 1080p file is 27.9 MB for the minute. The site plays the 720p file.
- The bottom-left label says "center" all the time.
