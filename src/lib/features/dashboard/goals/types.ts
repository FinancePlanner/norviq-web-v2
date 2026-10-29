// Port of norviq-web internal/api/goal_planning.go. The Go web hand-writes
// these shapes and calls the endpoints through Service.DoJSON, so v2 follows
// the Go structs rather than schema.d.ts.

export interface PlanningGoalPortfolioAllocation {
	id: string;
	portfolioListId: string;
	allocationPercentage: number;
}

export interface PlanningGoalExpenseCategoryLink {
	id: string;
	categoryId: string;
	role: string;
}

export interface GoalPlan {
	id: string;
	name: string;
	portfolioListId: string;
	goalType: string;
	targetAmount: number;
	targetDate: string;
	baseCurrency: string;
	startingCapital: number;
	monthlyContribution: number;
	annualContributionGrowth: number;
	inflationAssumption: number;
	riskProfile: string;
	expectedAnnualReturn: number;
	status: string;
	portfolioAllocations: PlanningGoalPortfolioAllocation[] | null;
	expenseCategoryLinks: PlanningGoalExpenseCategoryLink[] | null;
	createdAt: string;
	updatedAt: string;
}

export interface GoalPlanInput {
	name: string;
	goalType: string;
	targetAmount: number;
	targetDate: string;
	baseCurrency: string;
	startingCapital: number;
	monthlyContribution: number;
	annualContributionGrowth: number;
	inflationAssumption: number;
	riskProfile: string;
	status: string;
	portfolioAllocations: PlanningGoalPortfolioAllocation[];
	expenseCategoryLinks: PlanningGoalExpenseCategoryLink[];
}

export interface PlanningGoalTrajectoryPoint {
	date: string;
	plannedValue: number;
	actualValue?: number | null;
	projectedValue: number;
}

export interface PlanningGoalProgress {
	goalId: string;
	currency: string;
	currentValue: number;
	targetAmount: number;
	percentComplete: number;
	plannedValueToday: number;
	projectedValueAtTarget: number;
	projectedCompletionDate?: string | null;
	driftAmount: number;
	driftMonths?: number | null;
	driftState: string;
	plannedMonthlyContribution: number;
	observedMonthlyContribution: number;
	trajectory: PlanningGoalTrajectoryPoint[] | null;
	warnings: string[] | null;
	calculatedAt: string;
}

export interface PlanningGoalOverviewItem {
	id: string;
	goal: GoalPlan;
	progress: PlanningGoalProgress;
}

export interface PlanningGoalOverview {
	items: PlanningGoalOverviewItem[] | null;
	totalCurrentValue: number;
	totalTargetAmount: number;
	activeGoalCount: number;
	activeGoalLimit?: number | null;
	isPro: boolean;
}

export interface PlanningGoalTemplate {
	id: string;
	name: string;
	goalType: string;
	suggestedYears: number;
	riskProfile: string;
}

export interface PlanningGoalWhatIfRequest {
	monthlyContribution: number;
	expectedAnnualReturn: number;
}

export interface PlanningGoalWhatIfResponse {
	baseline: PlanningGoalProgress;
	scenario: PlanningGoalProgress;
}

export interface PlanningGoalSuggestion {
	id: string;
	goalId: string;
	kind: string;
	title: string;
	explanation: string;
	monthlyAmount?: number | null;
	allocationPercentage?: number | null;
	estimatedMonthsChanged?: number | null;
	status: string;
	createdAt: string;
}

export interface PlanningGoalAdjustmentDraft {
	id: string;
	suggestionId: string;
	destination: string;
	payload: Record<string, string>;
	createdAt: string;
}

export interface PlanningGoalContributionInput {
	amount: number;
	occurredAt: string;
	note?: string;
}

export interface PlanningFinancialGoalBulkUpdate {
	goalIds: string[];
	status: string;
}

/** api.PortfolioListResponse, reduced to what the goal form reads. */
export interface PortfolioListSummary {
	id: string;
	name: string;
}

/** goals.PageViewModel */
export interface GoalsPageViewModel {
	overview: PlanningGoalOverview;
	templates: PlanningGoalTemplate[];
	portfolios: PortfolioListSummary[];
	selected: PlanningGoalOverviewItem | null;
	suggestions: PlanningGoalSuggestion[];
	notice: string;
	errorMessage: string;
}
