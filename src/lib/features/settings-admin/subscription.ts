import type { components } from '#lib/api/schema.js';
import { isPro, type BillingContext } from '#lib/billing.js';
import { DEFAULT_IOS_APP_STORE_URL, type Config } from '#lib/server/env.js';
import { longDate } from './go-time.js';

// Ports of norviq-web internal/handlers/settings_types.go, the subscription
// parts of settings_data.go and billing.go, internal/billing/catalog.go and
// internal/billing/app_user_id.go.

type PlanOption = components['schemas']['BillingPlanOptionDTO'];

export interface SubscriptionPlanOptionVM {
	title: string;
	subtitle: string;
	productID: string;
	badge: string;
	isCurrent: boolean;
	changeKind: string;
	buttonText: string;
	intervalLabel: string;
}

export interface SubscriptionFeatureRow {
	title: string;
	includedFree: boolean;
	includedPro: boolean;
}

export interface SubscriptionFeatureGroup {
	title: string;
	rows: SubscriptionFeatureRow[];
}

export interface SubscriptionVM {
	isPro: boolean;
	trialExpired: boolean;
	statusLabel: string;
	planLabel: string;
	renewsAt: string;
	accessEndsAt: string;
	trialDaysRemaining: string;
	hasBillingIssue: boolean;
	isCancelledButActive: boolean;
	willRenew: boolean;
	hasPendingPlanChange: boolean;
	pendingPlanLabel: string;
	pendingPlanDate: string;
	planOptions: SubscriptionPlanOptionVM[];
	upgradePlanOptions: SubscriptionPlanOptionVM[];
	downgradePlanOptions: SubscriptionPlanOptionVM[];
	appUserID: string;
	revenueCatAPIKey: string;
	appStoreURL: string;
	canWebCheckout: boolean;
	successMessage: string;
	errorMessage: string;
	couponMessage: string;
	featureGroups: SubscriptionFeatureGroup[];
}

export function emptySubscriptionVM(): SubscriptionVM {
	return {
		isPro: false,
		trialExpired: false,
		statusLabel: '',
		planLabel: '',
		renewsAt: '',
		accessEndsAt: '',
		trialDaysRemaining: '',
		hasBillingIssue: false,
		isCancelledButActive: false,
		willRenew: false,
		hasPendingPlanChange: false,
		pendingPlanLabel: '',
		pendingPlanDate: '',
		planOptions: [],
		upgradePlanOptions: [],
		downgradePlanOptions: [],
		appUserID: '',
		revenueCatAPIKey: '',
		appStoreURL: '',
		canWebCheckout: false,
		successMessage: '',
		errorMessage: '',
		couponMessage: '',
		featureGroups: []
	};
}

const UUID_RE =
	/^(urn:uuid:)?\{?([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})\}?$/i;

/**
 * billing.AppUserID: RevenueCat's app_user_id. UUIDs are canonicalised to
 * uppercase (the casing iOS and the backend use); anything else is verbatim.
 */
export function appUserID(raw: string | null | undefined): string {
	const trimmed = (raw ?? '').trim();
	if (!trimmed) return '';
	const m = UUID_RE.exec(trimmed);
	if (!m) return trimmed;
	return `${m[2]}-${m[3]}-${m[4]}-${m[5]}-${m[6]}`.toUpperCase();
}

export function formatPlanLabel(plan: string | null | undefined): string {
	const raw = plan ?? '';
	switch (raw.trim().toLowerCase()) {
		case 'pro_yearly':
		case 'pro_annual':
			return 'Annual Plan';
		case 'pro_monthly':
			return 'Monthly Plan';
		case 'pro_weekly':
			return 'Weekly Plan';
		case 'pro':
			return 'Pro';
		case 'free':
			return 'Free Plan';
		default:
			return raw === '' ? 'Free Plan' : raw;
	}
}

