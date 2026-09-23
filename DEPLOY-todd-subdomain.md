# todd.oftomorrow.net — what is built, and the two steps that are Todd's

**B351.** Deploy-ready. Nothing here takes effect until the DNS record exists,
and the DNS is Todd's.

## Why one project and not two

Vercel bills the build. A second project on this repo builds the whole site
again on every push to serve a subset of it; one project with a host rewrite
builds once. `vercel.json` sends `todd.oftomorrow.net/` to `/blog`, and every
other path is already correct on both hosts — posts are at `/blog/<slug>`
either way, and `/rss.xml` is unchanged.

The masthead is not per-host and does not need to be: `Header.astro` is used
only by `BlogPost.astro` and `/blog/index.astro`, so `SITE_TITLE` renames the
blog without touching the marketing page, which has its own inline header.

## Todd's two steps

1. **DNS** — CNAME `todd` → Vercel, and add `todd.oftomorrow.net` as a domain
   on this project (not a new project).
2. **Say when it resolves.** Then the redirect below goes in, and not before.

## The redirect that is deliberately NOT here yet

Once `todd.oftomorrow.net` answers, `oftomorrow.net/blog` should send people to
it. That rule is not in `vercel.json` today, on purpose: shipping it now would
redirect the blog to a hostname that does not resolve, and Thursday's launch
post lives at `oftomorrow.net/blog/byollm-is-open-source`. A redirect to
nowhere is worse than a second address.

Add to `vercel.json` when the DNS is live:

```json
"redirects": [
  {
    "source": "/blog/:path*",
    "has": [{ "type": "host", "value": "oftomorrow.net" }],
    "destination": "https://todd.oftomorrow.net/blog/:path*",
    "permanent": false
  }
]
```

`permanent: false` until the move has been read back once. A 308 is cached by
browsers and is the hardest kind of mistake to take back.

## Known and left alone

`astro.config.mjs` has `site: 'https://oftomorrow.net'`, so RSS and canonical
links resolve to the apex. With one build serving both hosts it can only be one
value, and the apex is the one that works today — every link it produces is
live either way. Worth revisiting when the blog stops being served from the
apex at all, which is a decision, not a leftover.

## Not built, on purpose

The sidebar feed. B351: an empty sidebar for a week beats a fake live one, and
the SIG-93 widget does not exist yet.
