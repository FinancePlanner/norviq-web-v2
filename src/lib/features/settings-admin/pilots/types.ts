// Port of norviq-web internal/api/pilotsapi (the generated pilots-only client)
// and internal/pages/pilots view models. The pilots routes are not in the main
// OpenAPI spec the v2 client is generated from, so the shapes live here.

export interface PilotSummary {
	chamber?: string | null;
	displayName: string;
	holdingsCount: number;
	kind: string; // "politician" | "fund"
	slug: string;
	updatedAt?: string | null;
}

export interface PilotWeight {
	symbol: string;
	weight: number;
}

export interface PilotDisclosureItem {
	amountMax?: number | null;
	amountMin?: number | null;
	disclosureDate?: string | null;
	instrument: string;
	period?: string | null;
	side: string;
	symbol: string;
	transactionDate?: string | null;
}

export interface PilotDetail {
	lagNote: string;
	pilot: PilotSummary;
	recentDisclosures: PilotDisclosureItem[];
	skippedPuts: number;
	weights: PilotWeight[];
}

export interface PilotFollowResponse {
	appliedVersion: number;
	createdAt: string;
	currency: string;
	id: string;
	pilot: PilotSummary;
	portfolioListId?: string | null;
	startingCapital?: number | null;
	status: string; // "active" | "paused"
	targetKind: string; // "portfolio" | "watchlist"
	watchlistListId?: string | null;
}

export interface PilotFollowEventResponse {
	bookVersion: number;
	id: string;
	kind: string;
	note?: string | null;
	price?: number | null;
	pricedAt: string;
	quantity?: number | null;
	symbol: string;
}

export interface PilotFollowSnapshotResponse {
	cash: number;
	date: string;
	value: number;
}

export interface PilotFollowCreateRequest {
	pilotSlug: string;
	portfolioListId?: string;
	startingCapital?: number;
	targetKind: string;
	watchlistListId?: string;
}

export interface BillingUpgradeRequiredResponse {
	code: string;
	current?: number | null;
	error: string;
	feature: string;
	limit?: number | null;
	plan: string;
	requiredPlan: string;
	success: boolean;
}

// ---- view models (internal/pages/pilots) ----

/** PilotCardVM: followHref is empty when the pilot has no trades; followingHref is set when the user follows it. */
export interface PilotCardVM {
	slug: string;
	name: string;
	kindLabel: string;
	holdingsLabel: string;
	updatedLabel: string;
	hasTrades: boolean;
	href: string;
	followHref: string;
	followingHref: string;
}

export interface FollowRowVM {
	id: string;
	href: string;
	pilotSlug: string;
	pilotName: string;
	targetLabel: string;
	statusLabel: string;
	paused: boolean;
}

/** LoadError is kept apart from an empty list: a failed fetch must not read as "Norviq lists no pilots". */
export interface BrowseVM {
	politicians: PilotCardVM[];
	funds: PilotCardVM[];
	follows: FollowRowVM[];
	notice: string;
	loadError: boolean;
}

export interface WeightRowVM {
	symbol: string;
	symbolHref: string;
	weight: string;
}

export interface DisclosureRowVM {
	symbol: string;
	symbolHref: string;
	side: string;
	instrument: string;
	amount: string;
	traded: string;
	disclosed: string;
}

export interface DetailVM {
	pilot: PilotCardVM;
	weights: WeightRowVM[];
	disclosures: DisclosureRowVM[];
	skippedPutsNote: string;
	lagNote: string;
	following: FollowRowVM | null;
}

export interface WatchlistOptionVM {
	id: string;
	name: string;
}

export interface FollowFormVM {
	pilot: PilotCardVM;
	lagNote: string;
	target: string;
	startingCapital: string;
	watchlists: WatchlistOptionVM[];
	isPro: boolean;
	idempotencyKey: string;
	error: string;
	showUpgrade: boolean;
}

export interface EventRowVM {
	when: string;
	label: string;
	tone: '' | 'positive' | 'negative';
	symbol: string;
	symbolHref: string;
	quantity: string;
	price: string;
	note: string;
}

/**
 * FollowDetailVM. isPortfolio gates the value section; waiting is true until the
 * first book version has been applied. Go built the chart HTML server-side;
 * v2 ships chartLabels/chartValues and the page builds the wealthLine spec.
 */
export interface FollowDetailVM {
	id: string;
	pilot: PilotCardVM;
	targetLabel: string;
	targetLinkLabel: string;
	targetHref: string;
	statusLabel: string;
	paused: boolean;
	waiting: boolean;
	isPortfolio: boolean;
	startingCapital: string;
	latestValue: string;
	change: string;
	changeTone: '' | 'positive' | 'negative';
	chartLabels: string[];
	chartValues: number[];
	chartNote: string;
	events: EventRowVM[];
	eventsError: boolean;
	notice: string;
	error: string;
}
