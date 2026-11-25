import type { FeatureKey } from '../billing.js';
import {
	achievementsOn,
	groupsOn,
	groupsPublicOn,
	leaderboardsOn,
	type SocialConfig
} from '../nav.js';
import {
	DESTINATIONS,
	DOMAIN_META,
	DOMAIN_ORDER,
	type Destination,
	type DomainKey,
	type Gate,
	type NavLink,
	type Tr
} from './destinations.js';
import { DESCRIPTIONS } from './descriptions.js';

// The one filter (gates) and the view models every navigation surface reads:
// sidebar, domain index pages, /more, the section sub-nav and the ⌘K palette.

export interface NavContext {
	social: SocialConfig;
	articles: boolean;
	locked: ((f: FeatureKey) => boolean) | null;
}

export interface NavItemVM {
	label: string;
	path: string;
	showProBadge: boolean;
	badgeURL?: string;
}

export interface SidebarDomainVM {
	key: DomainKey;
	label: string;
	indexPath: string;
	picks: NavItemVM[];
}

function gateOpen(gate: Gate | undefined, ctx: NavContext): boolean {
	switch (gate) {
		case undefined:
			return true;
		case 'social':
			return ctx.social.enabled;
		case 'groups':
			return groupsOn(ctx.social);
		case 'groupsPublic':
			return groupsPublicOn(ctx.social);
		case 'leaderboards':
			return leaderboardsOn(ctx.social);
		case 'achievements':
			return achievementsOn(ctx.social);
		case 'articles':
			return ctx.articles;
	}
}

// While achievements are on they replace Settings › Badges, in the same place.
const SETTINGS_BADGES = '/settings/badges';
const SETTINGS_ACHIEVEMENTS: NavLink = {
	label: 'Achievements',
	path: '/achievements',
	gate: 'achievements'
};

function visibleChildren(children: NavLink[], ctx: NavContext): NavLink[] {
	const swap = achievementsOn(ctx.social);
	return children
		.map((c) => (swap && c.path === SETTINGS_BADGES ? SETTINGS_ACHIEVEMENTS : c))
		.filter((c) => gateOpen(c.gate, ctx));
}

/** Destinations whose gate is open, with their children filtered the same way. */
export function visibleDestinations(ctx: NavContext): Destination[] {
	return DESTINATIONS.filter((d) => gateOpen(d.gate, ctx)).map((d) =>
		d.children ? { ...d, children: visibleChildren(d.children, ctx) } : d
	);
}

function itemVM(t: Tr, ctx: NavContext, link: NavLink): NavItemVM {
	const vm: NavItemVM = {
		label: t(link.label),
		path: link.path,
		showProBadge: !!link.featureKey && !!ctx.locked?.(link.featureKey)
	};
	if (link.badgeURL) vm.badgeURL = link.badgeURL;
	return vm;
}

function picksOf(list: readonly Destination[], key: DomainKey): Destination[] {
	return list
		.filter((d) => d.domain === key && d.pick !== undefined)
		.sort((a, b) => (a.pick ?? 0) - (b.pick ?? 0));
}

/** The six domains in order, each with its picks; a domain with nothing visible is left out. */
export function sidebarDomains(t: Tr, ctx: NavContext): SidebarDomainVM[] {
	const list = visibleDestinations(ctx);
	return DOMAIN_ORDER.filter((key) => list.some((d) => d.domain === key)).map((key) => ({
		key,
		label: t(DOMAIN_META[key].label),
		indexPath: DOMAIN_META[key].indexPath,
		picks: picksOf(list, key).map((d) => itemVM(t, ctx, d))
	}));
}

// Planning's index follows spec §7.11; every other domain has one "All" section.
const PLANNING_SECTIONS: { title: string; ids: string[] }[] = [
	{ title: 'Goals', ids: ['goals'] },
	{
		title: 'Your future',
		ids: ['net-worth-forecast', 'retirement', 'scenarios', 'simulator', 'grow', 'tools']
	},
	{ title: 'Tax', ids: ['tax-strategy', 'terminal-sizing'] }
];

