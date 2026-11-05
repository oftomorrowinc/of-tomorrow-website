# news_001 — Today at Of Tomorrow: the daily stream of little stories on the homepage

**Status:** v1 for the cards (Todd, 2026-11-04, the night before a 7–10 day trip: "get the daily update stream online showing what we are working on today … a cool daily news feature that scrolls between little short stories on the homepage … blog when that is live and we have backfilled the last few months … little images to go with them so they really are like little stories"). · **Author:** CW, 11-05. · **Supersedes:** `byollm-cloud/specs/oftomorrow-log.md` (CW, 09-04, "OfTomorrow.net/log — the live build log", greenlit in principle, never built) — its fences, its "entries are data in a repo", and its one law carry over unchanged; this spec gives it the home it lacked (this repo), the shape Todd now wants (stories with pictures, on the homepage), and the source it did not have in September (the ledger and Owl's daily build log). · **Reads with:** `src/styles/magazine.css`, `specs/broadcast_001.md` §4 (the design language), signals `projects/*/log.md` (the private build log, newest day first), rule 35 (scripted before staffed), rule 37 (examples), the product-copy law.

## 0. The one law, first

**Stories describe what happened; nothing is ever done for the stream.** (oftomorrow-log §1.) The day the stream starts shaping the work, it has failed. The example: a quiet day posts zero stories, and zero is an honest number; a day with eleven landings posts the three a reader would care about, not eleven.

## 1. What it is

A strip on the homepage, "Today at Of Tomorrow", that scrolls between short dated stories — a headline, two or three sentences, a small picture — about what we are working on today. Newest first; yesterday's and last week's reachable by scrolling, and all of them at `/today` (one page, newest first, grouped by day, with `?project=` and `?author=` filters as the September spec asked). Each story is a small record; the picture is a spot illustration in the magazine's style; the voice is the person or agent who did the thing. Not a blog, not a changelog: the running commentary of a company that builds in public, with the private parts fenced.

## 2. A story is data in this repo

`src/content/today/<yyyy-mm-dd>-<slug>.md`, an Astro content collection, schema in `src/content.config.ts`:

    date      2026-11-04 (the day the thing happened, not the day it was written)
    title     ≤ 60 characters, a headline in the magazine's voice
    body      2–3 sentences, ≤ 320 characters, plain prose; what happened and why it matters
    project   byollm | press | signals | site | studio (a small controlled list, the nodes)
    author    todd | cw | owl | kevin | lis | a builder's name (the voice; signed on the story)
    image     ./images/<slug>.webp (optional; the monogram tile when absent, §4)
    refs      card or decision numbers, for us (rendered as plain "#7294", never a link into the ledger)
    link      optional public link (a release note, a blog post, a page)

Contribution is a commit (oftomorrow-log §3): Todd, CW and the daily task append directly; anyone outside contributes by PR, which is review-before-publish and identity for free. A story file that fails the fence test (§5) fails the build.

## 3. Where stories come from (rule 35: scripted first)

A daily task on Signals, `daily-stories`, runs on Owl's write-back tick after the build log entry for the day is written (`projects/*/log.md` already says, per host and project, what landed, what was ruled, what people did — the private, full version). The task drafts **zero to five** stories from that day's entry and the day's rulings and reads, each in the §2 shape, with the fences applied in the draft (no ids, no people without their okay, no security finding whose fix has not shipped), and files them as one PR against this repo titled "Today · <date>". CW reads the PR (an ask on the seat; the morning tick); a merge is the publish. Todd can delete any story any time; it is his site. Deriving from the record is fine; ghost-writing a person's voice is not — a story signed `todd` is one Todd wrote or okayed on the thread, otherwise it is signed `cw` and says "Todd ruled…" in the third person.

The example (rule 37): on 11-04 the private log had six entries — eight 0.1.5 cards landing, the dane site's landing fixed, the vault intake finding nothing, the push-card rule, Kevin's "nothing to push here", Owl's seventeen reviews. The stream would carry two: "Tools and images are coming to byollm 0.1.5" (project byollm, author cw, picture: a device handing a page to a model) and "The weekly gets a magazine" (project site, author cw, the OBS pack, picture: the paper masthead). Not the vault intake, not the push cards: nobody outside needs them.

## 4. The pictures: one style, made the same way every time

Every story has a small square picture (480×480 WebP, ≤ 60 KB) in **one style**: a magazine spot illustration — two colours (ink and the project's accent on paper), halftone shading, a single object or scene, no text, no faces of real people, no logos but ours. The style prompt is one file (`scripts/today/style.md`) and the generation step is one script (`scripts/today/picture.mjs <story>`) that takes the story's title and body, builds the prompt from the style file plus a one-line subject the task wrote (`picture: a bucket under a dripping tap`), and calls the image generator Press's Ad Studio uses today; when byollm 0.1.5's `llm.image` ships, the script becomes its first consumer and the generator is a byollm service. The output is committed beside the story. A story with no picture, or a picture that fails the check (wrong size, text detected, a real face), shows the **monogram tile**: the OT mark on paper with the project's accent, so the strip never has a hole in it. Todd can replace any picture by committing a new file.

## 5. Fences (oftomorrow-log §6, now a test)

1. Security findings post only after the fix ships. 2. No identifiers: no job ids as links, no tokens, env-shaped values, hub data, customer names, anything from a private surface. 3. People are named only with their okay (a list in `scripts/today/named.json`: todd, cw, owl; Kevin and Lis after they say yes — Todd asks). 4. Nothing is done for the stream. 5. Frame copy is product copy: the strip's standing text ("Today at Of Tomorrow", the dateline, "all stories") ships only with Todd's okay; no em dashes; house rules apply.
`tests/today.test.ts` fails the build on 2, 3 and 5, and on a story over the §2 limits.

## 6. The homepage strip, in the magazine's language

Between the hero and the first section: a dateline in Big Shoulders ("TODAY AT OF TOMORROW · THURSDAY 5 NOVEMBER") and a horizontal strip of story cards on paper — picture left (120 px), headline in Big Shoulders, body in Source Serif, the author and project as a small caption, a hairline rule between cards. The strip scrolls on its own, one card every eight seconds, pausing on hover and on any touch; arrows for the reader; reduced-motion users get the cards static and a "more" link. Three cards visible on a desktop, one on a phone. Clicking a card opens `/today#<slug>`. No reload, no fetch at runtime: the cards are in the static build; the site rebuilds on each merge (GitHub Pages deploy already runs on push). RSS at `/today.xml`, free since the page is a feed.

## 7. The backfill

The private logs in signals (`projects/byollm/log.md` since August, `projects/signals/log.md`) and the ledger's landings and rulings carry the last three months. The backfill is the same task run over a date range, drafting stories under the same fences, in batches of a week per PR so CW can read them; target 60–90 stories from 08-15 to 11-05, with pictures. Backfilled stories carry their original date (§2). Names stay fenced until the okays are in.

## 8. The blog post

When the strip is live and the backfill is merged: a post on the blog, "We started writing down what we do every day", in Todd's voice (drafted by CW on the thread for his edits), with the strip's first week as the example and a line on the one law. Not before.

## 9. Cards

1. **Lo-fi + the record** — the `today` collection and schema, the fence test, three real stories hand-written from the 11-04 log as fixtures (CW supplies the text on the card), the monogram tile, and a lo-fi strip and `/today` page at desktop and phone widths; screenshots in `specs/assets/news-001/`.
2. **The daily task** (signals) — `daily-stories` on Owl's write-back tick: drafts from the day's log entry, rulings and reads, applies the fences, opens the PR; dry-run mode that prints the stories; a test that a known log day yields the §3 example's two stories and not the other four.
3. **Pictures** — `style.md`, `picture.mjs` against Ad Studio's generator, the checks (size, text, faces), the monogram fallback, and twelve pictures for the fixtures and the first week; a walk of the strip with real pictures.
4. **Hi-fi + backfill + RSS + the post** — the strip's motion and the hi-fi pass, `/today.xml`, the backfill PRs (a week each), and the blog post draft on the thread for Todd.

Cards 1, 3 and 4 are this repo (ot.byollm:cc, `--repo of-tomorrow-website` — the site is registered there); card 2 is signals.

## 10. Done when

The homepage shows today's stories with pictures, written by the task and merged by a person; `/today` has the last three months; the fence test guards every merge; Kevin and Lis have said yes or no to being named; the blog post is up. And nothing in the week's work was done for the stream.
