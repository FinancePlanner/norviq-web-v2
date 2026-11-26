import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';

// AppShell reads page.url and page.data (locale, social, articles, features);
// vi.hoisted lets each test move to another path or flag set.
const state = vi.hoisted(() => {
	const data: Record<string, unknown> = {};
	return { page: { url: new URL('https://norviq.test/dashboard'), data } };
});
vi.mock('$app/state', () => state);
vi.mock('$app/forms', () => ({ enhance: () => ({}) }));
// requireFeature reads billing; unknown entitlement locks every Pro feature.
vi.mock('#lib/server/app-context.js', () => ({ loadBillingContext: () => Promise.resolve(null) }));

// NavBadge polls through createQuery; record each subscription instead.
const polled = vi.hoisted(() => [] as unknown[]);
vi.mock('@tanstack/svelte-query', () => ({
	createQuery: (options: () => { queryKey: unknown[] }) => {
		polled.push(options().queryKey[1]);
		return { data: 0 };
	}
}));

import { Feature } from '#lib/billing.js';
import { quickQMounted } from '#lib/features/dashboard/assistant/quick.js';
import ptPT from '#lib/i18n/pt-PT.json';
import { socialOff, type SocialConfig } from '#lib/nav.js';
import { DESTINATIONS, DOMAIN_ORDER } from '#lib/nav/destinations.js';
import { sidebarDomains, type NavContext } from '#lib/nav/visible.js';
import { matchDomain, params } from '../../../params.js';
import { load as domainLoad } from '../../../routes/(app)/[domain=domain]/+page.server.js';
import DomainPage from '../../../routes/(app)/[domain=domain]/+page.svelte';
import { load as moreLoad } from '../../../routes/(app)/more/+page.server.js';
import MorePage from '../../../routes/(app)/more/+page.svelte';
import { load as yearLoad } from '../../../routes/(app)/expenses/year/+page.server.js';
import YearPage from '../../../routes/(app)/expenses/year/+page.svelte';
import IntegrationsPage from '../../../routes/(app)/settings/integrations/+page.svelte';
import SettingsPage from '../../../routes/(app)/settings/+page.svelte';
import ExpensesPage from '../../../routes/(app)/expenses/+page.svelte';
import RetirePage from '../../../routes/(app)/planning/retire/+page.svelte';
import type { PlannerViewModel } from '#lib/features/money/expenses/vm.js';
import { defaultRetireDraft } from '#lib/features/planning-tools/planning/vm.js';
import { emptyIBKRVM, emptyTelegramVM } from '#lib/features/settings-admin/integrations/types.js';
import OAuthLayout from '../../../routes/(onboarding)/oauth/+layout.svelte';
import AppShell from './AppShell.svelte';
import { parseGroups } from './shell-state.svelte.js';
import { openPalette, palette } from './palette-state.svelte.js';

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

// Layout data as (app)/+layout.server.ts returns it, minus the sidebar.
const layoutData = (social: SocialConfig, articles: boolean) => ({
	locale: 'en',
	social,
	articles,
	features: {},
	billingUnknown: true
});

const ctxOf = (social: SocialConfig, articles: boolean): NavContext => ({
	social,
	articles,
	locked: null
});

const body = createRawSnippet(() => ({ render: () => '<p>page</p>' }));

function shellAt(path: string, social: SocialConfig = socialOff, articles = false): string {
	state.page.url = new URL('https://norviq.test' + path);
	state.page.data = layoutData(social, articles);
	return render(AppShell, {
		props: {
			username: 'ana',
			email: 'ana@example.com',
			sidebar: sidebarDomains(id, ctxOf(social, articles)),
			social,
			trialExpired: false,
			children: body
		}
	}).body;
}

const between = (html: string, start: string, end: string) => {
	const from = html.indexOf(start);
	return from < 0 ? '' : html.slice(from, html.indexOf(end, from));
};
const sidebarNav = (html: string) => between(html, 'aria-label="Main navigation"', '</nav>');
const sidebarFoot = (html: string) => between(html, 'app-sidebar-foot', '</aside>');
const topBarOf = (html: string) => between(html, 'class="app-desktop-topbar', '</header>');
const bottomBarOf = (html: string) => between(html, 'class="app-bottom-tabs"', '</nav>');
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const linkTo = (html: string, path: string) =>
	new RegExp(`<a[^>]*href="${path}"[^>]*>`).exec(html)?.[0] ?? '';
