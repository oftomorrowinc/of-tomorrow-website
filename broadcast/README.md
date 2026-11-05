# broadcast/ — the weekly's OBS pages, and the dock that drives them

Five pages, each one a 1920×1080 browser source in OBS, transparent where the camera shows, and `dock.html`, an OBS custom browser dock that changes all of them live. They are styled only from `src/styles/magazine.css`'s tokens, so the show looks like the site. Spec: `specs/broadcast_001.md`. Pictures: `specs/assets/broadcast-001/02-hifi-*.png` (card 1's lo-fi: `01-lofi-*.png`); a walk of one segment: `specs/assets/broadcast-001/walk.mp4`.

Card 2: the motion, `theme=ink`, the dock. Card 3: the stinger and the scene collection. Card 4: the pages hosted at `https://broadcast.oftomorrow.net/`, and `src=`, which fills a list or a progress from the ledger.

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

**Hosted instead of local.** Each page is also at `https://broadcast.oftomorrow.net/<page>.html?…`, e.g. `https://broadcast.oftomorrow.net/split.html?issue=12&…`, with the same params. Use the hosted URLs when a source takes `src=` from the ledger (below), or on a machine without the repo. Use the local `file://` URLs offline. Don't mix the two in one scene collection: the dock reaches only pages from its own origin (`localStorage` is per origin), so a hosted dock drives hosted pages and a local dock drives local pages.

## Publishing (broadcast.oftomorrow.net)

The site is `broadcast/dist/`, built by `broadcast/build.mjs` (`npm run broadcast:build`). It holds the pages, `params.js`, `broadcast.css` and `fonts/` unchanged, plus `src/styles/magazine.css` copied beside them. The pages' one `../src/styles/magazine.css` link becomes `magazine.css`, and nothing else changes. It runs on a Vercel project of its own, whose **Root Directory is `broadcast/`** and which is configured by `broadcast/vercel.json` (no framework, no install, `node build.mjs`, output `dist`). The site itself still deploys to GitHub Pages (`.github/workflows/deploy.yml`), and this repo has no root `vercel.json`, so the broadcast project can't take over the site. One-time setup, by hand:

1. Vercel → Add New → Project → import `oftomorrowinc/of-tomorrow-website`. Set **Root Directory** to `broadcast` and leave "Include files outside the root directory" on, because the build reads `../src/styles/magazine.css`. Deploy.
2. Project → Settings → Domains → add `broadcast.oftomorrow.net`.
3. DNS for `oftomorrow.net`: add `CNAME broadcast → cname.vercel-dns.com` (or whatever record Vercel shows).

After that, every push to `main` redeploys it. `tests/broadcast.published.spec.ts` builds `dist/`, serves it over http and compares its pages, pixel for pixel, with card 2's snapshots.

## src= — a list or a progress from the ledger

`split.html` and `full.html` (`mode=list` or `mode=progress`) take `src=<url>`, URL-encoded. They fetch it before they first draw. It must answer JSON in this shape:

```json
{ "title": "What landed this week", "kicker": "The Ledger", "items": [{ "text": "…", "n": 7293, "done": true }], "now": 3 }
```

- `items[].text` are the lines (list) or the steps (progress). `items[].n` replaces a line's number in its chip, for example a card number. The chips widen to fit the longest number, so every line's text still starts at the same x.
- In progress mode, `items[].done` marks the done steps and `now` (1-based) is the current one. Without `now`, the first step that isn't done is current. Without any `done`, steps before `now` count as done, the same as `step=…&now=`.
- The feed's `title` and `kicker` show unless the page's own URL gives `title=` / `kicker=`. `reveal` (from the URL or the dock) still counts lines, and absent means all. The dock's segment, accent, theme and issue still apply. The dock's title, list, steps and now **don't** replace the feed's content on a `src=` page.
- `key=<read key>` on the page's URL goes to the feed as `Authorization: Bearer <key>`, never in the feed's URL.
- If the feed fails (network, non-2xx, not JSON, not this shape), the page shows its URL's own `title=`/`l=`/`step=` content and sets `<html data-src="failed">` with a console warning. Nothing on air says so. While it loads, `data-src="loading"`; after that, `"loaded"`.

**The ledger's two feeds** (Signals, `apps/web`, `GET /api/broadcast/…`). Both answer the shape above and send CORS headers for `https://broadcast.oftomorrow.net` only, which is why they work only from the **hosted** pages. A `file://` page's origin is `null`, so the browser refuses the response.

| Feed | On air |
|---|---|
| `https://<signals>/api/broadcast/landed?scope=ot.press&days=7` | `split.html` / `full.html?mode=list`: this week's landed cards, each title shortened to 60 characters, with its card number as `n` |
| `https://<signals>/api/broadcast/steps?scope=<rock or project>` | `full.html?mode=progress`: the run's steps with `done`, and `now` |

For example (URL-encode the `src` value):
`https://broadcast.oftomorrow.net/full.html?issue=12&segment=The%20Ledger&mode=progress&tile=1&key=<read key>&src=https%3A%2F%2F<signals>%2Fapi%2Fbroadcast%2Fsteps%3Fscope%3Dot.press`

**The read key.** It belongs to a per-purpose principal (`broadcast`) that can only read the scopes it names. Todd mints it once and pastes it into the OBS URLs. It is **never** a seat key. The key is a secret only in that it reads the public-record scopes: what it can read is what the build log and the show already make public. Still, keep it out of screenshots and out of the repo. If it leaks, revoke and re-mint it, and nothing else changes. `tests/fixtures/broadcast-landed.json` and `broadcast-steps.json` are the shape the feeds must answer, and the page tests run against them.

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
| `split.html` | Paper panel (left 45 %, halftone) with kicker, title (72 px), list (34 px) | `kicker title l= / list= reveal marker segment accent theme`; `src key` (card 4) |
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
- `npm run test:broadcast` also runs `tests/broadcast.src.spec.ts` and `tests/broadcast.published.spec.ts`. The first checks `src=` against the fixtures: list, card numbers, progress done/now, the Bearer key, the URL's title winning, failures falling back, and the dock with a feed. The second builds `dist/`, serves it on `127.0.0.1:4799` and checks the stills against card 2's snapshots, the site's file list, and a same-origin `src=`.
- `npm run broadcast:shots:src` — remakes `specs/assets/broadcast-001/04-src-*.png` (split, full list and full progress rendering the fixtures through `src=`).
- `npm run broadcast:shots` — remakes `specs/assets/broadcast-001/02-hifi-*.png` over mid-grey, so the transparent parts show, plus the dock.
- `npm run broadcast:walk` — records `specs/assets/broadcast-001/walk.mp4`: `walk/stage.html` stacks the real pages like OBS's scenes over a stand-in camera (no footage) with the real dock beside them, and the script drives one segment from the dock — camera → lower-third → split with three reveals → full with the tile → framed → camera. Needs `ffmpeg`.
