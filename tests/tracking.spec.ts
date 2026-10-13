import { test, expect } from '@playwright/test';
import { isTranslationsLink } from '../src/utils/tracking';

// visit_translation_site: Translations Of Tomorrow's home is
// oftomorrow.press/#translations, and the old host 301s there, so either counts.
const CASES: [string, boolean][] = [
  ['https://oftomorrow.press/#translations', true],
  ['https://www.oftomorrow.press/#translations', true],
  ['https://translations.oftomorrow.net', true],
  ['https://translations.oftomorrow.net/some/page', true],
  ['https://oftomorrow.press/', false],
  ['https://oftomorrow.press/#workshop', false],
  ['https://byo-llm.com', false],
  ['https://example.com/?u=translations.oftomorrow.net', false],
  ['not a url', false],
];

test.describe('tracking: the translations predicate', () => {
  test('src/utils/tracking.ts', () => {
    for (const [url, want] of CASES) expect(isTranslationsLink(url), url).toBe(want);
  });

  test('the inline tracker the build ships', async ({ page }) => {
    await page.goto('/');
    const got = await page.evaluate(
      (urls) => urls.map((u) => (window as any).tracker.isTranslationsLink(u)),
      CASES.map(([url]) => url),
    );
    expect(got).toEqual(CASES.map(([, want]) => want));
  });

  test('trackExternalLink fires visit_translation_site for either URL', async ({ page }) => {
    await page.goto('/');
    const events = await page.evaluate(() => {
      const fired: string[] = [];
      const t = (window as any).tracker;
      t.trackEvent = (name: string) => fired.push(name);
      for (const u of ['https://oftomorrow.press/#translations', 'https://translations.oftomorrow.net']) {
        t.trackExternalLink(u, 'Visit the site');
      }
      return fired;
    });
    expect(events.filter((e) => e === 'visit_translation_site')).toHaveLength(2);
  });
});