const headings = (html: string) =>
	[...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1].trim());

beforeEach(() => {
	polled.length = 0;
	palette.open = false;
	palette.everOpened = false;
});

describe('AppShell sidebar (DS 2.0 P3)', () => {
	it('renders the six domains, the active pick and the index link', () => {
		const html = shellAt('/portfolio/allocation');
		const nav = sidebarNav(html);
		expect(nav.match(/aria-controls="nav-group-/g)).toHaveLength(6);
		expect([...nav.matchAll(/data-nav-group="([a-z]+)"/g)].map((m) => m[1])).toEqual([
			...DOMAIN_ORDER
		]);
		expect(between(nav, 'data-nav-group="wealth"', '</button>')).toContain('aria-expanded="true"');
		expect(between(nav, 'data-nav-group="money"', '</button>')).toContain('aria-expanded="false"');
		expect(linkTo(nav, '/portfolio/allocation')).toContain('aria-current="page"');
		expect(linkTo(nav, '/portfolio')).not.toContain('aria-current');
		expect(nav).toMatch(/href="\/wealth"[^>]*>[^<]*All in Wealth/);
		expect(hrefs(html)).not.toContain('/friends');
	});

	it('marks Holdings on a deep stock page', () => {
		const nav = sidebarNav(shellAt('/portfolio/AAPL/chart'));
		expect(linkTo(nav, '/portfolio')).toContain('aria-current="page"');
	});

	it('ends each group with its picks, then All in …', () => {
		const nav = sidebarNav(shellAt('/dashboard'));
		const planning = between(nav, 'data-nav-group="planning"', 'data-nav-group="intelligence"');
		expect(hrefs(planning)).toEqual([
			'/goals',
			'/forecast',
			'/planning/retire',
			'/scenarios',
			'/simulator',
			'/tax',
			'/planning'
		]);
	});

	it('keeps Settings out of the groups and puts it in the foot with search', () => {
		const html = shellAt('/settings/language');
		expect(hrefs(sidebarNav(html))).not.toContain('/settings');
		const foot = sidebarFoot(html);
		expect(foot).toContain('Search and commands');
		expect(foot).toContain('⌘K');
		expect(foot.indexOf('Search and commands')).toBeLessThan(foot.indexOf('href="/settings"'));
		expect(foot.indexOf('href="/settings"')).toBeLessThan(foot.indexOf('ana@example.com'));
		expect(linkTo(foot, '/settings')).toContain('aria-current="page"');
		// The collapsed rail hides the text; both keep an accessible name.
		expect(linkTo(foot, '/settings')).toContain('aria-label="Settings"');
		expect(foot).toMatch(/<button[^>]*aria-label="Search and commands"/);
	});

	it('does not mark Settings on Achievements', () => {
		const foot = sidebarFoot(shellAt('/achievements', allSocial, true));
		expect(linkTo(foot, '/settings')).not.toContain('aria-current');
	});

	it('Search and commands opens the palette state', () => {
		expect(palette.open).toBe(false);
		openPalette();
		expect(palette).toEqual({ open: true, everOpened: true });
	});

	// The palette is a lazy chunk: nothing of it renders on the server, and the
	// phone top bar opens it from a search button beside Settings.
	it('renders no palette on the server and a search button in the phone top bar', () => {
		const html = shellAt('/dashboard');
		expect(html).not.toContain('<dialog');
		expect(html).not.toContain('role="combobox"');
		const phoneBar = between(html, 'class="app-topbar ', '</header>');
		expect(phoneBar).toMatch(/<button[^>]*aria-label="Search and commands"/);
		expect(phoneBar.indexOf('aria-label="Search and commands"')).toBeLessThan(
			phoneBar.indexOf('href="/settings"')
		);
	});

	it('subscribes to the Groups unread badge once', () => {
		shellAt('/groups', allSocial, true);
		expect(polled.filter((url) => url === '/groups/unread-badge')).toHaveLength(1);
	});

	it('shows the active destination’s chips in the mobile sub-nav', () => {
		const html = shellAt('/markets/congress');
		const sub = between(html, 'mobile-section-subnav', '</nav>');
		expect(hrefs(sub)).toEqual([
			'/markets',
			'/markets/sentiment',
			'/markets/congress',
			'/markets/earnings'
		]);
	});

	// Phones have no sidebar: where a destination has no chips, its domain's picks
	// stand in, then "All in {domain} →". The row stays phone-only (lg:hidden).
	const subNavOf = (html: string) => between(html, 'mobile-section-subnav', '</nav>');
	const activeChips = (html: string) =>
		[
			...html.matchAll(/<a href="([^"]+)" class="section-subnav-link section-subnav-link-active"/g)
		].map((m) => m[1]);

	it('shows the Wealth picks and All in Wealth on /portfolio', () => {
		const html = shellAt('/portfolio');
		expect(html).toMatch(/<div class="mobile-section-subnav lg:hidden">/);
		const sub = subNavOf(html);
		expect(hrefs(sub)).toEqual([
			'/portfolio',
			'/portfolios',
			'/portfolio/allocation',
			'/portfolio/dividends',
			'/portfolio/watchlist',
			'/portfolio/earnings',
			'/portfolio/rebalancing',
			'/wealth'
		]);
		expect(sub).toContain('All in Wealth →');
		expect(activeChips(sub)).toEqual(['/portfolio']);
	});

	it('shows the Today picks on /dashboard', () => {
		const sub = subNavOf(shellAt('/dashboard'));
		expect(hrefs(sub)).toEqual([
			'/dashboard',
			'/dashboard/pulse',
			'/dashboard/activity',
			'/assistant',
			'/notifications',
			'/today'
		]);
		expect(activeChips(sub)).toEqual(['/dashboard']);
	});

	it('leaves a gated pick out of the domain chips', () => {
		// Social and articles off: Friends, Groups and Articles are gone from
		// Community, and Boards has one chip left, so the domain row stands in.
		const off = hrefs(subNavOf(shellAt('/boards')));
		expect(off).toEqual(['/boards', '/community']);
		// With articles on, Boards has its own two chips again.
		const on = hrefs(subNavOf(shellAt('/boards', allSocial, true)));
		expect(on).toEqual(['/boards', '/articles']);
	});
});

describe('AppShell desktop top bar', () => {
	const domainOf = (html: string) =>
		/<span[^>]*class="app-desktop-topbar-domain[^"]*"[^>]*>([^<]*)<\/span>/.exec(
			topBarOf(html)
		)?.[1] ?? null;

	it.each([
		['/dashboard', 'Today'],
		['/today', 'Today'],
		['/portfolio/allocation', 'Wealth'],
		['/goals/3', 'Planning'],
		['/markets/congress', 'Intelligence'],
		['/settings/integrations', 'Account'],
		['/achievements', 'Account'],
		['/more', 'More']
	])('on %s names the domain %s', (path, label) => {
		expect(domainOf(shellAt(path, allSocial, true))).toBe(label);
	});

	it('shows no domain on a page outside the six', () => {
		expect(domainOf(shellAt('/ai-consent'))).toBeNull();
		expect(topBarOf(shellAt('/ai-consent'))).toContain('Search holdings, pages, actions');
	});

	it('sits outside the animated main column', () => {
		const html = shellAt('/dashboard');
		expect(html.indexOf('app-desktop-topbar')).toBeGreaterThan(-1);
		expect(html.indexOf('app-desktop-topbar')).toBeLessThan(html.indexOf('id="main-content"'));
	});

	// (app)/+layout.svelte passes quickQMounted(data), the condition that mounts QuickAssistant.
	const askQ = (path: string, data: Record<string, unknown>) => {
		state.page.url = new URL('https://norviq.test' + path);
		const layout = { ...layoutData(socialOff, false), ...data };
		state.page.data = layout;
		const html = render(AppShell, {
			props: {
				username: 'ana',
				email: '',
				sidebar: [],
				social: socialOff,
				trialExpired: false,
				quickQ: quickQMounted(layout),
				children: body
			}
		}).body;
		const bar = topBarOf(html);
		if (/<button[^>]*>(?:(?!<\/button>)[\s\S])*Ask Q/.test(bar)) return 'card';
		if (/<a[^>]*href="\/assistant"[^>]*>(?:(?!<\/a>)[\s\S])*Ask Q/.test(bar)) return 'link';
		return 'none';
	};
	const ai = { features: { [Feature.AIInsights]: true } };

	it('opens the Q card where QuickAssistant is mounted', () => {
		expect(askQ('/dashboard', ai)).toBe('card');
	});

	it.each([
		['without AI insights', '/dashboard', {}],
		['during a guided step', '/dashboard', { ...ai, guidedStep: { step: 1 } }],
		['on full Q', '/assistant', ai],
		['in group chat', '/groups/7', ai]
	])('links to full Q %s', (_, path, data) => {
		expect(askQ(path, data)).toBe('link');
	});

	// /oauth/consent wears the shell with AI features in its data but never mounts
	// QuickAssistant: a card button there would do nothing.
	it('links to full Q in a layout that does not mount the card', () => {
		state.page.url = new URL('https://norviq.test/oauth/consent');
		state.page.data = { ...layoutData(socialOff, false), ...ai };
		const html = render(OAuthLayout, {
			props: {
				data: {
					...layoutData(socialOff, false),
					...ai,
					locale: 'en' as const,
					user: null,
					runtime: {},
					username: 'ana',
					email: '',
					sidebar: [],
					trialExpired: false
				},
				params: {},
				children: body
			}
		}).body;
		const bar = topBarOf(html);
		expect(bar).toMatch(/<a[^>]*href="\/assistant"[^>]*>(?:(?!<\/a>)[\s\S])*Ask Q/);
		expect(bar).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Ask Q/);
	});
});

