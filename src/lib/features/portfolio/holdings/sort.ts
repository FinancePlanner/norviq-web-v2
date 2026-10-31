// scripts.js holdingsPage.applySort + the asset filter (x-show), as TanStack
// Table sort/filter functions. Each sort mode is one column whose ascending
// order is Go's comparator, so sorting = [{ id: mode, desc: false }].
import type { PositionRowVM } from './types.js';

export type HoldingsSort = 'name' | 'gains' | 'weight';
export const HOLDINGS_SORT_KEY = 'norviq.holdingsSort';

export function parseHoldingsSort(raw: string | null | undefined): HoldingsSort {
	return raw === 'gains' || raw === 'weight' ? raw : 'name';
}

/** Go read data-gain / data-weight ("%f" strings) back with Number(). */
const num = (v: number) => Number(v.toFixed(6));

export const holdingsComparators: Record<
	HoldingsSort,
	(a: PositionRowVM, b: PositionRowVM) => number
> = {
	name: (a, b) => a.symbol.localeCompare(b.symbol),
	gains: (a, b) => num(b.rawGain) - num(a.rawGain),
	weight: (a, b) => num(b.rawWeight) - num(a.rawWeight)
};

/** positionFilterShow: (filter === 'all' || filter === category) */
export const categoryFilter = (category: string, filter: string) =>
	filter === 'all' || filter === category;
