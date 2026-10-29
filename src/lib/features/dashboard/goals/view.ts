// Port of norviq-web internal/pages/goals/viewmodel.go plus the helper funcs at
// the bottom of page.templ. Formatting is Go's fmt verbs, reproduced with
// formatFloat (= %.Nf) so the numbers match the Go page character for character.
import { formatFloat } from '#lib/format.js';
import type {
	GoalsPageViewModel,
	PlanningGoalOverview,
	PlanningGoalTrajectoryPoint
} from './types.js';

/** formatNumber: %.0f with a comma every three digits from the right. */
export function formatNumber(value: number): string {
	let text = formatFloat(value, 0);
	// Same loop as Go, including its quirk for short negatives ("-,123").
	for (let index = text.length - 3; index > 0; index -= 3) {
		text = text.slice(0, index) + ',' + text.slice(index);
	}
	return text;
}

export function money(value: number, currency: string): string {
	return `${(currency ?? '').toUpperCase()} ${formatNumber(value)}`;
}

export function percent(value: number): string {
	return `${formatFloat(value * 100, 0)}%`;
}

export function driftLabel(state: string, months: number | null | undefined): string {
	const has = months !== null && months !== undefined;
	switch (state) {
		case 'ahead':
			return has ? `${-months!} months ahead` : 'Ahead';
		case 'behind':
			return has ? `${months} months behind` : 'Behind';
		case 'complete':
			return 'Complete';
		case 'on_track':
			return 'On track';
		default:
			return 'Building baseline';
	}
}

export function driftClass(state: string): string {
	switch (state) {
		case 'behind':
			return 'text-amber-600 dark:text-amber-300';
		case 'ahead':
		case 'complete':
		case 'on_track':
			return 'text-emerald-600 dark:text-emerald-300';
		default:
			return 'opacity-60';
	}
}

export function trajectoryPoints(points: PlanningGoalTrajectoryPoint[] | null | undefined, projected: boolean): string {
	if (!points || points.length === 0) return '';
	const valueOf = (p: PlanningGoalTrajectoryPoint) => (projected ? p.projectedValue : p.plannedValue);
	let maximum = 1.0;
	for (const point of points) maximum = Math.max(maximum, valueOf(point));
	const span = Math.max(1, points.length - 1);
	return points
		.map((point, index) => {
			const x = (index / span) * 1000;
			const y = 260 - (valueOf(point) / maximum) * 240;
			return `${formatFloat(x, 1)},${formatFloat(y, 1)}`;
		})
		.join(' ');
}

export function sampled(points: PlanningGoalTrajectoryPoint[] | null | undefined): PlanningGoalTrajectoryPoint[] {
	const all = points ?? [];
	if (all.length <= 24) return all;
	const step = Math.max(1, Math.trunc(all.length / 24));
	const result: PlanningGoalTrajectoryPoint[] = [];
	for (let index = 0; index < all.length; index += step) result.push(all[index]);
	if (result[result.length - 1].date !== all[all.length - 1].date) result.push(all[all.length - 1]);
	return result;
}

/** style="width: …" of the funded bar: fmt "%.2f%%" of min(100, pct*100). */
export function fundedWidth(percentComplete: number): string {
	return `width: ${formatFloat(Math.min(100, percentComplete * 100), 2)}%`;
}

export function firstCurrency(vm: Pick<GoalsPageViewModel, 'overview'>): string {
	const items = vm.overview.items ?? [];
	return items.length > 0 ? items[0].goal.baseCurrency : 'USD';
}

export function activeCount(value: PlanningGoalOverview): string {
	if (value.activeGoalLimit !== null && value.activeGoalLimit !== undefined) {
		return `${value.activeGoalCount} / ${value.activeGoalLimit}`;
	}
	return `${value.activeGoalCount} · Pro`;
}

/** The free-tier limit check used by the "New goal" button and the notice. */
export function atGoalLimit(value: PlanningGoalOverview): boolean {
	return (
		!value.isPro &&
		value.activeGoalLimit !== null &&
		value.activeGoalLimit !== undefined &&
		value.activeGoalCount >= value.activeGoalLimit
	);
}
