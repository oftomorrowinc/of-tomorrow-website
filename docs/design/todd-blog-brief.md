# B351, corrected 09-30: todd.oftomorrow.net is its own GitHub Pages site, in its own repo

**The finding.** `of-tomorrow-website` is deployed by `.github/workflows/deploy.yml` to GitHub Pages (custom domain in `public/CNAME`); it is not on Vercel. So the 09-23 "deploy-ready" B351 (`vercel.json` host rewrite + `DEPLOY-todd-subdomain.md`, commit 89a93f4) does nothing: Pages ignores `vercel.json`, and a Pages site serves exactly one custom domain per repository. CCB read the file it wrote, not the workflow that deploys. The board row is corrected; this file is the brief for the job that replaces it, filed on ccb once the ledger knows the repo (SIG-103 #424) and the runner has it (#423).

## The shape

A second repository, **`oftomorrowinc/todd-of-tomorrow`** (Todd creates it: public, empty), with its own Pages deploy and its own custom domain `todd.oftomorrow.net` (DNS: CNAME `todd` → `oftomorrowinc.github.io`; Pages then issues the certificate). One repo, one domain, the way Pages works. Nothing on oftomorrow.net changes except, later, the blog index growing a link to it.

## The job (ccb, repo todd-of-tomorrow) — after #423/#424

1. Astro 5 + Tailwind, npm (match the parent repo's tooling exactly — same Astro major, same `deploy.yml` shape with `npm ci` / `astro build` / `upload-pages-artifact` / `deploy-pages`), `site: 'https://todd.oftomorrow.net'`, `public/CNAME` = `todd.oftomorrow.net`.
2. Copy from `of-tomorrow-website` the blog pieces and nothing else: `BaseHead`, `Header`, `HeaderLink`, `Footer`, `FormattedDate`, `BlogPost.astro`, `Layout.astro`, `pages/blog/index.astro` → the site's `/`, `pages/blog/[...slug].astro` → `/blog/[...slug]` (same paths as the parent, so a link copied from one host works on the other), `rss.xml.js`, the content collection config. No cookie banner, no consent manager, no tracking scripts, no Decap — this site has none of that. Masthead "Todd Of Tomorrow"; footer links to oftomorrow.net and byo-llm.com.
3. Content: both posts copied in verbatim (`byollm-is-open-source.md`, `the-rule-i-wrote-and-then-broke.md`) with their dates. The parent keeps its copies; the launch post's canonical stays on oftomorrow.net (it was announced there), Post 1's canonical is here.
4. About: one paragraph, Todd's words from the LinkedIn About (`todds-vault/derived/linkedin.md`) if the vault worktree is beside yours; otherwise a `<!-- Todd -->` placeholder. Do not write his bio.
5. `/videos`: not built. A `videos` page arrives with the first video.
6. Sidebar/feed slot: nothing rendered until SIG-93 exists. No fake list.
7. Tests: build passes; every file in the content collection has a page; the RSS validates; Playwright smoke as the parent has it.
8. Summary prints Todd's two hands: the DNS record (exact), and "Settings → Pages → custom domain `todd.oftomorrow.net`, Enforce HTTPS" on the new repo.

## Then, in of-tomorrow-website (a second small job, same lane)

- Remove `vercel.json` and `DEPLOY-todd-subdomain.md` (dead: not on Vercel).
- `pages/blog/index.astro` gets one line above the list: "New posts are at todd.oftomorrow.net." No redirect — Pages has no server redirects, and a `<meta refresh>` on the launch post would break the link that went out on 09-25.

## Not decided here (Todd)

- Repo name and owner. `oftomorrowinc/todd-of-tomorrow` is CW's pick because the domain is the org's and the masthead is "Todd Of Tomorrow"; `toddsampson/…` works the same way with DNS pointing at `toddsampson.github.io`.
