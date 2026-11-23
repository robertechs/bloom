# Desk cam inventory (ground truth)

Written from the three reference photos, studied as full frames and as native-resolution crops of every object.

- Hex values are medians sampled from the photos. They are the colours as photographed in low light, not catalogue colours.
- Sizes marked **spec** are the part's published size. Sizes marked **est.** are judged against a known part in the same photo.
- Positions come from the layout map in the brief. Looks come from the photos. Where the two disagree on looks, the photos win.

## The three photos

| file | size | viewpoint | shows |
| --- | --- | --- | --- |
| `ref/photo-a.png` | 2486x1860 | From above the front of the mat, looking down and slightly toward the back-left. Left and right match the stream camera. | fan, blue board, Pi 5, laptop keyboard and trackpad, tumbler, AirPods case, mouse |
| `ref/photo-b.png` | 2470x1848 | A few cm above the mat at its front edge, in front of the laptop, looking toward the back-left (roughly 40 degrees left of straight back, by my estimate). | three PIR sensors, Camera Module 3, ribbon cable, monitor and stand, dark boxes, AirPods case |
| `ref/photo-c.png` | 2482x1856 | Same viewpoint and background as photo B. | XVF3800 board, flex cable, round mic board, speaker and aux cable |

## Light

**Colour to match on every shot: photo C.**

| where | photo C (target) | photo B | photo A |
| --- | --- | --- | --- |
| wall, lit area left of the monitor | `#6db369` to `#72bc73` (hue about 120, medium saturation) | `#817e47` (yellow-green, not the target) | `#3f5738` (same green, dimmer) |
| narrow brightest band at the far left of the wall | `#98f1af` | `#f1eb7e` | not in frame |
| wall right of the monitor stand | `#918e5d` (green mixed with warm white) | `#716644` | not in frame |

**Direction**

- The key light is the green LED wash on the white wall behind the monitor. It is strongest left of the monitor and around the monitor's edges, and it fades to a warm cream toward the right.
- The scene is therefore backlit. Parts have rim light on their tops and back edges, their camera-facing sides are in shadow, and their soft shadows fall forward, toward the camera.
- Green spill on the mat is strongest at the back and left and weakest at the front-right: in photo C the mat goes from `#1e2518` at the left to `#1e1c14` at the right.
- A weak warm-white room light from above and from the camera side fills the front. It is what shows the true colours of the boards in photo A, and it gives the pale desk strip in front of the mat its cream tone (`#a99884`).
- The laptop screen adds a faint cool glow on its own keyboard and on anything directly in front of it.
- A tiny amber point of light sits low on the monitor stand's neck in photos B and C.

**Exposure**

- Night, low light, visible sensor noise. Blacks sit around `#110e0b` to `#181713`.
- No hard shadows anywhere.

## Room and furniture

**Wall**
- Plain white or off-white, no decoration, lit as above.
- In photos B and C a narrow, much brighter vertical band runs down the far left of the wall. I can't tell whether it is the light source's edge or a gap.

**External monitor**
- Dark (off or black screen), thin black bezel.
- Photos B and C show only its lower-left part, at the top of the frame.
- It stands behind the laptop, shifted left: in photo A its stand is behind and just left of the laptop's back-left corner.

**Monitor stand**
- Black rectangular neck, a wide flat column.
- Round flat black base, glossy enough to mirror the green wall (photo A).

**Dark boxes, back left**
- Two or three black rectangular boxes or devices stacked against the wall: a wide flat one at the bottom, a narrower taller one on top at the left, another beside it at the right.
- Out of focus in every photo. They read as dark silhouettes against the lit wall.

**Cables**
- Several thin black cables. Two drape from the monitor down toward the right, behind the laptop. Others lie along the desk behind the laptop and toward the back-left.
- One black cable is plugged into the laptop's left side near the hinge. A small black block sits at that spot in photos B and C (its plug or a dongle).

**Desk top**
- A pale, smooth strip shows in front of the mat in all three photos: `#a99884` in A, `#93805c` in B, `#8ba572` in C (green-lit).
- In photo A a darker grey-brown band (`#4b433b`) runs below that strip: the desk's front edge.
- Beside the mat in photos B and C the surface is smooth and reflective, mirroring the wall light.
- I read it as a light-coloured, slightly glossy desk top. The photos don't show enough of it to be certain.

**Desk mat**
- Black felt-like fabric with a fine pebbled weave.
- Stitched (overlocked) border in black thread, about 5 mm wide and slightly raised.
- Colour: `#181713` in A, `#110e0b` in B, `#1e2518` in C where the green falls on it.
- Large desk-mat format. No single photo shows both ends.

**MacBook Pro**
- Space grey: palm rest `#424338` (A), body `#423d39` (C).
- Black keys with white legends in a dark keyboard well. Bottom-left keys read fn, control, option, command.
- Large trackpad, centred.
- Lid notch in the middle of the front edge. It shows as a lighter sliver in all three photos.
- Thin black screen bezel.
- 14-inch or 16-inch: I can't tell from the photos.