function subscriptionStatusLabel(ctx: BillingContext | null): string {
	if (!ctx) return 'Unknown';
	if (ctx.isPremium) return ctx.subscription?.isTrial ? 'Pro Trial' : 'Pro Active';
	if (ctx.trialExpired) return 'Trial ended';
	return 'Free Plan';
}

function intervalLabel(interval: string): string {
	switch (interval.trim().toLowerCase()) {
		case 'weekly':
		case 'week':
			return 'per week';
		case 'monthly':
		case 'month':
			return 'per month';
		case 'annual':
		case 'annually':
		case 'year':
		case 'yearly':
			return 'per year';
		default:
			return '';
	}
}

function trialDaysRemaining(until: string): number {
	const remaining = new Date(until).getTime() - Date.now();
	if (!(remaining > 0)) return 0;
	return Math.ceil(remaining / 3_600_000 / 24);
}

// billing.Catalog: presentation only; inclusion comes from the backend.
const CATALOG: { key: string; title: string; watch: 'Wealth' | 'Spending' | 'Intelligence' }[] = [
	{ key: 'holdings', title: 'Holdings and watchlists', watch: 'Wealth' },
	{ key: 'goal_planning', title: 'One active financial goal', watch: 'Wealth' },
	{ key: 'broker_sync', title: 'Broker sync', watch: 'Wealth' },
	{ key: 'target_alerts', title: 'Price, dividend, and earnings alerts', watch: 'Wealth' },
	{ key: 'market_fundamentals', title: 'Fundamentals, statements, and research', watch: 'Wealth' },
	{ key: 'valuation_cases', title: 'Chart builder and projections', watch: 'Wealth' },
	{ key: 'scenario_planning', title: 'Scenario planning', watch: 'Wealth' },
	{ key: 'net_worth_forecasting', title: 'Net worth forecast', watch: 'Wealth' },
	{ key: 'smart_screening', title: 'Smart watchlist screens', watch: 'Wealth' },
	{ key: 'rebalancing_rules', title: 'Rebalancing rules', watch: 'Wealth' },
	{ key: 'advanced_portfolios', title: 'Retirement and hypothetical portfolios', watch: 'Wealth' },
	{ key: 'crypto', title: 'Crypto', watch: 'Wealth' },
	{ key: 'expense_planner', title: 'Core budgets and expenses', watch: 'Spending' },
	{ key: 'bank_sync', title: 'Read-only bank sync', watch: 'Spending' },
	{ key: 'receipt_scan', title: 'Receipt scanning', watch: 'Spending' },
	{ key: 'household_partner', title: 'Household split view', watch: 'Spending' },
	{ key: 'recurring_templates', title: 'Recurring expense templates', watch: 'Spending' },
	{ key: 'year_overview', title: 'Year-over-year expense history', watch: 'Spending' },
	{ key: 'smart_suggestions', title: 'Smart spending suggestions', watch: 'Spending' },
	{ key: 'reports', title: 'Basic reports', watch: 'Intelligence' },
	{ key: 'ai_insights', title: 'AI assistant and insights', watch: 'Intelligence' },
	{ key: 'mcp_access', title: 'MCP integrations', watch: 'Intelligence' },
	{ key: 'tax_optimization', title: 'Tax strategy', watch: 'Intelligence' },
	{ key: 'advanced_report_runs', title: 'Advanced and scheduled reports', watch: 'Intelligence' }
];

function subscriptionFeatureGroups(ctx: BillingContext | null): SubscriptionFeatureGroup[] {
	if (!ctx) return [];
	const groups: SubscriptionFeatureGroup[] = [];
	for (const watch of ['Wealth', 'Spending', 'Intelligence'] as const) {
		const rows: SubscriptionFeatureRow[] = [];
		for (const row of CATALOG.filter((r) => r.watch === watch)) {
			const feature = ctx.features?.find((f) => f.key.toLowerCase() === row.key.toLowerCase());
			if (!feature) continue; // IncludedInFree: unknown key → drop the row
			const includedFree = !feature.requiredPlan || feature.requiredPlan.trim() === '';
			rows.push({ title: row.title || feature.title, includedFree, includedPro: true });
		}
		if (rows.length > 0) groups.push({ title: watch, rows });
	}
	return groups;
}

