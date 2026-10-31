import { Feature, type FeatureLocked } from './billing.js';

// Port of norviq-web internal/nav/nav.go. Labels are i18n ids; callers pass
// `t` so the tree comes back localized.

export type Tab =
	| 'dashboard'
	| 'portfolio'
	| 'expenses'
	| 'economy'
	| 'markets'
	| 'reports'
	| 'tax'
	| 'settings'
	| 'friends'
	| 'community'
	| 'groups';

export const Path = {
	Dashboard: '/dashboard',
	Portfolio: '/portfolio',
	Expenses: '/expenses',
	Economy: '/economy',
	Markets: '/markets',
	MarketsSentiment: '/markets/sentiment',
	Reports: '/reports',
	Tax: '/tax',
	Settings: '/settings',
	Friends: '/friends',
	XP: '/xp',
	Achievements: '/achievements',
	Boards: '/boards',
	Articles: '/articles',
	Groups: '/groups',
	Terminal: '/terminal'
} as const;

export interface NavItem {
	label: string;
	path: string;
	tab: Tab;
	featureKey?: string;
	showProBadge?: boolean;
	/** Fragment URL polled for a count beside the label (unread group messages). */
	badgeURL?: string;
	children?: NavItem[];
}

export interface SocialConfig {
	enabled: boolean;
	contactsDiscovery: boolean;
	xImport: boolean;
	facebookImport: boolean;
	leaderboards: boolean;
	messaging: boolean;
	groups: boolean;
	groupsPublic: boolean;
	achievements: boolean;
	activityFeed: boolean;
}

export const socialOff: SocialConfig = {
	enabled: false,
	contactsDiscovery: false,
	xImport: false,
	facebookImport: false,
	leaderboards: false,
	messaging: false,
	groups: false,
	groupsPublic: false,
	achievements: false,
	activityFeed: false
};

export const leaderboardsOn = (c: SocialConfig) => c.enabled && c.leaderboards;
export const groupsOn = (c: SocialConfig) => c.enabled && c.groups;
export const groupsPublicOn = (c: SocialConfig) => groupsOn(c) && c.groupsPublic;
export const xImportOn = (c: SocialConfig) => c.enabled && c.xImport;
export const facebookImportOn = (c: SocialConfig) => c.enabled && c.facebookImport;
export const achievementsOn = (c: SocialConfig) => c.enabled && !!c.achievements;
/** Checks achievements too, so a stale config can never show a feed without them. */
export const activityFeedOn = (c: SocialConfig) => achievementsOn(c) && !!c.activityFeed;

type Tr = (s: string) => string;

function applyFeatureLocks(items: NavItem[], locked: FeatureLocked): NavItem[] {
	if (!locked) return items;
	return items.map((it) => ({
		...it,
		showProBadge: it.featureKey ? locked(it.featureKey) : it.showProBadge,
		children: it.children ? applyFeatureLocks(it.children, locked) : undefined
	}));
}

function friendsGroup(t: Tr, cfg: SocialConfig): NavItem {
	const children: NavItem[] = [{ label: t('Friends'), path: Path.Friends, tab: 'friends' }];
	if (leaderboardsOn(cfg)) {
		children.push(
			{ label: t('Leaderboard'), path: Path.Friends + '/leaderboard', tab: 'friends' },
			{ label: t('XP history'), path: Path.XP, tab: 'friends' }
		);
	}
	if (achievementsOn(cfg))
		children.push({ label: t('Achievements'), path: Path.Achievements, tab: 'friends' });
	children.push({ label: t('Invite friends'), path: Path.Friends + '/invite', tab: 'friends' });
	return { label: t('Friends'), path: Path.Friends, tab: 'friends', children };
}

function groupsGroup(t: Tr, cfg: SocialConfig): NavItem {
	const children: NavItem[] = [
		{
			label: t('Your groups'),
			path: Path.Groups,
			tab: 'groups',
			badgeURL: Path.Groups + '/unread-badge'
		}
	];
	if (groupsPublicOn(cfg))
		children.push({ label: t('Discover'), path: Path.Groups + '/discover', tab: 'groups' });
	children.push({ label: t('New group'), path: Path.Groups + '/new', tab: 'groups' });
	return { label: t('Groups'), path: Path.Groups, tab: 'groups', children };
}

// withAchievementsBadges points Settings -> Badges at the achievements page and
// relabels it: achievements replace the old badge grid while they are on.
function withAchievementsBadges(items: NavItem[], t: Tr): NavItem[] {
	for (const item of items) {
		if (item.path !== Path.Settings || !item.children) continue;
		item.children = item.children.map((c) =>
			c.path === Path.Settings + '/badges'
				? { label: t('Achievements'), path: Path.Achievements, tab: 'settings' }
				: c
		);
	}
	return items;
}