**Screen, as photographed (not to be reproduced)**
- All three photos show a chat app sidebar with round avatars and names. Photo C adds a code editor to the right of it.
- Photo A also shows a dark green nebula wallpaper.

**Screen, for the stills**
- Dark-theme code editor, full screen: near-black background, small lines of code in blue, yellow, green, pink and orange, a line-number gutter, a terminal panel. Photo C's editor area is the model for the look.
- macOS dock centred at the bottom: a translucent dark rounded bar with about eight small icons. No chat app icons.
- Nothing readable: no names, avatars, messages, wallets, addresses or numbers.

## Parts on the mat

### Centre group (photo A)

**Raspberry Pi 5**
- Bare board, no case, no cooler, fan not mounted.
- 85 x 56 mm (spec).
- Green PCB (`#2f3d2b`), four mounting holes with yellow-gold rings (`#8a8148`).
- White "Raspberry Pi 5" lettering and white raspberry logo on the top face.
- Square silver heat spreader on the main chip, left of centre. Silver shielded module at the back-left corner. Several black chips.
- Black 40-pin header (2 x 20, bare pins) along the back long edge, the edge toward the laptop.
- Right short edge: two stacked silver USB-A blocks, one with blue inserts, and the silver Ethernet jack nearest the camera.
- Front long edge, toward the camera: small silver ports (USB-C power and micro-HDMI).
- Metal parts photograph as `#6c665c`.
- No LED is lit in the photo.
- Orientation: long side roughly parallel to the laptop's front edge, turned about 20 degrees so the USB/Ethernet end sits further back than the left end.
- Position: 4 to 5 cm in front of the laptop's front edge, in front of the left part of the trackpad.

**Blue board**
- Dark blue PCB (`#1a232f`), rectangular with rounded corners.
- About 55 x 33 mm (est. against the Pi 5 beside it): roughly two-thirds of the Pi's length.
- Four mounting holes with gold rings (`#907f5e`), one at each corner.
- Rows of small gold-ringed through-hole pads along both long edges. No headers soldered.
- One short end carries a silver USB-C port and, beside it, a white JST connector.
- A square black chip in the centre, two smaller black chips, one small silver-white square part near the other end.
- Orientation: diagonal, about 45 degrees to the laptop's front edge, with the USB-C end pointing to the front-right, toward the Pi's front-left corner.
- Position: left of the Pi 5, about 1 cm between their nearest corners.

**Fan**
- Loose, lying flat, not mounted on anything.
- 40 x 40 x 10 mm (spec, and it measures 40 mm against the Pi).
- Black square frame (`#1a1a16`) with a round mounting hole in each corner, seven curved black blades, a plain round black hub.
- Four wires side by side leave one corner: black, red (`#5f312b`), yellow (`#7e6440`), blue (`#25304a`). About 8 cm long.
- The wires end in a small white 4-pin connector.
- Position: touching the laptop's front-left corner, behind and slightly left of the blue board.
- The wires arc up over the laptop's front-left corner and the connector lies at the laptop's front edge.
- Two tiny silver screws lie at the fan's back-left corner. Too small to matter at stream resolution.

### Left group (photo B)

**PIR motion sensors, three**
- HC-SR501 type. Board 32 x 24 mm, dome 23 mm across (spec).
- Milky white translucent dome on a square white flange (`#65584b` as photographed in warm light).
- Small green PCB (`#373f25`) under each dome, barely wider than the flange.
- Each stands dome-up on the black pins and parts under its board, so the board floats about 1 cm above the mat. Orange-tan trim pots are visible underneath.
- Layout: a loose triangle, about 7 cm between neighbours. As photo B shows it: one nearest at the left, one at the right, one further back between them.
- No wires attached.

**Camera Module 3**
- 25 x 24 mm (spec), lying flat, lens up.
- Green PCB (`#25301c`) with four gold-ringed mounting holes (`#5f5032`) and small white markings.
- Black square lens housing in the middle with a short round black lens barrel. An amber-brown connector part in front of it.
- The ribbon is **not** plugged into it.
- Position: in front of the PIR triangle, nearer the camera.

**Camera ribbon cable**
- Flat flex cable, amber-gold (`#372513` as photographed, warm highlights), translucent, with fine parallel traces visible along its length.
- About 16 mm wide and 20 cm long (est. against the camera module).
- The far end has a small white stiffener tab. The near end has a white stiffener band and a black tip.
- Lies loose in a shallow S-curve, lifting slightly off the mat, running from just right of the camera module toward the front-right.

### Right group (photo C)

**XVF3800 board**
- Green rectangular PCB (`#2d3d2a`), about 50 x 25 mm (est.).
- Silver USB-C port standing on one short end.
- White FPC connector on the other short end, where the flex cable plugs in.
- Rows of small gold pads along both long edges, a mounting hole in each corner.
- One large square black chip, one smaller black chip, one small oval metal crystal.

