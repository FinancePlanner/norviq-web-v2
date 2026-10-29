// Insights view-model builders. Ports of norviq-web
// internal/handlers/dashboard_data.go: mapFinancialHealth,
// financialHealthStatusLabel, financialHealthTone, mapInsightCards,
// mapFocusPoints, focusPointSortKey, focusPointsTeaser. Pure.

import type { components } from '#lib/api/schema.js';
import { formatCurrency, formatFloat } from '#lib/format.js';
import { clampPercent } from '../shared.js';
import type { FinancialHealthVM, FocusPointVM, InsightCardVM } from '../types.js';

export type DashboardInsights = components['schemas']['DashboardInsightsResponse'];
export type FinancialHealth = components['schemas']['DashboardFinancialHealthDTO'];
export type Goal = components['schemas']['GoalResponse'];

export const focusTeaserLimit = 3;

export function mapFinancialHealth(health: FinancialHealth | null | undefined): FinancialHealthVM {
	if (!health) {
		return { scoreText: '--', summaryText: '--/100 - Unavailable', tone: 'neutral', ringPercent: 0, unavailable: true };
	}
	const score = Math.trunc(health.score);
	const max = Math.trunc(health.maxScore);
	return {
		scoreText: String(score),
		summaryText: `${score}/${max} - ${financialHealthStatusLabel(health.status)}`,
		tone: financialHealthTone(health.status),
		ringPercent: max > 0 ? clampPercent((score / max) * 100) : 0,
		unavailable: false
	};
}

export function financialHealthStatusLabel(status: string): string {
	switch (status) {
		case 'atRisk':
			return 'At Risk';
		case 'needsAttention':
			return 'Needs Attention';
		case 'healthy':
			return 'Healthy';
		case 'excellent':
			return 'Excellent';
		default:
			return 'Unknown';
	}
}

export function financialHealthTone(status: string): string {
	switch (status) {
		case 'healthy':
		case 'excellent':
			return 'success';
		case 'needsAttention':
			return 'warning';
		case 'atRisk':
			return 'critical';
		default:
			return 'neutral';
	}
}

export function mapInsightCards(insights: DashboardInsights | null | undefined): InsightCardVM[] {
	if (!insights) return [];
	return [
		{
			title: 'Savings rate',
			value: `${formatFloat(insights.savingsRate, 0)}%`,
			detail: 'Planned vs actual',
			iconKind: 'savings',
			tone: 'success'
		},
		{
			title: 'Budget streak',
			value: `${Math.trunc(insights.budgetStreak)} mo`,
			detail: 'Under spending plan',
			iconKind: 'streak',
			tone: 'warning'
		},
		{
			title: 'Watchlist',
			value: String(Math.trunc(insights.watchlistCount)),
			detail: 'Tracked symbols',
			iconKind: 'watchlist',
			tone: 'indigo'
		},
		{
			title: 'Cash buffer',
			value: formatCurrency(insights.cashBuffer),
			detail: 'Liquid reserve',
			iconKind: 'cash',
			tone: 'blue'
		}
	];
}

const focusPointSortKey = (g: Goal) => (g.status === 'pending' ? 0 : 1);

/** Pending first (Go's in-place swap sort, kept for tie order); system goals are read-only. */
export function mapFocusPoints(goals: Goal[] | null | undefined): FocusPointVM[] {
	if (!goals || goals.length === 0) return [];
	const sorted = [...goals];
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			if (focusPointSortKey(sorted[i]) > focusPointSortKey(sorted[j])) [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
		}
	}
	return sorted.map((g) => {
		const isSystem = g.statusUpdatedBy === 'system';
		return {
			// Go printed the parsed uuid.UUID, which is lowercase.
			id: g.id.toLowerCase(),
			title: g.title,
			isCompleted: g.status === 'completed',
			isSystem,
			canToggle: !isSystem,
			canManage: !isSystem
		};
	});
}

export function focusPointsTeaser(points: FocusPointVM[]): FocusPointVM[] {
	return points.length <= focusTeaserLimit ? points : points.slice(0, focusTeaserLimit);
}