function planRank(plan: string): number {
	switch (plan.trim().toLowerCase()) {
		case 'pro_weekly':
			return 1;
		case 'pro_monthly':
			return 2;
		case 'pro_yearly':
		case 'pro_annual':
			return 3;
		default:
			return 0;
	}
}

const isAnnualPlan = (plan: string) =>
	['pro_yearly', 'pro_annual'].includes(plan.trim().toLowerCase());

function fallbackPlanOptions(currentPlan: string, isPremium: boolean): PlanOption[] {
	const descriptors: PlanOption[] = [
		{
			productId: 'pro_weekly',
			plan: 'pro_weekly',
			displayName: 'Weekly',
			interval: 'weekly',
			rank: 1,
			isCurrent: currentPlan === 'pro_weekly',
			changeKind: 'subscribe'
		},
		{
			productId: 'pro_monthly',
			plan: 'pro_monthly',
			displayName: 'Monthly',
			interval: 'monthly',
			rank: 2,
			badge: 'Better value',
			isCurrent: currentPlan === 'pro_monthly',
			changeKind: 'subscribe'
		},
		{
			productId: 'pro_yearly',
			plan: 'pro_yearly',
			displayName: 'Annual',
			interval: 'annual',
			rank: 3,
			badge: 'Best value',
			isCurrent: isAnnualPlan(currentPlan),
			changeKind: 'subscribe'
		}
	];
	const currentRank = planRank(currentPlan);
	for (const d of descriptors) {
		if (d.isCurrent) d.changeKind = 'current';
		else if (!isPremium) d.changeKind = 'subscribe';
		else if (currentRank > 0 && d.rank > currentRank) d.changeKind = 'upgrade';
		else if (currentRank > 0 && d.rank < currentRank) d.changeKind = 'downgrade';
		else d.changeKind = 'subscribe';
	}
	return descriptors;
}

function planOptionSubtitle(plan: string, changeKind: string): string {
	if (changeKind === 'upgrade') return 'Upgrade and keep access on your current account.';
	switch (plan.trim().toLowerCase()) {
		case 'pro_yearly':
		case 'pro_annual':
			return 'Best long-term value.';
		case 'pro_monthly':
			return 'Flexible monthly billing.';
		case 'pro_weekly':
			return 'Short-term access.';
		default:
			return 'Pro access.';
	}
}

const normalizeBillingProductID = (id: string) =>
	id.trim().toLowerCase() === 'pro_annual' ? 'pro_yearly' : id;

function planOptionButtonText(displayName: string, changeKind: string): string {
	switch (changeKind) {
		case 'upgrade':
			return 'Switch to ' + displayName;
		case 'current':
			return 'Current plan';
		default:
			return 'Subscribe';
	}
}

function subscriptionPlanOptionVMs(
	ctx: BillingContext,
	...allowedKinds: string[]
): SubscriptionPlanOptionVM[] {
	const options = ctx.planOptions?.length
		? ctx.planOptions
		: fallbackPlanOptions(ctx.plan, ctx.isPremium);
	const cards: SubscriptionPlanOptionVM[] = [];
	for (const option of options) {
		const changeKind = String(option.changeKind ?? '').trim();
		if (allowedKinds.length > 0 && !allowedKinds.includes(changeKind)) continue;
		const plan = normalizeBillingProductID(option.plan);
		cards.push({
			title: option.displayName,
			subtitle: planOptionSubtitle(plan, changeKind),
			productID: normalizeBillingProductID(option.productId),
			badge: option.badge ?? '',
			isCurrent: option.isCurrent,
			changeKind,
			buttonText: planOptionButtonText(option.displayName, changeKind),
			intervalLabel: intervalLabel(String(option.interval ?? ''))
		});
	}
	return cards;
}