describe('AppShell mobile bottom bar', () => {
	it('is Today, Money, Wealth, Plan, More', () => {
		const bar = bottomBarOf(shellAt('/dashboard'));
		expect(hrefs(bar)).toEqual(['/dashboard', '/expenses', '/portfolio', '/planning', '/more']);
		expect(bar).not.toContain('aria-haspopup');
		expect(shellAt('/dashboard')).not.toContain('app-bottom-tabs-more');
	});

	it.each([
		['/markets', '/more'],
		['/more', '/more'],
		['/more/', '/more'],
		['/friends', '/more'],
		['/settings', '/more'],
		['/planning', '/planning'],
		['/goals/3', '/planning'],
		['/portfolio/AAPL', '/portfolio'],
		['/expenses/year', '/expenses'],
		['/dashboard/pulse', '/dashboard']
	])('on %s the active tab is %s', (path, tab) => {
		const bar = bottomBarOf(shellAt(path, allSocial, true));
		const current = [...bar.matchAll(/<a[^>]*href="([^"]+)"[^>]*aria-current="page"/g)].map(
			(m) => m[1]
		);
		expect(current).toEqual([tab]);
	});
});

type LoadEvent = Parameters<typeof domainLoad>[0];
const loadEvent = (routeParams: Record<string, string>, social: SocialConfig, articles: boolean) =>
	({
		params: routeParams,
		locals: { t: id },
		parent: () => Promise.resolve(layoutData(social, articles))
	}) as unknown as LoadEvent;

