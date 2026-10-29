// View models for the dashboard's lazy panels (Go pages/dashboard viewmodel.go,
// why_moved.templ, terminal_summary.go, overview_extras.templ).

export interface TaxOpportunityVM {
	symbol: string;
	benefit: string;
	unrealizedLoss: string;
}

export interface TaxPanelVM {
	taxYear: string;
	harvestableLosses: string;
	estimatedBenefit: string;
	opportunities: TaxOpportunityVM[];
	href: string;
	needsProfile: boolean;
	isStale: boolean;
	unavailable: boolean;
}

export interface MCPScopeRow {
	label: string;
	/** live | ready | off */
	state: string;
}

export interface MCPAgentRow {
	name: string;
	scopes: string;
	lastUsed: string;
	/** Live | Idle | Never */
	status: string;
	isLive: boolean;
}

export interface MCPStatusVM {
	isPro: boolean;
	hasTokens: boolean;
	tokenCount: number;
	liveCount: number;
	lastActivity: string;
	agenticLabel: string;
	scopes: MCPScopeRow[];
	agents: MCPAgentRow[];
	loadError: boolean;
	needsPro: boolean;
	empty: boolean;
}

export interface WhyMovedChipVM {
	symbol: string;
	changePct: number;
	change: string;
	sentimentLabel: string;
	postCount: number;
}

export interface WhyMovedIndexVM {
	label: string;
	change: string;
	changePct: number;
}

export interface WhyMovedVM {
	aiSummary: string;
	moverChips: WhyMovedChipVM[];
	indexChips: WhyMovedIndexVM[];
	changeLabel: string;
	isPro: boolean;
	sourceLine: string;
	capacityLine: string;
}

export interface TerminalSummaryRowVM {
	ticker: string;
	terminalSharePrice: string;
	sharesNeeded: string;
	progressLabel: string;
	progressPct: number;
}

export interface TerminalSummaryVM {
	loadError: boolean;
	empty: boolean;
	totalValueWanted: string;
	monthlyAutobuyTotal: string;
	top: TerminalSummaryRowVM[];
	disclaimer: string;
}

export interface SearchResultVM {
	symbol: string;
	name: string;
	exchange: string;
	href: string;
	return3M: string;
	return3MClass: string;
	return6M: string;
	return6MClass: string;
	returnYTD: string;
	returnYTDClass: string;
}

/** components.NewsHeadlineVM */
export interface HeadlineVM {
	title: string;
	url: string;
	source?: string;
	timeAgo?: string;
}

/** Economy pulse: null items = the backend call failed (OverviewPanelError). */
export interface EconomyPulseVM {
	items: HeadlineVM[] | null;
}
