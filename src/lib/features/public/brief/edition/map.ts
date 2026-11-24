// Builds the editorial view model of a brief: The Open or The Close.
//
// Two inputs. The brief (MarketBriefVM) is always there: its localized
// group titles, formatted rows and the narrative. The edition is there for
// briefs written since editions existed, and carries the raw numbers,
// absolute moves, basis points, as-of times and intraday series. Without it
// the page still renders, from the brief's strings alone, and the blocks
// that need numbers are left out rather than filled in.
import type {
	MarketBriefGroupVM,
	MarketBriefItemVM,
	MarketBriefVM
} from '#lib/features/dashboard/market-brief/types.js';
import {
	CHART_H,
	CHART_W,
	comparativeChart,
	hourTicks,
	sparkline,
	type PctSeries
} from './chart.js';
import {
	directionOf,
	directionWord,
	formatBps,
	formatLevel,
	formatLongDate,
	formatNumber,
	formatPercent,
	formatSigned,
	formatTime,
	formatYield,
	parseLegacyPercent
} from './format.js';
import type {
	ChartSeriesVM,
	CrossAssetRowVM,
	Direction,
	EditionDTO,
	EditionInstrumentDTO,
	IntradayChartVM,
	ScoreGroupVM,
	ScorecardVM,
	SourceVM,
	StoryVM
} from './types.js';
import type { EditionStrings } from './strings.js';

export const LISBON = 'Europe/Lisbon';

export interface EditionPageVM {
	kind: 'open' | 'close';
	/** "The Close" / "O Fecho". */
	editionName: string;
	editionId: string;
	/** 0 for briefs written before revisions existed. */
	revision: number;
	dateLong: string;
	headline: string;
	dek: string;
	publishedTime: string;
	dataAsOfTime: string;
	degraded: boolean;
	groups: ScoreGroupVM[];
	chart: IntradayChartVM | null;
	lead: StoryVM | null;
	developments: StoryVM[];
	earnings: StoryVM[];
	crossAsset: { title: string; rows: CrossAssetRowVM[] }[];
	sources: SourceVM[];
	missing: string[];
	hasEdition: boolean;
}

/** Short tickers for the card meta line ("NDX · US"). */
function shortSymbol(symbol: string): string {
	return symbol.replace(/^\^/, '').replace(/=F$/, '');
}

export function editionKind(slot: string): 'open' | 'close' {
	return slot === 'morning' ? 'open' : 'close';
}

/** MI-2026-11-20-C: the same identifier the backend stamps on editions. */
export function editionId(dateISO: string, slot: string): string {
	return 'MI-' + dateISO + '-' + (slot === 'morning' ? 'O' : 'C');
}

/** Which group leads: the session the edition is named after. */
function leadGroupId(kind: 'open' | 'close'): string[] {
	return kind === 'close' ? ['us_close', 'eu_close'] : ['eu_open', 'us_futures'];
}

function orderGroups(groups: MarketBriefGroupVM[], kind: 'open' | 'close'): MarketBriefGroupVM[] {
	const order = leadGroupId(kind);
	const rank = (id: string) => {
		const i = order.indexOf(id);
		return i < 0 ? order.length : i;
	};
	return [...groups].sort((a, b) => rank(a.id) - rank(b.id));
}

function direction(raw: string): Direction {
	return raw === 'up' || raw === 'down' ? raw : 'flat';
}

/** The signed percent of a legacy row: its unsigned string plus its direction. */
function legacyPct(change: string, d: Direction): number | null {
	const v = parseLegacyPercent(change);
	if (v === null) return null;
	return d === 'down' ? -v : v;
}

interface HeadlineInput {
	groupId: string;
	tone: Direction;
	name: string;
	pct: number;
}

/**
 * A factual headline from the numbers alone: the lead session's tone and
 * its largest mover. Never adjectives the numbers do not carry.
 */
