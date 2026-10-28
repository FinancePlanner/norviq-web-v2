// View models for the four market-signal blocks (components/market_signals.go).
// Pre-formatted strings; the builders that fill them live with the pages.

export interface TechnicalsVM {
	present: boolean;
	asOf?: string;
	trendLabel?: string;
	crossLabel?: string;
	crossTone?: string;
	hasRSI?: boolean;
	rsi?: string;
	rsiHint?: string;
	rsiTone?: string;
	hasMACD?: boolean;
	macdLabel?: string;
	macdTone?: string;
	has52Week?: boolean;
	low52?: string;
	high52?: string;
	position52Label?: string;
	position52Pct?: number;
}

export interface InsiderTradeVM {
	date: string;
	name: string;
	title?: string;
	kind: string;
	shares: string;
	value: string;
}

export interface InsiderVM {
	present: boolean;
	windowLabel: string;
	buys: number;
	sells: number;
	netShares: string;
	netSharesTone?: string;
	clusterBuy?: string;
	trades: InsiderTradeVM[];
}

export interface InstitutionalHolderVM {
	name: string;
	shares: string;
	change: string;
	changeTone?: string;
}

export interface InstitutionalVM {
	present: boolean;
	asOfQuarter?: string;
	ownershipPct?: string;
	holdersCount?: string;
	holders: InstitutionalHolderVM[];
}

export interface CongressTradeVM {
	politician: string;
	chamber: string;
	type: string;
	amountRange: string;
	transactionDate: string;
	disclosureDate?: string;
	symbol?: string;
	symbolHref?: string;
}

export interface CongressVM {
	present: boolean;
	trades: CongressTradeVM[];
}

export function barOffset(pct: number): string {
	return `left:${pct.toFixed(1)}%`;
}

function pluralizeWord(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : plural;
}

export function insiderFlowLabel(vm: InsiderVM): string {
	return `${vm.buys} ${pluralizeWord(vm.buys, 'buy', 'buys')}, ${vm.sells} ${pluralizeWord(vm.sells, 'sell', 'sells')}`;
}

export function institutionalSummaryLabel(vm: InstitutionalVM): string {
	const parts: string[] = [];
	if (vm.asOfQuarter) parts.push('As of ' + vm.asOfQuarter);
	if (vm.ownershipPct) parts.push(vm.ownershipPct + ' institutionally held');
	if (vm.holdersCount) parts.push(vm.holdersCount + ' holders');
	return parts.join(' · ');
}
