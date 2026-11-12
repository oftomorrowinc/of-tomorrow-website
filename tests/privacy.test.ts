import { describe, test, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import PrivacyPolicy from '../src/pages/privacy-policy.astro';
import CookiePolicy from '../src/pages/cookie-policy.astro';
import { company } from '../src/config/company';
import { render, text } from './render';

// The policies Amazon reads (docs/privacy.md): https://oftomorrow.net/privacy-policy
// is the consent privacy URL on the Ads API application. They print the real
// company from src/config/company.ts, a fixed date, and never the template's
// placeholders.

const ADDRESS = '10313 Sandy Marsh Lane, Orlando, FL 32832, United States';
const EMAIL = 'support@oftomorrow.net';
const PLACEHOLDERS = ['Innovation Boulevard', 'oftomorrow.inc'];

describe('the company, as the policies print it', () => {
	test('src/config/company.ts holds the real values', () => {
		expect(company).toEqual({
			name: 'Of Tomorrow, Inc.',
			address: ADDRESS,
			email: EMAIL,
			privacyEmail: EMAIL,
			retentionDays: 365,
			policiesUpdated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
		});
	});

	for (const [name, page] of [
		['privacy-policy', PrivacyPolicy],
		['cookie-policy', CookiePolicy],
	] as const) {
		test(`/${name}: the Orlando address, ${EMAIL}, the fixed date`, async () => {
			const doc = await render(page);
			const body = text(doc.body);
			expect(body).toContain(ADDRESS);
			expect(body).toContain(EMAIL);
			const mailto = [...doc.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href'));
			expect(mailto.length).toBeGreaterThan(0);
			for (const href of mailto) expect(href).toBe(`mailto:${EMAIL}`);
			const [y, m, d] = company.policiesUpdated.split('-').map(Number);
			const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
			expect(body).toContain(`Last updated: ${month} ${d}, ${y}`);
			for (const p of PLACEHOLDERS) expect(doc.documentElement.outerHTML).not.toContain(p);
		});
	}

	test('/privacy-policy: the retention period', async () => {
		expect(text((await render(PrivacyPolicy)).body)).toContain(`${company.retentionDays} days`);
	});
});

const files = (dir: string): string[] =>
	readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? files(p) : [p];
	});
const textual = /\.(astro|ts|tsx|js|mjs|jsx|md|mdx|json|html|css|xml|txt|yml|yaml)$/;

describe('no placeholder company anywhere', () => {
	for (const dir of ['src', 'dist']) {
		test.skipIf(!existsSync(dir))(`${dir}/ has no ${PLACEHOLDERS.join(' or ')}`, () => {
			const hits = files(dir)
				.filter((f) => textual.test(f))
				.flatMap((f) => {
					const s = readFileSync(f, 'utf8');
					return PLACEHOLDERS.filter((p) => s.includes(p)).map((p) => `${f}: ${p}`);
				});
			expect(hits).toEqual([]);
		});
	}

	test('the policies read no env for the company', () => {
		for (const f of ['src/pages/privacy-policy.astro', 'src/pages/cookie-policy.astro', 'src/config/company.ts']) {
			const s = readFileSync(f, 'utf8');
			expect(s, f).not.toMatch(/import\.meta\.env|process\.env|COMPANY_|PRIVACY_CONTACT_EMAIL|DATA_RETENTION_DAYS/);
			expect(s, f).not.toMatch(/new Date\(\)/);
		}
	});
});
