// Activity + recent-spend view-model builders. Ports of norviq-web
// internal/handlers/dashboard_data.go: mapActivities, activityBadge,
// activityIconKind, tickerFromActivityTitle, mapRecentSpend,
// pillarBadge, initials. Pure: safe to call on the server and in the browser
// (the 60s activity poll maps /api/v1/activities with the same code).
//
// DS 2.0 P1 (spec § 2.0 A7, A11): amounts are in the account currency and the
// app locale, and every event in this feed is neutral. A buy is not a gain and
// an edit is not a loss: green and red are kept for realised P/L, which this
// feed does not carry. The sign comes from what the event means.

import type { components } from '#lib/api/schema.js';
import { money, type AppLocale } from '#lib/money.js';
import { resolvePillar } from '../pillars.js';
import { goFormat, parseTime, relativeTimeSince } from '../shared.js';
import type { ActivityItemVM, RecentSpendItemVM } from '../types.js';

export type UserActivity = components['schemas']['UserActivityResponse'];
export type Expense = components['schemas']['ExpenseResponse'];

/** dashboard_data.go constants. */
export const overviewActivityLimit = 5;
export const activityPageDefaultLimit = 20;
export const activityPageMaxLimit = 100;
export const activityPageStep = 20;
export const recentSpendLimit = 3;

/** How amounts are printed: the account's currency (null when unknown, never USD) and the app locale. */
export interface MoneyOpts {
	currency: string | null;
	locale: AppLocale;
	now: Date;
}

/** The signed amount of an event: expenses are outflows; holding events keep their own sign. */
function eventAmount(type: UserActivity['type'], amount: number): number {
	return type === 'expense_recorded' || type === 'expense_updated' ? -Math.abs(amount) : amount;
}

export function mapActivities(
	items: UserActivity[] | null | undefined,
	opts: MoneyOpts
): ActivityItemVM[] {
	const { currency, locale, now } = opts;
	const out: ActivityItemVM[] = [];
	for (const a of items ?? []) {
		const created = parseTime(a.createdAt);
		const item: ActivityItemVM = {
			title: a.title ?? '',
			subtitle: a.subtitle ?? '',
			relativeTime: created ? relativeTimeSince(created, now) : '',
			timestamp: created ? goFormat(created, 'Jan 2, 3:04 PM') : '',
			amount: '',
			hasAmount: false,
			amountPositive: !!a.isGrowth,
			tone: 'neutral',
			badgeLabel: activityBadge(a.symbol ?? '', a.type, a.title ?? ''),
			iconKind: activityIconKind(a.symbol ?? '', a.type),
			iconTone: 'neutral',
			// Go's mapActivities never sets Href/Domain (only the ledger does).
			href: '',
			domain: ''
		};
		if (a.amount != null && a.amount !== 0) {
			const signed = eventAmount(a.type, a.amount);
			item.hasAmount = true;
			item.amountPositive = signed > 0;
			item.amount = money(signed, currency, locale);
		}
		out.push(item);
	}
	return out;
}

export function activityBadge(symbol: string, activityType: string, title: string): string {
	const badge = tickerFromActivityTitle(title);
	if (badge) return badge;
	switch (activityType) {
		case 'stock_added':
		case 'stock_updated':
			return 'EQ';
		case 'expense_recorded':
		case 'expense_updated':
			return 'EXP';
	}
	switch (symbol) {
		case 'newspaper.fill':
		case 'newspaper':
			return 'NW';
		case 'pencil.circle.fill':
		case 'pencil':
			return 'ED';
		default:
			return '-';
	}
}

export function activityIconKind(symbol: string, activityType: string): string {
	switch (activityType) {
		case 'stock_added':
		case 'stock_updated':
			return 'portfolio';
		case 'expense_recorded':
		case 'expense_updated':
			return 'expense';
	}
	switch (symbol) {
		case 'newspaper.fill':
		case 'newspaper':
			return 'news';
		default:
			return 'default';
	}
}

/** The last word of the title, when it looks like a ticker (1-5 of A-Z0-9). */
export function tickerFromActivityTitle(title: string): string {
	const words = title.split(/\s+/).filter(Boolean);
	if (words.length === 0) return '';
	const candidate = words[words.length - 1].replace(/^[.,;:]+|[.,;:]+$/g, '').toUpperCase();
	const bytes = new TextEncoder().encode(candidate).length;
	if (bytes < 1 || bytes > 5) return '';
	if (!/^[A-Z0-9]+$/.test(candidate)) return '';
	return candidate;
}

/**
 * The three newest expenses of the current month (UTC), by occurredOn (Go's
 * in-place swap sort, kept for tie order). An older expense is not "recent
 * spend" this month, so it is left out rather than shown as current.
 */
export function mapRecentSpend(
	expenses: Expense[] | null | undefined,
	opts: MoneyOpts
): RecentSpendItemVM[] {
	if (!expenses || expenses.length === 0) return [];
	const { currency, locale, now } = opts;
	const time = (e: Expense) => parseTime(e.occurredOn)?.getTime() ?? Number.NEGATIVE_INFINITY;
	const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
	const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
	const sorted = expenses.filter((e) => time(e) >= monthStart && time(e) < nextMonth);
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			if (time(sorted[j]) > time(sorted[i])) [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
		}
	}
	return sorted.slice(0, recentSpendLimit).map((e) => {
		const occurred = parseTime(e.occurredOn);
		return {
			title: e.title,
			amount: money(-Math.abs(e.amount), currency, locale),
			date: occurred ? goFormat(occurred, 'Jan 2') : '',
			pillar: e.pillar,
			pillarBadge: pillarBadge(e.pillar)
		};
	});
}

/** Two-letter pillar shorthand; custom pillars get their own initials. */
export function pillarBadge(pillar: string): string {
	const def = resolvePillar(pillar);
	switch (def.key) {
		case 'fundamentals':
			return 'F';
		case 'futureYou':
			return 'FY';
		case 'fun':
			return 'N';
	}
	return initials(def.label).toUpperCase();
}

/** Up to two leading letters, so "Side hustle" reads as "SH". */
export function initials(label: string): string {
	const fields = label.split(/\s+/).filter(Boolean);
	switch (fields.length) {
		case 0:
			return 'E';
		case 1:
			return fields[0].length >= 2 ? fields[0].slice(0, 2) : fields[0];
		default:
			return fields[0][0] + fields[1][0];
	}
}
