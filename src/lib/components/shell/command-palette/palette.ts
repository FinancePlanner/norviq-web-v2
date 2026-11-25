import { DOMAIN_META, DOMAIN_ORDER, type Destination, type Tr } from '#lib/nav/destinations.js';
import { visibleDestinations, type NavContext } from '#lib/nav/visible.js';

// The ⌘K palette's rows and ranking (DS 2.0 spec §4.2), kept apart from the
// component so they test without a browser. Only CommandPalette.svelte imports
// this, and the shell loads that lazily, so none of it ships in the shell chunk.

export type PaletteKind = 'destination' | 'action' | 'symbol';

export interface PaletteItem {
	kind: PaletteKind;
	label: string;
	hint?: string;
	href: string;
}

/** The common actions, in the order the empty palette lists them. */
export function paletteActions(t: Tr): PaletteItem[] {
	return [
		{ kind: 'action', label: t('Record spend'), href: '/expenses/record' },
		{ kind: 'action', label: t('Add holding'), href: '/portfolio?add=position' },
		{ kind: 'action', label: t('Ask Q'), href: '/assistant' }
	];
}

const domainRank = (d: Destination) =>
	d.domain === 'account' ? DOMAIN_ORDER.length : DOMAIN_ORDER.indexOf(d.domain);

/**
 * Every visible destination and child, hinted with its domain: the sidebar picks
 * first (domain order, then pick order), then the other destinations, then the
 * children. A path is listed once, under its destination's name (§4.4): a chip
 * on its parent's own path ("Budget planner" on /expenses) is not a second name.
 */
export function paletteDestinations(t: Tr, ctx: NavContext): PaletteItem[] {
	const list = visibleDestinations(ctx);
	const hint = (d: Destination) =>
		t(d.domain === 'account' ? 'Account' : DOMAIN_META[d.domain].label);
	const picks = list
		.filter((d) => d.pick !== undefined)
		.sort((a, b) => domainRank(a) - domainRank(b) || (a.pick ?? 0) - (b.pick ?? 0));
	const rows = [
		...picks.map((d) => ({ link: d, d })),
		...list.filter((d) => d.pick === undefined).map((d) => ({ link: d, d })),
		...list.flatMap((d) => (d.children ?? []).map((link) => ({ link, d })))
	];
	const seen = new Set<string>();
	const out: PaletteItem[] = [];
	for (const { link, d } of rows) {
		if (seen.has(link.path)) continue;
		seen.add(link.path);
		out.push({ kind: 'destination', label: t(link.label), hint: hint(d), href: link.path });
	}
	return out;
}

/** Lower case, accents stripped: "Previsão" and "PREVISAO" both read "previsao". */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const WORD_BREAK = /[^\p{L}\p{N}]/u;

// 0: the label starts with the query; 1: a word in it does ("worth fore" too);
// 2: it contains the query; -1: no match.
function matchRank(label: string, query: string): number {
	if (label.startsWith(query)) return 0;
	let at = label.indexOf(query);
	if (at < 0) return -1;
	for (; at >= 0; at = label.indexOf(query, at + 1)) {
		if (WORD_BREAK.test(label[at - 1])) return 1;
	}
	return 2;
}

/**
 * The best `limit` items for `query`: label prefix, then word prefix, then
 * substring, case- and accent-insensitive; ties keep input order. An empty
 * query keeps input order, so callers pass the actions, then the destinations
 * (picks first). An href already listed is skipped: Ask Q is an action and a
 * destination, and shows once.
 */
export function rankPalette(
	query: string,
	items: readonly PaletteItem[],
	limit = 8
): PaletteItem[] {
	const q = fold(query.trim());
	const ranked = items
		.map((item, index) => ({ item, index, rank: matchRank(fold(item.label), q) }))
		.filter((r) => r.rank >= 0)
		.sort((a, b) => a.rank - b.rank || a.index - b.index);
	const seen = new Set<string>();
	const out: PaletteItem[] = [];
	for (const { item } of ranked) {
		if (out.length >= limit) break;
		if (seen.has(item.href)) continue;
		seen.add(item.href);
		out.push(item);
	}
	return out;
}
