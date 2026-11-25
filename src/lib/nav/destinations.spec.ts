import { describe, expect, it } from 'vitest';
import ptPT from '../i18n/pt-PT.json';
import { Feature } from '../billing.js';
import { socialOff, type SocialConfig } from '../nav.js';
import { DESTINATIONS, DOMAIN_ORDER, type Destination } from './destinations.js';
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
		['/xp', 'friends', 'community']
	])('deep path %s resolves to %s in %s', (path, dest, domain) => {
		expect(activeDestination(path, DESTINATIONS)?.id).toBe(dest);
		expect(activeDomain(path, DESTINATIONS)).toBe(domain);
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

	it('every label and description has a pt-PT entry', () => {
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

// routeRegex turns a route file key into a matcher for concrete paths:
// `(group)` segments drop out, `[param]` matches one segment, `[[param]]` is optional.
function routeRegex(file: string): RegExp {
	const segments = file
		.replace(/^\/src\/routes/, '')
		.replace(/\/\+page\.svelte$/, '')
		.split('/')
		.filter((s) => s !== '' && !/^\(.*\)$/.test(s));
	const body = segments
		.map((s) => {
			if (/^\[\[.+\]\]$/.test(s)) return '(?:/[^/]+)?';
			if (/^\[.+\]$/.test(s)) return '/[^/]+';
			return '/' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		})
		.join('');
	return new RegExp(`^${body || '/'}$`);
}
