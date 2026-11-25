import { describe, expect, it } from 'vitest';
import ptPT from '../i18n/pt-PT.json';
import { Feature } from '../billing.js';
import { socialOff, type SocialConfig } from '../nav.js';
import { DESTINATIONS, DOMAIN_META, DOMAIN_ORDER, type Destination } from './destinations.js';
import { OLD_NAV_PATHS } from './old-nav-paths.js';
import {
	activeDestination,
	activeDomain,
	bottomBar,
	domainIndex,
	moreIndex,
	sidebarDomains,
	subNavLinks,
	visibleDestinations,
	type NavContext
} from './visible.js';

const id = (s: string) => s;

const allSocial: SocialConfig = {
	enabled: true,
	contactsDiscovery: true,
	xImport: true,
	facebookImport: true,
	leaderboards: true,
	messaging: true,
	groups: true,
	groupsPublic: true,
	achievements: true,
	activityFeed: true
};

const allOn: NavContext = { social: allSocial, articles: true, locked: () => false };
// Every sub-flag stays on, so only the master switches hide anything.
const socialOffCtx: NavContext = {
	social: { ...allSocial, enabled: false },
	articles: false,
	locked: () => false
};

const linkPaths = (d: Destination) => [d.path, ...(d.children ?? []).map((c) => c.path)];

