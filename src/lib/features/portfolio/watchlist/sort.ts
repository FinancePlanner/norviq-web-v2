// scripts.js watchlistPage.applySort, as TanStack Table sort functions. Each
// sort mode is one column whose ascending order is exactly Go's comparator,
// so sorting = [{ id: mode, desc: false }] reproduces the old DOM reorder.
import type { WatchlistRowVM } from './types.js';

export type WatchlistSort = 'name' | 'gains' | 'weight';
export const WATCHLIST_SORT_KEY = 'norviq.watchlistSort';

export function parseWatchlistSort(raw: string | null | undefined): WatchlistSort {
	return raw === 'gains' || raw === 'weight' ? raw : 'name';
}

/** Go read dataset values back with Number(); data-gain etc. were "%f" strings. */
const num = (v: number) => Number(v.toFixed(6));

export const watchlistComparators: Record<WatchlistSort, (a: WatchlistRowVM, b: WatchlistRowVM) => number> = {
	name: (a, b) => a.symbol.localeCompare(b.symbol),
	gains: (a, b) => {
		// Unheld symbols have no portfolio gains — keep them after held rows.
		if (a.isHeld !== b.isHeld) return a.isHeld ? -1 : 1;
		if (a.isHeld) {
			const gainDiff = num(b.rawGain) - num(a.rawGain);
			if (gainDiff !== 0) return gainDiff;
		}
		return num(b.rawDayChangePct) - num(a.rawDayChangePct);
	},
	weight: (a, b) => {
		if (a.isHeld !== b.isHeld) return a.isHeld ? -1 : 1;
		return num(b.rawWeight) - num(a.rawWeight);
	}
};
