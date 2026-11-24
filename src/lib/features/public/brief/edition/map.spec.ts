import { describe, expect, it } from 'vitest';
import type { MarketBriefVM } from '#lib/features/dashboard/market-brief/types.js';
import { editionId, editionPageVM, headlineFor } from './map.js';
import { editionStrings } from './strings.js';
import type { EditionDTO } from './types.js';

const MINUS = '−';
const t = editionStrings('en');

function brief(overrides: Partial<MarketBriefVM> = {}): MarketBriefVM {
	return {
		slot: 'evening',
		tradingDate: '20 Nov 2026',
		tradingDateISO: '2026-11-20',
		generatedAt: '22:33',
		generatedAtISO: '2026-11-20T22:33:52Z',
		degraded: false,
		greeting: 'Here is how markets closed today.',
		groups: [
			{
				id: 'eu_close',
				title: 'Europe closed lower',
				tone: 'down',
				rows: [
					{
						symbol: '^GDAXI',
						flag: '🇩🇪',
						name: 'DAX',
						level: '24,803',
						change: '2.60%',
						direction: 'down'
					}
				]
			},
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
					},
					{
						symbol: '^GSPC',
						flag: '🇺🇸',
						name: 'S&P 500',
						level: '6,910',
						change: '3.70%',
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
				sourceURL: 'https://www.cnbc.com/a'
			},
			{ kind: 'story', text: 'Yields eased.', tickers: [], sourceHost: '', sourceURL: '' },
			{
				kind: 'story',
				text: 'Oil rose.',
				tickers: [],
				sourceHost: 'cnbc.com',
				sourceURL: 'https://www.cnbc.com/b'
			}
		],
		previousSlot: 'morning',
		previousDate: '2026-11-20',
		previousURL: '',
		latestURL: '',
		shareURL: '',
		shareNativeURL: '',
		shareTitle: '',
		shareProps: '',
		...overrides
	};
}

const t0 = Date.UTC(2026, 10, 20, 14, 30) / 1000;

function edition(): EditionDTO {
	return {
		schemaVersion: 2,
		id: 'MI-2026-11-20-C',
		kind: 'close',
		revision: 1,
		status: 'published',
		publishedAt: '2026-11-20T22:33:52Z',
		marketDataAsOf: '2026-11-20T21:10:00Z',
		timezone: 'Europe/Lisbon',
		instruments: [
			{
				symbol: '^GDAXI',
				name: 'DAX',
				assetClass: 'index',
				region: 'DE',
				group: 'eu_close',
				unit: 'points',
				currency: 'EUR',
				precision: 2,
				last: 24803.2,
				previousClose: 25464.47,
				change: -661.27,
				changePct: -2.6,
				asOf: '2026-11-20T16:35:00Z',
				source: 'yahoo'
			},
			{
				symbol: '^NDX',
				name: 'Nasdaq 100',
				assetClass: 'index',
				region: 'US',
				group: 'us_close',
				unit: 'points',
				currency: 'USD',
				precision: 2,
				last: 25029.33,
				previousClose: 26519.65,
				change: -1490.32,
				changePct: -5.62,
				asOf: '2026-11-20T21:10:00Z',
				source: 'yahoo'
			},
			{
				symbol: '^GSPC',
				name: 'S&P 500',
				assetClass: 'index',
				region: 'US',
				group: 'us_close',
				unit: 'points',
				currency: 'USD',
				precision: 2,
				last: 6910.12,
				previousClose: 7175.51,
				change: -265.39,
				changePct: -3.7,
				asOf: '2026-11-20T21:10:00Z',
				source: 'yahoo'
			},
			{
				symbol: 'BZ=F',
				name: 'Brent crude',
				assetClass: 'commodity',
				region: '',
				unit: 'usd_bbl',
				currency: 'USD',
				precision: 2,
				last: 89.87,
				previousClose: 89.44,
				change: 0.43,
				changePct: 0.48,
				asOf: '2026-11-20T21:59:00Z',
				source: 'yahoo'
			},
			{
				symbol: '^TNX',
				name: 'US 10-year Treasury yield',
				assetClass: 'rate',
				region: 'US',
				unit: 'percent',
				precision: 3,
				last: 4.91,
				previousClose: 5.049,
				change: -0.139,
				changePct: -2.75,
				changeBps: -13.9,
				asOf: '2026-11-20T20:59:00Z',
				source: 'yahoo'
			}
		],
		series: [
			{
				symbol: '^NDX',
				interval: '5m',
				timezone: 'America/New_York',
				points: [
					[t0, 26500],
					[t0 + 3 * 3600, 25800],
					[t0 + 6.5 * 3600, 25029.33]
				],
				asOf: '2026-11-20T21:00:00Z',
				source: 'yahoo'
			},
			{
				symbol: '^GSPC',
				interval: '5m',
				timezone: 'America/New_York',
				points: [
					[t0, 7170],
					[t0 + 6.5 * 3600, 6910.12]
				],
				asOf: '2026-11-20T21:00:00Z',
				source: 'yahoo'
			}
		],
		quality: { degraded: false, model: 'claude', missing: ['series:^DJI', 'quote:^HSI'] }
	};
}