function insertAfterHome(items: NavItem[], group: NavItem): NavItem[] {
	return [items[0], group, ...items.slice(1)];
}

function sidebarItems(t: Tr): NavItem[] {
	return [
		{
			label: t('Home'),
			path: Path.Dashboard,
			tab: 'dashboard',
			children: [
				{ label: t('Overview'), path: Path.Dashboard, tab: 'dashboard' },
				{ label: t('Pulse'), path: Path.Dashboard + '/pulse', tab: 'dashboard' },
				{ label: t('Activity'), path: Path.Dashboard + '/activity', tab: 'dashboard' },
				{ label: t('Insights'), path: Path.Dashboard + '/insights', tab: 'dashboard' },
				{ label: t('Q'), path: '/assistant', tab: 'dashboard', featureKey: Feature.AIInsights },
				{ label: t('Financial goals'), path: '/goals', tab: 'dashboard' }
			]
		},
		{
			label: t('Portfolio'),
			path: Path.Portfolio,
			tab: 'portfolio',
			children: [
				{ label: t('Holdings'), path: Path.Portfolio, tab: 'portfolio' },
				{ label: t('Portfolios'), path: '/portfolios', tab: 'portfolio' },
				{ label: t('Grow'), path: '/planning/grow', tab: 'portfolio' },
				{ label: t('Retire'), path: '/planning/retire', tab: 'portfolio' },
				{ label: t('Terminal sizing'), path: Path.Terminal, tab: 'portfolio' },
				{ label: t('Retirement'), path: Path.Portfolio + '/retirement', tab: 'portfolio' },
				{
					label: t('Net worth forecast'),
					path: '/forecast',
					tab: 'portfolio',
					featureKey: Feature.NetWorthForecasting
				},
				{
					label: t('Chart Builder'),
					path: '/chart-builder',
					tab: 'portfolio',
					featureKey: Feature.ValuationCases
				},
				{
					label: t('Scenario Planning'),
					path: '/scenarios',
					tab: 'portfolio',
					featureKey: Feature.ScenarioPlanning
				},
				{ label: t('Allocation'), path: Path.Portfolio + '/allocation', tab: 'portfolio' },
				{ label: t('Simulator'), path: '/simulator', tab: 'portfolio' },
				{
					label: t('Rebalancing'),
					path: Path.Portfolio + '/rebalancing',
					tab: 'portfolio',
					featureKey: Feature.RebalancingRules
				},
				{
					label: t('Sector Gains'),
					path: Path.Portfolio + '/sector-gains',
					tab: 'portfolio',
					featureKey: Feature.Statistics
				},
				{ label: t('Watchlist'), path: Path.Portfolio + '/watchlist', tab: 'portfolio' },
				{
					label: t('Smart screens'),
					path: Path.Portfolio + '/screens',
					tab: 'portfolio',
					featureKey: Feature.SmartScreening
				},
				{
					label: t('Rebalancing rules'),
					path: Path.Portfolio + '/rebalancing-rules',
					tab: 'portfolio',
					featureKey: Feature.RebalancingRules
				},
				{
					label: t('Targets'),
					path: Path.Portfolio + '/targets',
					tab: 'portfolio',
					featureKey: Feature.TargetAlerts
				},
				{ label: t('Earnings'), path: Path.Portfolio + '/earnings', tab: 'portfolio' },
				{ label: t('Thesis Watch'), path: Path.Portfolio + '/news', tab: 'portfolio' },
				{ label: t('Crypto'), path: '/crypto', tab: 'portfolio', featureKey: Feature.Crypto },
				{
					label: t('Research'),
					path: '/research',
					tab: 'portfolio',
					featureKey: Feature.AdvancedResearch
				}
			]
		},
		{
			label: t('Expenses'),
			path: Path.Expenses,
			tab: 'expenses',
			children: [
				{ label: t('Budget Planner'), path: Path.Expenses, tab: 'expenses' },
				{
					label: t('Year Overview'),
					path: Path.Expenses + '/year',
					tab: 'expenses',
					featureKey: Feature.YearOverview
				}
			]
		},
		{
			label: t('Tax strategy'),
			path: Path.Tax,
			tab: 'tax',
			featureKey: Feature.TaxOptimization,
			children: [
				{ label: t('Overview'), path: Path.Tax, tab: 'tax', featureKey: Feature.TaxOptimization }
			]
		},
		{
			label: t('Markets'),
			path: Path.Markets,
			tab: 'markets',
			children: [
				{ label: t('Overview'), path: Path.Markets, tab: 'markets' },
				{ label: t('Retail sentiment'), path: Path.MarketsSentiment, tab: 'markets' }
			]
		},
		{
			label: t('Boards'),
			path: Path.Boards,
			tab: 'community',
			children: [{ label: t('All boards'), path: Path.Boards, tab: 'community' }]
		},
		{
			label: t('Economy'),
			path: Path.Economy,
			tab: 'economy',
			children: [
				{ label: t('Inflation'), path: Path.Economy, tab: 'economy' },
				{ label: t('Your Inflation'), path: Path.Economy + '/personal', tab: 'economy' },
				{ label: t('Housing'), path: Path.Economy + '/housing', tab: 'economy' },
				{ label: t('Growth & Jobs'), path: Path.Economy + '/growth', tab: 'economy' },
				{ label: t('Policy Watch'), path: Path.Economy + '/fed', tab: 'economy' }
			]
		},
		{
			label: t('Reports'),
			path: Path.Reports,
			tab: 'reports',
			children: [
				{ label: t('Overview'), path: Path.Reports, tab: 'reports' },
				{
					label: t('Reporting Center'),
					path: Path.Reports + '/advanced',
					tab: 'reports',
					featureKey: Feature.AdvancedReportRuns
				},
				{ label: t('Portfolio'), path: Path.Reports + '/portfolio', tab: 'reports' },
				{ label: t('Spending'), path: Path.Reports + '/spending', tab: 'reports' },
				{ label: t('Trends'), path: Path.Reports + '/trends', tab: 'reports' },
				{
					label: t('Deep Dive'),
					path: Path.Reports + '/deep-dive',
					tab: 'reports',
					featureKey: Feature.AdvancedReportRuns
				}
			]
		},
		{
			label: t('Settings'),
			path: Path.Settings,
			tab: 'settings',
			children: [
				{ label: t('Profile'), path: Path.Settings, tab: 'settings' },
				{ label: t('Appearance'), path: Path.Settings + '/appearance', tab: 'settings' },
				{ label: t('Edit Profile'), path: Path.Settings + '/profile', tab: 'settings' },
				{ label: t('Badges'), path: Path.Settings + '/badges', tab: 'settings' },
				{ label: t('Subscription'), path: Path.Settings + '/subscription', tab: 'settings' },
				{ label: t('Notifications'), path: Path.Settings + '/notifications', tab: 'settings' },
				{ label: t('Language'), path: Path.Settings + '/language', tab: 'settings' },
				{ label: t('Feedback'), path: Path.Settings + '/feedback', tab: 'settings' },
				{ label: t('Integrations'), path: Path.Settings + '/integrations', tab: 'settings' },
				{ label: t('Bank sync'), path: Path.Settings + '/banks', tab: 'settings' },
				{ label: t('API access'), path: Path.Settings + '/api-access', tab: 'settings' },
				{ label: t('AI providers'), path: Path.Settings + '/ai-providers', tab: 'settings' },
				{ label: t('Data export'), path: Path.Settings + '/export', tab: 'settings' },
				{ label: t('About'), path: Path.Settings + '/about', tab: 'settings' }
			]
		}
	];
}

