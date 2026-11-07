# 08. Brand, design system and animation spec

Direction: a deep burgundy interface that carries the Alice logo. The red dot-matrix Indonesia map on burgundy is the one memorable element; everything around it is calm, spacious and readable on a projector. Dark (burgundy) is the default theme, with a cream light theme. Use system fonts only so the app works offline.

## 1. The logo and brand
**The logo** (file: `Square_ALICE_globe_logo_on_burgundy`, a square image): a globe seen over Southeast Asia and Indonesia, drawn as red landmass on a dark burgundy field, ringed by a thin cream circle, with the word **ALICE** across the middle in a heavy, wide, geometric sans-serif in cream. The globe is centered on the Indonesian archipelago, which is exactly the product's subject.
**Brand colors sampled from the logo:**
| Role | Value | Where it comes from |
|---|---|---|
| Burgundy | #2e000b | the logo's background |
| Brand red | #c6363c | the logo's landmass |
| Cream | #fdf5e9 | the logo's wordmark and ring |

**Using the logo**
- Always use the supplied image, never redraw or recolor it, and do not stretch it. Keep clear space around it of at least a quarter of its width. Minimum size 24 px.
- Placements: empty state, above the heading, as a large rounded tile (about 104 px, rounded corners, soft shadow; it already contains the wordmark, so do not repeat the name beside it; there is no login screen); sidebar header as a small rounded tile (about 30 px) next to the word **ALICE** typeset in the UI (see typography); assistant avatar as a circular crop (30 px); browser tab icon (a small square version); title slide of the deck at large size.
- The logo image keeps its burgundy square in both themes; on the cream theme it sits as a tile.
- **How Codex gets it:** the image file is copied into the web app's public assets by the team. Confirm with the organizers that bringing the logo image is allowed. If it cannot be brought, build a placeholder: a red disc with a thin cream ring and the word ALICE in a heavy geometric sans, and swap in the real file later.

