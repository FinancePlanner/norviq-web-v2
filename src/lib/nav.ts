import { Feature, type FeatureLocked } from './billing.js';
import type { Tr } from './nav/destinations.js';

// Port of norviq-web internal/nav/nav.go: paths, social flags and the stock
// detail tabs. The app navigation (sidebar, bottom bar, sub-nav) lives in
// nav/destinations.ts and nav/visible.ts (DS 2.0 P3).

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
	Terminal: '/terminal',
	Tools: '/tools'
} as const;

/** One stock detail tab (stockDetailTabs, StockSubNav). */
export interface StockTab {
	label: string;
	path: string;
	featureKey?: string;
	showProBadge?: boolean;
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

export type { Tr };

function applyFeatureLocks(items: StockTab[], locked: FeatureLocked): StockTab[] {
	if (!locked) return items;
	return items.map((it) => ({
		...it,
		showProBadge: it.featureKey ? locked(it.featureKey) : it.showProBadge
	}));
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

export function stockDetailTabs(symbol: string, locked: FeatureLocked = null): StockTab[] {
	const base = '/portfolio/' + symbol;
	const tab = (label: string, segment: string): StockTab => ({
		label,
		path: segment ? `${base}/${segment}` : base,
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

export function isActivePath(current: string, target: string): boolean {
	return current.replace(/\/$/, '') === target.replace(/\/$/, '');
}
