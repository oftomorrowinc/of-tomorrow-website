# The privacy and cookie policies

`/privacy-policy` and `/cookie-policy` print the company's name, address,
contact mailboxes, retention period and a "Last updated" date. All of it comes
from one file.

## The URL is on file with Amazon: do not move it

**https://oftomorrow.net/privacy-policy** is the consent privacy URL on the
Amazon Ads API application (Login with Amazon security profile "Of Tomorrow
Press"), given by Todd on 2026-11-11. Amazon's reviewers open it. Do not rename,
move or redirect `src/pages/privacy-policy.astro`; if the URL ever has to
change, the security profile in the Login with Amazon console has to change
with it, first.

## Where the values live

`src/config/company.ts`, as literals:

| Field | Value | Printed on |
| :-- | :-- | :-- |
| `name` | Of Tomorrow, Inc. | both |
| `address` | 10313 Sandy Marsh Lane, Orlando, FL 32832, United States | both |
| `email` (general contact) | support@oftomorrow.net | both |
| `privacyEmail` (privacy contact) | support@oftomorrow.net | both |
| `retentionDays` | 365 | privacy policy |
| `policiesUpdated` | the "Last updated" date, `YYYY-MM-DD` | both |

There is no env for these and no fallback. The site is Astro, built and
deployed to **GitHub Pages** by `.github/workflows/deploy.yml` on every push to
`main` (it is not on Vercel), and that workflow sets no environment, so an
`import.meta.env.COMPANY_*` read would always be empty. The pages used to read
such variables with the template's placeholders (`123 Innovation Boulevard,
Future City`, `@oftomorrow.inc` mailboxes) behind `||`, and those placeholders
were what went live. Now the `Company` type requires every field: leaving one
out fails `npm run typecheck`, rather than printing a made-up address.

## Changing a value or the policy text

1. Edit `src/config/company.ts` (a value) or the page itself,
   `src/pages/privacy-policy.astro` / `src/pages/cookie-policy.astro` (the text).
2. Set `policiesUpdated` to the day the change ships. It is set by hand and only
   when what a policy says changes; it is never computed from the build, so a
   redeploy does not claim the policy was updated.
3. If you changed a value, update `tests/privacy.test.ts` to match.
4. `npm test` and `npm run typecheck`, then merge to `main`; the deploy
   publishes it. Check https://oftomorrow.net/privacy-policy and
   https://oftomorrow.net/cookie-policy afterwards.

## The guard

`tests/privacy.test.ts` renders both pages and asserts the Orlando address,
support@oftomorrow.net (every `mailto:` on them) and the fixed date appear; that
`Innovation Boulevard` and `oftomorrow.inc` appear nowhere under `src/` or
`dist/` (the `dist/` check runs when a build is present); and that the pages
read no env and no `new Date()`.