export function sidebarItemsFor(
	t: Tr,
	opts: { social: SocialConfig; articles: boolean; locked: FeatureLocked }
): NavItem[] {
	let items = sidebarItems(t);
	if (opts.social.enabled) items = insertAfterHome(items, friendsGroup(t, opts.social));
	// Inserted after Friends so it lands directly under Home, ahead of it.
	if (groupsOn(opts.social)) items = insertAfterHome(items, groupsGroup(t, opts.social));
	if (opts.articles) {
		const boards = items.find((i) => i.path === Path.Boards);
		boards?.children?.push({ label: t('Articles'), path: Path.Articles, tab: 'community' });
	}
	if (achievementsOn(opts.social)) items = withAchievementsBadges(items, t);
	return applyFeatureLocks(items, opts.locked);
}

export function bottomTabs(t: Tr): NavItem[] {
	return [
		{ label: t('Home'), path: Path.Dashboard, tab: 'dashboard' },
		{ label: t('Portfolio'), path: Path.Portfolio, tab: 'portfolio' },
		{ label: t('Expenses'), path: Path.Expenses, tab: 'expenses' },
		{ label: t('Reports'), path: Path.Reports, tab: 'reports' }
	];
}

function bottomTabsMoreBase(t: Tr): NavItem[] {
	return [
		{ label: t('Markets'), path: Path.Markets, tab: 'markets' },
		{ label: t('Economy'), path: Path.Economy, tab: 'economy' },
		{ label: t('Tax'), path: Path.Tax, tab: 'tax' },
		{ label: t('Boards'), path: Path.Boards, tab: 'community' }
	];
}

