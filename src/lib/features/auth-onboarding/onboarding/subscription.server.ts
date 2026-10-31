// The slice of handlers.LoadSubscriptionVM the onboarding paywall reads
// (settings_data.go + settings_types.go). The settings port has the full VM;
// this one only fills RevenueCat keys, CanWebCheckout, AppStoreURL and the
// "subscribe" plan cards.
import type { RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/env.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import type { BillingContext } from '#lib/billing.js';

export interface PlanOptionVM {
	title: string;
	subtitle: string;
	productId: string;
	badge: string;
	isCurrent: boolean;
	changeKind: string;
	buttonText: string;
	intervalLabel: string;
}

export interface PaywallVM {
	revenueCatAPIKey: string;
	appUserId: string;
	canWebCheckout: boolean;
	appStoreURL: string;
	planOptions: PlanOptionVM[];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** billing.AppUserID: UUIDs uppercased (RevenueCat customers were created by iOS), anything else verbatim. */
export function appUserID(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	return uuidPattern.test(trimmed) ? trimmed.toUpperCase() : trimmed;
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

const normalizeProductID = (id: string) =>
	id.trim().toLowerCase() === 'pro_annual' ? 'pro_yearly' : id;
const isAnnualPlan = (plan: string) =>
	['pro_yearly', 'pro_annual'].includes(plan.trim().toLowerCase());

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

type PlanOption = NonNullable<BillingContext['planOptions']>[number];

function fallbackPlanOptions(currentPlan: string, isPremium: boolean): PlanOption[] {
	const d: PlanOption[] = [
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
	for (const o of d) {
		if (o.isCurrent) o.changeKind = 'current';
		else if (!isPremium) o.changeKind = 'subscribe';
		else if (currentRank > 0 && o.rank > currentRank) o.changeKind = 'upgrade';
		else if (currentRank > 0 && o.rank < currentRank) o.changeKind = 'downgrade';
		else o.changeKind = 'subscribe';
	}
	return d;
}

/** subscriptionPlanOptionVMs(ctx, ...allowedKinds) */
export function subscriptionPlanOptionVMs(
	ctx: BillingContext | null,
	...allowedKinds: string[]
): PlanOptionVM[] {
	if (!ctx) return [];
	const allowed = new Set(allowedKinds);
	let options = (ctx.planOptions ?? []) as PlanOption[];
	if (options.length === 0) options = fallbackPlanOptions(ctx.plan ?? '', !!ctx.isPremium);
	const cards: PlanOptionVM[] = [];
	for (const o of options) {
		const changeKind = String(o.changeKind ?? '').trim();
		if (allowed.size > 0 && !allowed.has(changeKind)) continue;
		cards.push({
			title: o.displayName,
			subtitle: planOptionSubtitle(normalizeProductID(o.plan), changeKind),
			productId: normalizeProductID(o.productId),
			isCurrent: o.isCurrent,
			changeKind,
			buttonText: planOptionButtonText(o.displayName, changeKind),
			intervalLabel: intervalLabel(String(o.interval ?? '')),
			badge: o.badge ?? ''
		});
	}
	return cards;
}

export async function loadPaywallVM(event: RequestEvent): Promise<PaywallVM> {
	const cfg = config();
	const key = cfg.revenueCatWebAPIKey.trim();
	const billing = await loadBillingContext(event);
	return {
		revenueCatAPIKey: key,
		canWebCheckout: key !== '',
		appStoreURL: cfg.iosAppStoreURL,
		appUserId: appUserID(event.locals.session.auth?.userId ?? ''),
		// LoadSubscriptionVM stops before the plan cards when the billing
		// context is missing; subscriptionPlanOptionVMs(nil) is empty too.
		planOptions: subscriptionPlanOptionVMs(billing, 'subscribe')
	};
}
