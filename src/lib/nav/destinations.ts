import { Feature, type FeatureKey } from '../billing.js';

// The DS 2.0 P3 destination table (docs/superpowers/plans/2026-11-25-ds2-p3-destinations.md,
// web columns) as data. Labels, descriptions and section titles are English i18n
// ids; the builders in visible.ts pass them through `t`.

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
	/** One line, English source string (translated by t). */
	description: string;
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
		path: '/dashboard',
		description: 'Where you stand today across money, wealth and plans.'
	},
	{
		id: 'period',
		domain: 'today',
		pick: 2,
		label: 'Period',
		path: '/dashboard/pulse',
		description: 'How your money moved over the period you choose.'
	},
	{
		id: 'activity',
		domain: 'today',
		pick: 3,
		label: 'Activity',
		path: '/dashboard/activity',
		description: 'Everything that happened in your accounts, newest first.'
	},
	{
		id: 'ask-q',
		domain: 'today',
		pick: 4,
		label: 'Ask Q',
		path: '/assistant',
		aliases: ['/assistant/*'],
		featureKey: Feature.AIInsights,
		description: 'Ask Q about your money, holdings and plans.'
	},
	{
		id: 'notifications',
		domain: 'today',
		pick: 5,
		label: 'Notifications',
		path: '/notifications',
		description: 'Alerts and updates that need your attention.'
	},

	// Money: "Where does my money go?"
	{
		id: 'budget',
		domain: 'money',
		pick: 1,
		label: 'Budget',
		path: '/expenses',
		aliases: ['/expenses/*'],
		description: "Plan this month's spending and see what is left.",
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
		featureKey: Feature.YearOverview,
		description: "Every month of the year's spending, category by category."
	},
	{
		id: 'comparisons',
		domain: 'money',
		pick: 3,
		label: 'Comparisons',
		path: '/reports/trends',
		description: "How this period's spending compares with earlier ones."
	},
	{
		id: 'receipts',
		domain: 'money',
		pick: 4,
		label: 'Receipts',
		path: '/expenses/receipt/import',
		description: 'Scan receipts and turn them into expenses.'
	},
	{
		id: 'spending-reports',
		domain: 'money',
		pick: 5,
		label: 'Spending reports',
		path: '/reports/spending',
		description: 'Where your money went, by category and over time.'
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
		aliases: ['/portfolio/*'],
		description: "Every holding across your portfolios, with today's change."
	},
	{
		id: 'portfolios',
		domain: 'wealth',
		pick: 2,
		label: 'Portfolios',
		path: '/portfolios',
		description: 'Create, rename and organise your portfolios.'
	},
	{
		id: 'allocation',
		domain: 'wealth',
		pick: 3,
		label: 'Allocation',
		path: '/portfolio/allocation',
		description: 'How your wealth splits across assets, sectors and regions.'
	},
	{
		id: 'gains-and-dividends',
		domain: 'wealth',
		pick: 4,
		label: 'Gains and dividends',
		path: '/portfolio/dividends',
		description: 'Realised gains and the dividends your holdings pay.'
	},
	{
		id: 'watchlist',
		domain: 'wealth',
		pick: 5,
		label: 'Watchlist',
		path: '/portfolio/watchlist',
		description: 'Symbols you follow but do not own yet.'
	},
	{
		id: 'earnings',
		domain: 'wealth',
		pick: 6,
		label: 'Earnings',
		path: '/portfolio/earnings',
		description: 'Upcoming and recent earnings for what you hold.'
	},
	{
		id: 'rebalancing',
		domain: 'wealth',
		pick: 7,
		label: 'Rebalancing',
		path: '/portfolio/rebalancing',
		aliases: ['/portfolio/rebalancing-rules'],
		featureKey: Feature.RebalancingRules,
		description: 'Bring your portfolio back to its target mix.'
	},
	{
		id: 'sector-gains',
		domain: 'wealth',
		label: 'Sector gains',
		path: '/portfolio/sector-gains',
		featureKey: Feature.Statistics,
		description: 'Gains and losses broken down by sector.'
	},
	{
		id: 'crypto',
		domain: 'wealth',
		label: 'Crypto',
		path: '/crypto',
		aliases: ['/crypto/*'],
		featureKey: Feature.Crypto,
		description: 'Your crypto holdings and the coins you follow.'
	},
	{
		id: 'targets',
		domain: 'wealth',
		label: 'Targets',
		path: '/portfolio/targets',
		featureKey: Feature.TargetAlerts,
		description: 'Price targets and the alerts they trigger.'
	},
	{
		id: 'thesis-watch',
		domain: 'wealth',
		label: 'Thesis Watch',
		path: '/portfolio/news',
		description: 'News that tests the thesis behind each holding.'
	},
	{
		id: 'portfolio-report',
		domain: 'wealth',
		label: 'Portfolio report',
		path: '/reports/portfolio',
		description: "A report on your portfolio's performance and mix."
	},

	// Planning: "Where am I heading?"
	{
		id: 'goals',
		domain: 'planning',
		pick: 1,
		label: 'Goals',
		path: '/goals',
		aliases: ['/goals/*'],
		description: 'Your financial goals and whether you are on track.'
	},
	{
		id: 'net-worth-forecast',
		domain: 'planning',
		pick: 2,
		label: 'Net worth forecast',
		path: '/forecast',
		featureKey: Feature.NetWorthForecasting,
		description: 'Where your net worth could be in the years ahead.'
	},
	{
		id: 'retirement',
		domain: 'planning',
		pick: 3,
		label: 'Retirement',
		path: '/planning/retire',
		aliases: ['/planning/retire/*', '/portfolio/retirement'],
		description: 'When you could retire and what it takes to get there.'
	},
	{
		id: 'scenarios',
		domain: 'planning',
		pick: 4,
		label: 'Scenarios',
		path: '/scenarios',
		aliases: ['/scenarios/*'],
		featureKey: Feature.ScenarioPlanning,
		description: 'Test what-if changes against your plan.'
	},
	{
		id: 'simulator',
		domain: 'planning',
		pick: 5,
		label: 'Simulator',
		path: '/simulator',
		aliases: ['/simulator/*'],
		description: 'Simulate how a portfolio could grow over time.'
	},
	{
		id: 'tax-strategy',
		domain: 'planning',
		pick: 6,
		label: 'Tax strategy',
		path: '/tax',
		aliases: ['/tax/*'],
		featureKey: Feature.TaxOptimization,
		description: 'Ways to lower the tax on your investments this year.'
	},
	{
		id: 'grow',
		domain: 'planning',
		label: 'Grow',
		path: '/planning/grow',
		aliases: ['/planning/grow/*'],
		description: 'How regular saving and investing can grow your wealth.'
	},
	{
		id: 'terminal-sizing',
		domain: 'planning',
		label: 'Terminal sizing',
		path: '/terminal',
		aliases: ['/terminal/*'],
		description: 'Size a position from the market cap you expect a company to reach.'
	},
	{
		id: 'tools',
		domain: 'planning',
		label: 'Tools',
		path: '/tools',
		description: 'Calculators for everyday money decisions.'
	},

	// Intelligence: "What's happening in markets and why?"
	{
		id: 'market-brief',
		domain: 'intelligence',
		pick: 1,
		label: 'Market brief',
		path: '/brief',
		aliases: ['/brief/*'],
		description: "The day's market story at the open and the close."
	},
	{
		id: 'markets',
		domain: 'intelligence',
		pick: 2,
		label: 'Markets',
		path: '/markets',
		aliases: ['/markets/*'],
		description: 'Indices, movers and what is driving them.',
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
		description: 'Inflation, jobs, housing and central bank policy.',
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
		featureKey: Feature.AdvancedResearch,
		description: 'In-depth research and memos on the companies you follow.'
	},
	{
		id: 'insights',
		domain: 'intelligence',
		pick: 5,
		label: 'Insights',
		path: '/dashboard/insights',
		featureKey: Feature.AIInsights,
		description: 'Patterns Q has spotted in your money and holdings.'
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
		description: 'Reports on your finances, ready to read or export.',
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
		featureKey: Feature.SmartScreening,
		description: 'Filter the market for stocks that meet your criteria.'
	},
	{
		id: 'chart-builder',
		domain: 'intelligence',
		label: 'Chart builder',
		path: '/chart-builder',
		featureKey: Feature.ValuationCases,
		description: 'Build and compare charts of any metric.'
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
		description: 'Friends on Norviq, their progress and your invites.',
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
		description: 'Private groups to talk money with people you choose.',
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
		description: 'Public discussion boards on markets and money.',
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
		gate: 'articles',
		description: 'Articles written by the Norviq community.'
	},

	// Account: not a domain. Sidebar foot on web.
	{
		id: 'settings',
		domain: 'account',
		label: 'Settings',
		path: '/settings',
		// Settings sub-pages outside the 14 children (blocked users, privacy, …).
		aliases: ['/settings/*'],
		description: 'Your profile, appearance, subscription and privacy.',
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
		path: '/settings/integrations',
		description: 'Connect your brokers and import your holdings.'
	},
	{
		id: 'achievements',
		domain: 'account',
		label: 'Achievements',
		path: '/achievements',
		gate: 'achievements',
		description: 'Badges and milestones you have earned.'
	}
];
