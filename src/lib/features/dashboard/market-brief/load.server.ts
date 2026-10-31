import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { tag } from '#lib/sharelinks.js';
import type { Locale } from '#lib/i18n/index.js';
import {
	Down,
	Flat,
	KindEarnings,
	KindHighlight,
	KindStory,
	SlotEvening,
	SlotMorning,
	Up,
	marketBriefTitleKey,
	type MarketBriefItemVM,
	type MarketBriefVM
} from './types.js';

// Port of norviq-web internal/handlers/market_brief.go (Partial, fetch,
// mapMarketBrief) and the card-share bits of market_brief_page.go.
//
// Authenticates with PUBLIC_API_TOKEN, never the visitor's session: the brief
// is the same for everyone, so one per-isolate cache serves every visitor.

type BriefResponse = components['schemas']['MarketBriefResponse'];

const CACHE_TTL = 5 * 60_000;
const FAILURE_TTL = 60_000;
const CACHE_MAX = 256;
const FETCH_TIMEOUT = 10_000;
const OLDEST_DATE_MS = 366 * 24 * 60 * 60 * 1000;

interface Key {
	lang: string;
	slot: string;
	date: string;
}

interface Entry {
	vm: MarketBriefVM | null;
	expires: number;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<Entry>>();

/** parseMarketBriefQuery: both slot and date, or neither. null = 400. */
export function parseMarketBriefQuery(
	params: URLSearchParams,
	now: Date
): Omit<Key, 'lang'> | null {
	const slot = (params.get('slot') ?? '').trim();
	const date = (params.get('date') ?? '').trim();
	if (!slot && !date) return { slot: '', date: '' };
	if (slot !== SlotMorning && slot !== SlotEvening) return null;
	const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const parsed = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	if (parsed.getUTCMonth() !== +m[2] - 1 || parsed.getUTCDate() !== +m[3]) return null;
	if (
		parsed.getTime() > now.getTime() + 24 * 3600_000 ||
		parsed.getTime() < now.getTime() - OLDEST_DATE_MS
	)
		return null;
	return { slot, date: parsed.toISOString().slice(0, 10) };
}

const PT_MONTHS = [
	'jan.',
	'fev.',
	'mar.',
	'abr.',
	'mai.',
	'jun.',
	'jul.',
	'ago.',
	'set.',
	'out.',
	'nov.',
	'dez.'
];
const EN_MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

/** "15 Oct 2026" / "15 out. 2026". */
function formatBriefDate(iso: string, lang: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return `${d} ${(lang === 'pt-PT' ? PT_MONTHS : EN_MONTHS)[m - 1]} ${y}`;
}

function lisbonHHMM(t: Date): string {
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Lisbon',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(t);
}

const direction = (raw: string) => (raw === Up || raw === Down ? raw : Flat);

function tickers(raw: string[] | null | undefined): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const r of raw ?? []) {
		const t = r.trim().replace(/^\$/, '').toUpperCase();
		if (!t || t.length > 10 || seen.has(t) || !/^[A-Z0-9.-]+$/.test(t)) continue;
		seen.add(t);
		out.push(t);
	}
	return out;
}

function sourceHost(raw: string | null | undefined): string {
	if (!raw) return '';
	try {
		const u = new URL(raw.trim());
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
		return u.hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return '';
	}
}

