import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch, apiJSON } from '#lib/server/api.js';
import { formatCurrency, formatFloat } from '#lib/format.js';
import { buildSentimentRollup } from '../sentiment.js';
import {
	fetchPnlBySymbol,
	fetchQuoteBatch,
	fetchSentimentBySymbol,
	loadPortfolioMarketEnrichment,
	loadWatchlistSentimentRollup,
	parseUUID,
	quoteBySymbol,
	sentimentBadgeFor,
	uuidString,
	type PnlBySymbol,
	type QuoteBatchResponse,
	type SymbolSentiment
} from '../market.server.js';
import {
	emptyCSVImportVM,
	type WatchlistCSVImportVM,
	type WatchlistListVM,
	type WatchlistRowVM,
	type WatchlistViewModel
} from './types.js';

// Ports LoadWatchlistViewModel / mapPortfolioWatchlistRows /
// LoadWatchlistQuoteRows (handlers/portfolio_subpages_data.go,
// quote_refresh.go) and the CSV upload in portfolio_watchlist_csv.go.

type Schemas = components['schemas'];
type WatchlistItem = Schemas['WatchlistItemResponse'];
type WatchlistList = Schemas['WatchlistListResponse'];

/** handlers.maxCSVUploadBytes (12 MiB). */
export const MAX_CSV_UPLOAD_BYTES = 12 << 20;

export const listWatchlistLists = (event: RequestEvent) =>
	apiJSON<WatchlistList[]>(event, 'GET', '/v1/watchlist/lists');

/** resolveWatchlistListID: the requested theme if it exists, else the default, else the first. */
export function resolveWatchlistListID(raw: string, lists: WatchlistList[]): string {
	const parsed = parseUUID(raw);
	if (parsed) {
		const hit = lists.find((l) => uuidString(l.id) === parsed);
		if (hit) return hit.id;
	}
	return (lists.find((l) => l.isDefault) ?? lists[0]).id;
}

/** Go fmt "%+.2f"-style sign: "+" for ≥0, the minus is part of the number. */
const signed2 = (v: number) => (v < 0 ? '' : '+') + formatFloat(v, 2);

export function mapPortfolioWatchlistRows(
	items: WatchlistItem[],
	quotes: QuoteBatchResponse | null,
	sparklines: Map<string, number[]> | null,
	pnl: Map<string, PnlBySymbol> | null,
	sentiments: Map<string, SymbolSentiment> | null
): WatchlistRowVM[] {
	const quoteMap = quoteBySymbol(quotes);
	return items.map((item, i) => {
		const symbol = item.symbol.trim().toUpperCase();
		const row: WatchlistRowVM = {
			id: uuidString(item.id),
			symbol,
			detailURL: '/portfolio/' + symbol.toLowerCase(),
			weightLabel: '—',
			sentiment: sentimentBadgeFor(sentiments, symbol),
			note: (item.note ?? '').trim(),
			price: '',
			netChg: '',
			changePercent: '',
			changePositive: false,
			open: '-',
			prevClose: '-',
			high: '-',
			low: '-',
			rawDayChangePct: 0,
			rawGain: 0,
			rawWeight: 0,
			isHeld: false,
			sparkline: null,
			sparklineID: '',
			volume: ''
		};
		const q = quoteMap.get(symbol);
		if (q) {
			row.price = formatCurrency(q.c);
			row.volume = '-';
			if (q.o != null) row.open = formatCurrency(q.o);
			if (q.pc != null) row.prevClose = formatCurrency(q.pc);
			if (q.h != null) row.high = formatCurrency(q.h);
			if (q.l != null) row.low = formatCurrency(q.l);
			if (q.d != null) row.netChg = signed2(q.d);
			if (q.dp != null) {
				row.changePositive = q.dp >= 0;
				row.rawDayChangePct = q.dp;
				row.changePercent = signed2(q.dp) + '%';
			}
		}
		const p = pnl?.get(symbol);
		if (p) {
			row.isHeld = true;
			row.rawGain = p.unrealizedPnl;
			if (p.weightPercent != null) {
				row.rawWeight = p.weightPercent;
				row.weightLabel = formatFloat(p.weightPercent, 1) + '%';
			} else {
				row.weightLabel = '—';
			}
		}
		const closes = sparklines?.get(symbol);
		if (closes) {
			row.sparkline = closes;
			row.sparklineID = `watchlist-spark-${symbol}-${i}`;
		}
		return row;
	});
}

