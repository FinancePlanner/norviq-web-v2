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

/**
 * Shape-coded, not colour-coded: ▲ and ▼ stay distinct for colour-blind readers
 * and in grayscale, where the old 🟢/🔴 dots differed only by hue. Screen readers
 * get directionKey() instead, so callers keep the glyph aria-hidden.
 */
export function directionMarker(direction: string): string {
	if (direction === Up) return '▲';
	if (direction === Down) return '▼';
	return '–';
}

/** The gain/loss/flat text class for a direction (theme tokens, never brand gold). */
export function directionToneClass(direction: string): string {
	if (direction === Up) return 'text-[var(--color-gain)]';
	if (direction === Down) return 'text-[var(--color-loss)]';
	return 'text-[var(--color-flat)]';
}

export function directionKey(direction: string): string {
	if (direction === Up) return 'Up';
	if (direction === Down) return 'Down';
	return 'Unchanged';
}

export function itemMarker(kind: string): string {
	return kind === KindEarnings ? '📍' : '📌';
}
