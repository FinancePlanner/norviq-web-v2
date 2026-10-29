// View models for /portfolio/watchlist (pages/portfolio/viewmodel.go).
import type { SentimentBadgeVM } from '#lib/components/norviq/sentiment.js';
import type { SentimentRollupVM } from '../sentiment.js';

/** WatchlistListVM — one theme in the sidebar. */
export interface WatchlistListVM {
	id: string;
	name: string;
	isDefault: boolean;
	canDelete: boolean;
	active: boolean;
	href: string;
}

/** The price cells a quote refresh replaces (WatchlistQuote). */
export interface WatchlistQuoteVM {
	id: string;
	price: string;
	netChg: string;
	changePercent: string;
	changePositive: boolean;
	open: string;
	prevClose: string;
	high: string;
	low: string;
}

/** WatchlistRowVM — one symbol row. */
export interface WatchlistRowVM extends WatchlistQuoteVM {
	symbol: string;
	sentiment: SentimentBadgeVM;
	note: string;
	rawDayChangePct: number;
	rawGain: number;
	rawWeight: number;
	isHeld: boolean;
	weightLabel: string;
	/** Daily closes for the sparkline; the page builds the chart (id below). */
	sparkline: number[] | null;
	sparklineID: string;
	detailURL: string;
	volume: string;
}

/** WatchlistViewModel */
export interface WatchlistViewModel {
	sentiment: SentimentRollupVM;
	lists: WatchlistListVM[];
	selectedListID: string;
	rows: WatchlistRowVM[];
	loadError: boolean;
}

/** WatchlistSearchResultVM */
export interface WatchlistSearchResultVM {
	symbol: string;
	name: string;
	exchange: string;
}

/** WatchlistItemEditVM */
export interface WatchlistItemEditVM {
	itemID: string;
	listID: string;
	symbol: string;
	note: string;
}

/** ListFormVM */
export interface ListFormVM {
	listID: string;
	name: string;
	isEdit: boolean;
	isDefault: boolean;
	canDelete: boolean;
	error: string;
}

export interface WatchlistCSVImportRowVM {
	line: number;
	symbol: string;
	note: string;
	action: string;
}

/** WatchlistCSVImportVM */
export interface WatchlistCSVImportVM {
	listID: string;
	listName: string;
	rows: WatchlistCSVImportRowVM[];
	errors: string[];
	error: string;
	committed: boolean;
	inserted: number;
	updated: number;
}

/** GET /portfolio/watchlist/quotes payload (Go: QuoteRefreshFragments OOB swaps). */
export interface WatchlistQuotesResponse {
	updatedAt: string;
	rows: WatchlistQuoteVM[];
}

export const emptyCSVImportVM = (listID = '', listName = ''): WatchlistCSVImportVM => ({
	listID,
	listName,
	rows: [],
	errors: [],
	error: '',
	committed: false,
	inserted: 0,
	updated: 0
});

/** watchlistImportSummary; strconv.Quote of a plain name is a double-quoted string. */
export function watchlistImportSummary(inserted: number, updated: number, listName: string): string {
	if (inserted === 0 && updated === 0) {
		if (listName === '') return 'No symbols were changed in the selected theme.';
		return `No symbols were changed in ${JSON.stringify(listName)}.`;
	}
	const listLabel = listName ? `theme ${JSON.stringify(listName)}` : 'the selected theme';
	return `Added ${inserted} and updated ${updated} symbol(s) in ${listLabel}.`;
}

/** watchlistListForm: the form VM for a theme, from the lists already on the page (loadWatchlistListFormVM). */
export function watchlistListForm(lists: WatchlistListVM[], listID: string): ListFormVM {
	const vm: ListFormVM = { listID: '', name: '', isEdit: false, isDefault: false, canDelete: false, error: '' };
	listID = listID.trim();
	if (listID === '') return vm;
	vm.isEdit = true;
	vm.listID = listID;
	const list = lists.find((l) => l.id.toLowerCase() === listID.toLowerCase());
	if (!list) {
		vm.error = 'List not found.';
		return vm;
	}
	vm.name = list.name;
	vm.isDefault = list.isDefault;
	vm.canDelete = !list.isDefault;
	return vm;
}