export function headlineFor(h: HeadlineInput, lang: string): string {
	const pt = lang === 'pt-PT';
	const pct = formatPercent(Math.abs(h.pct), lang).replace(/^\+/, '');
	const signed = formatPercent(h.pct, lang);
	const mover = directionOf(h.pct);
	// [subject, verb, higher, lower, mixed] per language.
	const en: Record<string, string[]> = {
		us_close: ['Wall Street', 'closes', 'higher', 'lower', 'ends mixed'],
		eu_close: ['European stocks', 'close', 'higher', 'lower', 'close mixed'],
		eu_open: ['European stocks', 'open', 'higher', 'lower', 'open mixed'],
		us_futures: ['US futures', 'point', 'higher', 'lower', 'are mixed']
	};
	const ptw: Record<string, string[]> = {
		us_close: ['Wall Street', 'fecha', 'em alta', 'em queda', 'fecha mista'],
		eu_close: ['Bolsas europeias', 'fecham', 'em alta', 'em queda', 'fecham mistas'],
		eu_open: ['Bolsas europeias', 'abrem', 'em alta', 'em queda', 'abrem mistas'],
		us_futures: ['Futuros americanos', 'apontam', 'para ganhos', 'para perdas', 'estão mistos']
	};
	const [subject, verb, higher, lower, mixed] =
		(pt ? ptw : en)[h.groupId] ?? (pt ? ptw : en).us_close;
	const tone = h.tone === 'up' ? higher : h.tone === 'down' ? lower : '';
	// Futures name an index they are not: never "the Nasdaq 100 falls". A
	// mover against the session's tone never gets the "as … falls" form.
	if (!tone || mover !== h.tone || h.groupId === 'us_futures') {
		return `${subject} ${tone ? verb + ' ' + tone : mixed}; ${h.name} ${signed}`;
	}
	if (pt)
		return `${subject} ${verb} ${tone}, com o ${h.name} ${mover === 'up' ? 'a ganhar' : 'a cair'} ${pct}`;
	return `${subject} ${verb} ${tone} as the ${h.name} ${mover === 'up' ? 'gains' : 'falls'} ${pct}`;
}

function instrumentLabel(
	name: string,
	level: string,
	move: string,
	d: Direction,
	lang: string
): string {
	return `${name}, ${level}, ${directionWord(d, lang)} ${move.replace(/^[+−]/, '')}`;
}

function scorecard(
	row: MarketBriefGroupVM['rows'][number],
	inst: EditionInstrumentDTO | undefined,
	series: EditionDTO['series'][number] | undefined,
	lang: string
): ScorecardVM {
	if (!inst) {
		const d = direction(row.direction);
		const pct = legacyPct(row.change, d);
		const changePct = pct === null ? row.change : formatPercent(pct, lang);
		return {
			symbol: row.symbol,
			name: row.name,
			meta: shortSymbol(row.symbol),
			level: row.level,
			change: '',
			changePct,
			direction: d,
			label: instrumentLabel(row.name, row.level, changePct, d, lang),
			spark: null,
			asOf: ''
		};
	}
	const d = directionOf(inst.changePct);
	const level = formatLevel(inst.last, lang, inst.precision);
	const changePct = formatPercent(inst.changePct, lang);
	let spark = null;
	if (series && series.points.length >= 2) {
		spark = sparkline(
			series.points.map((p) => p[1]),
			inst.previousClose
		);
	}
	return {
		symbol: inst.symbol,
		name: row.name || inst.name,
		meta: [shortSymbol(inst.symbol), inst.region].filter(Boolean).join(' · '),
		level,
		change: formatSigned(inst.change, lang, Math.min(inst.precision, 2)),
		changePct,
		direction: d,
		label: instrumentLabel(row.name || inst.name, level, changePct, d, lang),
		spark,
		asOf: formatTime(inst.asOf, LISBON, lang)
	};
}

function tzLabel(tz: string | undefined): string {
	if (tz === 'America/New_York') return 'ET';
	if (tz === 'Europe/Berlin' || tz === 'Europe/Paris') return 'CET';
	if (tz === LISBON) return 'Lisbon';
	return tz ?? 'UTC';
}

const CHART_TONES: ChartSeriesVM['tone'][] = ['line', 'alt', 'info'];