async function domainPage(key: string, social = socialOff, articles = false) {
	state.page.data = layoutData(social, articles);
	const data = await domainLoad(loadEvent({ domain: key }, social, articles));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PageProps carries route types the test does not build
	return render(DomainPage as any, { props: { data } }).body;
}

describe('domain index pages', () => {
	it('/planning has Goals, Your future and Tax, in that order', async () => {
		const html = await domainPage('planning');
		expect(html).toContain('Planning');
		expect(html).toContain('Where am I heading?');
		expect(headings(html)).toEqual(['Goals', 'Your future', 'Tax']);
	});

	it('/money lists every Money destination', async () => {
		const html = await domainPage('money');
		const expected = DESTINATIONS.filter((d) => d.domain === 'money').map((d) => d.path);
		expect(hrefs(html)).toEqual(expected);
		expect(html).toContain("Plan this month's spending and see what is left.");
	});

	it('/wealth lists the destinations that are not picks too', async () => {
		const html = await domainPage('wealth');
		const expected = DESTINATIONS.filter((d) => d.domain === 'wealth').map((d) => d.path);
		expect(hrefs(html)).toEqual(expected);
		expect(hrefs(html)).toContain('/crypto');
	});

	it('/community hides gated destinations', async () => {
		expect(hrefs(await domainPage('community'))).toEqual(['/boards']);
		expect(hrefs(await domainPage('community', allSocial, true))).toEqual([
			'/friends',
			'/groups',
			'/boards',
			'/articles'
		]);
	});

	it('badges Pro-locked rows, and none while entitlement is unknown', async () => {
		const row = (html: string, path: string) => between(html, `href="${path}"`, '</a>');
		const known = async () => {
			const data = await domainLoad({
				...loadEvent({ domain: 'planning' }, socialOff, false),
				parent: () => Promise.resolve({ ...layoutData(socialOff, false), billingUnknown: false })
			} as LoadEvent);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PageProps carries route types the test does not build
			return render(DomainPage as any, { props: { data } }).body;
		};
		const locked = await known();
		expect(row(locked, '/forecast')).toContain('pro-badge');
		expect(row(locked, '/goals')).not.toContain('pro-badge');
		expect(await domainPage('planning')).not.toContain('pro-badge');
	});

	it('only the six domain keys match the route', async () => {
		expect(DOMAIN_ORDER.map(matchDomain)).toEqual([...DOMAIN_ORDER]);
		expect(['more', 'settings', 'Planning', 'account', ''].map(matchDomain)).toEqual(
			Array(5).fill(undefined)
		);
		const validate = (p: string) => params.domain['~standard'].validate(p);
		expect(await validate('wealth')).toEqual({ value: 'wealth' });
		expect(await validate('more')).toHaveProperty('issues');
	});
});

