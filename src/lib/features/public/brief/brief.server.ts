// Port of norviq-web internal/handlers/market_brief_page.go: the market
// brief's public permalinks /brief/{date}/{slot} (page, og.png, card.png) and
// /brief (redirect to the latest). iOS links to the same URLs, so their shape
// is a contract.
//
// The language is the URL's ?lang=pt-PT, never the cookie or
// Accept-Language: a shared link renders in the sharer's language, and each
// language has one canonical URL (English without a query).
//
// The mapping and query rules are the dashboard card's
// (#lib/features/dashboard/market-brief/load.server.js). This module keeps its
// own per-isolate cache because a page must tell a failed fetch (503) from
// "no brief" (404), which the card's cache does not record. Go's rendered-page
// cache is not ported: the brief lookup is cached, and Cache-Control lets a
// shared cache hold the HTML for five minutes as in Go.
import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import {
	normalizeLanguage,
	translator,
	LANGUAGE_ENGLISH,
	LANGUAGE_PTPT,
	type Locale
} from '#lib/i18n/index.js';
import { build as buildShareLinks, tag, type Links } from '#lib/sharelinks.js';
import {
	mapMarketBrief,
	parseMarketBriefQuery
} from '#lib/features/dashboard/market-brief/load.server.js';
import {
	marketBriefTitleKey,
	type MarketBriefVM
} from '#lib/features/dashboard/market-brief/types.js';

type BriefResponse = components['schemas']['MarketBriefResponse'];

const CACHE_TTL = 5 * 60_000;
const FAILURE_TTL = 60_000;
const CACHE_MAX = 256;
const FETCH_TIMEOUT = 10_000;

export const PAGE_CACHE_CONTROL = 'public, max-age=0, s-maxage=300';
export const IMAGE_CACHE_CONTROL = 'public, max-age=3600';
export const REDIRECT_CACHE_CONTROL = 'public, max-age=60';
export const MISSING_CACHE_CONTROL = 'public, max-age=60';

const DESCRIPTION_RUNES = 160;
const SHARE_TICKERS = 3;
const SHARE_BULLETS = 3;

export interface Key {
	lang: Locale;
	slot: string;
	date: string;
}

interface Entry {
	vm: MarketBriefVM | null;
	failed: boolean;
	expires: number;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<Entry>>();

export class BriefNotFound extends Error {}
export class BriefUnavailable extends Error {}

/** marketBriefPath: a brief's permalink path, without the language. */
export function briefPath(date: string, slot: string): string {
	return '/brief/' + date + '/' + slot;
}

/** marketBriefLangQuery: none for English, the canonical default. */
export function langQuery(lang: string): string {
	return lang === LANGUAGE_PTPT ? '?lang=' + LANGUAGE_PTPT : '';
}

/** marketBriefURLLang: ?lang=, defaulting to English. */
export function urlLang(url: URL): Locale {
	return normalizeLanguage(url.searchParams.get('lang')) ?? LANGUAGE_ENGLISH;
}

/**
 * parseMarketBriefPermalink: the {date}/{slot} segments under the card's
 * ?slot=&date= rules, and only the canonical spelling of the date.
 */
export function parsePermalink(
	date: string,
	slot: string,
	now = new Date()
): { slot: string; date: string } | null {
	const key = parseMarketBriefQuery(new URLSearchParams({ slot, date }), now);
	if (!key || !key.slot || key.date !== date) return null;
	return key;
}

async function fetchBrief(event: RequestEvent, key: Key): Promise<Entry> {
	if (!config().publicAPIToken) return { vm: null, failed: false, expires: Date.now() + CACHE_TTL };
	try {
		const res = await apiFetch(event, 'GET', '/v1/market/brief', null, {
			auth: 'public',
			query: { lang: key.lang, slot: key.slot || undefined, date: key.date || undefined },
			signal: AbortSignal.timeout(FETCH_TIMEOUT)
		});
		if (res.status === 200) {
			return {
				vm: mapMarketBrief((await res.json()) as BriefResponse, key.lang),
				failed: false,
				expires: Date.now() + CACHE_TTL
			};
		}
		await res.body?.cancel().catch(() => {});
		if (res.status === 404 && key.slot)
			return { vm: null, failed: false, expires: Date.now() + CACHE_TTL };
		console.warn('load market brief', key, `market brief returned status ${res.status}`);
	} catch (err) {
		console.warn('load market brief', key, err);
	}
	return { vm: null, failed: true, expires: Date.now() + FAILURE_TTL };
}

function store(k: string, entry: Entry) {
	if (!entries.has(k) && entries.size >= CACHE_MAX) {
		const now = Date.now();
		for (const [key, e] of entries) if (now >= e.expires) entries.delete(key);
		if (entries.size >= CACHE_MAX) return;
	}
	entries.set(k, entry);
}

async function lookup(event: RequestEvent, key: Key): Promise<Entry> {
	const k = `${key.lang}|${key.slot}|${key.date}`;
	const hit = entries.get(k);
	if (hit && Date.now() < hit.expires) return hit;
	let p = inflight.get(k);
	if (!p) {
		p = fetchBrief(event, key).then((entry) => {
			store(k, entry);
			inflight.delete(k);
			return entry;
		});
		inflight.set(k, p);
	}
	return p;
}

/** find: the brief at key, or throws BriefNotFound / BriefUnavailable. */
export async function findBrief(event: RequestEvent, key: Key): Promise<MarketBriefVM> {
	const entry = await lookup(event, key);
	if (entry.failed) throw new BriefUnavailable('market brief backend unavailable');
	const vm = entry.vm;
	if (!vm || !vm.slot || !vm.tradingDateISO) throw new BriefNotFound('market brief not found');
	// Never serve one brief under another's URL.
	if (key.slot && (vm.slot !== key.slot || vm.tradingDateISO !== key.date))
		throw new BriefNotFound('market brief not found');
	return vm;
}

export function briefTitle(lang: Locale, vm: MarketBriefVM): string {
	return translator(lang)(marketBriefTitleKey(vm.slot)) + ' — ' + vm.tradingDate;
}

/** marketBriefItems: the morning notes or the evening stories. */
function items(vm: MarketBriefVM) {
	return [...vm.notes, ...vm.stories];
}

export function itemTexts(vm: MarketBriefVM, limit: number): string[] {
	return items(vm)
		.slice(0, limit)
		.map((it) => it.text);
}

/** The first few distinct tickers, for X cashtags. */
function shareTickers(vm: MarketBriefVM): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const it of items(vm)) {
		for (const t of it.tickers) {
			if (out.length === SHARE_TICKERS) return out;
			if (!seen.has(t)) {
				seen.add(t);
				out.push(t);
			}
		}
	}
	return out;
}