function intradayChart(
	e: EditionDTO,
	kind: 'open' | 'close',
	lang: string,
	str: EditionStrings
): IntradayChartVM | null {
	const bySymbol = new Map(e.instruments.map((i) => [i.symbol, i]));
	const input: (PctSeries & { name: string })[] = [];
	for (const s of e.series) {
		const inst = bySymbol.get(s.symbol);
		if (!inst || !(inst.previousClose > 0) || s.points.length < 2) continue;
		// At 08:15 Lisbon Europe has traded for minutes: charting it beside a
		// night of futures would be a sliver. The Open charts the futures.
		if (kind === 'open' && inst.assetClass !== 'future') continue;
		input.push({
			symbol: s.symbol,
			name: str.names[s.symbol] ?? inst.name,
			points: s.points.map(
				([ts, v]) => [ts, (v / inst.previousClose - 1) * 100] as [number, number]
			)
		});
	}
	if (input.length === 0) return null;
	const all = input.flatMap((s) => s.points.map((p) => p[0]));
	const t0 = Math.min(...all);
	const t1 = Math.max(...all);
	const tz = e.series[0]?.timezone || 'America/New_York';
	const ticks = hourTicks(t0, t1, t1 - t0 > 10 * 3600 ? 3 : 1);
	const geo = comparativeChart(input, ticks);
	if (!geo) return null;
	const series: ChartSeriesVM[] = input.map((s, i) => {
		const last = s.points[s.points.length - 1][1];
		return {
			symbol: s.symbol,
			name: s.name,
			tone: CHART_TONES[i % CHART_TONES.length],
			path: geo.paths.get(s.symbol) ?? '',
			last: formatPercent(last, lang),
			direction: directionOf(last)
		};
	});
	// Data-table alternative, sampled every 30 minutes plus the last print.
	const sampleTimes: number[] = [];
	for (let ts = Math.ceil(t0 / 1800) * 1800; ts <= t1; ts += 1800) sampleTimes.push(ts);
	if (sampleTimes[sampleTimes.length - 1] !== t1) sampleTimes.push(t1);
	const valueAt = (s: PctSeries, ts: number) => {
		let best: number | null = null;
		for (const [pt, v] of s.points) if (pt <= ts) best = v;
		return best;
	};
	const tzName = tzLabel(tz);
	const range = `${formatTime(new Date(t0 * 1000).toISOString(), tz, lang)}–${formatTime(new Date(t1 * 1000).toISOString(), tz, lang)} ${tzName}`;
	return {
		title: kind === 'close' ? str.chartTitleClose : str.chartTitleOpen,
		description: series.map((s) => `${s.name} ${s.last}`).join(', ') + ` (${range}).`,
		series,
		yTicks: geo.yTicks.map((y) => ({ y: y.y, label: formatPercent(y.value, lang, 1) })),
		xTicks: geo.xTicks.map((x) => ({
			x: x.x,
			label: formatTime(new Date(x.t * 1000).toISOString(), tz, lang)
		})),
		zero: geo.zero,
		table: {
			columns: [`${str.time} (${tzName})`, ...series.map((s) => s.name)],
			rows: sampleTimes.map((ts) => [
				formatTime(new Date(ts * 1000).toISOString(), tz, lang),
				...input.map((s) => {
					const v = valueAt(s, ts);
					return v === null ? '—' : formatPercent(v, lang);
				})
			])
		},
		timezoneLabel: tzName
	};
}

function crossAsset(
	e: EditionDTO,
	lang: string,
	str: EditionStrings
): { title: string; rows: CrossAssetRowVM[] }[] {
	const sections: { key: string; title: string; rows: CrossAssetRowVM[] }[] = [
		{ key: 'rate', title: str.rates, rows: [] },
		{ key: 'commodity', title: str.commodities, rows: [] },
		{ key: 'index', title: str.asia, rows: [] }
	];
	for (const inst of e.instruments) {
		if (inst.group) continue;
		const section = sections.find((s) => s.key === inst.assetClass);
		if (!section) continue;
		const name = str.names[inst.symbol] ?? inst.name;
		let level: string;
		let change: string;
		let d: Direction;
		if (inst.assetClass === 'rate' && typeof inst.changeBps === 'number') {
			level = formatYield(inst.last, lang, inst.precision);
			change = formatBps(inst.changeBps, lang);
			d = directionOf(inst.changeBps, 1);
		} else if (inst.assetClass === 'rate') {
			// A yield's changePct is relative ("fell 2.77%" for about −14 bp):
			// without its basis points, show the level and no move at all.
			level = formatYield(inst.last, lang, inst.precision);
			change = '';
			d = 'flat';
		} else {
			level =
				inst.unit === 'usd_bbl'
					? '$' + formatNumber(inst.last, lang, 2)
					: formatLevel(inst.last, lang, inst.precision);
			change = formatPercent(inst.changePct, lang);
			d = directionOf(inst.changePct);
		}
		section.rows.push({
			symbol: inst.symbol,
			name,
			section: section.title,
			level,
			change,
			direction: d,
			// No move known: say the level only, never "unchanged".
			label: change ? instrumentLabel(name, level, change, d, lang) : `${name}, ${level}`
		});
	}
	return sections.filter((s) => s.rows.length > 0).map(({ title, rows }) => ({ title, rows }));
}