async function morePage(social = socialOff, articles = false) {
	state.page.data = layoutData(social, articles);
	const data = await moreLoad(
		loadEvent({}, social, articles) as unknown as Parameters<typeof moreLoad>[0]
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PageProps carries route types the test does not build
	return render(MorePage as any, { props: { data } }).body;
}

describe('/more', () => {
	it('has Intelligence, Community and Account', async () => {
		const html = await morePage();
		expect(headings(html)).toEqual(['Intelligence', 'Community', 'Account']);
		expect(html).toMatch(/href="\/intelligence"[^>]*>[^<]*All in Intelligence/);
	});

	it('lists Boards only in Community while social is off', async () => {
		const html = await morePage();
		const community = between(html, '>Community</h2>', '</section>');
		expect(hrefs(community)).toEqual(['/community', '/boards']);
	});
});

describe('shell group state', () => {
	it('keeps saved domain keys', () => {
		expect(parseGroups('wealth:1,money:0')).toEqual(
			new Map([
				['wealth', true],
				['money', false]
			])
		);
	});

	it('drops a save that holds any old tab key', () => {
		// "community" is an old tab key and a domain key; the old save is dropped whole.
		expect(parseGroups('dashboard:1,community:0')).toBeNull();
		expect(parseGroups('')).toBeNull();
	});
});

describe('one name per destination (§4.4)', () => {
	// The pages render with empty view models; only their names are under test.
	const named = (C: unknown, data: Record<string, unknown>) => {
		state.page.url = new URL('https://norviq.test/');
		state.page.data = { locale: 'en' };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PageProps carries route types the test does not build
		return render(C as any, { props: { data, form: null } });
	};
	const h1 = (html: string) => /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1];

	it('/expenses/year is "Spending log" in its header, title and Pro gate', async () => {
		const page = named(YearPage, {
			year: 2026,
			labels: [],
			values: [],
			currency: 'EUR',
			totalSpent: '',
			totalPlanned: '',
			yoySpent: '',
			yoyPlanned: '',
			months: []
		});
		expect(h1(page.body)).toBe('Spending log');
		expect(page.head).toContain('<title>Spending log - Norviq</title>');
		await expect(
			Promise.resolve(yearLoad({} as Parameters<typeof yearLoad>[0]))
		).rejects.toMatchObject({ status: 402, body: { proGate: 'Spending log' } });
	});

	it('/expenses is "Budget" in its header and title', () => {
		const vm: PlannerViewModel = {
			hasLoadError: false,
			errorMessage: '',
			monthLabel: 'November 2026',
			monthQuery: '2026-11',
			prevMonthURL: '/expenses?month=2026-10',
			nextMonthURL: '/expenses?month=2026-12',
			hasSnapshot: false,
			snapshotID: '',
			salary: '',
			plannedTotal: '',
			spentTotal: '',
			spentPct: 0,
			donut: null,
			pillars: [],
			activity: [],
			suggestions: [],
			suggestionsError: '',
			planItems: [],
			categories: [],
			recurring: [],
			partnerName: '',
			hasPartner: false,
			isPro: false,
			drift: null,
			capacity: null,
			alertPolicy: null,
			discipline: null,
			reallocations: [],
			templates: [],
			financialGoals: [],
			portfolioLists: []
		};
		const page = named(ExpensesPage, {
			vm,
			features: {},
			taxTeaser: new Promise(() => {})
		});
		expect(h1(page.body)).toBe('Budget');
		expect(page.head).toContain('<title>Budget - Norviq</title>');
	});

	it('/planning/retire is "Retirement" in its header and title', () => {
		const page = named(RetirePage, {
			vm: {
				draft: defaultRetireDraft(),
				currency: 'EUR',
				prefilledCost: false,
				prefilledValue: false,
				prefilledHousing: false,
				noBudget: false,
				result: null,
				chart: null,
				error: '',
				notice: ''
			}
		});
		expect(h1(page.body)).toBe('Retirement');
		expect(page.head).toContain('<title>Retirement - Norviq</title>');
	});

	it('/settings/integrations is "Brokers and imports" in its header and title', () => {
		const page = named(IntegrationsPage, {
			vm: {
				brokers: [],
				ibkr: emptyIBKRVM(),
				mcp: {
					isPro: false,
					hasTokens: false,
					tokenCount: 0,
					liveCount: 0,
					lastActivity: '',
					agenticLabel: '',
					scopes: [],
					agents: [],
					loadError: false,
					needsPro: false,
					empty: true
				},
				telegram: emptyTelegramVM(),
				appStoreURL: '',
				hasLoadError: false,
				errorMessage: '',
				successMessage: ''
			}
		});
		expect(h1(page.body)).toBe('Brokers and imports');
		expect(page.head).toContain('<title>Brokers and imports - Norviq</title>');
	});

	it('the Settings hub card to /settings/integrations says "Brokers and imports"', () => {
		const page = named(SettingsPage, {
			vm: { hasProfile: false, profileError: '' },
			social: socialOff
		});
		const card = between(page.body, 'href="/settings/integrations"', '</a>');
		expect(card).toContain('Brokers and imports');
		expect(card).not.toMatch(/>\s*Integrations\s*</);
	});
});

describe('pt-PT', () => {
	it('has every new shell string', () => {
		const catalog = new Set(Object.keys(ptPT));
		const strings = [
			'All in %s →',
			'Search and commands',
			'Spending log',
			'Brokers and imports',
			'More',
			'Account',
			'Plan',
			'Search holdings, pages, actions'
		];
		expect(strings.filter((s) => !catalog.has(s))).toEqual([]);
	});

	// "ações" is stocks in this catalogue; commands are "comandos", as in "Pesquisa e comandos".
	it('does not call commands stocks in the top-bar search', () => {
		const label = (ptPT as Record<string, string>)['Search holdings, pages, actions'];
		expect(label).toContain('comandos');
		expect(label).not.toContain('ações');
	});
});
