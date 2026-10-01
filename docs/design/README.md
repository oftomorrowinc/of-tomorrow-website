# The design language — oftomorrow.net and todd.oftomorrow.net (CW, 2026-10-01)

Two sites, one family: **the company wears the cover, the person writes the inside pages.** The mockups are canvases on claude.ai (private to Todd):

- todd.oftomorrow.net — https://claude.ai/artifact/RBnEU2XzT74h8EVEpUECA3 (Todd: go, 10-01; signals #495 builds it, #496 imports the archive)
- oftomorrow.net — https://claude.ai/artifact/K6XmfRWbDQJDweG9fhijKk (ruling card signals #497)

The values below are the spec; the canvases are the picture.

**Relation to `docs/of-tomorrow-brand-guidelines.md` (v2.0, Aug 2025):** that document's brand story and voice stand — they are what this design finally draws. Its visual sections (Space Grotesk + Inter, Tomorrow Blue `#0066FF`, Progress Orange, the purple-gradient site that came from them) are superseded by the tables below once Todd rules on #497; the guidelines file gets a v3 then, not before.

## Shared

- **Reading face:** Source Serif 4 (400, 600, italic; optical size). Body 20px/1.62 at a 680px measure on the blog; 20px/1.55 in the magazine's text blocks.
- **Nameplate / label face:** Big Shoulders Display — 900 for nameplates and headlines, 700 caps with 0.08–0.14em tracking for labels, dates, buttons, figure captions. (The blog's approved mockup used Space Grotesk for this role; the proposal is that it switches to Big Shoulders so the two are visibly one family — Todd's call on #497.)
- **Cards are boxed features, not floating tiles:** a 2px ink border on the magazine, a 1px rule on the blog. No shadows, no gradients.
- **Figure captions** under every illustration, caps, "Fig. n — …".
- **Badges / labels** in the label face: "From the vault", "Launch", "Tumblr · archive", "first on LinkedIn", "note".

## oftomorrow.net — the magazine

| token | value | use |
|---|---|---|
| paper | `#F4ECD9` | ground |
| paper-light | `#FBF6EA` | card fill |
| paper-dark | `#E9DFC6` | illustration placeholder fill |
| ink | `#1C1A16` | text, rules, the NOW BUILDING band |
| poppy | `#C5372C` | primary button, "Inc.", one accent per page |
| teal | `#1F6E7A` | eyebrows, figure captions, the WRITE TO US band |
| mustard | `#D9A21B` | numbered callouts on ink — fills only, never text on paper |
| body-muted | `#4A4335` | descriptions, footer |
| caption | `#6B6253` | placeholder labels |

Rules: 6px ink at the top of the page and above the footer, 2px between sections. Container 1120px, 24px gutters, 12-column grid, 32px gap. Headline 84px/0.92 caps (52px on a phone); nameplate 72px (48px); section h2 40px caps; buttons 48px tall, caps, 0.08em.

Structure: issue line → nameplate + nav → cover story (headline, deck, two buttons, Illustration 1) → NOW BUILDING on ink (01 BYOLLM, 02 BYOLLM Cloud, 03 Translations Of Tomorrow) → FROM THE WORKSHOP (latest two posts from todd.oftomorrow.net) → THE COMPANY (the story paragraph verbatim; mission/vision; Illustration 2) → WRITE TO US on teal → footer.

Copy that goes: the six generic service tiles ("From apps to art…"), "Education Of Tomorrow — coming soon", "Ready to build tomorrow?". Placeholders to fill: `[YEAR]` on the issue line, `[CONTACT EMAIL]`.

## todd.oftomorrow.net — the inside pages

| token | value | use |
|---|---|---|
| ground | `#FFFFFF` | page |
| section ground | `#F6F5FB` | the year-strip band, evidence box |
| ink | `#15131F` | text, wordmark |
| indigo | `#4338CA` | the one accent: links in chrome, pull-quote rule, year bars, active pill |
| ember | `#E8590C` | "now" only — the current year in the strip |
| body-muted | `#4B4960` | descriptions |
| meta | `#5B5A6B` | dates, labels (4.5:1 on white) |
| rule | `#E6E4F0` | borders |
| badge indigo | `#EEF0FF` / `#3730A3` | "From the vault" |
| badge grey | `#F1F0F6` / `#4B4960` | every other badge |
| empty year | `#B9B6CC` dashed | 2018–2025 in the strip and the archive |

Container 1040px; post column 680px; home h1 44px/1.2 serif 400; post h1 46px/1.12 600; card h3 28px. The year strip: one bar per year, height ∝ count, empty years drawn as 4px dashed outlines, current year ember, a computed sentence beneath. Tumblr dates read "by <date>" (ceilings). Short posts (<200 chars) are notes. Dark mode deferred; colors live in custom properties so it is one block later.

## Illustration

`image-prompts.md` — five prompts matched to the placeholders, and the rules that keep period art from looking like AI. Keep the prompt, seed and model beside any picture that ships, in `public/images/art/<name>.txt`.

## The copy (from the mockup, verbatim — the build uses these words)

**Issue line.** "No. 1 · Autumn 2026" · "Building the world of tomorrow, in public" · "Est. [YEAR]"

**Cover story.** Eyebrow: "The cover story". Headline: "A great big beautiful tomorrow doesn't arrive in your feed." Deck: "We have to build it. Small, single-purpose tools, well connected, running on the compute you already own – open source where it counts, and shown to you while it's being made." Buttons: "See BYOLLM →" (byo-llm.com), "Early access to the cloud" (byollm.cloud/early-access). Fig. 1 — "A machine the size of a toaster, and the town it talks to."

**Now building.** Tag: "Three things, all real".
01 BYOLLM — "Bring Your Own LLM. Use your own AI on websites you authorize – your models, your subscriptions, a small program on your machine. Open source, MIT." → "Open source · 0.1.2 →"
02 BYOLLM Cloud — "The same protocol, hosted: a dashboard for the sites you use, and early access while we open the doors a few people at a time." → "Early access →"
03 Translations Of Tomorrow — "Chapter-by-chapter book translation that keeps the context and the culture – built for independent authors, run on their own AI." → "Visit the site →"

**From the workshop.** "What's being built, written down as it happens – real dates, including the parts that don't work. Todd's posts live at todd.oftomorrow.net." Link: "All posts →". Cards from the feed: date · kind label in teal, title in Source Serif 600, description.

**The company.** The story paragraphs and mission/vision verbatim from the current site. Fig. 2 — "Every room has its own small machine. None of them phones home."

**Departments.** Under mission/vision in THE COMPANY, one strip between 2px ink rules, label face (Big Shoulders 700, caps, 0.12em, 15px), centred: "Departments" in teal, then "Software · Publishing · Games · Art · Events · Ventures" in ink with the " · " in poppy. Wraps to two lines on a phone. The names live in `DEPARTMENTS` (`src/consts.ts`). Names only, no blurbs, no links until a department has a page; a department earns a section on the page when it has two real items.

**Write to us.** "Building something, or want to? The door is open." Button: the contact email.

**Footer.** "© 2026 Of Tomorrow, Inc." · byo-llm.com · byollm.cloud · todd.oftomorrow.net · Privacy