describe('destination model (DS 2.0 P3)', () => {
	it('picks follow the destination table', () => {
		expect(sidebarDomains(id, allOn).map((d) => [d.key, d.picks.map((p) => p.label)])).toEqual([
			['today', ['Overview', 'Period', 'Activity', 'Ask Q', 'Notifications']],
			['money', ['Budget', 'Spending log', 'Comparisons', 'Receipts', 'Spending reports']],
			[
				'wealth',
				[
					'Holdings',
					'Portfolios',
					'Allocation',
					'Gains and dividends',
					'Watchlist',
					'Earnings',
					'Rebalancing'
				]
			],
			[
				'planning',
				['Goals', 'Net worth forecast', 'Retirement', 'Scenarios', 'Simulator', 'Tax strategy']
			],
			['intelligence', ['Market brief', 'Markets', 'Economy', 'Research', 'Insights', 'Reports']],
			['community', ['Friends', 'Groups', 'Boards', 'Articles']]
		]);
	});

	it('no domain shows more than seven picks', () => {
		const counts = DOMAIN_ORDER.map((key) =>
			DESTINATIONS.filter((d) => d.domain === key && d.pick)
		);
		expect(counts.filter((picks) => picks.length > 7)).toEqual([]);
		expect(sidebarDomains(id, allOn).every((d) => d.picks.length <= 7)).toBe(true);
	});

	it('destination labels are unique', () => {
		const labels = DESTINATIONS.map((d) => d.label);
		expect(labels.filter((l, i) => labels.indexOf(l) !== i)).toEqual([]);
		const ids = DESTINATIONS.map((d) => d.id);
		expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
	});

	it('gated destinations are absent from every surface', () => {
		const gated = new Set(['/friends', '/groups', '/articles', '/xp', '/achievements']);
		const surfaces: Record<string, string[]> = {
			sidebarDomains: sidebarDomains(id, socialOffCtx).flatMap((d) => d.picks.map((p) => p.path)),
			domainIndex: domainIndex(id, socialOffCtx, 'community').sections.flatMap((s) =>
				s.items.map((i) => i.path)
			),
			moreIndex: moreIndex(id, socialOffCtx).sections.flatMap((s) => s.items.map((i) => i.path)),
			subNavLinks: subNavLinks(id, socialOffCtx, '/boards').map((l) => l.path),
			visibleDestinations: visibleDestinations(socialOffCtx).flatMap(linkPaths)
		};
		const leaks = Object.entries(surfaces).flatMap(([name, paths]) =>
			paths.filter((p) => gated.has(p)).map((p) => `${name}: ${p}`)
		);
		expect(leaks).toEqual([]);
		expect(
			sidebarDomains(id, socialOffCtx)
				.find((d) => d.key === 'community')
				?.picks.map((p) => p.label)
		).toEqual(['Boards']);
		expect(
			moreIndex(id, socialOffCtx)
				.sections.find((s) => s.title === 'Community')
				?.items.map((i) => i.label)
		).toEqual(['Boards']);
	});

	it('gates children on their own flags', () => {
		const onlyFriends: NavContext = {
			social: { ...socialOff, enabled: true },
			articles: false,
			locked: null
		};
		expect(subNavLinks(id, onlyFriends, '/friends').map((l) => l.path)).toEqual([
			'/friends',
			'/friends/invite'
		]);
		expect(subNavLinks(id, onlyFriends, '/settings').map((l) => l.path)).toContain(
			'/settings/badges'
		);
		expect(visibleDestinations(onlyFriends).map((d) => d.id)).not.toContain('groups');
		const settings = subNavLinks(id, allOn, '/settings');
		expect(settings.map((l) => l.path)).not.toContain('/settings/badges');
		expect(settings.find((l) => l.path === '/achievements')?.label).toBe('Achievements');
		expect(settings).toHaveLength(14);
	});

	it('every path in today’s nav still resolves', () => {
		const all = visibleDestinations(allOn);
		expect(OLD_NAV_PATHS.length).toBeGreaterThan(59);
		expect(OLD_NAV_PATHS.filter((p) => activeDestination(p, DESTINATIONS) === null)).toEqual([]);
		expect(OLD_NAV_PATHS.filter((p) => activeDestination(p, all) === null)).toEqual([]);
	});

	it.each([
		['/portfolio/AAPL/chart', 'holdings', 'wealth'],
		['/portfolio/AAPL', 'holdings', 'wealth'],
		['/crypto/coin/BTCUSD', 'crypto', 'wealth'],
		['/groups/12/c/3', 'groups', 'community'],
		['/g/abc', 'groups', 'community'],
		['/portfolio/retirement', 'retirement', 'planning'],
		['/portfolio/rebalancing-rules', 'rebalancing', 'wealth'],
		['/settings/language', 'settings', 'account'],
		['/dashboard/pulse', 'period', 'today'],
		['/dashboard', 'overview', 'today'],
		['/dashboard/', 'overview', 'today'],
		['/reports/spending', 'spending-reports', 'money'],
		['/reports/advanced', 'reports', 'intelligence'],
		['/reports/deep-dive/abc', 'reports', 'intelligence'],
		['/brief/2026-11-20/close', 'market-brief', 'intelligence'],
		['/expenses/record', 'budget', 'money'],
		['/xp', 'friends', 'community'],
		['/assistant/conversations', 'ask-q', 'today'],
		['/planning/retire/preview', 'retirement', 'planning'],
		['/planning/grow/preview', 'grow', 'planning'],
		['/simulator/save', 'simulator', 'planning'],
		['/tools', 'tools', 'planning'],
		['/planning/grow', 'grow', 'planning'],
		['/admin/community', 'boards', 'community']
	])('deep path %s resolves to %s in %s', (path, dest, domain) => {
		expect(activeDestination(path, DESTINATIONS)?.id).toBe(dest);
		expect(activeDomain(path, DESTINATIONS)).toBe(domain);
	});

	it.each(DOMAIN_ORDER.map((key) => [DOMAIN_META[key].indexPath, key]))(
		'index page %s belongs to %s',
		(path, key) => {
			expect(activeDomain(path, DESTINATIONS)).toBe(key);
			expect(activeDomain(path + '/', DESTINATIONS)).toBe(key);
		}
	);

	it('/planning is the planning domain, /planning/x is not', () => {
		expect(activeDomain('/planning', DESTINATIONS)).toBe('planning');
		expect(activeDomain('/planningx', DESTINATIONS)).toBeNull();
		expect(activeDomain('/community/x', DESTINATIONS)).toBeNull();
	});

	// Pages with no destination of their own. Keep this list short; each entry says why.
	const UNROUTED_APP_PAGES: Record<string, string> = {
		'/[domain=domain]': 'the domain index pages; activeDomain matches them by path',
		'/more': 'the mobile More page; the shell marks the More tab itself',
		'/__dev/digest': 'developer preview, never linked from navigation',
		'/ai-consent': 'one-time consent interstitial before Q, outside navigation',
		'/digest/[id]': 'an emailed digest opened from its link, not a navigation place',
		'/pilots': 'Pilots are not in the P3 destination table',
		'/pilots/[slug]': 'Pilots are not in the P3 destination table',
		'/pilots/[slug]/follow': 'Pilots are not in the P3 destination table',
		'/pilot-follows/[id]': 'Pilots are not in the P3 destination table',
		'/trading': 'not in the P3 destination table'
	};

	it('every (app) page resolves to a destination, except the listed ones', () => {
		// `(app)` would be glob syntax, so glob every page and keep the (app) group.
		const pages = Object.keys(import.meta.glob('/src/routes/**/+page.svelte'))
			.filter((f) => f.startsWith('/src/routes/(app)/'))
			.map((f) => f.replace(/^\/src\/routes\/\(app\)/, '').replace(/\/\+page\.svelte$/, ''));
		expect(pages.length).toBeGreaterThan(80);
		// A concrete path per route: [param] → x, [[optional]] dropped.
		const concrete = (route: string) =>
			route.replace(/\/\[\[[^\]]+\]\]/g, '').replace(/\[[^\]]+\]/g, 'x') || '/';
		const unresolved = pages.filter(
			(route) =>
				!(route in UNROUTED_APP_PAGES) && activeDestination(concrete(route), DESTINATIONS) === null
		);
		expect(unresolved.sort()).toEqual([]);
		// The allowlist only names real pages that really are unresolved.
		const stale = Object.keys(UNROUTED_APP_PAGES).filter(
			(route) => !pages.includes(route) || activeDestination(concrete(route), DESTINATIONS) !== null
		);
		expect(stale).toEqual([]);
	});

	it('one label per path across rows and chips', () => {
		// A destination's own first chip (Markets › Overview) names a view inside it,
		// so a chip on its parent's own path is exempt; every other link to a path
		// uses the one name that path has everywhere.
		const named = new Map<string, Set<string>>();
		const add = (path: string, label: string) =>
			named.set(path, (named.get(path) ?? new Set()).add(label));
		for (const d of DESTINATIONS) {
			add(d.path, d.label);
			for (const c of d.children ?? []) if (c.path !== d.path) add(c.path, c.label);
		}
		for (const c of subNavLinks(id, allOn, '/settings'))
			if (c.path !== '/settings') add(c.path, c.label);
		const clashes = [...named].filter(([, labels]) => labels.size > 1);
		expect(clashes.map(([path, labels]) => `${path}: ${[...labels].join(' / ')}`)).toEqual([]);
	});

	it.each([
		['/expenses/year', 'budget', ['/expenses', '/expenses/year']],
		['/articles', 'boards', ['/boards', '/articles']],
		['/settings/integrations', 'settings', null],
		['/achievements', 'friends', null]
	])('sub-nav on %s keeps the %s chips', (path, parentID, expected) => {
		const parent = visibleDestinations(allOn).find((d) => d.id === parentID);
		const chips = subNavLinks(id, allOn, path).map((l) => l.path);
		expect(chips).toEqual(expected ?? parent?.children?.map((c) => c.path));
		expect(chips).toContain(path);
	});

	// Equal-length ties between one destination's own path and another's child
	// link: the destination that owns the path wins, so its pick is the one marked
	// active. See the Task 1 report for the trade-off.
	it.each([
		['/expenses/year', 'spending-log'],
		['/articles', 'articles'],
		['/settings/integrations', 'brokers-and-imports'],
		['/achievements', 'achievements']
	])('own path %s beats an equal-length child link (%s)', (path, dest) => {
		expect(activeDestination(path, DESTINATIONS)?.id).toBe(dest);
	});

	it('prefix aliases stop at a segment boundary', () => {
		expect(activeDestination('/portfolios', DESTINATIONS)?.id).toBe('portfolios');
		expect(activeDestination('/groupsx', DESTINATIONS)).toBeNull();
		expect(activeDestination('/nowhere', DESTINATIONS)).toBeNull();
		expect(activeDomain('/nowhere', DESTINATIONS)).toBeNull();
	});

	it('every destination and child path is a real route', () => {
		const routes = Object.keys(import.meta.glob('/src/routes/**/+page.svelte')).map(routeRegex);
		expect(routes.length).toBeGreaterThan(50);
		const paths = DESTINATIONS.flatMap(linkPaths).map((p) => p.split('?')[0]);
		expect(paths.filter((p) => !routes.some((re) => re.test(p)))).toEqual([]);
	});

	it('each domain index and /more is exactly one page route', () => {
		const routes = Object.keys(import.meta.glob('/src/routes/**/+page.svelte')).map(routeRegex);
		const indexPaths = [...DOMAIN_ORDER.map((key) => DOMAIN_META[key].indexPath), '/more'];
		expect(indexPaths.map((p) => [p, routes.filter((re) => re.test(p)).length])).toEqual(
			indexPaths.map((p) => [p, 1])
		);
		// The domain matcher takes the six keys only, not any one segment.
		expect(routes.filter((re) => re.test('/nowhere'))).toEqual([]);
	});

	it('every declared label, description and domain string has a pt-PT entry', () => {
		// Read straight from the data, so a string no builder sends through t
		// (an Account description, a gated child) is still checked.
		const strings = [
			...DESTINATIONS.flatMap((d) => [
				d.label,
				d.description,
				...(d.children ?? []).map((c) => c.label)
			]),
			...DOMAIN_ORDER.flatMap((key) => [DOMAIN_META[key].label, DOMAIN_META[key].question]),
			...domainIndex(id, allOn, 'planning').sections.map((s) => s.title)
		];
		const catalog = new Set(Object.keys(ptPT));
		expect(strings.length).toBeGreaterThan(140);
		expect([...new Set(strings)].filter((key) => !catalog.has(key)).sort()).toEqual([]);
	});

	it('every label and description the builders emit has a pt-PT entry', () => {
		const seen = new Set<string>();
		const capture = (s: string) => {
			seen.add(s);
			return s;
		};
		sidebarDomains(capture, allOn);
		for (const key of DOMAIN_ORDER) domainIndex(capture, allOn, key);
		moreIndex(capture, allOn);
		bottomBar(capture);
		for (const d of DESTINATIONS) subNavLinks(capture, allOn, d.path);
		const catalog = new Set(Object.keys(ptPT));
		expect(seen.size).toBeGreaterThan(100);
		expect([...seen].filter((key) => !catalog.has(key)).sort()).toEqual([]);
	});

	it('Pro-locked destinations stay listed with a badge', () => {
		const ctx: NavContext = { ...allOn, locked: (f) => f === Feature.NetWorthForecasting };
		const planning = sidebarDomains(id, ctx).find((d) => d.key === 'planning');
		expect(planning?.picks.find((p) => p.label === 'Net worth forecast')?.showProBadge).toBe(true);
		expect(planning?.picks.find((p) => p.label === 'Goals')?.showProBadge).toBe(false);
		const index = domainIndex(id, ctx, 'planning').sections.flatMap((s) => s.items);
		expect(index.find((i) => i.path === '/forecast')?.showProBadge).toBe(true);
	});

	it('the planning index has Goals, Your future and Tax', () => {
		const idx = domainIndex(id, allOn, 'planning');
		expect(idx.label).toBe('Planning');
		expect(idx.question).toBe('Where am I heading?');
		expect(idx.sections.map((s) => [s.title, s.items.map((i) => i.label)])).toEqual([
			['Goals', ['Goals']],
			[
				'Your future',
				['Net worth forecast', 'Retirement', 'Scenarios', 'Simulator', 'Grow', 'Tools']
			],
			['Tax', ['Tax strategy', 'Terminal sizing']]
		]);
	});

	it('other domain indexes list every destination in one All section', () => {
		const money = domainIndex(id, allOn, 'money');
		expect(money.sections.map((s) => s.title)).toEqual(['All']);
		expect(money.sections[0].items.map((i) => i.label)).toEqual([
			'Budget',
			'Spending log',
			'Comparisons',
			'Receipts',
			'Spending reports'
		]);
		const wealth = domainIndex(id, allOn, 'wealth').sections[0].items;
		expect(wealth.map((i) => i.label)).toContain('Portfolio report');
		expect(wealth.every((i) => i.description.length > 0)).toBe(true);
	});

	it('moreIndex lists Intelligence, Community and Account', () => {
		const more = moreIndex(id, allOn);
		expect(more.sections.map((s) => [s.title, s.indexPath])).toEqual([
			['Intelligence', '/intelligence'],
			['Community', '/community'],
			['Account', undefined]
		]);
		expect(more.sections[2].items.map((i) => i.path)).toEqual([
			'/settings',
			'/settings/integrations',
			'/achievements'
		]);
	});

	it('bottom bar is Today, Money, Wealth, Plan, More', () => {
		expect(bottomBar(id)).toEqual([
			{ key: 'today', label: 'Today', path: '/dashboard' },
			{ key: 'money', label: 'Money', path: '/expenses' },
			{ key: 'wealth', label: 'Wealth', path: '/portfolio' },
			{ key: 'planning', label: 'Plan', path: '/planning' },
			{ key: 'more', label: 'More', path: '/more' }
		]);
	});

	it('sub-nav needs at least two visible children', () => {
		expect(subNavLinks(id, allOn, '/markets/congress').map((l) => l.label)).toEqual([
			'Overview',
			'Retail sentiment',
			'Congress',
			'Earnings'
		]);
		expect(subNavLinks(id, allOn, '/portfolio/allocation')).toEqual([]);
		expect(subNavLinks(id, socialOffCtx, '/boards')).toEqual([]);
		expect(subNavLinks(id, allOn, '/nowhere')).toEqual([]);
		const groups = subNavLinks(id, allOn, '/groups/12');
		expect(groups[0]).toEqual({
			label: 'Your groups',
			path: '/groups',
			showProBadge: false,
			badgeURL: '/groups/unread-badge'
		});
	});
});

// Param matchers in src/params, as the values they accept.
const MATCHERS: Record<string, readonly string[]> = { domain: DOMAIN_ORDER };

// routeRegex turns a route file key into a matcher for concrete paths:
// `(group)` segments drop out, `[param]` matches one segment, `[[param]]` is optional,
// and `[param=matcher]` matches only what that matcher accepts.
function routeRegex(file: string): RegExp {
	const segments = file
		.replace(/^\/src\/routes/, '')
		.replace(/\/\+page\.svelte$/, '')
		.split('/')
		.filter((s) => s !== '' && !/^\(.*\)$/.test(s));
	const body = segments
		.map((s) => {
			if (/^\[\[.+\]\]$/.test(s)) return '(?:/[^/]+)?';
			const matcher = /^\[[^=\]]+=([^\]]+)\]$/.exec(s)?.[1];
			if (matcher) {
				const values = MATCHERS[matcher];
				if (!values) throw new Error(`routeRegex: no values for param matcher "${matcher}"`);
				return `/(?:${values.join('|')})`;
			}
			if (/^\[.+\]$/.test(s)) return '/[^/]+';
			return '/' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		})
		.join('');
	return new RegExp(`^${body || '/'}$`);
}
