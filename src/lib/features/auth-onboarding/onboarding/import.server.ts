// onboarding.go CSV import + onboarding_manual.go manual import.
import type { RequestEvent } from '@sveltejs/kit';
import { api, apiFetch, isAPIError } from '#lib/server/api.js';
import { formatCurrency, formatFloat } from '#lib/format.js';

export const DEFAULT_CSV_PROVIDERS = ['generic', 'ibkr', 'trading212', 'degiro', 'revolut'];
const MAX_CSV_UPLOAD_BYTES = 12 << 20;
export const MAX_MANUAL_IMPORT_ROWS = 25;

export interface CSVPreviewRow {
	line: number;
	symbol: string;
	shares: string;
	buyPrice: string;
	buyDate: string;
}

export interface CSVPreviewVM {
	provider: string;
	rows: CSVPreviewRow[];
	errors: string[];
	error: string;
	committed: boolean;
	inserted: number;
	updated: number;
}

const emptyPreview = (): CSVPreviewVM => ({
	provider: '',
	rows: [],
	errors: [],
	error: '',
	committed: false,
	inserted: 0,
	updated: 0
});

/** portfolio_data.go formatShares */
const formatShares = (shares: number) =>
	shares % 1 === 0 ? formatFloat(shares, 0) : formatFloat(shares, 2);

/** loadCSVProviders: distinct broker providers, or the defaults. */
export async function loadCSVProviders(event: RequestEvent): Promise<string[]> {
	try {
		const res = await api(event).GET('/v1/brokers');
		const list =
			(res.response.ok ? (res.data as Array<{ provider?: string }> | undefined) : undefined) ?? [];
		const out: string[] = [];
		for (const b of list) {
			const p = (b.provider ?? '').trim();
			if (p && !out.includes(p)) out.push(p);
		}
		return out.length ? out : [...DEFAULT_CSV_PROVIDERS];
	} catch {
		return [...DEFAULT_CSV_PROVIDERS];
	}
}

type PreviewResponse = {
	items: Array<{
		line: number;
		symbol: string;
		shares?: number | null;
		buyPrice?: number | null;
		buyDate?: string | null;
	}>;
	errors: Array<{ line: number; message: string }>;
};
type CommitResponse = {
	inserted: unknown[];
	updated: unknown[];
	errors: Array<{ line: number; message: string }>;
};

