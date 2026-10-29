// Port of norviq-web internal/pages/dashboard/market_brief.go (MarketBriefVM).
// Shared by the dashboard card; the landing page (/market-brief) and the
// /brief/{date}/{slot} pages can reuse it.

export const MarketBriefShellID = 'market-brief-panel';

export const SlotMorning = 'morning';
export const SlotEvening = 'evening';
export const KindHighlight = 'highlight';
export const KindEarnings = 'earnings';
export const KindStory = 'story';
export const Up = 'up';
export const Down = 'down';
export const Flat = 'flat';

export interface MarketBriefRowVM {
	symbol: string;
	flag: string;
	name: string;
	level: string;
	change: string;
	direction: string;
}

export interface MarketBriefGroupVM {
	id: string;
	title: string;
	tone: string;
	rows: MarketBriefRowVM[];
}

export interface MarketBriefItemVM {
	kind: string;
	text: string;
	tickers: string[];
	sourceHost: string;
}

export interface MarketBriefVM {
	slot: string;
	tradingDate: string;
	tradingDateISO: string;
	generatedAt: string;
	generatedAtISO: string;
	degraded: boolean;
	greeting: string;
	groups: MarketBriefGroupVM[];
	notes: MarketBriefItemVM[];
	stories: MarketBriefItemVM[];
	previousSlot: string;
	previousDate: string;
	previousURL: string;
	latestURL: string;
	shareURL: string;
	shareNativeURL: string;
	shareTitle: string;
	shareProps: string;
}

export function marketBriefTitleKey(slot: string): string {
	if (slot === SlotMorning) return 'Morning brief';
	if (slot === SlotEvening) return 'Market close recap';
	return 'Market brief';
}

export function directionMarker(direction: string): string {
	if (direction === Up) return '🟢';
	if (direction === Down) return '🔴';
	return '⚪️';
}

export function directionKey(direction: string): string {
	if (direction === Up) return 'Up';
	if (direction === Down) return 'Down';
	return 'Unchanged';
}

export function itemMarker(kind: string): string {
	return kind === KindEarnings ? '📍' : '📌';
}
