import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The build log (/log, /log/<person>, /log/<project>, the homepage strip, the
// RSS), built from tests/fixtures/log-feed.json by way of the fixture feed on
// :4398 (playwright.config.ts). The browser's own reads of the feed are
// answered here with page.route when a test needs a claim or a newer entry.

const FEED = 'http://localhost:4398/api/log';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/log-feed.json', import.meta.url), 'utf8'));
const seqs = (scope?: string, person?: string): number[] =>
  fixture.entries
    .filter((e: any) => !scope || e.scope === scope)
    .filter((e: any) => !person || e.people.includes(person))
    .map((e: any) => e.seq);

const CLAIM = {
  lane: 'ot.signals:ccs',
  by: 'ccs, for todd',
  id: '915',
  title: 'A backlog card does not wait on the icebox',
  scope: 'ot.signals',
  since: '2026-10-13T23:00:00.000Z',
  elapsed_seconds: 2220,
  line: 'ccs is on #915 for 37m',
};

const NEWER = {
  seq: 108,
  at: '2026-10-14T00:30:00.000Z',
  kind: 'job.done',
  scope: 'ot.signals',
  project: 'Signals',
  people: ['ccs', 'todd'],
  by: 'ccs, for todd',
  title: 'Newer than the build',
  body: 'Arrived after the site was built.',
  link: 'https://signals.oftomorrow.net/board?scope=ot.signals&card=960',
  id: '960',
  worked: '12m',
};

/** Answer the browser's reads of the feed: the fixture's entries after its
 *  `since` (plus `extra`), and `live`. */
async function feed(page: Page, opts: { live?: object[]; extra?: object[] } = {}) {
  const asked: string[] = [];
  await page.route(`${FEED}**`, async (route) => {
    const url = new URL(route.request().url());
    asked.push(url.search);
    const since = Number(url.searchParams.get('since') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const scope = url.searchParams.get('scope');
    const person = url.searchParams.get('person');
    const entries = [...(opts.extra ?? []), ...fixture.entries]
      .filter((e: any) => e.seq > since)
      .filter((e: any) => !scope || e.scope === scope)
      .filter((e: any) => !person || e.people.includes(person))
      .slice(0, limit);
    await route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ entries, live: opts.live ?? [], next_since: since }),
    });
  });
  return asked;
}

