// Port of norviq-web internal/api/planning.go: hand-written mirrors of
// StockPlanShared's Planning DTOs (the backend documents these routes with a
// loose schema, so the Go web does not use the generated client for them).

export interface ProjectionAssumptions {
	initialAmount: number;
	monthlyContribution: number;
	annualReturnRate: number;
	annualContributionGrowthRate: number;
	annualInflationRate: number;
	years: number;
}

export interface ProjectionYear {
	yearIndex: number;
	contributedThisYear: number;
	cumulativeContributions: number;
	endingBalanceNominal: number;
	endingBalanceReal: number;
	growthToDate: number;
}

export interface ProjectionResult {
	assumptions: ProjectionAssumptions;
	years: ProjectionYear[] | null;
	endingValueNominal: number;
	endingValueReal: number;
	totalContributed: number;
	totalGrowth: number;
}

export interface SensitivityPoint {
	annualReturnRate: number;
	endingValueNominal: number;
	endingValueReal: number;
}

export interface GrowthProjectionRequest {
	assumptions: ProjectionAssumptions;
	sensitivityRates?: number[];
}

export interface GrowthProjectionResponse {
	result: ProjectionResult;
	sensitivity: SensitivityPoint[] | null;
	assumptionNotes: string[] | null;
}

export interface PlanningPrefill {
	currency: string;
	portfolioValue: number;
	monthlyCostOfLife?: number | null;
	monthlyByPillar?: Record<string, number>;
	monthlyHousing?: number | null;
	suggestedRetirementAge?: number | null;
	hasBudget: boolean;
	hasPortfolio: boolean;
}

export interface RetirementNeedInput {
	currentAge: number;
	retirementAge: number;
	longevityAge: number;
	monthlyCostOfLifeToday: number;
	monthlyHousingToday: number;
	housingEndsAtAge?: number;
	monthlyOtherIncomeAtRetirement: number;
	annualInflationRate: number;
	withdrawalRate: number;
	expectedAnnualReturn: number;
}

export interface DepletionYear {
	age: number;
	annualSpending: number;
	endingBalance: number;
}

export interface RetirementNeed {
	annualSpendingAtRetirement: number;
	nestEggAtWithdrawalRate: number;
	depletion: DepletionYear[] | null;
	runwayYears: number;
	endingBalance: number;
	shortfallAge?: number | null;
}

/** PlanLever: all moves are absent when on track (gap <= 0). */
export interface PlanLever {
	gap: number;
	additionalMonthlyContribution?: number | null;
	delayYears?: number | null;
	spendingReductionMonthly?: number | null;
}

export interface RetirementPlanningRequest {
	need: RetirementNeedInput;
	plan: ProjectionAssumptions;
	includeProbability?: boolean;
	annualVolatility?: number;
}

export interface RetirementPlanningResponse {
	need: RetirementNeed;
	lever: PlanLever;
	projection: ProjectionResult;
	projectedPortfolioAtRetirement: number;
	readinessProbability?: number | null;
	assumptionNotes: string[] | null;
}

/** PlanLever.IsOnTrack */
export const isOnTrack = (lever: PlanLever) => lever.gap <= 0;