/** truncateAtWord: at most n runes, at a word boundary when there is one, ending in "…". */
export function truncateAtWord(s: string, n: number): string {
	const runes = Array.from(s);
	if (runes.length <= n) return s;
	let cut = runes.slice(0, n - 1).join('');
	// Go compares byte offsets: LastIndex(cut, " ") > len(cut)/2.
	const bytes = (x: string) => new TextEncoder().encode(x).length;
	const i = cut.lastIndexOf(' ');
	if (i >= 0 && bytes(cut.slice(0, i)) > Math.floor(bytes(cut) / 2)) cut = cut.slice(0, i);
	return cut.replace(/[ ,.;:—-]+$/u, '') + '…';
}

/** marketBriefDescription: greeting + first item, cut at ~160 runes; the title when empty. */
export function briefDescription(vm: MarketBriefVM, title: string): string {
	const parts: string[] = [];
	if (vm.greeting) parts.push(vm.greeting);
	const first = itemTexts(vm, 1);
	if (first.length > 0) parts.push(first[0]);
	const text = parts.join(' ');
	if (!text) return title;
	return truncateAtWord(text, DESCRIPTION_RUNES);
}

function absolute(base: string, path: string): string {
	return base ? base.replace(/\/+$/, '') + path : path;
}

/** Go's encoding/json escapes <, > and & (and U+2028/2029), so the result is safe inside <script>. */
export function goJSON(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

/** Go json.Marshal of a map sorts the keys. */
function sortedKeys<T extends Record<string, unknown>>(obj: T): T {
	return Object.fromEntries(
		Object.keys(obj)
			.sort()
			.map((k) => [k, obj[k]])
	) as T;
}

export function shareProps(vm: MarketBriefVM, lang: string, surface: string): string {
	return goJSON(sortedKeys({ slot: vm.slot, date: vm.tradingDateISO, lang, surface }));
}

export interface BriefPageVM {
	lang: Locale;
	brief: MarketBriefVM;
	heading: string;
	title: string;
	documentTitle: string;
	description: string;
	canonicalURL: string;
	englishURL: string;
	portugueseURL: string;
	ogImageURL: string;
	ogLocale: string;
	ogLocaleAlternate: string;
	publishedISO: string;
	jsonLD: string;
	previousURL: string;
	latestURL: string;
	otherLanguageURL: string;
	otherLanguageCode: string;
	otherLanguageLabel: string;
	share: Links;
	shareProps: string;
	nativeShareURL: string;
	cardImageURL: string;
	cardFileName: string;
	signedIn: boolean;
}

/** pageVM: every URL built and every string translated, in the URL's language. */
export function pageVM(lang: Locale, brief: MarketBriefVM, signedIn: boolean): BriefPageVM {
	const t = translator(lang);
	const base = config().publicBaseURL;
	const path = briefPath(brief.tradingDateISO, brief.slot);
	const englishURL = absolute(base, path);
	const portugueseURL = absolute(base, path + langQuery(LANGUAGE_PTPT));
	const canonical = lang === LANGUAGE_PTPT ? portugueseURL : englishURL;
	const title = briefTitle(lang, brief);
	const pt = lang === LANGUAGE_PTPT;
	const vm: BriefPageVM = {
		lang,
		brief,
		heading: t(marketBriefTitleKey(brief.slot)),
		title,
		documentTitle: title + ' | Norviq',
		description: briefDescription(brief, title),
		canonicalURL: canonical,
		englishURL,
		portugueseURL,
		ogImageURL: absolute(base, path + '/og.png' + langQuery(lang)),
		ogLocale: pt ? 'pt_PT' : 'en_US',
		ogLocaleAlternate: pt ? 'en_US' : 'pt_PT',
		publishedISO: brief.generatedAtISO,
		jsonLD: '',
		previousURL:
			brief.previousSlot && brief.previousDate
				? briefPath(brief.previousDate, brief.previousSlot) + langQuery(lang)
				: '',
		latestURL: '',
		otherLanguageURL: pt ? path : path + langQuery(LANGUAGE_PTPT),
		otherLanguageCode: pt ? LANGUAGE_ENGLISH : LANGUAGE_PTPT,
		otherLanguageLabel: pt ? 'English' : 'Português',
		share: buildShareLinks({
			canonical,
			title,
			tickers: shareTickers(brief),
			bullets: itemTexts(brief, SHARE_BULLETS),
			disclaimer: t('AI-written from market data. Not financial advice.'),
			captionCTA: t('Read it on Norviq (link in bio).')
		}),
		shareProps: shareProps(brief, lang, 'page'),
		nativeShareURL: tag(canonical, 'native'),
		cardImageURL: path + '/card.png' + langQuery(lang),
		cardFileName: 'norviq-brief-' + brief.tradingDateISO + '-' + brief.slot + '.png',
		signedIn
	};
	vm.jsonLD = jsonLD(vm, base, lang);
	return vm;
}

function jsonLD(vm: BriefPageVM, base: string, lang: string): string {
	const norviq = { '@type': 'Organization', name: 'Norviq', url: absolute(base, '/') };
	const data: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		headline: vm.title,
		description: vm.description,
		url: vm.canonicalURL,
		mainEntityOfPage: vm.canonicalURL,
		image: [vm.ogImageURL],
		inLanguage: lang,
		author: norviq,
		publisher: norviq
	};
	if (vm.publishedISO) {
		data.datePublished = vm.publishedISO;
		data.dateModified = vm.publishedISO;
	}
	// Go marshals maps with sorted keys, nested ones too.
	const sortDeep = (v: unknown): unknown =>
		Array.isArray(v)
			? v.map(sortDeep)
			: v && typeof v === 'object'
				? Object.fromEntries(
						Object.keys(v)
							.sort()
							.map((k) => [k, sortDeep((v as Record<string, unknown>)[k])])
					)
				: v;
	return goJSON(sortDeep(data));
}

/** SitemapPaths: the latest brief's permalink in each language. */
export async function briefSitemapPaths(event: RequestEvent): Promise<string[]> {
	if (!config().publicAPIToken) return [];
	const paths: string[] = [];
	for (const lang of [LANGUAGE_ENGLISH, LANGUAGE_PTPT] as Locale[]) {
		try {
			const brief = await findBrief(event, { lang, slot: '', date: '' });
			paths.push(briefPath(brief.tradingDateISO, brief.slot) + langQuery(lang));
		} catch {
			// skipped, as in Go
		}
	}
	return paths;
}

/** marketBriefShortHost: the base URL as people type it, "norviq.org". */
export function shortHost(base: string): string {
	const host = base
		.replace(/^https:\/\//, '')
		.replace(/^http:\/\//, '')
		.replace(/^www\./, '');
	return host || 'norviq.org';
}