/** hydrateSubscriptionVMFromContext */
export function hydrateSubscriptionVM(vm: SubscriptionVM, ctx: BillingContext | null): void {
	if (vm.featureGroups.length === 0) vm.featureGroups = subscriptionFeatureGroups(ctx);
	if (!ctx) return;
	vm.statusLabel = subscriptionStatusLabel(ctx);
	vm.trialExpired = !!ctx.trialExpired && !ctx.isPremium;
	vm.planLabel = formatPlanLabel(ctx.plan);
	vm.planOptions = subscriptionPlanOptionVMs(ctx, 'subscribe');
	vm.upgradePlanOptions = subscriptionPlanOptionVMs(ctx, 'upgrade');
	vm.downgradePlanOptions = subscriptionPlanOptionVMs(ctx, 'downgrade');
	const sub = ctx.subscription;
	if (!sub) return;
	vm.renewsAt = longDate(sub.renewsOrExpiresAt);
	vm.accessEndsAt = longDate(sub.accessEndsAt) || longDate(sub.periodEndsAt);
	vm.hasBillingIssue = sub.hasBillingIssue;
	vm.isCancelledButActive = sub.isCancelledButActive;
	if (sub.willRenew !== undefined && sub.willRenew !== null) vm.willRenew = sub.willRenew;
	if (sub.pendingPlan && sub.pendingPlan.trim() !== '') {
		vm.hasPendingPlanChange = true;
		vm.pendingPlanLabel = formatPlanLabel(sub.pendingPlan);
		vm.pendingPlanDate = longDate(sub.pendingPlanEffectiveAt);
	}
	if (sub.isTrial && sub.trialEndsAt) {
		const days = trialDaysRemaining(sub.trialEndsAt);
		if (days > 0) vm.trialDaysRemaining = String(days);
	}
}

/** LoadSubscriptionVM, minus the billing fetch (the caller passes the context). */
export function subscriptionVM(
	cfg: Config,
	userID: string | undefined,
	billing: BillingContext | null,
	query: URLSearchParams
): SubscriptionVM {
	const vm = emptySubscriptionVM();
	vm.appStoreURL = cfg.iosAppStoreURL || DEFAULT_IOS_APP_STORE_URL;
	vm.revenueCatAPIKey = cfg.revenueCatWebAPIKey.trim();
	vm.canWebCheckout = vm.revenueCatAPIKey !== '';
	vm.appUserID = appUserID(userID);
	if (!billing) {
		vm.errorMessage = 'Could not load subscription status.';
		return vm;
	}
	vm.isPro = isPro(billing);
	hydrateSubscriptionVM(vm, billing);
	if ((query.get('upgraded') ?? '').trim() === '1')
		vm.successMessage = 'Subscription synced successfully.';
	if ((query.get('manage_error') ?? '').trim() === '1') {
		vm.errorMessage =
			'Could not open subscription management. Try restoring purchases, then try again.';
	}
	return vm;
}

const ALLOWED_BILLING_HOSTS = new Set([
	'apps.apple.com',
	'billing.revenuecat.com',
	'pay.rev.cat',
	'billing.stripe.com'
]);

/** safeBillingRedirect: HTTPS billing-portal hosts only. */
export function safeBillingRedirect(raw: string | null | undefined): string | null {
	let parsed: URL;
	try {
		parsed = new URL((raw ?? '').trim());
	} catch {
		return null;
	}
	if (parsed.protocol !== 'https:' || !parsed.host) return null;
	if (!ALLOWED_BILLING_HOSTS.has(parsed.hostname.toLowerCase().replace(/\.$/, ''))) return null;
	return parsed.toString();
}
