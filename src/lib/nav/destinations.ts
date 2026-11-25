import { Feature, type FeatureKey } from '../billing.js';

// The DS 2.0 P3 destination table (docs/superpowers/plans/2026-11-25-ds2-p3-destinations.md,
// web columns) as data. Labels and section titles are English i18n ids; the
// builders in visible.ts pass them through `t`. The one-line descriptions live in
// descriptions.ts, so the client shell (which never shows them) does not ship them.

/** Translator: an i18n id in, the localized string out. */
export type Tr = (s: string) => string;

export type DomainKey = 'today' | 'money' | 'wealth' | 'planning' | 'intelligence' | 'community';

export const DOMAIN_ORDER: readonly DomainKey[] = [
	'today',
	'money',
	'wealth',
	'planning',
	'intelligence',
	'community'
];

/** Server flags that hide a row outright (Pro features badge it instead). */
export type Gate =
	'social' | 'groups' | 'groupsPublic' | 'leaderboards' | 'achievements' | 'articles';

export interface NavLink {
	label: string;
	path: string;
	featureKey?: FeatureKey;
	gate?: Gate;
	badgeURL?: string;
}

export interface Destination extends NavLink {
	/** Kebab-case, unique. */
	id: string;
	domain: DomainKey | 'account';
	/** 1..7 sidebar order; absent = index/⌘K only. */
	pick?: number;
	/** Exact paths, or 'prefix/*' for everything below prefix. */
	aliases?: string[];
	/** Sub-navigation chips inside the destination. */
	children?: NavLink[];
}

export const DOMAIN_META: Record<
	DomainKey,
	{ label: string; question: string; indexPath: `/${DomainKey}` }
> = {
	today: {
		label: 'Today',
		question: 'Where do I stand, what changed, what needs me?',
		indexPath: '/today'
	},
	money: { label: 'Money', question: 'Where does my money go?', indexPath: '/money' },
	wealth: { label: 'Wealth', question: 'What do I own and how is it doing?', indexPath: '/wealth' },
	planning: { label: 'Planning', question: 'Where am I heading?', indexPath: '/planning' },
	intelligence: {
		label: 'Intelligence',
		question: "What's happening in markets and why?",
		indexPath: '/intelligence'
	},
	community: { label: 'Community', question: 'What are others doing?', indexPath: '/community' }
};