/** LoadWatchlistViewModel */
export async function loadWatchlistViewModel(
	event: RequestEvent,
	selectedListID: string
): Promise<WatchlistViewModel> {
	const vm: WatchlistViewModel = {
		sentiment: buildSentimentRollup('', null, 0, 0, 0, 0, '', '', ''),
		lists: [],
		selectedListID,
		rows: [],
		loadError: false
	};

	let lists: WatchlistList[];
	try {
		lists = await listWatchlistLists(event);
	} catch (err) {
		vm.loadError = true;
		console.warn('watchlist lists fetch failed', err);
		return vm;
	}
	if (!lists?.length) return vm;

	const selected = resolveWatchlistListID(selectedListID, lists);
	vm.selectedListID = uuidString(selected);
	vm.lists = lists.map((list): WatchlistListVM => ({
		id: uuidString(list.id),
		name: list.name,
		isDefault: list.isDefault,
		canDelete: !list.isDefault,
		active: list.id === selected,
		href: '/portfolio/watchlist?list=' + uuidString(list.id)
	}));

	let items: WatchlistItem[];
	try {
		items = await apiJSON<WatchlistItem[]>(event, 'GET', '/v1/watchlist', undefined, {
			query: { watchlistListId: selected }
		});
	} catch (err) {
		vm.loadError = true;
		console.warn('watchlist items fetch failed', err);
		return vm;
	}
	if (!items?.length) return vm;

	const symbols = items.map((item) => item.symbol);
	const [{ quotes, sparklines }, pnl, sentiments, rollup] = await Promise.all([
		loadPortfolioMarketEnrichment(event, symbols),
		fetchPnlBySymbol(event, null),
		fetchSentimentBySymbol(event, symbols),
		loadWatchlistSentimentRollup(event, selectedListID)
	]);
	vm.sentiment = rollup;
	vm.rows = mapPortfolioWatchlistRows(items, quotes, sparklines, pnl, sentiments);
	return vm;
}

/** LoadWatchlistQuoteRows: the quote-only rows the 20s poll swaps in. */
export async function loadWatchlistQuoteRows(
	event: RequestEvent,
	selectedListID: string
): Promise<WatchlistRowVM[]> {
	let lists: WatchlistList[];
	try {
		lists = await listWatchlistLists(event);
	} catch (err) {
		console.warn('watchlist quote refresh lists fetch failed', err);
		return [];
	}
	if (!lists?.length) return [];
	const selected = resolveWatchlistListID(selectedListID, lists);
	let items: WatchlistItem[];
	try {
		items = await apiJSON<WatchlistItem[]>(event, 'GET', '/v1/watchlist', undefined, {
			query: { watchlistListId: selected }
		});
	} catch (err) {
		console.warn('watchlist quote refresh items fetch failed', err);
		return [];
	}
	if (!items) return [];
	const quotes = await fetchQuoteBatch(
		event,
		items.map((item) => item.symbol)
	);
	return mapPortfolioWatchlistRows(items, quotes, null, null, null);
}

/** The list name for a theme id ("" when unknown or on error), as watchlistCSVImportVM read it. */
export async function watchlistListName(event: RequestEvent, listID: string): Promise<string> {
	const parsed = parseUUID(listID);
	if (!listID || !parsed) return '';
	try {
		const lists = await listWatchlistLists(event);
		return lists.find((l) => uuidString(l.id) === parsed)?.name ?? '';
	} catch {
		return '';
	}
}