export function domainIndex(
	t: Tr,
	ctx: NavContext,
	key: DomainKey
): {
	label: string;
	question: string;
	sections: { title: string; items: (NavItemVM & { description: string })[] }[];
} {
	const rows = visibleDestinations(ctx).filter((d) => d.domain === key);
	const row = (d: Destination) => ({
		...itemVM(t, ctx, d),
		description: t(DESCRIPTIONS[d.id] ?? '')
	});
	const sections =
		key === 'planning'
			? PLANNING_SECTIONS.map((s) => ({
					title: t(s.title),
					items: s.ids.flatMap((id) => rows.filter((d) => d.id === id)).map(row)
				}))
			: [{ title: t('All'), items: rows.map(row) }];
	return {
		label: t(DOMAIN_META[key].label),
		question: t(DOMAIN_META[key].question),
		sections: sections.filter((s) => s.items.length > 0)
	};
}

/** The mobile /more page: the picks of the two domains off the bottom bar, then Account. */
export function moreIndex(
	t: Tr,
	ctx: NavContext
): { sections: { title: string; indexPath?: string; items: NavItemVM[] }[] } {
	const list = visibleDestinations(ctx);
	const domains = (['intelligence', 'community'] as const).map((key) => ({
		title: t(DOMAIN_META[key].label),
		indexPath: DOMAIN_META[key].indexPath,
		items: picksOf(list, key).map((d) => itemVM(t, ctx, d))
	}));
	const account = {
		title: t('Account'),
		items: list.filter((d) => d.domain === 'account').map((d) => itemVM(t, ctx, d))
	};
	return { sections: [...domains, account].filter((s) => s.items.length > 0) };
}

export function bottomBar(t: Tr): { key: DomainKey | 'more'; label: string; path: string }[] {
	return [
		{ key: 'today', label: t('Today'), path: '/dashboard' },
		{ key: 'money', label: t('Money'), path: '/expenses' },
		{ key: 'wealth', label: t('Wealth'), path: '/portfolio' },
		{ key: 'planning', label: t('Plan'), path: '/planning' },
		{ key: 'more', label: t('More'), path: '/more' }
	];
}

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

// patternLength is how much of `path` a pattern covers: an exact path, or a
// 'prefix/*' alias covering everything below prefix (never prefix itself, and
// only at a segment boundary). -1 when it does not match.
function patternLength(pattern: string, path: string): number {
	if (pattern.endsWith('/*')) {
		const prefix = pattern.slice(0, -1);
		return path.startsWith(prefix) && path.length > prefix.length ? prefix.length : -1;
	}
	return pattern === path ? pattern.length : -1;
}

// matchScore ranks one destination against `path`. The longest match wins; at
// equal length a destination's own path beats another's alias or child link, so
// the pick the user followed (Spending log, Articles) is the one marked active.
function matchScore(path: string, d: Destination): number {
	let best = d.path === path ? d.path.length * 2 + 1 : -1;
	for (const p of [...(d.aliases ?? []), ...(d.children ?? []).map((c) => c.path)]) {
		const n = patternLength(p, path);
		if (n >= 0) best = Math.max(best, n * 2);
	}
	return best;
}

/** The destination `path` belongs to: longest match over paths, aliases and children; ties go to the first declared. */
export function activeDestination(path: string, list: readonly Destination[]): Destination | null {
	const p = normalizePath(path);
	let best: Destination | null = null;
	let bestScore = -1;
	for (const d of list) {
		const s = matchScore(p, d);
		if (s > bestScore) {
			best = d;
			bestScore = s;
		}
	}
	return best;
}

/** The domain `path` belongs to: its own index page (`/today` … `/community`), else its destination's. */
export function activeDomain(
	path: string,
	list: readonly Destination[]
): DomainKey | 'account' | null {
	const p = normalizePath(path);
	const index = DOMAIN_ORDER.find((key) => DOMAIN_META[key].indexPath === p);
	return index ?? activeDestination(p, list)?.domain ?? null;
}

/**
 * Chips for the active destination's visible children; none when fewer than two.
 * A page that is its own destination but also another's chip (Spending log in
 * Budget, Articles in Boards) falls back to the first destination listing it,
 * so the chip row the user came from stays in place.
 */
export function subNavLinks(t: Tr, ctx: NavContext, path: string): NavItemVM[] {
	const p = normalizePath(path);
	const list = visibleDestinations(ctx);
	const chips = (d: Destination | null | undefined) =>
		d?.children && d.children.length >= 2 ? d.children : null;
	const links =
		chips(activeDestination(p, list)) ??
		chips(list.find((d) => chips(d)?.some((c) => c.path === p))) ??
		[];
	return links.map((c) => itemVM(t, ctx, c));
}