export function mapMarketBrief(resp: BriefResponse | null, lang: string): MarketBriefVM | null {
	if (!resp || !resp.enabled || !resp.tradingDate) return null;
	const vm: MarketBriefVM = {
		slot: resp.slot === SlotMorning || resp.slot === SlotEvening ? resp.slot : '',
		tradingDate: formatBriefDate(resp.tradingDate, lang),
		tradingDateISO: resp.tradingDate.slice(0, 10),
		generatedAt: '',
		generatedAtISO: '',
		degraded: resp.degraded,
		greeting: (resp.greeting ?? '').trim(),
		groups: [],
		notes: [],
		stories: [],
		previousSlot: '',
		previousDate: '',
		previousURL: '',
		latestURL: '',
		shareURL: '',
		shareNativeURL: '',
		shareTitle: '',
		shareProps: ''
	};
	if (resp.generatedAt) {
		const g = new Date(resp.generatedAt);
		if (!Number.isNaN(g.getTime())) {
			vm.generatedAt = lisbonHHMM(g);
			vm.generatedAtISO = g.toISOString().replace(/\.\d{3}Z$/, 'Z');
		}
	}
	for (const group of resp.groups ?? []) {
		const rows = (group.rows ?? []).map((row) => ({
			symbol: row.symbol.trim(),
			flag: row.flag.trim(),
			name: row.name.trim(),
			level: row.level.trim(),
			change: row.changePercent.trim(),
			direction: direction(row.direction)
		}));
		if (rows.length > 0)
			vm.groups.push({
				id: group.id,
				title: group.title.trim(),
				tone: direction(group.tone),
				rows
			});
	}
	for (const item of resp.items ?? []) {
		const text = (item.text ?? '').trim();
		if (!text) continue;
		const mapped: MarketBriefItemVM = {
			kind: item.kind,
			text,
			tickers: tickers(item.tickers),
			sourceHost: sourceHost(item.sourceUrl)
		};
		if (mapped.kind === KindHighlight || mapped.kind === KindEarnings) vm.notes.push(mapped);
		else if (mapped.kind === KindStory) vm.stories.push(mapped);
	}
	if (vm.groups.length === 0 && vm.notes.length === 0 && vm.stories.length === 0) return null;
	const prev = resp.previous;
	if (prev && (prev.slot === SlotMorning || prev.slot === SlotEvening)) {
		vm.previousSlot = prev.slot;
		vm.previousDate = prev.tradingDate.slice(0, 10);
	}
	return vm;
}

async function fetchBrief(event: RequestEvent, key: Key): Promise<Entry> {
	const token = config().publicAPIToken;
	if (!token) return { vm: null, expires: Date.now() + CACHE_TTL };
	try {
		const res = await apiFetch(event, 'GET', '/v1/market/brief', null, {
			auth: 'public',
			query: { lang: key.lang, slot: key.slot || undefined, date: key.date || undefined },
			signal: AbortSignal.timeout(FETCH_TIMEOUT)
		});
		if (res.status === 200)
			return {
				vm: mapMarketBrief((await res.json()) as BriefResponse, key.lang),
				expires: Date.now() + CACHE_TTL
			};
		await res.body?.cancel().catch(() => {});
		if (res.status === 404 && key.slot) return { vm: null, expires: Date.now() + CACHE_TTL };
		console.warn('load market brief', key, `market brief returned status ${res.status}`);
	} catch (err) {
		console.warn('load market brief', key, err);
	}
	return { vm: null, expires: Date.now() + FAILURE_TTL };
}

function store(k: string, entry: Entry) {
	if (!entries.has(k) && entries.size >= CACHE_MAX) {
		const now = Date.now();
		for (const [key, e] of entries) if (now >= e.expires) entries.delete(key);
		if (entries.size >= CACHE_MAX) return;
	}
	entries.set(k, entry);
}

async function lookup(event: RequestEvent, key: Key): Promise<MarketBriefVM | null> {
	const k = `${key.lang}|${key.slot}|${key.date}`;
	const hit = entries.get(k);
	if (hit && Date.now() < hit.expires) return hit.vm;
	let p = inflight.get(k);
	if (!p) {
		p = fetchBrief(event, key).then((entry) => {
			store(k, entry);
			inflight.delete(k);
			return entry;
		});
		inflight.set(k, p);
	}
	return (await p).vm;
}

/**
 * MarketBriefHandler.Partial: the card VM for basePath, or null for "render
 * nothing" (Go's empty 200). Throws nothing; a bad slot/date is the caller's 400.
 */
export async function loadMarketBriefCard(
	event: RequestEvent,
	basePath: string,
	key: Omit<Key, 'lang'>
): Promise<MarketBriefVM | null> {
	const lang: Locale = event.locals.locale;
	const cached = await lookup(event, { ...key, lang });
	if (!cached) return null;
	const vm = { ...cached };
	if (vm.previousSlot && vm.previousDate) {
		vm.previousURL =
			basePath +
			'?' +
			new URLSearchParams({ date: vm.previousDate, slot: vm.previousSlot }).toString();
	}
	if (key.slot) vm.latestURL = basePath;
	if (vm.slot && vm.tradingDateISO) {
		const path = `/brief/${vm.tradingDateISO}/${vm.slot}` + (lang === 'pt-PT' ? '?lang=pt-PT' : '');
		vm.shareURL = path + '#share';
		vm.shareNativeURL = tag(config().publicBaseURL + path, 'native');
		vm.shareTitle = event.locals.t(marketBriefTitleKey(vm.slot)) + ' — ' + vm.tradingDate;
		vm.shareProps = JSON.stringify({
			date: vm.tradingDateISO,
			lang,
			slot: vm.slot,
			surface: 'card'
		});
	}
	return vm;
}