function story(item: MarketBriefItemVM, rank: number): StoryVM {
	return {
		rank,
		kind: item.kind,
		text: item.text,
		tickers: item.tickers,
		sourceHost: item.sourceHost,
		sourceURL: item.sourceURL ?? ''
	};
}

function sources(items: MarketBriefItemVM[]): SourceVM[] {
	const seen = new Map<string, string>();
	for (const it of items) {
		if (it.sourceHost && it.sourceURL && !seen.has(it.sourceHost))
			seen.set(it.sourceHost, it.sourceURL);
	}
	return [...seen].map(([host, url]) => ({ host, url }));
}

function missingNames(e: EditionDTO | null, str: EditionStrings): string[] {
	if (!e) return [];
	return e.quality.missing.map((m) => {
		const [kind, symbol] = m.split(':');
		const name = str.names[symbol] ?? symbol;
		return kind === 'series' ? `${name} — ${str.intradayChart}` : `${name} — ${str.quote}`;
	});
}

export function editionPageVM(
	brief: MarketBriefVM,
	edition: EditionDTO | null,
	lang: string,
	str: EditionStrings
): EditionPageVM {
	const kind = editionKind(brief.slot);
	const e = edition && edition.id ? edition : null;
	const instruments = new Map((e?.instruments ?? []).map((i) => [i.symbol, i]));
	const series = new Map((e?.series ?? []).map((s) => [s.symbol, s]));
	const ordered = orderGroups(brief.groups, kind);
	const groups: ScoreGroupVM[] = ordered.map((g) => ({
		id: g.id,
		title: g.title,
		cards: g.rows.map((row) =>
			scorecard(row, instruments.get(row.symbol), series.get(row.symbol), lang)
		)
	}));

	let headline = '';
	const lead = ordered[0];
	if (lead) {
		const tone = direction(lead.tone);
		const movers: { name: string; pct: number }[] = [];
		for (const row of lead.rows) {
			const inst = instruments.get(row.symbol);
			const pct = inst ? inst.changePct : legacyPct(row.change, direction(row.direction));
			if (pct !== null) movers.push({ name: row.name, pct });
		}
		// The mover named must move the way the session did: in a higher close
		// the largest gainer, never a falling index ("closes higher as the
		// Nasdaq falls"). With no such row, or a mixed session, the largest
		// absolute move goes in the neutral form.
		const agreeing = movers.filter((m) => directionOf(m.pct) === tone);
		const pool = tone !== 'flat' && agreeing.length ? agreeing : movers;
		const best = pool.reduce<{ name: string; pct: number } | null>(
			(b, m) => (!b || Math.abs(m.pct) > Math.abs(b.pct) ? m : b),
			null
		);
		if (best) headline = headlineFor({ groupId: lead.id, tone, ...best }, lang);
	}

	const items = [...brief.notes, ...brief.stories];
	const narrative =
		kind === 'close' ? brief.stories : brief.notes.filter((n) => n.kind === 'highlight');
	const earnings = brief.notes.filter((n) => n.kind === 'earnings');

	return {
		kind,
		editionName: kind === 'close' ? str.theClose : str.theOpen,
		editionId: e?.id ?? editionId(brief.tradingDateISO, brief.slot),
		revision: e?.revision ?? 0,
		dateLong: formatLongDate(brief.tradingDateISO, lang),
		headline: headline || (kind === 'close' ? str.theClose : str.theOpen),
		// The greeting is a dek only when it is a sentence, not a salutation ("Good morning,").
		dek: /[.!?]$/.test(brief.greeting) && brief.greeting.length >= 40 ? brief.greeting : '',
		publishedTime: brief.generatedAtISO ? formatTime(brief.generatedAtISO, LISBON, lang) : '',
		dataAsOfTime: e?.marketDataAsOf ? formatTime(e.marketDataAsOf, LISBON, lang) : '',
		degraded: brief.degraded,
		groups,
		chart: e ? intradayChart(e, kind, lang, str) : null,
		lead: narrative[0] ? story(narrative[0], 1) : null,
		developments: narrative.slice(1).map((it, i) => story(it, i + 2)),
		earnings: earnings.map((it, i) => story(it, i + 1)),
		crossAsset: e ? crossAsset(e, lang, str) : [],
		sources: sources(items),
		missing: missingNames(e, str),
		hasEdition: e !== null
	};
}

export { CHART_H, CHART_W };
