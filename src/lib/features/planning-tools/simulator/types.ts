// Port of norviq-web internal/api/portfolio_simulation.go (hand-written in Go
// because the backend documents the simulation routes with a loose schema)
// plus the RebalancingSimulation pieces it embeds (internal/api/rebalancing.go).

export const SimulationModeFromScratch = 'fromScratch';
export const SimulationModeCloneCurrentPortfolio = 'cloneCurrentPortfolio';

export interface PortfolioSimulationLeg {
	symbol: string;
	displayName?: string;
	targetBasisPoints: number;
	sortOrder: number;
}

export interface PortfolioSimulationLegInput {
	symbol: string;
	displayName?: string;
	targetBasisPoints: number;
}

export interface PortfolioSimulation {
	id: string;
	name: string;
	mode: string;
	sourcePortfolioId?: string;
	baseCurrency: string;
	targetCapital: number;
	fractionalSharesEnabled: boolean;
	legs: PortfolioSimulationLeg[] | null;
	createdAt: string;
	updatedAt?: string;
}

export interface PortfolioSimulationUpsertRequest {
	name: string;
	mode: string;
	sourcePortfolioId?: string;
	baseCurrency: string;
	targetCapital: number;
	fractionalSharesEnabled: boolean;
	/** Go marshals a nil slice as null. */
	legs: PortfolioSimulationLegInput[] | null;
	expectedRevision?: number;
}

export interface RebalanceTrade {
	symbol: string;
	side: string;
	quantity: number;
	price: number;
	notional: number;
	estimatedFee: number;
	currency: string;
}

export interface RebalancingValuationWarning {
	code: string;
	symbol?: string;
	message: string;
}

export interface RebalancingSimulation {
	baseCurrency: string;
	trades: RebalanceTrade[] | null;
}

export interface PortfolioSimulationDiffRow {
	symbol: string;
	currentBasisPoints: number;
	targetBasisPoints: number;
	currentValue: number;
	targetValue: number;
}

export interface PortfolioSimulationResult {
	simulationId: string;
	revision: number;
	mode: string;
	generatedAt: string;
	simulation: RebalancingSimulation;
	totalCashNeeded: number;
	leftoverCash: number;
	cashBasisPoints: number;
	diff: PortfolioSimulationDiffRow[] | null;
	warnings: RebalancingValuationWarning[] | null;
}

export interface PortfolioSimulationListResponse {
	items: PortfolioSimulation[] | null;
	nextCursor?: string;
}