## 2. Color tokens
| Token | Dark (default) | Light |
|---|---|---|
| background | #2e000b | #fdf5e9 |
| panel | #3a0814 | #fffaf2 |
| panel (raised) | #470d1b | #f6ead8 |
| line | #5e1a2a | #e6d5bd |
| line (strong) | #7a2a3a | #d6c0a4 |
| text | #fdf5e9 | #2e000b |
| muted text | #d9bdb6 | #7a4a52 |
| faint text | #a98388 | #876a6d |
| accent (brand red, for fills) | #c6363c | #b02a31 |
| accent hover | #d94a4f | #c4363b |
| accent as text or thin icon | #ff7f76 | #b02a31 |
| text on accent | #fdf5e9 | #fdf5e9 |
| good | #7fd6a4 | #1f7a4d |
| warn | #f2b84b | #9a6200 |
| bad (negative, backlash) | #ff6b61 | #c0392b |
| variant A | #fdf5e9 (cream) | #5b1e2c (wine) |
| variant B | #f2b84b (gold) | #925c00 |
| variant C | #f48fb1 (rose) | #b0306a |
| map dot (land) | brand red at about 42 percent opacity | brand red (#b02a31) at about 34 percent |
| glow | brand red at about 18 percent | brand red at about 12 percent |
**Rules:**
- Brand red is for brand chrome (primary buttons, active tab underline, selected states, the map land, focus accents). Brand red alone must never mean "error": negative and risk states use the brighter coral (bad) and always carry text or an icon ("!").
- Small red text on dark uses the lighter coral token, not the brand red (contrast below).
- Variants are always also labeled with their letter; color is never the only cue.
**Platform colors (audience stage):** dark: TikTok #fdf5e9, Instagram #f48fb1, YouTube #ff6b61, Facebook #f2b84b, X #b9a398, WhatsApp #7fd6a4. Light: TikTok #5b1e2c, Instagram #c2417a, YouTube #d6453a, Facebook #b9770e, X #7d6b66, WhatsApp #2e8b57.
**Data ramps:** sentiment and impact score run coral (low) to gold (mid) to soft green (high). Reach runs from a dim wine (#5e1a2a, or #e2c8b2 in the light theme) to cream (to brand red in the light theme). Backlash runs from the dim wine to coral. "Not reached" is faint grey.
**Contrast (measured):** cream on burgundy 17.3:1; cream on brand red 4.9:1 (fine for buttons); brand red on burgundy 3.6:1 (graphics only); coral text (#ff7f76) on burgundy 7.6:1; light theme accent #b02a31 on cream 6.0:1; light theme text #2e000b on cream 17.3:1.

## 3. Typography
Body: the system sans stack (system-ui, Segoe UI, Roboto, Helvetica Neue, Arial). Headlines and big numbers: a serif stack (Iowan Old Style, Palatino, Book Antiqua, Georgia) for character. **The wordmark ALICE in the UI** (sidebar header) is uppercase, extra bold, letter-spaced (about 0.16 em), echoing the logo. Numerals use tabular figures. Sizes: body 14 to 15 px; panel titles 13 to 14 px muted; section headings 18 to 30 px serif; hero headline 40 to 44 px serif; big metric numbers about 30 px serif. Sentence case elsewhere, no all-caps eyebrows, no tiny monospace labels.

## 4. Shape, spacing, depth
Radius 10 to 12 px for controls, 14 to 20 px for cards, 24 px for the large logo tile. Generous padding (14 to 26 px). Borders 1 px in the line color; shadows only on floating things (composer, popovers, tooltips, logo tile). Chips and tags are pill-shaped, 12 px text. Toggles are small pill switches. Focus rings are 2 px in the accent-as-text color with a 2 px offset.

## 5. Components
Buttons: primary (brand red fill, cream text, hover to the lighter red), default (raised panel with border), ghost, small, icon-only. Segmented controls (selected segment is red with cream text) for mode, metric, dimension and variant. Popovers anchored above the composer. Cards for questions, results, risks and fixes. Tables with a header row in the raised panel color. Tooltips on the map. Toast at the bottom center. A short full-screen flash in brand red at low opacity when a run completes. Status dots in the sidebar: grey idle, gold waiting for answers, cream pulsing while running, green when done.

## 6. Motion principles
Purposeful and short: 150 to 250 ms for hover and toggles, 400 to 500 ms for content entering (fade up a few pixels), numbers counting up and bars growing over about 900 ms, tab panes fade up. Respect reduced-motion: shorten and simplify. Never block the user with animation; Skip and Cancel are always available in the run view.

## 7. The dot-matrix map
- Hex-offset grid of small squares about 0.3 degrees apart over the land of Indonesia (see `05-DATA-SPEC.md` section 8), drawn in the brand red at reduced opacity so it echoes the red landmass of the logo. Pre-draw the static land layer once into an offscreen layer and re-draw it each frame cheaply; rebuild on resize and theme change.
- Fit the map to its container with margins, preserving aspect ratio, centered. Non-Indonesian land is drawn dimmer.
- Dashboard choropleth: each region's dots take the ramp color for the selected metric, with a value bubble and the region name on each region.
- Region bubbles: a dark translucent burgundy circle with a thin cream ring, the value in cream, the region name below.

## 8. Run animation: layers, colors and timing (at 1x speed, quick and standard)
This table is the full target. Build the minimal cinematic version in `01-PRODUCT-SPEC.md` section 9 first. The visuals listed there as polish come only after Checkpoint 2. Keep these durations for both.
| Stage | Duration | Visuals |
|---|---|---|
| Reading the brief | about 2.3 s | A cream vertical sweep with a soft trail moves left to right; map dots brighten to cream as it passes. |
| Building the audience | about 3 s | Agents fade and scale in progressively, colored by main platform (palette above), with about 13 city labels (about 9 above 3,000 agents) fading in without overlapping, in muted rose. |
| Agents react | about 4.2 s | A new archetype card flips in at the top of the feed on each reaction; that archetype's agents ring-pulse in cream and recolor by sentiment (coral, gold, green). |
| Simulating spread | about 2.5 s per variant | Per tick: a halo ring in each newly exposed agent's color; thin cream arcs (curved, drawn progressively with a bright head) from sharer to reached agent, fading after about two seconds; coral arcs for spread driven by anger, named in the legend; unreached agents dim; the cumulative-exposure line chart grows in variant colors. |
| Rolling up | about 1.9 s | Agents drift into region centers with a small scatter, colored by the winning variant; score bubbles sized by audience share appear; city labels are hidden. |
| Risk scan | about 2.7 s | A coral sweep crosses the map; objecting agents get coral expanding rings as it passes; warning markers drop on the most affected regions (coral for high, gold for medium) and pulse. |
| Fix loop | about 2 s per round | A marker turns green when its flag clears. A marker that does not clear stays gold with "needs a person". |
| Done | about 0.9 s | Flash in brand red at low opacity, open the dashboard. |
Duration scales with depth (about 0.8x for Quick, 1x Standard, 1.15x Deep), and the card cadence adapts as described in the product spec. At 2x everything runs twice as fast.

## 9. Performance budget (up to 5,000 agents)
Keep at least 30 frames per second; the JavaScript part of a frame should stay around a few milliseconds. How: keep per-agent state in typed arrays, not objects; precompute pixel positions once per map size; cache each agent's color string and rebuild it only when the quantized color changes; use small squares instead of circles above about 2,500 agents; skip invisible agents; limit live arcs to about 150 and halos and rings to recently active agents; never recreate canvases per frame; update feed and telemetry text only when values change. Measure in a real browser at the presenting resolution and report the numbers.

## 10. Charts
Inline SVG: the spread line chart (cumulative share reached by tick, one line per variant in variant colors, drawn progressively on load), a small sparkline in telemetry, score bars as divs. Axes use faint text and line colors; gridlines subtle.

## 11. Accessibility
Contrast at least 4.5:1 for text in both themes (see the measured values above); never rely on color alone (winner chips and risk markers carry text or an icon); real buttons and labels; focus visible; reduced motion honored; the map has a text alternative (the ranked region list in the side panel).

## 12. Responsive
Desktop first, projector friendly. Below about 1050 px: run grid and dashboard two-column layouts stack. Below about 820 px: the sidebar becomes an overlay.
