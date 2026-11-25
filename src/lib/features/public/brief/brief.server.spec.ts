import { describe, expect, it, vi } from 'vitest';

// config() reads every key; a Proxy answers undefined (the default) for all but the base URL.
vi.mock(
	'$app/env/private',
	() =>
		new Proxy<Record<string, string | undefined>>(
			{ PUBLIC_BASE_URL: 'https://www.norviq.org' },
			{
				has: () => true,
				get: (target, key) => (typeof key === 'string' ? target[key] : undefined)
			}
		)
);

import type { MarketBriefVM } from '#lib/features/dashboard/market-brief/types.js';
import { pageVM, validEdition } from './brief.server.js';

const brief: MarketBriefVM = {
	slot: 'evening',
	tradingDate: '20 Nov 2026',
	tradingDateISO: '2026-11-20',
	generatedAt: '22:33',
	generatedAtISO: '2026-11-20T22:33:52Z',
	degraded: false,
	greeting: 'Here is how markets closed today.',
	groups: [
		{
			id: 'us_close',
			title: 'Wall Street closed lower',
			tone: 'down',
			rows: [
				{
					symbol: '^NDX',
					flag: '🇺🇸',
					name: 'Nasdaq 100',
					level: '25,029',
					change: '5.61%',
					direction: 'down'
				}
			]
		}
	],
	notes: [],
	stories: [
		{
			kind: 'story',
			text: 'Nvidia led the selloff.',
			tickers: ['NVDA'],
			sourceHost: 'cnbc.com',
			sourceURL: 'https://cnbc.com/x'
		}
	],
	previousSlot: '',
	previousDate: '',
	previousURL: '',
	latestURL: '',
	shareURL: '',
	shareNativeURL: '',
	shareTitle: '',
	shareProps: ''
};

interface LD {
	'@type': string;
	headline: string;
	isPartOf: unknown;
	identifier: string;
	url: string;
	dateModified: string;
	image: string[];
}

const ldOf = (json: string): LD => JSON.parse(json) as LD;

describe('brief page VM', () => {
	it('titles the page with its factual headline and edition, and keeps a query-free canonical', () => {
		const vm = pageVM('en', brief, false);
		expect(vm.heading).toBe('Wall Street closes lower as the Nasdaq 100 falls 5.61%');
		expect(vm.title).toBe('The Close — 20 Nov 2026');
		expect(vm.documentTitle).toBe(
			'Wall Street closes lower as the Nasdaq 100 falls 5.61% — The Close — 20 Nov 2026 | Norviq'
		);
		expect(vm.canonicalURL).toBe('https://www.norviq.org/brief/2026-11-20/evening');
		expect(vm.canonicalURL).not.toContain('utm_');
		expect(vm.edition.editionId).toBe('MI-2026-11-20-C');
	});

	it('marks the brief as an issue of the Market Intelligence periodical in JSON-LD', () => {
		const ld = ldOf(pageVM('pt-PT', brief, false).jsonLD);
		expect(ld['@type']).toBe('NewsArticle');
		expect(ld.headline).toBe('Wall Street fecha em queda, com o Nasdaq 100 a cair 5,61%');
		expect(ld.isPartOf).toEqual({
			'@type': 'Periodical',
			name: 'Norviq Market Intelligence',
			url: 'https://www.norviq.org/brief'
		});
		expect(ld.identifier).toBe('MI-2026-11-20-C');
		expect(ld.url).toBe('https://www.norviq.org/brief/2026-11-20/evening?lang=pt-PT');
	});

	it('takes dateModified from the edition', () => {
		const edition = validEdition({
			schemaVersion: 2,
			id: 'MI-2026-11-20-C',
			revision: 2,
			publishedAt: '2026-11-20T23:05:00Z',
			instruments: [],
			series: []
		});
		const vm = pageVM('en', brief, false, edition);
		expect(vm.modifiedISO).toBe('2026-11-20T23:05:00Z');
		expect(ldOf(vm.jsonLD).dateModified).toBe('2026-11-20T23:05:00Z');
		expect(vm.edition.revision).toBe(2);
	});
});

describe('brief page export URLs', () => {
	const withRevision = (revision: number) =>
		validEdition({
			schemaVersion: 2,
			id: 'MI-2026-11-20-C',
			revision,
			instruments: [],
			series: []
		});

	it('puts the revision on og:image', () => {
		const en = pageVM('en', brief, false, withRevision(2));
		expect(en.ogImageURL).toBe('https://www.norviq.org/brief/2026-11-20/evening/og.png?rev=2');
		expect(ldOf(en.jsonLD).image).toEqual([en.ogImageURL]);
		const pt = pageVM('pt-PT', brief, false, withRevision(2));
		expect(pt.ogImageURL).toBe(
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=pt-PT&rev=2'
		);
		expect(ldOf(pt.jsonLD).image).toEqual([pt.ogImageURL]);
	});

	it('leaves og:image unversioned for a legacy brief', () => {
		expect(pageVM('en', brief, false, null).ogImageURL).not.toContain('rev=');
		expect(pageVM('en', brief, false, withRevision(0)).ogImageURL).not.toContain('rev=');
	});

	it('builds the export URLs', () => {
		const vm = pageVM('en', brief, false);
		expect(vm.exportsURL).toBe('/brief/2026-11-20/evening/exports.json');
		expect(vm.exportFallback.pdf).toBe('/brief/2026-11-20/evening/report.pdf');
		expect(pageVM('pt-PT', brief, false).exportFallback.social).toBe(
			'/brief/2026-11-20/evening/social.png?lang=pt-PT'
		);
	});
});

describe('validEdition', () => {
	it('drops malformed instruments and series instead of failing the page', () => {
		const e = validEdition({
			schemaVersion: 2,
			id: 'MI-1',
			instruments: [
				{ symbol: '^NDX', last: 1, previousClose: 1, change: 0, changePct: 0, precision: 2 },
				{ symbol: '^GSPC', last: 'NaN', previousClose: 1, change: 0, changePct: 0, precision: 2 },
				null
			],
			series: [
				{ symbol: '^NDX', points: [[1, 2]] },
				{ symbol: '^GSPC', points: [[1, null]] }
			]
		});
		expect(e?.instruments.map((i) => i.symbol)).toEqual(['^NDX']);
		expect(e?.series.map((s) => s.symbol)).toEqual(['^NDX']);
	});

	it('accepts the backend shape and fills a missing quality block', () => {
		const e = validEdition({ schemaVersion: 2, id: 'MI-1', instruments: [], series: [] });
		expect(e?.quality).toEqual({ degraded: false, model: '', missing: [] });
	});

	it('rejects anything a renderer could not trust', () => {
		for (const raw of [
			null,
			undefined,
			'x',
			{},
			{ id: '' },
			{ id: 'MI-1', instruments: 'no', series: [] }
		]) {
			expect(validEdition(raw)).toBeNull();
		}
	});
});
