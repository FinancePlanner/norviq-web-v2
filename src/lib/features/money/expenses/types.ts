// Backend shapes the Go expenses handlers use (internal/api/models.gen.go and
// dca_capacity.go), kept local because the Go web calls these by hand or via
// its own generated client rather than the v2 OpenAPI types.

export type SplitMode = 'personal' | 'shared';
export type DriftLevel = 'green' | 'yellow' | 'red';

export interface BudgetSnapshot {
	id: string;
	monthStart: string;
	netSalary: number;
	targetShares: Record<string, number>;
	currencyCode: string;
	revision: number;
	categoryDriftThreshold: number;
	totalDriftThreshold: number;
	alertsEnabled: boolean;
	alertOnUnbudgeted: boolean;
}

export interface BudgetMonthSummary {
	monthStart: string;
	planned: number;
	actual: number;
	salary: number;
	pillarPlans: Record<string, number>;
	pillarActuals: Record<string, number>;
}

export interface ExpenseRow {
	id: string;
	title: string;
	amount: number;
	occurredOn: string;
	pillar: string;
	categoryId?: string | null;
	splitMode?: SplitMode;
	userSharePercent?: number;
}

export interface ReportSuggestion {
	id: string;
	title: string;
	message: string;
	severity: string;
	recommendedSavings: number;
}

export interface BudgetPlanItem {
	id: string;
	snapshotId: string;
	title: string;
	plannedAmount: number;
	pillar: string;
	splitMode: SplitMode;
	userSharePercent: number;
	targetType: string;
	incomePercentage?: number | null;
	thresholdOverride?: number | null;
	reallocationEligible: boolean;
	allocationKind: string;
	categoryId?: string | null;
}

export interface ExpenseCategory {
	id: string;
	name: string;
	isDefault: boolean;
	pillar?: string | null;
}

export interface RecurringTemplate {
	id: string;
	title: string;
	amount: number;
	pillar: string;
	frequency: 'monthly' | 'weekly';
	splitMode: SplitMode;
	userSharePercent: number;
	categoryId?: string | null;
}

export interface HouseholdPartner {
	displayName?: string | null;
	defaultUserSharePercent?: number | null;
}

export interface BudgetCategoryDrift {
	id: string;
	title: string;
	targetAmount: number;
	actualAmount: number;
	driftAmount: number;
	driftPercent?: number | null;
	level: DriftLevel;
	allocationKind: string;
	reallocationEligible: boolean;
}

export interface BudgetDriftDashboard {
	snapshotId: string;
	revision: number;
	currencyCode: string;
	totalLevel: DriftLevel;
	totalTarget: number;
	totalActual: number;
	totalDriftAmount: number;
	totalDriftPercent?: number | null;
	lostInvestmentCapital: number;
	investmentContributionTarget: number;
	categories: BudgetCategoryDrift[];
}

export interface BudgetDisciplineSummary {
	currentScore?: number | null;
	completedMonthStreak: number;
	compliantMonths: number;
	evaluatedMonths: number;
}

export interface BudgetReallocationEvent {
	id: string;
	effectiveMonth: string;
	freedCapital: number;
}

export interface BudgetTemplateItem {
	title: string;
	plannedAmount: number;
	pillar: string;
	categoryId?: string | null;
	targetType: string;
	incomePercentage?: number | null;
	thresholdOverride?: number | null;
	allocationKind: string;
	reallocationEligible: boolean;
}

export interface BudgetTemplate {
	id: string;
	name: string;
}

export interface FinancialGoal {
	id: string;
	name: string;
	portfolioListId: string;
}

export interface PortfolioList {
	id: string;
	name: string;
}

export interface SpendToUnitsCapacity {
	symbol: string;
	currencyCode: string;
	surplusAmount: number;
	surplusUnits?: number | null;
	price?: number | null;
	priceCurrency?: string | null;
	quoteStale: boolean;
	disclaimer: string;
	categories: { title: string; overspendAmount: number; units?: number | null }[];
}

export interface TaxMoney {
	amount: number;
	currency: string;
}

export interface TaxDashboard {
	profileComplete: boolean;
	taxDrag?: { projectedYearEndTax: TaxMoney } | null;
	summary: { embeddedUnrealizedLiability: TaxMoney; estimatedNetBenefit: TaxMoney };
	opportunities: unknown[];
}

/** api.ReceiptDraftResponse */
export interface ReceiptDraft {
	merchant?: string | null;
	total?: number | null;
	currency?: string | null;
	date?: string | null;
	taxId?: string | null;
	taxTotal?: number | null;
	source: string;
	confidence?: number;
}

export interface ReceiptDraftResponse {
	recognized: boolean;
	draft?: ReceiptDraft | null;
}