/** processCSVUpload(commit) */
export async function processCSVUpload(
	event: RequestEvent,
	commit: boolean
): Promise<CSVPreviewVM> {
	const vm = emptyPreview();
	const len = Number(event.request.headers.get('content-length') ?? 0);
	if (len > MAX_CSV_UPLOAD_BYTES) {
		vm.error = 'Could not read the uploaded file.';
		return vm;
	}
	const form = await event.request.formData().catch(() => null);
	if (!form) {
		vm.error = 'Could not read the uploaded file.';
		return vm;
	}
	const provider = String(form.get('provider') ?? '').trim();
	if (!provider) {
		vm.error = 'Choose a broker format.';
		return vm;
	}
	vm.provider = provider;
	const file = form.get('file');
	if (!(file instanceof File) || (file.size === 0 && file.name === '')) {
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
	const body = new FormData();
	body.append('file', new Blob([bytes], { type: 'application/octet-stream' }), file.name);

	const path = commit ? '/v1/brokers/import/csv/commit' : '/v1/brokers/import/csv';
	let res: Response;
	try {
		res = await apiFetch(event, 'POST', path, body, { query: { provider } });
	} catch {
		res = new Response(null, { status: 599 });
	}
	const data = res.status === 200 ? await res.json().catch(() => null) : null;

	if (commit) {
		if (!data) {
			vm.error = 'Import failed. Check the file format and try again.';
			return vm;
		}
		const c = data as CommitResponse;
		vm.committed = true;
		vm.inserted = c.inserted?.length ?? 0;
		vm.updated = c.updated?.length ?? 0;
		vm.errors = (c.errors ?? []).map((e) => `Line ${Math.trunc(e.line)}: ${e.message}`);
		return vm;
	}
	if (!data) {
		vm.error = 'Could not parse CSV. Check the broker format and try again.';
		return vm;
	}
	const p = data as PreviewResponse;
	vm.rows = (p.items ?? []).map((item) => ({
		line: Math.trunc(item.line),
		symbol: item.symbol,
		shares: item.shares != null ? formatShares(item.shares) : '',
		buyPrice: item.buyPrice != null ? formatCurrency(item.buyPrice) : '',
		buyDate: item.buyDate ?? ''
	}));
	vm.errors = (p.errors ?? []).map((e) => e.message);
	return vm;
}

// --- manual entry -----------------------------------------------------------

export interface ManualRowVM {
	symbol: string;
	shares: string;
	buyPrice: string;
}

export interface ManualPageVM {
	rows: ManualRowVM[];
	buyDate: string;
	category: string;
	error: string;
	added: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyRow = (): ManualRowVM => ({ symbol: '', shares: '', buyPrice: '' });

export function defaultManualPageVM(): ManualPageVM {
	return { rows: [emptyRow()], buyDate: today(), category: 'stock', error: '', added: false };
}

export function manualPageVMFromQuery(url: URL): ManualPageVM {
	const vm = defaultManualPageVM();
	const n = Number.parseInt((url.searchParams.get('rows') ?? '').trim(), 10);
	if (Number.isFinite(n) && n > 1)
		vm.rows = Array.from({ length: Math.min(n, MAX_MANUAL_IMPORT_ROWS) }, emptyRow);
	return vm;
}

const ASSET_CATEGORIES = ['stock', 'etf', 'crypto'];
// Go's strconv.ParseFloat: a plain decimal or exponent, no trailing junk.
const floatPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const parseFloatStrict = (raw: string) => (floatPattern.test(raw) ? Number(raw) : Number.NaN);

export function parseBulkManualImport(form: FormData): {
	stocks: Array<{
		symbol: string;
		shares: number;
		buyPrice: number;
		buyDate: string;
		category: string;
	}>;
	vm: ManualPageVM;
	error: string;
} {
	const get = (k: string) => String(form.get(k) ?? '').trim();
	const vm: ManualPageVM = {
		rows: [],
		buyDate: get('buy_date'),
		category: get('category'),
		error: '',
		added: false
	};
	let rowCount = Number.parseInt(get('row_count'), 10);
	if (!Number.isFinite(rowCount) || rowCount < 1) rowCount = 1;
	if (rowCount > MAX_MANUAL_IMPORT_ROWS) rowCount = MAX_MANUAL_IMPORT_ROWS;

	if (!/^\d{4}-\d{2}-\d{2}$/.test(vm.buyDate) || Number.isNaN(Date.parse(vm.buyDate)))
		vm.buyDate = today();
	if (!ASSET_CATEGORIES.includes(vm.category)) vm.category = 'stock';
	const category = vm.category;

	const stocks: Array<{
		symbol: string;
		shares: number;
		buyPrice: number;
		buyDate: string;
		category: string;
	}> = [];
	for (let i = 0; i < rowCount; i++) {
		const row = {
			symbol: get(`row_${i}_symbol`),
			shares: get(`row_${i}_shares`),
			buyPrice: get(`row_${i}_buy_price`)
		};
		vm.rows.push(row);
		if (!row.symbol && !row.shares && !row.buyPrice) continue;
		const symbol = row.symbol.toUpperCase();
		if (!symbol) return { stocks: [], vm, error: `Row ${i + 1}: enter a symbol.` };
		const shares = parseFloatStrict(row.shares);
		if (!(shares > 0))
			return { stocks: [], vm, error: `Row ${i + 1}: enter a valid share amount.` };
		const buyPrice = parseFloatStrict(row.buyPrice);
		if (!(buyPrice > 0)) return { stocks: [], vm, error: `Row ${i + 1}: enter a valid buy price.` };
		stocks.push({ symbol, shares, buyPrice, buyDate: vm.buyDate, category });
	}
	if (stocks.length === 0) return { stocks: [], vm, error: 'Enter at least one position.' };
	return { stocks, vm, error: '' };
}

type BulkResponse = {
	created: number;
	failed: number;
	results: Array<{ index: number; error?: string | null }>;
};

/** BulkCreateStocks; returns '' on success or the bulkCreateErrorMessage. */
export async function bulkCreateStocks(event: RequestEvent, stocks: unknown[]): Promise<string> {
	let res: Response;
	try {
		res = await apiFetch(event, 'POST', '/v1/stocks/bulk', JSON.stringify({ stocks }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		if (!isAPIError(err)) console.error('bulk create stocks', err);
		return 'Failed to import positions. Check your connection and try again.';
	}
	const text = await res.text().catch(() => '');
	let json: unknown = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {
		json = null;
	}
	const bulk =
		res.status === 200 && json && typeof json === 'object' && 'created' in json
			? (json as BulkResponse)
			: null;
	if (bulk && bulk.created > 0) return '';
	if (bulk && bulk.failed > 0) {
		for (const item of bulk.results ?? []) {
			if (item.error && item.error.trim()) return `Row ${item.index + 1}: ${item.error.trim()}`;
		}
		return `${bulk.failed} position(s) could not be imported.`;
	}
	if (text && json && typeof json === 'object') {
		const p = json as { reason?: string; message?: string; error?: unknown };
		if (p.reason) return p.reason;
		if (p.message) return p.message;
		if (typeof p.error === 'string' && p.error) return p.error;
	}
	return `Failed to import positions (HTTP ${res.status}).`;
}
