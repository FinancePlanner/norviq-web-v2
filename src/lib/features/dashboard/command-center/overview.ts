// Pure helpers from norviq-web pages/dashboard/overview.templ,
// wealth_card.templ, command_center.templ and viewmodel.go.

import type { ActionGroupVM, ActionItemVM, OverviewViewModel } from './types.js';

export interface OverviewAttentionVM {
	show: boolean;
	tone: string;
	label: string;
	title: string;
	description: string;
	metricPositive: boolean | null;
	metricSuffix: string;
	actionLabel: string;
	actionHref: string;
	secondary: string;
}

const none: OverviewAttentionVM = {
	show: false,
	tone: '',
	label: '',
	title: '',
	description: '',
	metricPositive: null,
	metricSuffix: '',
	actionLabel: '',
	actionHref: '',
	secondary: ''
};

export function showOverviewSetup(vm: OverviewViewModel): boolean {
	return !vm.wealthChart && vm.recentSpend.length === 0 && vm.focusPoints.length === 0;
}

function overviewMetricParts(raw: string, suffix: string): [string, string] {
	const metric = raw.trim();
	const s = suffix.trim();
	if (!s || !metric.endsWith(s)) return [metric, ''];
	return [metric.slice(0, metric.length - s.length).trim(), s];
}

export function overviewAttention(vm: OverviewViewModel): OverviewAttentionVM {
	const e = vm.loadErrors;
	if (e.dashboard || e.reports || e.performance) {
		return {
			...none,
			show: true,
			tone: 'warning',
			label: 'Data delayed',
			title: 'Some overview sections are using partial data.',
			description:
				'Portfolio, reports, or chart data did not fully load. Your saved data is still intact.',
			actionLabel: 'Reload overview',
			actionHref: '/dashboard'
		};
	}
	if (showOverviewSetup(vm)) {
		return {
			...none,
			show: true,
			tone: 'setup',
			label: 'Next best action',
			title: 'Finish setup to make this dashboard useful.',
			description:
				'Start with one holding and one expense so Norviq can connect portfolio movement with cash-flow habits.',
			actionLabel: 'Add holding',
			actionHref: '/portfolio?add=position'
		};
	}
	if (vm.portfolioPeriodPercent) {
		const [metric, suffix] = overviewMetricParts(
			vm.portfolioPeriodPercent,
			vm.portfolioPeriodSuffix
		);
		return {
			...none,
			show: true,
			tone: 'portfolio',
			label: 'Portfolio movement',
			title: 'Your portfolio moved.',
			description: metric,
			metricPositive: vm.portfolioPeriodPositive,
			metricSuffix: suffix,
			actionLabel: 'Open portfolio',
			actionHref: '/portfolio'
		};
	}
	if (vm.spendingPeriodPercent) {
		const [metric, suffix] = overviewMetricParts(vm.spendingPeriodPercent, 'vs last month');
		return {
			...none,
			show: true,
			tone: 'spending',
			label: 'Spending movement',
			title: 'Monthly spending changed.',
			description: metric,
			metricPositive: vm.spendingPeriodPositive,
			metricSuffix: suffix,
			actionLabel: 'Review expenses',
			actionHref: '/expenses'
		};
	}
	return none;
}

export function overviewLiquidity(vm: OverviewViewModel): string {
	for (const card of vm.insightCards)
		if (card.title === 'Cash buffer' && card.value) return card.value;
	if (vm.healthMetrics.budgetRemaining && vm.healthMetrics.budgetRemaining !== '-')
		return vm.healthMetrics.budgetRemaining;
	return '';
}

/** commandGreeting: one text node. */
export function commandGreeting(vm: OverviewViewModel): string {
	return vm.username ? `${vm.greeting}, ${vm.username}.` : vm.greeting;
}

const actionGroupThreshold = 3;

export function groupedActionQueue(items: ActionItemVM[]): ActionGroupVM[] {
	const groups: ActionGroupVM[] = [];
	for (const item of items) {
		const last = groups[groups.length - 1];
		if (last && last.kind === item.kind) {
			last.items.push(item);
			continue;
		}
		groups.push({ kind: item.kind, kindLabel: item.kindLabel, tone: item.tone, items: [item] });
	}
	return groups;
}

export const groupCollapsed = (g: ActionGroupVM) => g.items.length >= actionGroupThreshold;

export function groupSummaryTitle(g: ActionGroupVM): string {
	if (g.items.length === 0) return '';
	const shared = g.items[0].title;
	if (g.items.slice(1).some((i) => i.title !== shared))
		return `${g.items.length} ${g.kindLabel.toLowerCase()} alerts`;
	return `${shared} · ${g.items.length}`;
}
