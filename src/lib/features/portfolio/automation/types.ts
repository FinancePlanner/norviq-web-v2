import type { components } from '#lib/api/schema.js';

// Hand-written shapes from norviq-web internal/api/rebalancing.go and
// portfolio_reporting.go (the Go web calls these endpoints with DoJSON, not the
// generated client, so the Go structs are the contract).

export interface AllocationTargetLeaf {
	id: string;
	kind: string;
	symbol?: string;
	name: string;
	targetBasisPoints: number;
	alertThresholdBasisPoints?: number;
	sortOrder: number;
}

export interface AllocationTargetBucket {
	id: string;
	name: string;
	targetBasisPoints: number;
	alertThresholdBasisPoints?: number;
	sectorKey?: string;
	sortOrder: number;
	leaves: AllocationTargetLeaf[];
}

export interface AllocationModel {
	id: string;
	portfolioId: string;
	name: string;
	groupingMode: string;
	isActive: boolean;
	revision: number;
	baseCurrency: string;
	defaultTargetThresholdBasisPoints: number;
	totalThresholdBasisPoints: number;
	fractionalSharesEnabled: boolean;
	quantityIncrement: number;
	minimumTradeAmount: number;
	flatFee: number;
	variableFeeBasisPoints: number;
	buckets: AllocationTargetBucket[];
	createdAt: string;
	updatedAt?: string;
}

export interface AllocationModelUpsertRequest {
	name: string;
	groupingMode: string;
	expectedRevision?: number;
	activate: boolean;
	defaultTargetThresholdBasisPoints: number;
	totalThresholdBasisPoints: number;
	fractionalSharesEnabled: boolean;
	quantityIncrement: number;
	minimumTradeAmount: number;
	flatFee: number;
	variableFeeBasisPoints: number;
	buckets: AllocationTargetBucket[];
}

export interface RebalancingAllocationRow {
	id: string;
	label: string;
	symbol?: string;
	targetBasisPoints: number;
	currentBasisPoints: number;
	driftBasisPoints: number;
	currentValue: number;
	targetValue: number;
	driftValue: number;
	severity: string;
	children: RebalancingAllocationRow[] | null;
}

export interface RebalancingValuationWarning {
	code: string;
	symbol?: string;
	message: string;
}

export interface RebalancingOverview {
	portfolioId: string;
	model: AllocationModel | null;
	baseCurrency: string;
	totalValue: number;
	totalDriftBasisPoints: number;
	severity: string;
	priceQuality: string;
	pricedAt?: string;
	openAlertCount: number;
	rows: RebalancingAllocationRow[] | null;
	warnings: RebalancingValuationWarning[] | null;
}

export interface RebalanceTradeOverride {
	symbol: string;
	amount: number;
}

export interface RebalancingSimulationRequest {
	modelId: string;
	modelRevision: number;
	cashFlow: number;
	overrides: RebalanceTradeOverride[];
}

export interface RebalanceTrade {
	symbol: string;
	side: string;
	quantity: number;
	price: number;
	notional: number;
	estimatedFee: number;
	estimatedCostBasis?: number;
	estimatedRealizedGainLoss?: number;
	currency: string;
}

export interface RebalancingSimulation {
	portfolioId: string;
	modelId: string;
	modelRevision: number;
	baseCurrency: string;
	totalValueBefore: number;
	totalValueAfter: number;
	driftBeforeBasisPoints: number;
	driftAfterBasisPoints: number;
	estimatedFees: number;
	estimatedRealizedGainLoss: number;
	trades: RebalanceTrade[] | null;
	pricedAt?: string;
}

export interface RebalancePlan {
	id: string;
	portfolioId: string;
	modelId: string;
	modelRevision: number;
	name?: string;
	status: string;
	baseCurrency: string;
	driftBeforeBasisPoints: number;
	driftAfterBasisPoints: number;
	totalValue: number;
	estimatedFees: number;
	estimatedRealizedGainLoss: number;
	trades: RebalanceTrade[] | null;
	createdAt: string;
	exportedAt?: string;
	completedAt?: string;
	cancelledAt?: string;
}

export interface RebalancingHistorySummary {
	completedCount: number;
	averageDriftBeforeBasisPoints: number;
	averageDriftAfterBasisPoints: number;
	averageDaysBetweenRebalances?: number | null;
	lastCompletedAt?: string;
}

export interface RebalancingAlert {
	id: string;
	portfolioId: string;
	modelId: string;
	scopeId: string;
	scopeName: string;
	driftBasisPoints: number;
	thresholdBasisPoints: number;
	status: string;
	triggeredAt: string;
	acknowledgedAt?: string;
	resolvedAt?: string;
}

export interface RebalancingNotificationPreferences {
	portfolioId: string;
	pushEnabled: boolean;
}

/** api.ManagedPortfolio (only the fields these pages read). */
export interface ManagedPortfolio {
	id: string;
	name: string;
	purpose?: string;
	ownership?: string;
	mode?: string;
	baseCurrency?: string;
	isDefault?: boolean;
}

export interface PortfolioPage {
	items: ManagedPortfolio[] | null;
}

/** portfolio.RebalancingViewModel */
export interface RebalancingViewModel {
	portfolios: ManagedPortfolio[];
	selected: ManagedPortfolio | null;
	overview: RebalancingOverview;
	models: AllocationModel[];
	simulation: RebalancingSimulation | null;
	plans: RebalancePlan[];
	history: RebalancingHistorySummary;
	alerts: RebalancingAlert[];
	preferences: RebalancingNotificationPreferences;
	cashFlow: number;
	notice: string;
	error: string;
}

type S = components['schemas'];
export type PortfolioListResponse = S['PortfolioListResponse'];
export type WatchlistListResponse = S['WatchlistListResponse'];
export type WatchlistScreen = S['WatchlistScreen'];
export type ScreenMetricDescriptor = S['ScreenMetricDescriptor'];
export type WatchlistScreenEvaluation = S['WatchlistScreenEvaluation'];
export type WatchlistScreenUpsertRequest = S['WatchlistScreenUpsertRequest'];
export type WatchlistScreenGroup = S['WatchlistScreenGroup'];
export type WatchlistScreenCondition = S['WatchlistScreenCondition'];
export type RebalancingPolicy = S['RebalancingPolicy'];
export type RebalancingPolicyUpsertRequest = S['RebalancingPolicyUpsertRequest'];
export type RebalancePreview = S['RebalancePreview'];
export type RebalanceEvent = S['RebalanceEvent'];
export type RebalanceTarget = S['RebalanceTarget'];

/** automation.ScreensVM */
export interface ScreensVM {
	lists: WatchlistListResponse[];
	screens: WatchlistScreen[];
	catalog: ScreenMetricDescriptor[];
	evaluation: WatchlistScreenEvaluation | null;
	editing: WatchlistScreen | null;
	history: WatchlistScreenEvaluation[];
	historyScreenID: string;
	error: string;
}

/** automation.RebalancingVM (the rebalancing-rules page) */
export interface RebalancingRulesVM {
	portfolios: PortfolioListResponse[];
	selectedID: string;
	policy: RebalancingPolicy | null;
	preview: RebalancePreview | null;
	events: RebalanceEvent[];
	error: string;
}