describe('editionPageVM with an edition', () => {
	const vm = editionPageVM(brief(), edition(), 'en', t);

	it('names the edition', () => {
		expect(vm.kind).toBe('close');
		expect(vm.editionName).toBe('The Close');
		expect(vm.editionId).toBe('MI-2026-11-20-C');
		expect(vm.revision).toBe(1);
		expect(vm.dateLong).toBe('20 November 2026');
		expect(vm.publishedTime).toBe('22:33');
		expect(vm.dataAsOfTime).toBe('21:10');
	});

	it('writes a factual headline from the lead session and its largest mover', () => {
		expect(vm.headline).toBe('Wall Street closes lower as the Nasdaq 100 falls 5.62%');
	});

	it('leads with the session the edition is named after', () => {
		expect(vm.groups.map((g) => g.id)).toEqual(['us_close', 'eu_close']);
		const ndx = vm.groups[0].cards[0];
		expect(ndx.level).toBe('25,029.33');
		expect(ndx.change).toBe(MINUS + '1,490.32');
		expect(ndx.changePct).toBe(MINUS + '5.62%');
		expect(ndx.meta).toBe('NDX · US');
		expect(ndx.direction).toBe('down');
		expect(ndx.spark).not.toBeNull();
		expect(ndx.label).toBe('Nasdaq 100, 25,029.33, down 5.62%');
		expect(vm.groups[0].cards[1].spark).not.toBeNull();
		expect(vm.groups[1].cards[0].spark).toBeNull();
	});

	it('quotes the 10-year in basis points, never its relative change', () => {
		const rates = vm.crossAsset.find((s) => s.title === 'Rates')!;
		expect(rates.rows[0].level).toBe('4.910%');
		expect(rates.rows[0].change).toBe(MINUS + '13.9 bp');
		expect(JSON.stringify(vm.crossAsset)).not.toContain('2.75');
		const commodities = vm.crossAsset.find((s) => s.title === 'Commodities')!;
		expect(commodities.rows[0]).toMatchObject({
			name: 'Brent crude',
			level: '$89.87',
			change: '+0.48%'
		});
	});

	it('charts every series as percent from the previous close, with a data table', () => {
		const chart = vm.chart!;
		expect(chart.series.map((s) => s.name)).toEqual(['Nasdaq 100', 'S&P 500']);
		expect(chart.series[0].last).toBe(MINUS + '5.62%');
		expect(chart.timezoneLabel).toBe('ET');
		expect(chart.xTicks[0].label).toBe('10:00');
		expect(chart.table.columns).toEqual(['Time (ET)', 'Nasdaq 100', 'S&P 500']);
		expect(chart.table.rows[0]).toEqual(['09:30', MINUS + '0.07%', MINUS + '0.08%']);
		expect(chart.table.rows.at(-1)![0]).toBe('16:00');
		expect(chart.description).toContain('09:30–16:00 ET');
	});

	it('splits the lead story from the ranked developments and lists cited sources once', () => {
		expect(vm.lead?.text).toBe('Nvidia led the selloff.');
		expect(vm.lead?.sourceURL).toBe('https://www.cnbc.com/a');
		expect(vm.developments.map((d) => d.rank)).toEqual([2, 3]);
		expect(vm.sources).toEqual([{ host: 'cnbc.com', url: 'https://www.cnbc.com/a' }]);
	});

	it('names what is missing instead of inventing it', () => {
		expect(vm.missing).toEqual(['Dow Jones — intraday chart', 'Hang Seng — quote']);
	});
});

describe('headline mover selection', () => {
	it('names the largest mover in the direction of the session', () => {
		const up = brief({
			groups: [
				{
					id: 'us_close',
					title: 'Wall Street closed higher',
					tone: 'up',
					rows: [
						{
							symbol: '^NDX',
							flag: '',
							name: 'Nasdaq 100',
							level: '1',
							change: '1.60%',
							direction: 'down'
						},
						{
							symbol: '^GSPC',
							flag: '',
							name: 'S&P 500',
							level: '1',
							change: '0.60%',
							direction: 'up'
						},
						{
							symbol: '^DJI',
							flag: '',
							name: 'Dow Jones',
							level: '1',
							change: '1.50%',
							direction: 'up'
						}
					]
				}
			]
		});
		expect(editionPageVM(up, null, 'en', t).headline).toBe(
			'Wall Street closes higher as the Dow Jones gains 1.50%'
		);
	});
});

