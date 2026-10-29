// View models for /reports. Ports of norviq-web internal/pages/reports/
// viewmodel.go, viewmodel_deepdive.go and the AdvancedViewModel in
// advanced.templ. Go's ChartHTML fields carry the builder inputs instead: the
// page builds the ECharts spec (option formatters do not serialize).

import type { FinancialHealthVM, InsightCardVM } from '#lib/features/dashboard/types.js';

export interface LineSeries {
	labels: string[];
	values: number[];
}

export interface PieSeries {
	labels: string[];
	weights: number[];
}

export interface NetWorthCardVM {
	available: boolean;
	totalValue: string;
	changeLabel: string;
	changePositive: boolean;
	chart: LineSeries | null;
}

export interface StatVM {
	label: string;
	value: string;
}

export interface QuickStatsCardVM {
	available: boolean;
	error: string;
	stats: StatVM[];
}

export interface InsightsCardVM {
	available: boolean;
	financialHealth: FinancialHealthVM | null;
	insightCards: InsightCardVM[];
}

export interface PerformanceCardVM {
	available: boolean;
	error: string;
	changeLabel: string;
	changePositive: boolean;
	chart: LineSeries | null;
}

export interface AllocationRowVM {
	label: string;
	value: string;
	percent: string;
	overweight: string;
	color: string;
}

export interface AllocationCardVM {
	available: boolean;
	chart: PieSeries | null;
	rows: AllocationRowVM[];
}

export interface SpendingCardVM {
	available: boolean;
	latestMonth: string;
	changeLabel: string;
	changePositive: boolean;
	chart: LineSeries | null;
}

export interface BudgetPillarRowVM {
	label: string;
	icon: string;
	colorVar: string;
	target: string;
	planned: string;
	actual: string;
	percent: number;
	/** "on-track" | "warning" | "over"; empty when no goal is set. */
	state: string;
	hasTarget: boolean;
}

export const pillarIconName = (r: BudgetPillarRowVM) => r.icon || 'layers';
export const pillarColorProperty = (r: BudgetPillarRowVM) => `--pillar-color: var(${r.colorVar || '--color-tint'})`;

export interface BudgetTrackingCardVM {
	available: boolean;
	rows: BudgetPillarRowVM[];
}

export interface SavingsRateCardVM {
	available: boolean;
	latestRate: string;
	changeLabel: string;
	changePositive: boolean;
	chart: LineSeries | null;
}

export interface HouseholdSplitCardVM {
	available: boolean;
	hasPartner: boolean;
	myActual: string;
	partnerActual: string;
	myPlanned: string;
	partnerPlanned: string;
	mySharePct: number;
}

export interface CashFlowCardVM {
	available: boolean;
	latestNet: string;
	latestIncome: string;
	latestExpenses: string;
	changeLabel: string;
	changePositive: boolean;
	chart: LineSeries | null;
}

export interface ReportsPageVM {
	tab: string;
	activePath: string;
	isPro: boolean;
	reportsAvailable: boolean;
	hasLoadError: boolean;
	errorMessage: string;
	netWorth: NetWorthCardVM;
	quickStats: QuickStatsCardVM;
	insights: InsightsCardVM;
	performance: PerformanceCardVM;
	allocation: AllocationCardVM;
	spending: SpendingCardVM;
	budgetTracking: BudgetTrackingCardVM;
	savingsRate: SavingsRateCardVM;
	householdSplit: HouseholdSplitCardVM;
	cashFlow: CashFlowCardVM;
}

// ---------------------------------------------------------------------------
// Deep dive

export interface CalendarDayVM {
	date: string;
	pnlPercent: string;
	positive: boolean;
}

export interface StockSummaryVM {
	symbol: string;
	marketValue: string;
	unrealizedPnlPercent: string;
	positive: boolean;
}

export interface DeepDiveReportVM {
	title: string;
	description: string;
	dataAvailable: boolean;
	calendar: CalendarDayVM[];
	sectors: AllocationRowVM[];
	stocks: StockSummaryVM[];
}

export const statPillValueClassLocal = (positive: boolean) => (positive ? 'command-metric-value is-positive' : 'command-metric-value');

// ---------------------------------------------------------------------------
// Advanced reporting (internal/api/portfolio_reporting.go)

export interface ReportPageSettings {
	size: string;
	orientation: string;
	showPageNumbers: boolean;
	showGeneratedAt: boolean;
}

export interface ReportBlockSettings {
	visualization: string;
	showLegend: boolean;
	showDetails: boolean;
	showSourceURLs: boolean;
}

export interface ReportBlock {
	id: string;
	kind: string;
	title: string;
	portfolioIds: string[];
	settings: ReportBlockSettings;
	isVisible: boolean;
	pageBreakBefore: boolean;
}

export interface ReportTemplateInput {
	name: string;
	description?: string;
	theme: string;
	pageSettings: ReportPageSettings;
	blocks: ReportBlock[];
}

export interface AdvancedReportTemplate {
	id: string;
	input: ReportTemplateInput;
	revision: number;
	createdAt: string;
}

export interface ReportRecurrence {
	frequency: string;
	timeZone: string;
	localTime: string;
	weekday?: number;
	dayOfMonth?: number;
	anchorMonth?: number;
}

export interface ReportScheduleInput {
	name: string;
	templateId: string;
	outputFormats: string[];
	recurrence: ReportRecurrence;
	recipientUserIds: string[];
	isEnabled: boolean;
}

export interface AdvancedReportSchedule {
	id: string;
	input: ReportScheduleInput;
	nextRunAt: string;
	lastRunAt: string;
	pausedReason: string;
}

export interface ReportArtifact {
	id: string;
	format: string;
	filename: string;
	sizeBytes: number;
	expiresAt: string;
}

export interface AdvancedReportRun {
	id: string;
	templateId: string;
	status: string;
	outputFormats: string[];
	failureReason: string;
	artifacts: ReportArtifact[];
	createdAt: string;
}

export interface ReportArtifactLink {
	url: string;
	expiresAt: string;
}

export interface AdvancedPortfolioVM {
	id: string;
	name: string;
	mode: string;
}

export interface AdvancedViewModel {
	templates: AdvancedReportTemplate[];
	schedules: AdvancedReportSchedule[];
	runs: AdvancedReportRun[];
	portfolios: AdvancedPortfolioVM[];
	notice: string;
	error: string;
	isPro: boolean;
}

export function scheduleState(item: AdvancedReportSchedule): string {
	if (item.pausedReason) return 'Paused';
	if (item.nextRunAt) return 'Next ' + item.nextRunAt;
	return 'Disabled';
}
