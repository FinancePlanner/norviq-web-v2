// View models, ported field-for-field from norviq-web
// internal/pages/dashboard/viewmodel.go (camelCased). Shared across the
// dashboard pages; every builder returns plain JSON-serialisable data so it
// can cross from +page.server.ts to the page.

export interface ActivityItemVM {
	title: string;
	subtitle: string;
	relativeTime: string;
	timestamp: string;
	amount: string;
	hasAmount: boolean;
	amountPositive: boolean;
	badgeLabel: string;
	iconKind: string;
	iconTone: string;
	/** Ledger drill-through. Empty means the row is not linkable. */
	href: string;
	/** portfolio | spending | other */
	domain: string;
}

export interface RecentSpendItemVM {
	title: string;
	amount: string;
	date: string;
	pillar: string;
	pillarBadge: string;
}

export interface FinancialHealthVM {
	scoreText: string;
	summaryText: string;
	tone: string;
	ringPercent: number;
	unavailable: boolean;
}

export interface InsightCardVM {
	title: string;
	value: string;
	detail: string;
	iconKind: string;
	tone: string;
}

export interface FocusPointVM {
	id: string;
	title: string;
	isCompleted: boolean;
	isSystem: boolean;
	canToggle: boolean;
	canManage: boolean;
}

export interface HealthMetricsVM {
	savingsRate: string;
	savingsRatePct: number;
	spendingStatus: string;
	spendingOnTrack: boolean;
	budgetRemaining: string;
	budgetRemainingPct: number;
	healthScore: string;
	healthScorePct: number;
	streakDays: number;
	unavailable: boolean;
}

export interface AIInsightHighlightVM {
	label: string;
	value: string;
}

export interface AIInsightCardVM {
	kindLabel: string;
	title: string;
	body: string;
	disclaimer: string;
	highlights: AIInsightHighlightVM[];
	error: string;
}

export interface ActivityPageViewModel {
	activities: ActivityItemVM[];
	recentSpend: RecentSpendItemVM[];
	financialHealth: FinancialHealthVM;
	activitiesError: boolean;
	recentSpendError: boolean;
	financialHealthErr: boolean;
	activityLimit: number;
	hasMoreActivities: boolean;
}

export interface InsightsPageViewModel {
	isPro: boolean;
	financialHealth: FinancialHealthVM;
	insightCards: InsightCardVM[];
	focusPoints: FocusPointVM[];
	insightsError: boolean;
	goalsError: boolean;
}

/** GET /dashboard/insights/ai: the consent prompt, or the three cards. */
export type AIInsightsResult = { consentRequired: true; next: string } | { consentRequired: false; cards: AIInsightCardVM[] };
