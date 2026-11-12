// The company, as the privacy and cookie policies print it
// (src/pages/privacy-policy.astro, src/pages/cookie-policy.astro).
//
// These are literals on purpose: the site is built on GitHub Pages with no
// deploy env, so there is nothing to read and nothing to fall back to. A
// missing field is a type error, never a placeholder address on a live page.
// How to change any of it, and why the URL must not move: docs/privacy.md.

export interface Company {
	readonly name: string;
	readonly address: string;
	/** General contact. */
	readonly email: string;
	/** Privacy contact, named in both policies. */
	readonly privacyEmail: string;
	/** How long personal data is kept, in days. */
	readonly retentionDays: number;
	/**
	 * The policies' "Last updated" date, YYYY-MM-DD. Changed by hand when the
	 * text of either policy changes; never computed.
	 */
	readonly policiesUpdated: `${number}-${number}-${number}`;
}

export const company: Company = {
	name: 'Of Tomorrow, Inc.',
	address: '10313 Sandy Marsh Lane, Orlando, FL 32832, United States',
	email: 'support@oftomorrow.net',
	privacyEmail: 'support@oftomorrow.net',
	retentionDays: 365,
	policiesUpdated: '2026-11-12',
};

/** policiesUpdated as the pages print it: "November 12, 2026". */
export function policiesUpdatedLabel(c: Pick<Company, 'policiesUpdated'> = company): string {
	return new Date(`${c.policiesUpdated}T00:00:00Z`).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	});
}
