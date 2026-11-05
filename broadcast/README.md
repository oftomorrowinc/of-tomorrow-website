# broadcast/ — the weekly's OBS pages, and the dock that drives them

Five pages, each one a 1920×1080 browser source in OBS, transparent where the camera shows, and `dock.html`, an OBS custom browser dock that changes all of them live. They are styled only from `src/styles/magazine.css`'s tokens, so the show looks like the site. Spec: `specs/broadcast_001.md`. Pictures: `specs/assets/broadcast-001/02-hifi-*.png` (card 1's lo-fi: `01-lofi-*.png`); a walk of one segment: `specs/assets/broadcast-001/walk.mp4`.

Card 2 (this): the motion, `theme=ink`, the dock. Card 3 adds the stinger and the scene collection. Card 4 adds `broadcast.oftomorrow.net` and `src=`.

The fonts are files in `fonts/` (the magazine's Big Shoulders Display and Source Serif 4), so the pages render the same offline.

## Add a page to OBS

1. **Sources → + → Browser.** Name it after the page (e.g. `split`).
2. **Untick "Local file".** OBS's local-file picker drops everything after `?`, and the content lives in the `?` part. Paste a `file://` URL into **URL** instead:
   `file:///Users/<you>/Github/of-tomorrow-website/broadcast/split.html?issue=12&date=2026-11-04&segment=Field%20Notes&title=Make%20it%20flow&l=First%20line&l=Second%20line`
   (Keep the repo where it is. The pages load `../src/styles/magazine.css`.)
3. **Width 1920, Height 1080.**
4. **Custom CSS: empty.** Delete OBS's default `body { background-color: rgba(0,0,0,0); … }`. The pages already set their own transparency.
5. **"Shutdown source when not visible": off.** **"Refresh browser when scene becomes active": off.**
6. Put it at 0,0 with no scaling (right-click → Transform → Reset Transform).

To change what's on screen, edit the URL (Properties → URL) and OBS reloads it, or use the dock (below), which changes it without a reload.

## Add the dock

1. **Docks → Custom Browser Docks…** Name: `Of Tomorrow`. URL: `file:///Users/<you>/Github/of-tomorrow-website/broadcast/dock.html`. **Apply**, and put the dock where you want it (it is ~380 px wide).
2. Fill in the segment, issue, date, title and list. Every change goes to every page at once: no reload, no network.

| In the dock | On air |
|---|---|
| Segment, Accent | The badge, the kicker, the numbers, the tab — one accent for the scene (blank Accent = the segment's) |
| Issue No., Date | The issue line under the masthead |
| Theme Paper / Ink | Every page: ink is the inverse, for a dark segment |
| Kicker, Title | split.html and full.html (title and list modes). A title too long to fit is underlined in poppy here, and never on air. |
| List: one row a line; drag ⠿ to reorder (or Alt+↑/↓); Enter adds a row; × removes | The list on split and full. The numbered squares in the dock show which lines are on air. |
| Reveal − / + | The next line rises 12 px and fades in (220 ms), on split and full together, so a crossfade finds them alike |
| Progress steps, Now − / + | full.html `mode=progress` |
| Lower-third headline, subline, No.; **In** / **Out** | lower.html slides in along the bottom rule (500 ms) and back out |
| The same, as a URL | The dock's whole state as the URL contract's query — paste it after a page's `?` to put it there without the dock |

**How the dock and the URL share one contract.** The dock writes its state, as the same query string a URL takes, to `localStorage` under one key (`oftomorrow.broadcast.params`); each page listens for the change and re-renders. On load a page takes the dock's last state and lets **its own URL's keys win**; after that, **every dock change wins** for the keys the dock owns (`segment accent issue date kicker title l/list reveal step now lt lsub ln out theme`). The rest — `mode tile caption bw marker host` — always come from each source's URL, so three `full.html` sources can be title, list and progress at once. The lower-third's fields are `lt`, `lsub`, `ln` in the dock's state (a `lower.html` URL may still use `title`, `sub`, `n`), so the segment title and a name plate can be set together. Once you use the dock, fill in the issue and date there too: a blank dock field is a blank on air.

Not yet tried in OBS: that a custom dock and the browser sources share `localStorage` for `file://` pages in Todd's OBS build. The tests prove it for pages and a dock in one Chromium context; the first time in the room is the check.

## The scenes, and where the camera goes

Top of each list = top of the OBS source stack.

| Scene | Sources, top to bottom | Camera transform |
|---|---|---|
| **1 Camera** | `camera.html` · camera | Full frame (0,0, 1920×1080), Todd in the right third. "Zoom" is the same source scaled ~130 % around his face (a second scene or a Move transition). |
| **2 Split** | `camera.html` · `split.html` · camera | The camera fills the right 55 %: position x 864, y 0; crop/scale so 1056×1080 shows the zoomed shot. The panel covers x 0–864. |
| **3 Full** | `camera.html` · `full.html` · camera | With `tile=1`: the tile is at x 1548, y 588, 300×420. Crop the zoomed shot to a 5:7 vertical and size it to cover that box. The page's hole has 24 px rounded corners and covers the rest. Without `tile`, hide the camera. |
| **4 Framed** | `camera.html` · `framed.html` · media / browser / capture source · camera | The window is x 240, y 116, 1440×810 (x 96 with `tile=1`). Size the media source to that box. With `tile=1`, the camera goes in the tile box, as in scene 3. For b&w, add OBS's Color Correction filter (saturation −1) to the media source. |
| any | `lower.html` on top, toggled with its eye | — |

`camera.html` (the masthead, issue line, badge and inner rule) sits on top of every scene, as the frame.

`split.html` and `full.html?mode=list` take the same list params and put every line in the same pixel position, at the same size, in both themes. That's the split→full move: give both scenes the same lines (the dock does) and crossfade them in 300 ms (Studio Mode → Fade, 300 ms): the paper reads as the panel widening and the list does not move.

## Motion (spec §4)

- A line revealed (dock Reveal +) rises 12 px and fades in over 220 ms; lines already up do not move; nothing animates on a page load, so a scene switch never replays a list.
- The lower-third slides in along the frame's bottom rule from behind its left edge in 500 ms on load or **In**, and back the same way on `out=1` or **Out**.
- The new current step (dock Now +) rises in like a list line.
- No blur, no bounce, no parallax anywhere (a test greps for `blur(`).

## The pages

| Page | Draws | Params it reads |
|---|---|---|
| `camera.html` | Masthead strip (OF TOMORROW, issue line, segment badge), 2 px ink rule 24 px in, grain in the corners | `host issue date segment accent` |
| `split.html` | Paper panel (left 45 %, halftone) with kicker, title (72 px), list (34 px) | `kicker title l= / list= reveal marker segment accent theme` |
| `full.html` | Paper matte; `mode=title` (140 px + a rule in the accent), `mode=list` (the split's list, same place), `mode=progress` (the plan of the issue); `tile=1` cuts the camera tile | as split, plus `mode step= now tile` |
| `framed.html` | Paper matte with a 1440×810 window and a caption beneath | `caption` (or `title`) `tile` |
| `lower.html` | Caption plate on the bottom rule: an accent tab with `No. n`, headline (40 px), subline (26 px) | `title sub n` (or `lt lsub ln`) `accent out theme` |
| `dock.html` | The OBS custom dock (above) | its own URL may seed it with any of the dock's keys |

## The URL contract (spec §3)

- **Common:**
  - `issue`: number, shown as "No. 12"
  - `date`: `YYYY-MM-DD`, shown as "November 2026"
  - `host`: default `Todd Sampson`
  - `segment`: default `Field Notes`
  - `accent`: `poppy|teal|mustard`. The default comes from the segment: Field Notes is teal, The Ledger is mustard, Ask Me Anything (or AMA) is poppy. `lower.html` takes the same accent as the rest of the scene (one accent per scene, §4).
  - `reveal`: how many list lines show; all if it's absent
  - `tile=1`
  - `theme=paper|ink`: ink swaps paper and ink on every page (panel, matte, masthead, frame rule, plate, tile edge). On ink, poppy and teal stay fills and their text goes paper (as text they are under 3:1 on ink); mustard is text and fill.
- **Text:** `title`, `kicker` (defaults to the segment), `sub`, `n`, `caption`.
- **Lists:** repeat `l=` (`l=First&l=Second`). For long lists, use `list=` with a base64url JSON array (`btoa(JSON.stringify([...]))` with `+/` → `-_`, no `=`). `marker=square` swaps the numbers for ink squares.
- **Progress:** `step=Cut mistakes&step=Cut waffle&now=2`. Done steps are ink, the current one is the accent, upcoming ones are caption.
- **Lower-third:** `lt`, `lsub`, `ln` (or `title`, `sub`, `n` on a lower.html URL); `out=1` slides it away.

All parsing is in `params.js`, a classic script (OBS won't load module scripts from `file://`). Every page reads `window.Broadcast.params`.

## Checks

- `npm run test:broadcast` — every page renders its params; the motion (a revealed line's 220 ms rise from 12 px, the plate's 500 ms slide in and out along the rule); the list keeping its edge and size from split to full in both themes; `theme=ink` inverting each page; the tile's border, shadow and hole; the dock driving split, full, camera and lower in one browser context (title, list, drag to reorder, reveal ±, now ±, In/Out, theme), the URL winning on load and the dock after; no computed colour outside magazine.css's tokens; and screenshots at the end of each motion compared pixel for pixel (`tests/broadcast.spec.ts-snapshots/`, macOS Chromium; `npm run test:broadcast -- -u` remakes them after a change that is meant to change the look). It opens the pages as `file://` with no build, and runs in `npm run verify`.
- `npm test` includes `tests/brand.test.ts`, which follows every `var(--…)` in `broadcast/` to `magazine.css`'s `:root` and fails on a colour or a face written into `broadcast/` itself.
- `npm run broadcast:shots` — remakes `specs/assets/broadcast-001/02-hifi-*.png` over mid-grey, so the transparent parts show, plus the dock.
- `npm run broadcast:walk` — records `specs/assets/broadcast-001/walk.mp4`: `walk/stage.html` stacks the real pages like OBS's scenes over a stand-in camera (no footage) with the real dock beside them, and the script drives one segment from the dock — camera → lower-third → split with three reveals → full with the tile → framed → camera. Needs `ffmpeg`.
