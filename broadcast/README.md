# broadcast/ — the weekly's OBS pages (lo-fi)

Five pages, each one a 1920×1080 browser source in OBS, transparent where the camera shows. They are styled only from `src/styles/magazine.css`'s tokens, so the show looks like the site. Spec: `specs/broadcast_001.md`. Pictures: `specs/assets/broadcast-001/01-lofi-*.png`.

This is lo-fi (rule 27), so there's no motion, no dock and no publish yet. Card 2 adds the reveals, the slide-in and the dock. Card 3 adds the stinger and the scene collection. Card 4 adds `broadcast.oftomorrow.net` and `src=`.

## Add a page to OBS

1. **Sources → + → Browser.** Name it after the page (e.g. `split`).
2. **Untick "Local file".** OBS's local-file picker drops everything after `?`, and the content lives in the `?` part. Paste a `file://` URL into **URL** instead:
   `file:///Users/<you>/Github/of-tomorrow-website/broadcast/split.html?issue=12&date=2026-11-04&segment=Field%20Notes&title=Make%20it%20flow&l=First%20line&l=Second%20line`
   (Keep the repo where it is. The pages load `../src/styles/magazine.css`.)
3. **Width 1920, Height 1080.**
4. **Custom CSS: empty.** Delete OBS's default `body { background-color: rgba(0,0,0,0); … }`. The pages already set their own transparency.
5. **"Shutdown source when not visible": off.** **"Refresh browser when scene becomes active": off.**
6. Put it at 0,0 with no scaling (right-click → Transform → Reset Transform).

To change what's on screen, edit the URL (Properties → URL) and OBS reloads it. Fonts load from Google Fonts, so the machine needs to be online. Offline, the pages fall back to Impact and Georgia.

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

`split.html` and `full.html?mode=list` take the same list params and put every line in the same pixel position. That's the split→full move: give both scenes the same `l=` lines and crossfade them in 300 ms (Studio Mode → Fade).

## The pages

| Page | Draws | Params it reads |
|---|---|---|
| `camera.html` | Masthead strip (OF TOMORROW, issue line, segment badge), 2 px ink rule 24 px in, grain in the corners | `host issue date segment accent` |
| `split.html` | Paper panel (left 45 %, halftone) with kicker, title (72 px), list (34 px) | `kicker title l= / list= reveal marker segment accent theme` |
| `full.html` | Paper matte; `mode=title` (140 px + a rule in the accent), `mode=list` (the split's list, same place), `mode=progress` (the plan of the issue); `tile=1` cuts the camera tile | as split, plus `mode step= now tile` |
| `framed.html` | Paper matte with a 1440×810 window and a caption beneath | `caption` (or `title`) `tile` |
| `lower.html` | Caption plate on the bottom rule: an accent tab with `No. n`, headline (40 px), subline (26 px) | `title sub n accent out` |

## The URL contract (spec §3)

- **Common:**
  - `issue`: number, shown as "No. 12"
  - `date`: `YYYY-MM-DD`, shown as "November 2026"
  - `host`: default `Todd Sampson`
  - `segment`: default `Field Notes`
  - `accent`: `poppy|teal|mustard`. The default comes from the segment: Field Notes is teal, The Ledger is mustard, Ask Me Anything (or AMA) is poppy. `lower.html` defaults to mustard.
  - `reveal`: how many list lines show; all if it's absent
  - `tile=1`
  - `theme=paper|ink`
- **Text:** `title`, `kicker` (defaults to the segment), `sub`, `n`, `caption`.
- **Lists:** repeat `l=` (`l=First&l=Second`). For long lists, use `list=` with a base64url JSON array (`btoa(JSON.stringify([...]))` with `+/` → `-_`, no `=`). `marker=square` swaps the numbers for ink squares.
- **Progress:** `step=Cut mistakes&step=Cut waffle&now=2`. Done steps are ink, the current one is the accent, upcoming ones are caption.
- `out=1` hides the lower-third. In lo-fi it just hides; card 2 makes it slide away.

All parsing is in `params.js`, a classic script (OBS won't load module scripts from `file://`). Every page reads `window.Broadcast.params`.

## Checks

- `npm run test:broadcast` — every page renders its params, `reveal=2` shows two lines, `tile=1` cuts a 300×420 hole, the list stays put between split and full, and no computed colour on any page is outside magazine.css's tokens. It opens the pages as `file://` with no build. It also runs as part of `npm run verify`.
- `npm run broadcast:shots` — remakes `specs/assets/broadcast-001/01-lofi-*.png` over mid-grey, so the transparent parts show.