**Flex cable**
- White flat flex (`#a89c7e` as photographed), about 12 mm wide and 10 cm long (est.).
- Blue stiffener (`#213242`) at both ends.
- Lies in a gentle wave, plugged into the XVF3800 board at one end and the round mic board at the other.

**Round mic board**
- Round green PCB (`#2e402c`), about 40 mm across (est.).
- Four gold-ringed mounting holes (`#746951`) spaced around the edge.
- Black rectangular chip in the centre.
- Three small square parts around it, silver bodies with round black caps. The brief calls them buttons.
- White FPC connector at the edge where the flex arrives.

**Speaker**
- Round, matte black (`#0f100b`), a squashed ball about 50 mm across and 35 to 40 mm tall (est.).
- Black perforated metal mesh on top, slightly domed.
- A horizontal seam around the middle.
- Thin black aux cable from its left side, looped once on the mat, ending in a 3.5 mm plug with a black grip and a silver tip. A second black moulded end lies just behind the plug, out of focus.
- Position in photo C: behind the XVF3800 board, close to the laptop's front edge.

## Other objects

**Tumbler**
- Clear, slightly frosted plastic tumbler with what looks like a straw inside. About 9 cm across at the base (est.); its top is out of frame in photo A.
- Picks up the green light strongly (`#4a6b4a`).
- Dark printed lettering on its side, only fragments visible. It must not become readable text.

**AirPods case**
- White glossy AirPods Pro case (`#787768` as photographed), about 6 x 4.5 cm.
- Lying flat with its port end toward the camera.

**Mouse**
- Black matte wired mouse, large and rounded, at the far left of the mat.
- A black cable leaves its front and loops toward the back.

## Allowed additions (not in the photos)

- **Pi 5 power:** a black USB-C cable plugged into the Pi's USB-C power port, which is at the left end of its front long edge. The Pi's tiny status LED, at the front-left corner, is lit green.
- **XVF3800 cable:** a black USB-C cable plugged into the board's USB-C port.

Routing I will hold constant across all five shots:
- The Pi's cable leaves the port toward the camera, curves slightly left and runs off the front edge of the mat.
- The XVF3800's cable curves back behind the speaker and runs off along the laptop's right side.

## In the photos, not in the stills

- The chat app, its avatars and names (all three photos), and the Telegram icon in the dock (photos B and C).
- The plastic wrapper beside the tumbler (photo A).
- The tissue at the right edge (photo A).
- The green translucent plastic piece at the right edge (photo A): not in the layout map.
- A pale strip under the mouse cable at the far left edge (photo A): unidentified.
- White dust specks on the mat (photo A).

## Where the sources disagree, and what I use

| point | sources | used |
| --- | --- | --- |
| Wall light colour | Green in A and C, yellow-green in B | Photo C's green, per the brief |
| Laptop position on the mat | In A the mat continues well left of the laptop. In B and C the mat's left edge lines up with the laptop's left side | The layout map: the mat runs across the whole front of the desk and carries all three groups |
| Tumbler and AirPods case | In B the case sits on the bare desk beside the mat. In A it sits left of the laptop next to the tumbler | The layout map: behind the PIR sensors, left of the laptop |
| Fan wires | Brief says red, blue and yellow. Photo A shows a fourth, black wire | Four wires, as photographed |
| Mic board parts | Brief says three small black buttons. Photo C shows silver square bodies with black round caps | As photographed |
| Camera ribbon ends | Brief says white ends. Photo B shows one white end and one white band with a black tip | As photographed |
| Where the part groups sit | In the photos each group was shot at the same spot in front of the laptop | The layout map: left, centre, right |

## Layout, seen from the stream camera

The camera stands at the front of the desk and faces the laptop. Left and right below are the camera's.

```
                         white wall, green LED wash
  [dark boxes]     [ dark monitor on round black stand ]       black cables
 ------------------------------------------------------------------------------
  tumbler  AirPods     +--------- MacBook Pro ---------+
                       |  screen: code editor + dock   |
                       |  keyboard                     |
  mouse      PIR       |  trackpad                     |
          PIR   PIR    +------------- notch -----------+   aux ~ speaker
            camera   fan                                  XVF3800 == flex == mic
            module    blue board   Pi 5
              ~ ribbon               |
                                     | USB-C power
 ======================= stitched front edge of the mat =======================
                                  stream camera
```

- **Left:** mouse at the far left. PIR triangle, with the camera module in front of it and the ribbon to its right. Tumbler and AirPods case behind them, left of the laptop.
- **Centre, in front of the laptop's left half:** fan at the laptop's front-left corner, blue board in front of the fan, Pi 5 to the right of the blue board.
- **Right:** speaker nearest the laptop with its aux loop to its left. In front of it the XVF3800 board on the left, the flex running right to the round mic board.
- **Back:** monitor on its round stand behind the laptop, dark boxes at the back left, cables behind.