describe('editionPageVM for a legacy brief (no edition)', () => {
	const vm = editionPageVM(brief(), null, 'en', t);

	it('still renders the published levels, without numbers it does not have', () => {
		expect(vm.hasEdition).toBe(false);
		expect(vm.editionId).toBe(editionId('2026-11-20', 'evening'));
		expect(vm.revision).toBe(0);
		const ndx = vm.groups[0].cards[0];
		expect(ndx.level).toBe('25,029');
		expect(ndx.change).toBe('');
		expect(ndx.changePct).toBe(MINUS + '5.61%');
		expect(ndx.spark).toBeNull();
		expect(vm.chart).toBeNull();
		expect(vm.crossAsset).toEqual([]);
		expect(vm.dataAsOfTime).toBe('');
		expect(vm.missing).toEqual([]);
	});

	it('writes its headline from the published strings', () => {
		expect(vm.headline).toBe('Wall Street closes lower as the Nasdaq 100 falls 5.61%');
	});

	it('treats a morning brief as The Open, with earnings separate', () => {
		const morning = editionPageVM(
			brief({
				slot: 'morning',
				groups: [
					{
						id: 'us_futures',
						title: 'US futures higher',
						tone: 'up',
						rows: [
							{
								symbol: 'NQ=F',
								flag: '',
								name: 'Nasdaq 100',
								level: '25,100',
								change: '0.40%',
								direction: 'up'
							}
						]
					},
					{
						id: 'eu_open',
						title: 'European open higher',
						tone: 'up',
						rows: [
							{
								symbol: '^GDAXI',
								flag: '',
								name: 'DAX',
								level: '24,900',
								change: '0.80%',
								direction: 'up'
							}
						]
					}
				],
				stories: [],
				notes: [
					{ kind: 'highlight', text: 'Asia rose.', tickers: [], sourceHost: '' },
					{ kind: 'earnings', text: 'PEP reports.', tickers: ['PEP'], sourceHost: '' },
					{ kind: 'highlight', text: 'Oil steady.', tickers: [], sourceHost: '' }
				]
			}),
			null,
			'en',
			t
		);
		expect(morning.editionName).toBe('The Open');
		expect(morning.editionId).toBe('MI-2026-11-20-O');
		expect(morning.groups.map((g) => g.id)).toEqual(['eu_open', 'us_futures']);
		expect(morning.headline).toBe('European stocks open higher as the DAX gains 0.80%');
		expect(morning.lead?.text).toBe('Asia rose.');
		expect(morning.developments.map((d) => d.text)).toEqual(['Oil steady.']);
		expect(morning.earnings.map((d) => d.text)).toEqual(['PEP reports.']);
	});
});

describe('headlineFor', () => {
	it('writes Portuguese', () => {
		expect(
			headlineFor({ groupId: 'us_close', tone: 'down', name: 'Nasdaq 100', pct: -5.61 }, 'pt-PT')
		).toBe('Wall Street fecha em queda, com o Nasdaq 100 a cair 5,61%');
		expect(headlineFor({ groupId: 'eu_open', tone: 'up', name: 'DAX', pct: 0.8 }, 'pt-PT')).toBe(
			'Bolsas europeias abrem em alta, com o DAX a ganhar 0,80%'
		);
	});

	it('says mixed when the session is mixed', () => {
		expect(
			headlineFor({ groupId: 'us_close', tone: 'flat', name: 'Dow Jones', pct: 0.1 }, 'en')
		).toBe('Wall Street ends mixed; Dow Jones +0.10%');
	});

	it('never names a mover going against the session', () => {
		expect(
			headlineFor({ groupId: 'us_close', tone: 'up', name: 'Nasdaq 100', pct: -1.6 }, 'en')
		).toBe('Wall Street closes higher; Nasdaq 100 ' + MINUS + '1.60%');
	});

	it('never makes a future the index it tracks', () => {
		expect(
			headlineFor({ groupId: 'us_futures', tone: 'down', name: 'Nasdaq 100', pct: -0.4 }, 'en')
		).toBe('US futures point lower; Nasdaq 100 ' + MINUS + '0.40%');
	});
});
