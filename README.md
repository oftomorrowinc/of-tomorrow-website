# Of Tomorrow, Inc. · oftomorrow.net

## Today at Of Tomorrow (specs/news_001.md)

The daily stream of little stories on the homepage, and all of them at `/today`.

- **A story is a file:** `src/content/today/<yyyy-mm-dd>-<slug>.md`, the body either as `body:` in the frontmatter or as the file's prose below it (the daily task, signals' `daily-stories`, writes prose; the loader in `src/content.config.ts` lifts it into `body`, and a file with both fails). The fields: `date` (the day it happened), `title` (≤ 60), `body` (2 or 3 sentences, ≤ 320), `project` (`byollm | press | signals | site | studio`), `author`, and optionally `image` (`./images/<slug>.webp`), `refs` (card numbers, shown as plain `#7294`; numbers or digit strings), `link` (public, https) and `picture` (the one-line subject card 3 draws from). Schema in `src/content.config.ts`.
- **The fences fail the build:** `fence()` in `src/lib/today.ts` runs in the schema (so `astro build` refuses a fenced story) and in `tests/today.test.ts` (`npm test`): no identifiers (ULIDs, UUIDs, tokens and token-shaped strings, env-shaped `NAME=value`, links in the prose or into the ledger), no person outside `scripts/today/named.json`'s `named` (todd, cw, owl; kevin and lis are `asked`, not yet named), no em dashes, and the §2 limits.
- **The picture:** `node scripts/today/picture.mjs src/content/today/<story>.md` draws it from the story's `picture:` line and the one style in `scripts/today/style.md` (`--prompt` prints the prompt and stops), using Ad Studio's generator (Google's Gemini image model). The key is Ad Studio's and never lives here: `AD_STUDIO_ART_KEY` or `GEMINI_API_KEY` in the environment, else of-tomorrow-press's `.env.local` (`TODAY_ART_ENV` names another file). It writes `src/content/today/images/<slug>.webp` (480×480, ≤ 60 KB) and adds `image:` to the story only if the checks pass: the size, no text read in it and no face found in it (Apple Vision, `scripts/today/detect.swift`, so run it on a Mac). A refused picture is not written. To replace a picture, commit a new file under the same name.
- **The strip moves:** one card every eight seconds, back to the newest at the end; it holds still while a pointer is over it or focus is in it, and a touch stops it for good. Arrows for the reader. With `prefers-reduced-motion` nothing moves: the cards that fit, no arrows, and a "more" link to `/today`.
- **The feed:** `/today.xml`, RSS of every story, newest first, each linking to `/today#<slug>`; the homepage and `/today` link it in their head.
- **No picture?** The monogram tile (`src/components/today/MonogramTile.astro`): the OT mark on paper with the project's accent (byollm teal, press poppy, signals mustard, the site ink, studio body-muted).
- **The record:** `npm run today:shots` builds with the dateline pinned to 2026-11-05 and writes `specs/assets/news-001/01-lofi-*.png` (1280 and 390) and `01-lofi-walk.mp4`; `npm run today:shots -- --card=3` writes the same as `03-*` with the real pictures, and `npm run today:contact` writes the pictures' contact sheet, `03-pictures.png`. `npm run today:shots -- --card=4` writes the hi-fi record, `02-hifi-*.png` (with `02-hifi-home-still-*.png` under reduced motion) and `02-hifi-walk.mp4` (the strip advancing on its own, holding under the pointer).

### Frame copy, pending Todd's okay (§5.5)

The strip's and the page's standing text is product copy and ships only with Todd's okay. Until he gives it, all of this is **pending Todd's okay**:

| Where | Text |
| :-- | :-- |
| Homepage strip, dateline | `Today at Of Tomorrow · Thursday 5 November` (the build's day, set in capitals) |
| Homepage strip, link to `/today` | `All stories →` |
| Homepage strip, the arrows (screen readers) | `Previous`, `Next` |
| Homepage strip, reduced motion only | `More stories →` |
| `/today.xml`, the feed's title and description | `Today at Of Tomorrow`, `What we are working on, one short story at a time.` |
| `/today`, heading and `<title>` | `Today at Of Tomorrow`, `Today at Of Tomorrow · Of Tomorrow, Inc.` |
| `/today`, the filters | `All stories`, then the projects (`BYOLLM`, `Press`, `Signals`, `The site`, `Studio`) and the named authors (`Todd`, `CW`, `Owl`) |
| `/today`, each day | `Wednesday 4 November 2026` |

---

## Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
