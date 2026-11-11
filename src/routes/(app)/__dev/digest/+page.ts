import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { PageLoad } from './$types';
import { buildDigestPage, focusAnchor } from '#lib/features/digest/viewmodel.js';
import type { DigestResponse } from '#lib/features/digest/types.js';

// DEV ONLY: the weekly digest page with a full sample payload, inside the app
// shell, for design work without a composed digest on staging. 404 outside
// `vite dev`. ?empty=1 shows the empty digest; ?s=<anchor> focuses a section.
const sample: DigestResponse = {
	id: '00000000-0000-0000-0000-000000000000',
	periodStart: '2026-11-02',
	periodEnd: '2026-11-08',
	status: 'sent',
	headline: 'Your holdings rose €412.30 this week',
	narrative:
		'A quiet week for most positions. Most of the gain came from two holdings, and spending stayed inside budget apart from groceries.',
	payload: {
		schemaVersion: 1,
		periodStart: '2026-11-02',
		periodEnd: '2026-11-08',
		holdings: [
			{
				currency: 'EUR',
				startValue: 18240.1,
				endValue: 18652.4,
				change: 412.3,
				changePercent: 2.26
			},
			{ currency: 'USD', startValue: 4120, endValue: 4071.55, change: -48.45, changePercent: -1.18 }
		],
		pricedPositions: 11,
		totalPositions: 12,
		movers: [
			{
				symbol: 'NVDA',
				currency: 'USD',
				shares: 20,
				startPrice: 182.4,
				endPrice: 191.9,
				contribution: 190,
				changePercent: 5.21,
				why: 'Guidance raised ahead of earnings.'
			},
			{
				symbol: 'ASML',
				currency: 'EUR',
				shares: 4,
				startPrice: 690,
				endPrice: 726.5,
				contribution: 146,
				changePercent: 5.29
			},
			{
				symbol: 'INTC',
				currency: 'USD',
				shares: 40,
				startPrice: 41.2,
				endPrice: 38.9,
				contribution: -92,
				changePercent: -5.58
			}
		],
		budget: {
			monthStart: '2026-11-01',
			currency: 'EUR',
			lines: [
				{ title: 'Groceries', target: 320, actual: 356.4, drift: 36.4, driftPercent: 11.38 },
				{ title: 'Transport', target: 120, actual: 64.2, drift: -55.8, driftPercent: -46.5 },
				{ title: 'Eating out', target: 150, actual: 98, drift: -52 }
			]
		},
		inflation: { country: 'PT', asOf: '2026-10', personalRate: 3.1, officialRate: 2.4 },
		earnings: [
			{ symbol: 'ABCL', date: '2026-11-09', hour: 'amc' },
			{ symbol: 'ASTS', date: '2026-11-09', hour: 'amc' },
			{ symbol: 'RKLB', date: '2026-11-09', hour: 'amc' },
			{ symbol: 'CRWV', date: '2026-11-10', hour: 'amc' },
			{ symbol: 'ONDS', date: '2026-11-12', hour: 'bmo' },
			{ symbol: 'TE', date: '2026-11-12', hour: 'bmo' },
			{ symbol: 'SAP', date: '2026-11-13' }
		]
	}
};

export const load: PageLoad = ({ url }) => {
	if (!dev) error(404, 'Not found');
	const resp: DigestResponse = url.searchParams.has('empty')
		? {
				...sample,
				headline: 'Your week in Norviq',
				narrative: null,
				payload: {
					...sample.payload,
					holdings: [],
					movers: [],
					budget: null,
					inflation: null,
					earnings: []
				}
			}
		: sample;
	return { vm: buildDigestPage(resp), focus: focusAnchor(url.searchParams.get('s')) };
};