export const DESTINATIONS: readonly Destination[] = [
	// Today: "Where do I stand, what changed, what needs me?"
	{
		id: 'overview',
		domain: 'today',
		pick: 1,
		label: 'Overview',
		path: '/dashboard'
	},
	{
		id: 'period',
		domain: 'today',
		pick: 2,
		label: 'Period',
		path: '/dashboard/pulse'
	},
	{
		id: 'activity',
		domain: 'today',
		pick: 3,
		label: 'Activity',
		path: '/dashboard/activity'
	},
	{
		id: 'ask-q',
		domain: 'today',
		pick: 4,
		label: 'Ask Q',
		path: '/assistant',
		aliases: ['/assistant/*'],
		featureKey: Feature.AIInsights
	},
	{
		id: 'notifications',
		domain: 'today',
		pick: 5,
		label: 'Notifications',
		path: '/notifications'
	},

	// Money: "Where does my money go?"
	{
		id: 'budget',
		domain: 'money',
		pick: 1,
		label: 'Budget',
		path: '/expenses',
		aliases: ['/expenses/*'],
		children: [
			{ label: 'Budget planner', path: '/expenses' },
			{ label: 'Spending log', path: '/expenses/year', featureKey: Feature.YearOverview }
		]
	},
	{
		id: 'spending-log',
		domain: 'money',
		pick: 2,
		label: 'Spending log',
		path: '/expenses/year',
		featureKey: Feature.YearOverview
	},
	{
		id: 'comparisons',
		domain: 'money',
		pick: 3,
		label: 'Comparisons',
		path: '/reports/trends'
	},
	{
		id: 'receipts',
		domain: 'money',
		pick: 4,
		label: 'Receipts',
		path: '/expenses/receipt/import'
	},
	{
		id: 'spending-reports',
		domain: 'money',
		pick: 5,
		label: 'Spending reports',
		path: '/reports/spending'
	},

	// Wealth: "What do I own and how is it doing?"
	{
		id: 'holdings',
		domain: 'wealth',
		pick: 1,
		label: 'Holdings',
		path: '/portfolio',
		// Covers /portfolio/positions/* and /portfolio/[symbol]/*; every other
		// /portfolio/… destination is a longer exact match and wins.
		aliases: ['/portfolio/*']
	},
	{
		id: 'portfolios',
		domain: 'wealth',
		pick: 2,
		label: 'Portfolios',
		path: '/portfolios'
	},
	{
		id: 'allocation',
		domain: 'wealth',
		pick: 3,
		label: 'Allocation',
		path: '/portfolio/allocation'
	},
	{
		id: 'gains-and-dividends',
		domain: 'wealth',
		pick: 4,
		label: 'Gains and dividends',
		path: '/portfolio/dividends'
	},
	{
		id: 'watchlist',
		domain: 'wealth',
		pick: 5,
		label: 'Watchlist',
		path: '/portfolio/watchlist'
	},
	{
		id: 'earnings',
		domain: 'wealth',
		pick: 6,
		label: 'Earnings',
		path: '/portfolio/earnings'
	},
	{
		id: 'rebalancing',
		domain: 'wealth',
		pick: 7,
		label: 'Rebalancing',
		path: '/portfolio/rebalancing',
		aliases: ['/portfolio/rebalancing-rules'],
		featureKey: Feature.RebalancingRules
	},
	{
		id: 'sector-gains',
		domain: 'wealth',
		label: 'Sector gains',
		path: '/portfolio/sector-gains',
		featureKey: Feature.Statistics
	},
	{
		id: 'crypto',
		domain: 'wealth',
		label: 'Crypto',
		path: '/crypto',
		aliases: ['/crypto/*'],
		featureKey: Feature.Crypto
	},
	{
		id: 'targets',
		domain: 'wealth',
		label: 'Targets',
		path: '/portfolio/targets',
		featureKey: Feature.TargetAlerts
	},
	{
		id: 'thesis-watch',
		domain: 'wealth',
		label: 'Thesis Watch',
		path: '/portfolio/news'
	},
	{
		id: 'portfolio-report',
		domain: 'wealth',
		label: 'Portfolio report',
		path: '/reports/portfolio'
	},

	// Planning: "Where am I heading?"
	{
		id: 'goals',
		domain: 'planning',
		pick: 1,
		label: 'Goals',
		path: '/goals',
		aliases: ['/goals/*']
	},
	{
		id: 'net-worth-forecast',
		domain: 'planning',
		pick: 2,
		label: 'Net worth forecast',
		path: '/forecast',
		featureKey: Feature.NetWorthForecasting
	},
	{
		id: 'retirement',
		domain: 'planning',
		pick: 3,
		label: 'Retirement',
		path: '/planning/retire',
		aliases: ['/planning/retire/*', '/portfolio/retirement']
	},
	{
		id: 'scenarios',
		domain: 'planning',
		pick: 4,
		label: 'Scenarios',
		path: '/scenarios',
		aliases: ['/scenarios/*'],
		featureKey: Feature.ScenarioPlanning
	},
	{
		id: 'simulator',
		domain: 'planning',
		pick: 5,
		label: 'Simulator',
		path: '/simulator',
		aliases: ['/simulator/*']
	},
	{
		id: 'tax-strategy',
		domain: 'planning',
		pick: 6,
		label: 'Tax strategy',
		path: '/tax',
		aliases: ['/tax/*'],
		featureKey: Feature.TaxOptimization
	},
	{
		id: 'grow',
		domain: 'planning',
		label: 'Grow',
		path: '/planning/grow',
		aliases: ['/planning/grow/*']
	},
	{
		id: 'terminal-sizing',
		domain: 'planning',
		label: 'Terminal sizing',
		path: '/terminal',
		aliases: ['/terminal/*']
	},
	{
		id: 'tools',
		domain: 'planning',
		label: 'Tools',
		path: '/tools'
	},

	// Intelligence: "What's happening in markets and why?"
	{
		id: 'market-brief',
		domain: 'intelligence',
		pick: 1,
		label: 'Market brief',
		path: '/brief',
		aliases: ['/brief/*']
	},
	{
		id: 'markets',
		domain: 'intelligence',
		pick: 2,
		label: 'Markets',
		path: '/markets',
		aliases: ['/markets/*'],
		children: [
			{ label: 'Overview', path: '/markets' },
			{ label: 'Retail sentiment', path: '/markets/sentiment' },
			{ label: 'Congress', path: '/markets/congress' },
			{ label: 'Earnings', path: '/markets/earnings' }
		]
	},
	{
		id: 'economy',
		domain: 'intelligence',
		pick: 3,
		label: 'Economy',
		path: '/economy',
		aliases: ['/economy/*'],
		children: [
			{ label: 'Inflation', path: '/economy' },
			{ label: 'Your inflation', path: '/economy/personal' },
			{ label: 'Housing', path: '/economy/housing' },
			{ label: 'Growth and jobs', path: '/economy/growth' },
			{ label: 'Policy watch', path: '/economy/fed' }
		]
	},
	{
		id: 'research',
		domain: 'intelligence',
		pick: 4,
		label: 'Research',
		path: '/research',
		aliases: ['/research/*'],
		featureKey: Feature.AdvancedResearch
	},
	{
		id: 'insights',
		domain: 'intelligence',
		pick: 5,
		label: 'Insights',
		path: '/dashboard/insights',
		featureKey: Feature.AIInsights
	},
	{
		id: 'reports',
		domain: 'intelligence',
		pick: 6,
		label: 'Reports',
		path: '/reports',
		// /reports/advanced, /reports/deep-dive and every /reports/[tab] that is
		// not its own destination (those are longer exact matches and win).
		aliases: ['/reports/*'],
		children: [
			{ label: 'Overview', path: '/reports' },
			{
				label: 'Reporting center',
				path: '/reports/advanced',
				featureKey: Feature.AdvancedReportRuns
			},
			{ label: 'Deep dive', path: '/reports/deep-dive', featureKey: Feature.AdvancedReportRuns }
		]
	},
	{
		id: 'smart-screens',
		domain: 'intelligence',
		label: 'Smart screens',
		path: '/portfolio/screens',
		featureKey: Feature.SmartScreening
	},
	{
		id: 'chart-builder',
		domain: 'intelligence',
		label: 'Chart builder',
		path: '/chart-builder',
		featureKey: Feature.ValuationCases
	},

	// Community: "What are others doing?"
	{
		id: 'friends',
		domain: 'community',
		pick: 1,
		label: 'Friends',
		path: '/friends',
		aliases: ['/friends/*', '/xp'],
		gate: 'social',
		children: [
			{ label: 'Friends', path: '/friends' },
			{ label: 'Leaderboard', path: '/friends/leaderboard', gate: 'leaderboards' },
			{ label: 'XP history', path: '/xp', gate: 'leaderboards' },
			{ label: 'Achievements', path: '/achievements', gate: 'achievements' },
			{ label: 'Invite friends', path: '/friends/invite' }
		]
	},
	{
		id: 'groups',
		domain: 'community',
		pick: 2,
		label: 'Groups',
		path: '/groups',
		aliases: ['/groups/*', '/g/*'],
		gate: 'groups',
		// Keeps the unread count on the sidebar pick, as the old Groups group had.
		badgeURL: '/groups/unread-badge',
		children: [
			{ label: 'Your groups', path: '/groups', badgeURL: '/groups/unread-badge' },
			{ label: 'Discover', path: '/groups/discover', gate: 'groupsPublic' },
			{ label: 'New group', path: '/groups/new' }
		]
	},
	{
		id: 'boards',
		domain: 'community',
		pick: 3,
		label: 'Boards',
		path: '/boards',
		// The community admin page belonged to Community in the old nav too.
		aliases: ['/boards/*', '/admin/community'],
		children: [
			{ label: 'All boards', path: '/boards' },
			{ label: 'Articles', path: '/articles', gate: 'articles' }
		]
	},
	{
		id: 'articles',
		domain: 'community',
		pick: 4,
		label: 'Articles',
		path: '/articles',
		aliases: ['/articles/*'],
		gate: 'articles'
	},

	// Account: not a domain. Sidebar foot on web.
	{
		id: 'settings',
		domain: 'account',
		label: 'Settings',
		path: '/settings',
		// Settings sub-pages outside the 14 children (blocked users, privacy, …).
		aliases: ['/settings/*'],
		children: [
			{ label: 'Profile', path: '/settings' },
			{ label: 'Appearance', path: '/settings/appearance' },
			{ label: 'Edit Profile', path: '/settings/profile' },
			// visible.ts swaps Badges for Achievements while achievements are on.
			{ label: 'Badges', path: '/settings/badges' },
			{ label: 'Subscription', path: '/settings/subscription' },
			{ label: 'Notifications', path: '/settings/notifications' },
			{ label: 'Language', path: '/settings/language' },
			{ label: 'Feedback', path: '/settings/feedback' },
			{ label: 'Brokers and imports', path: '/settings/integrations' },
			{ label: 'Bank sync', path: '/settings/banks' },
			{ label: 'API access', path: '/settings/api-access' },
			{ label: 'AI providers', path: '/settings/ai-providers' },
			{ label: 'Data export', path: '/settings/export' },
			{ label: 'About', path: '/settings/about' }
		]
	},
	{
		id: 'brokers-and-imports',
		domain: 'account',
		label: 'Brokers and imports',
		path: '/settings/integrations'
	},
	{
		id: 'achievements',
		domain: 'account',
		label: 'Achievements',
		path: '/achievements',
		gate: 'achievements'
	}
];