/** watchlistCSVErrorMessage */
export function watchlistCSVErrorMessage(status: number, stage: 'preview' | 'commit'): string {
	switch (status) {
		case 401:
		case 403:
			return 'Please sign in again to import CSV files.';
		case 404:
			return 'Could not find the selected theme.';
		case 413:
			return 'The uploaded CSV is too large. Try a smaller file.';
		case 429:
			return 'Import limit reached. Try again later.';
		case 400:
			if (stage === 'commit')
				return 'Could not process this CSV. Check the file format and try again.';
			return 'Could not parse CSV. Check the file format and try again.';
	}
	if (stage === 'commit') return 'Import failed. Check the CSV and try again.';
	return 'Could not parse CSV. Check the file format and try again.';
}

const csvErrors = (errors: Schemas['CsvImportPreviewError'][] | null | undefined) =>
	(errors ?? []).map((e) => `Line ${e.line}: ${e.message}`);

/** processWatchlistCSVUpload: preview or commit the uploaded file into a theme. */
export async function processWatchlistCSVUpload(
	event: RequestEvent,
	commit: boolean
): Promise<WatchlistCSVImportVM> {
	let form: FormData;
	try {
		const length = Number(event.request.headers.get('content-length') ?? 0);
		if (length > MAX_CSV_UPLOAD_BYTES) throw new Error('too large');
		form = await event.request.formData();
	} catch {
		const vm = emptyCSVImportVM();
		vm.error = 'Could not read the uploaded file.';
		return vm;
	}
	const listID = String(form.get('list_id') ?? '').trim();
	const vm = emptyCSVImportVM(listID, await watchlistListName(event, listID));

	const file = form.get('file');
	if (!(file instanceof File) || file.name === '') {
		vm.error = 'Select a CSV file to upload.';
		return vm;
	}
	if (file.size > MAX_CSV_UPLOAD_BYTES) {
		vm.error = 'Could not read the uploaded file.';
		return vm;
	}
	let bytes: ArrayBuffer;
	try {
		bytes = await file.arrayBuffer();
	} catch {
		vm.error = 'Could not read the CSV file.';
		return vm;
	}

	// watchlistCSVParams: an empty id means the default theme; a bad one is refused.
	let watchlistListId: string | undefined;
	if (listID !== '') {
		const parsed = parseUUID(listID);
		if (!parsed) {
			vm.error = 'Invalid watchlist theme.';
			return vm;
		}
		watchlistListId = parsed;
	}

	// pkgonboarding.MultipartFileField: one "file" part, the original file name,
	// Content-Type application/octet-stream.
	const body = new FormData();
	body.set('file', new Blob([bytes], { type: 'application/octet-stream' }), file.name);
	const res = await apiFetch(
		event,
		'POST',
		commit ? '/v1/watchlist/import/csv/commit' : '/v1/watchlist/import/csv/preview',
		body,
		{
			query: { watchlistListId }
		}
	).catch(() => null);
	if (!res || res.status !== 200) {
		vm.error = watchlistCSVErrorMessage(res?.status ?? 0, commit ? 'commit' : 'preview');
		return vm;
	}

	if (commit) {
		const payload = (await res.json().catch(() => null)) as
			Schemas['WatchlistCsvImportCommitResponse'] | null;
		if (!payload) {
			vm.error = watchlistCSVErrorMessage(200, 'commit');
			return vm;
		}
		vm.committed = true;
		vm.inserted = payload.inserted?.length ?? 0;
		vm.updated = payload.updated?.length ?? 0;
		vm.errors = csvErrors(payload.errors);
		return vm;
	}

	const payload = (await res.json().catch(() => null)) as
		Schemas['WatchlistCsvImportPreviewResponse'] | null;
	if (!payload) {
		vm.error = watchlistCSVErrorMessage(200, 'preview');
		return vm;
	}
	vm.rows = (payload.items ?? []).map((item) => ({
		line: item.line,
		symbol: item.symbol,
		note: item.note ?? '',
		action: item.willUpdateExisting ? 'Update' : 'Add'
	}));
	vm.errors = csvErrors(payload.errors);
	return vm;
}