test.describe('/log: everything', () => {
  test('every entry, newest first, grouped by New York day, as prose', async ({ page }) => {
    await page.goto('/log');
    await expect(page.getByTestId('log-heading')).toHaveText('Everything');
    const entries = page.getByTestId('log-entry');
    await expect(entries).toHaveCount(fixture.entries.length);
    expect((await entries.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-seq')))))).toEqual(
      [...seqs()].sort((a, b) => b - a),
    );
    const days = page.getByTestId('log-day');
    await expect(days.locator('h2')).toHaveText([
      'Tuesday, October 13, 2026',
      'Monday, October 12, 2026',
      'Sunday, October 11, 2026',
    ]);
    await expect(days.nth(0).getByTestId('log-entry')).toHaveCount(4);
    // Prose, not cards: no grid, no bordered boxes.
    await expect(page.locator('.log-entries').first()).toHaveCSS('display', 'block');
  });

  test('[person · project], with the person and the project as links, and the card linked', async ({ page }) => {
    await page.goto('/log');
    const e = page.locator('#e107');
    await expect(e.locator('.log-bracket')).toHaveText('[ccb, for todd · byollm]');
    await expect(e.locator('.log-bracket a')).toHaveText(['todd', 'byollm']);
    await expect(e.getByRole('link', { name: 'todd' })).toHaveAttribute('href', '/log/todd');
    await expect(e.getByRole('link', { name: 'byollm' })).toHaveAttribute('href', '/log/byollm');
    await expect(e.getByRole('link', { name: '#953' })).toHaveAttribute(
      'href',
      'https://signals.oftomorrow.net/board?scope=ot.byollm&card=953',
    );
    await expect(e.locator('.log-line')).toContainText('Built #953: byollm.cloud opens: the signup gate comes off (8m)');
    await expect(page.locator('#e105 .log-line')).toContainText('Landed #944 as 358ac1c in signals: The build log is served from the ledger');
    await expect(page.locator('#e106 .log-line')).toContainText("Decided on #953: the gate's function keeps its name");
    await expect(page.locator('#e104 .log-line')).toContainText('[todd · press] Said #799: Press emits ad lifecycle events to Signals now.');
    await expect(page.locator('#e103 .log-line')).toContainText('Ruled on #770: a person may hold several cards');
    // job.done is the builder's done, not the card landing (decision #170): no line says "Done".
    await expect(page.locator('.log-line', { hasText: /\bDone #/ })).toHaveCount(0);
    await expect(page.locator('#e102 .log-line')).toContainText('(2h 14m · 2 attempts)');
  });

  test("the feed's text is text: markup escaped, backticks as code", async ({ page }) => {
    await page.goto('/log');
    const body = page.locator('#e107 .log-body');
    await expect(body).toContainText('<script>alert(1)</script> stays text.');
    await expect(page.locator('[data-testid="log-entry"] script')).toHaveCount(0);
    await expect(body.locator('code')).toHaveText('pnpm test');
  });

  test('the filters are URLs: everything, the people the feed serves, the projects', async ({ page }) => {
    await page.goto('/log');
    await expect(page.getByTestId('log-filters').locator('a')).toHaveText(['Everything', 'todd', 'byollm', 'press', 'signals', 'RSS']);
    await expect(page.getByTestId('log-filters').getByRole('link', { name: 'Everything' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/log/rss.xml');
  });
});

test.describe('/log/<person> and /log/<project>', () => {
  for (const [slug, heading, scope, person] of [
    ['todd', 'Todd', undefined, 'todd'],
    ['byollm', 'BYOLLM', 'ot.byollm', undefined],
    ['signals', 'Signals', 'ot.signals', undefined],
    ['press', 'Press', 'ot.press', undefined],
  ] as const) {
    test(`/log/${slug} renders its own stream`, async ({ page }) => {
      const res = await page.goto(`/log/${slug}`);
      expect(res!.status()).toBe(200);
      await expect(page.getByTestId('log-heading')).toHaveText(heading);
      const want = seqs(scope, person).sort((a, b) => b - a);
      console.log(`/log/${slug}: ${want.length} entries`);
      expect(want.length).toBeGreaterThan(0);
      await expect(page.getByTestId('log-entry')).toHaveCount(want.length);
      expect(await page.getByTestId('log-entry').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-seq'))))).toEqual(want);
      await expect(page.getByTestId('log-filters').getByRole('link', { name: slug, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', `/log/${slug}/rss.xml`);
    });
  }

  test('a person the feed does not serve is a 404: kevin and lis (stream off in the fixture) and a stranger', async ({ page, request }) => {
    for (const path of ['/log/kevin', '/log/kevin/rss.xml', '/log/lis', '/log/nobody', '/log/vault']) {
      const res = await request.get(path);
      console.log(`${path}: ${res.status()}`);
      expect(res.status(), path).toBe(404);
    }
    await page.goto('/log');
    await expect(page.getByRole('link', { name: 'kevin' })).toHaveCount(0);
  });
});

test.describe('the live line and what is newer than the build', () => {
  test('/log: the live line when something is claimed, a newer entry on top of its day', async ({ page }) => {
    const asked = await feed(page, { live: [CLAIM], extra: [NEWER] });
    await page.goto('/log');
    await expect(page.getByTestId('log-live')).toHaveText('ccs is on #915 for 37m');
    await expect(page.getByTestId('log-live').getByRole('link', { name: '#915' })).toHaveAttribute(
      'href',
      'https://signals.oftomorrow.net/board?scope=ot.signals&card=915',
    );
    await expect(page.getByTestId('log-entry').first()).toHaveAttribute('data-seq', '108');
    // 00:30Z on the 14th is 8:30 pm on the 13th in New York: today's day, not a new one.
    await expect(page.getByTestId('log-day')).toHaveCount(3);
    await expect(page.getByTestId('log-day').first().getByTestId('log-entry').first()).toHaveAttribute('data-seq', '108');
    await expect(page.getByTestId('log-entry')).toHaveCount(fixture.entries.length + 1);
    // It asked only for what the build did not have.
    expect(asked[0]).toContain('since=107');
    expect(asked[0]).toContain('live=1');
  });

  test('/log/byollm asks the feed for its own scope', async ({ page }) => {
    const asked = await feed(page, { extra: [NEWER] });
    await page.goto('/log/byollm');
    await expect.poll(() => asked.length).toBeGreaterThan(0);
    expect(asked[0]).toContain('scope=ot.byollm');
    expect(asked[0]).toContain('since=107');
    // NEWER is ot.signals: not here.
    await expect(page.locator('#e108')).toHaveCount(0);
    await expect(page.getByTestId('log-live')).toBeHidden();
  });
});

test.describe('home: the build log strip', () => {
  test('under From the workshop: the newest five, each with its [person · project], linking to /log', async ({ page }) => {
    await page.goto('/');
    const sections = await page.locator('main section[id]').evaluateAll((els) => els.map((el) => el.id));
    expect(sections.indexOf('log')).toBe(sections.indexOf('workshop') + 1);
    const strip = page.getByTestId('log-strip');
    const entries = strip.getByTestId('strip-entry');
    await expect(entries).toHaveCount(5);
    expect(await entries.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-seq'))))).toEqual([107, 106, 105, 104, 103]);
    await expect(entries.locator('.log-bracket')).toHaveText([
      '[ccb, for todd · byollm]',
      '[ccb, for todd · byollm]',
      '[ccs, for todd · signals]',
      '[todd · press]',
      '[todd · signals]',
    ]);
    await expect(entries.nth(0)).toContainText('Built #953');
    await expect(entries.filter({ hasText: /\bDone #/ })).toHaveCount(0);
    await expect(entries.nth(0).locator('a.log-title')).toHaveAttribute('href', '/log#e107');
    await expect(entries.locator('.log-body')).toHaveCount(0);
    await expect(strip.getByTestId('all-log')).toHaveAttribute('href', '/log');
  });

  test('no claim: no live line, and no "idle" either', async ({ page }) => {
    const responded = page.waitForResponse((r) => r.url().startsWith(FEED));
    await page.goto('/');
    await responded;
    const strip = page.getByTestId('log-strip');
    await expect(strip.getByTestId('log-live')).toHaveCount(0);
    await expect(strip.locator('[data-live]')).toBeHidden();
    await expect(strip).not.toContainText(/idle/i);
  });

  test('a claim: the live line at the top of the strip', async ({ page }) => {
    await feed(page, { live: [CLAIM] });
    await page.goto('/');
    const strip = page.getByTestId('log-strip');
    await expect(strip.getByTestId('log-live')).toHaveText('ccs is on #915 for 37m');
    const [live, first] = await Promise.all([
      strip.getByTestId('log-live').boundingBox(),
      strip.getByTestId('strip-entry').first().boundingBox(),
    ]);
    expect(live!.y).toBeLessThan(first!.y);
  });

  test('newer than the build: the strip redraws, still five', async ({ page }) => {
    await feed(page, { extra: [NEWER] });
    await page.goto('/');
    const entries = page.getByTestId('log-strip').getByTestId('strip-entry');
    await expect(entries.first()).toHaveAttribute('data-seq', '108');
    await expect(entries).toHaveCount(5);
  });

  test('phone: no horizontal scroll on the strip or /log at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/log']) {
      await page.goto(path);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(`${path} scrollWidth at 390px: ${scroll}`);
      expect(scroll).toBeLessThanOrEqual(390);
    }
  });
});

test.describe('RSS', () => {
  for (const [path, count] of [
    ['/log/rss.xml', seqs().length],
    ['/log/todd/rss.xml', seqs(undefined, 'todd').length],
    ['/log/byollm/rss.xml', seqs('ot.byollm').length],
    ['/log/press/rss.xml', seqs('ot.press').length],
    ['/log/signals/rss.xml', seqs('ot.signals').length],
  ] as const) {
    test(`${path} is valid RSS 2.0, pointed at this site`, async ({ page, request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const text = await res.text();
      await page.goto('/log');
      const feed = await page.evaluate((src) => {
        const doc = new DOMParser().parseFromString(src, 'application/xml');
        if (doc.querySelector('parsererror')) return { error: doc.querySelector('parsererror')!.textContent };
        const rss = doc.documentElement;
        const channel = rss.querySelector(':scope > channel')!;
        const child = (el: Element, name: string) =>
          [...el.children].find((c) => c.tagName === name)?.textContent ?? null;
        return {
          root: rss.tagName,
          version: rss.getAttribute('version'),
          channels: rss.querySelectorAll(':scope > channel').length,
          title: child(channel, 'title'),
          link: child(channel, 'link'),
          description: child(channel, 'description'),
          self: [...channel.children].find((c) => c.tagName === 'atom:link')?.getAttribute('href'),
          items: [...channel.querySelectorAll(':scope > item')].map((i) => ({
            title: child(i, 'title'),
            link: child(i, 'link'),
            guid: child(i, 'guid'),
            pubDate: child(i, 'pubDate'),
            description: child(i, 'description'),
          })),
        };
      }, text);
      expect(feed).not.toHaveProperty('error');
      const page_ = path.replace(/rss\.xml$/, '');
      expect(feed).toMatchObject({
        root: 'rss',
        version: '2.0',
        channels: 1,
        link: `https://oftomorrow.net${page_}`,
        self: `https://oftomorrow.net${path}`,
      });
      expect(feed.title).toMatch(/^Of Tomorrow build log/);
      expect(feed.description).toBeTruthy();
      expect(feed.items).toHaveLength(count);
      const guids = new Set<string>();
      for (const item of feed.items!) {
        expect(item.title).toMatch(/^\[[^\]]+ · ot\.[a-z]+\] (done|landed|decided|ruled|said)/);
        expect(item.link).toMatch(/^https:\/\/signals\.oftomorrow\.net\/board\?scope=ot\.[a-z]+&card=\d+$/);
        expect(item.pubDate).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        expect(guids.has(item.guid!)).toBe(false);
        guids.add(item.guid!);
      }
      expect(text).not.toContain('<script>');
    });
  }
});