export function bottomTabsMore(t: Tr, social: SocialConfig): NavItem[] {
	let items = bottomTabsMoreBase(t);
	if (social.enabled)
		items = [{ label: t('Friends'), path: Path.Friends, tab: 'friends' }, ...items];
	if (groupsOn(social))
		items = [{ label: t('Groups'), path: Path.Groups, tab: 'groups' }, ...items];
	return items;
}

export function isMoreTab(tab: Tab): boolean {
	if (tab === 'friends' || tab === 'groups') return true;
	return bottomTabsMoreBase((s) => s).some((i) => i.tab === tab);
}

const stockTabFeatures: Record<string, string> = {
	builder: Feature.ValuationCases,
	statements: Feature.MarketFundamentals,
	ownership: Feature.MarketFundamentals,
	analysis: Feature.MarketFundamentals,
	forecast: Feature.ValuationCases,
	compare: Feature.PeerComparison,
	sentiment: Feature.AIInsights,
	earnings: Feature.EarningsText
};

export function stockTabFeature(tab: string): string {
	return stockTabFeatures[tab.trim().toLowerCase()] ?? '';
}

export function stockDetailTabs(symbol: string, locked: FeatureLocked = null): NavItem[] {
	const base = '/portfolio/' + symbol;
	const tab = (label: string, segment: string): NavItem => ({
		label,
		path: segment ? `${base}/${segment}` : base,
		tab: 'portfolio',
		featureKey: stockTabFeature(segment) || undefined
	});
	return applyFeatureLocks(
		[
			tab('Chart', 'chart'),
			tab('Overview', ''),
			tab('Builder', 'builder'),
			tab('Statements', 'statements'),
			tab('Analysis', 'analysis'),
			tab('Forecast', 'forecast'),
			tab('Compare', 'compare'),
			tab('News', 'news'),
			tab('Sentiment', 'sentiment'),
			tab('Earnings', 'earnings'),
			tab('Ownership', 'ownership')
		],
		locked
	);
}

const validStockTabs = new Set([
	'chart',
	'overview',
	'builder',
	'statements',
	'analysis',
	'forecast',
	'compare',
	'news',
	'sentiment',
	'earnings',
	'ownership'
]);
const validReportTabs = new Set(['overview', 'portfolio', 'spending', 'trends']);
const validSettingsSections = new Set([
	'profile',
	'appearance',
	'badges',
	'about',
	'subscription',
	'notifications',
	'language',
	'feedback',
	'integrations',
	'export',
	'api-access',
	'banks',
	'ai-providers',
	'news-ticker'
]);

export const isValidStockTab = (tab: string) => tab === '' || validStockTabs.has(tab);
export const isValidReportTab = (tab: string) =>
	tab === '' || tab === 'overview' || validReportTabs.has(tab);
export const isValidSettingsSection = (s: string) => s === '' || validSettingsSections.has(s);
export const normalizeReportTab = (tab: string) => (tab === '' || tab === 'overview' ? '' : tab);

export function activeTab(path: string): Tab {
	path = path.replace(/\/$/, '');
	if (path === '') return 'dashboard';
	const p = (prefix: string) => path.startsWith(prefix);
	if (p('/dashboard') || p('/goals')) return 'dashboard';
	if (
		p('/portfolio') ||
		p('/forecast') ||
		p('/chart-builder') ||
		p('/scenarios') ||
		p('/crypto') ||
		p('/research') ||
		p(Path.Terminal)
	)
		return 'portfolio';
	if (p('/expenses')) return 'expenses';
	if (p('/markets')) return 'markets';
	if (p('/economy')) return 'economy';
	if (p('/reports')) return 'reports';
	if (p('/tax')) return 'tax';
	if (p('/settings')) return 'settings';
	if (p(Path.Groups) || p('/g/')) return 'groups';
	if (p(Path.Friends) || p(Path.XP) || p(Path.Achievements)) return 'friends';
	if (p(Path.Boards) || p(Path.Articles) || p('/admin/community')) return 'community';
	return 'dashboard';
}

export function isActivePath(current: string, target: string): boolean {
	return current.replace(/\/$/, '') === target.replace(/\/$/, '');
}
