import type { components } from './api/schema.js';

// Port of norviq-web internal/billing/pro.go. Feature keys are the backend's
// BillingContextResponse.features keys, so the two cannot drift.

export type BillingContext = components['schemas']['BillingContextResponse'];

export const Feature = {
	Reports: 'reports',
	AIInsights: 'ai_insights',
	Statistics: 'statistics',
	EarningsText: 'earnings_text',
	AdvancedResearch: 'advanced_research',
	PeerComparison: 'peer_comparison',
	MarketFundamentals: 'market_fundamentals',
	TargetAlerts: 'target_alerts',
	YearOverview: 'year_overview',
	SmartSuggestions: 'smart_suggestions',
	Crypto: 'crypto',
	BrokerSync: 'broker_sync',
	BankSync: 'bank_sync',
	HouseholdPartner: 'household_partner',
	RecurringTemplates: 'recurring_templates',
	ValuationCases: 'valuation_cases',
	ScenarioPlanning: 'scenario_planning',
	NetWorthForecasting: 'net_worth_forecasting',
	SmartScreening: 'smart_screening',
	RebalancingRules: 'rebalancing_rules',
	SpreadsheetImport: 'spreadsheet_import',
	ScreenshotImport: 'screenshot_import',
	ReceiptScan: 'receipt_scan',
	TaxOptimization: 'tax_optimization',
	AdvancedPortfolios: 'advanced_portfolios',
	JointPortfolios: 'joint_portfolios',
	AdvancedReportRuns: 'advanced_report_runs',
	MCPAccess: 'mcp_access'
} as const;

export type FeatureKey = (typeof Feature)[keyof typeof Feature];

export function isPro(ctx: BillingContext | null | undefined): boolean {
	if (!ctx) return false;
	if (ctx.isPro || ctx.isPremium) return true;
	const level = (ctx.entitlementLevel ?? '').trim().toLowerCase();
	return level === 'pro' || level.startsWith('pro_') || level === 'temporary';
}

export function isTrialExpired(ctx: BillingContext | null | undefined): boolean {
	return !!ctx?.trialExpired && !isPro(ctx);
}

export function isFeatureAvailable(ctx: BillingContext | null | undefined, key: string): boolean {
	if (isPro(ctx)) return true;
	const f = ctx?.features?.find((x) => x.key.toLowerCase() === key.toLowerCase());
	return !!f?.available;
}

export type FeatureLocked = ((key: string) => boolean) | null;

/** null when entitlement is unknown: then no Pro badges are drawn (pro.go). */
export function featureLockedPredicate(ctx: BillingContext | null | undefined): FeatureLocked {
	if (!ctx) return null;
	return (key) => !!key && !isFeatureAvailable(ctx, key);
}

export function availableFeatures(ctx: BillingContext | null | undefined): Record<string, boolean> {
	return Object.fromEntries(Object.values(Feature).map((k) => [k, isFeatureAvailable(ctx, k)]));
}
