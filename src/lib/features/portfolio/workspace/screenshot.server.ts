import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch } from '#lib/server/api.js';
import { formatFloat } from '#lib/format.js';
import { AI_CONSENT_REQUIRED_REASON } from '../ai-consent.server.js';
import { formValue } from './api.server.js';
import {
	MAX_SCREENSHOT_IMAGES,
	newScreenshotImportVM,
	type ScreenshotImportRowVM,
	type ScreenshotImportVM
} from './screenshot.js';

// handlers/portfolio_screenshot_import.go + api/portfolio_screenshot.go.

type Row = components['schemas']['CsvImportPreviewItem'];
type RowError = components['schemas']['CsvImportPreviewError'];
type PreviewResponse = components['schemas']['ScreenshotImportPreviewResponse'];

interface CommitResponse {
	provider: string;
	inserted: unknown[] | null;
	updated: unknown[] | null;
	errors: RowError[] | null;
	replacedSymbols: string[] | null;
	importedLotsCount: number;
}

/** 3 × 8 MB images plus room for the form fields. */
export const MAX_SCREENSHOT_UPLOAD_BYTES = 3 * (8 << 20) + (64 << 10);

class ConsentRequired extends Error {}
class MergeConflict extends Error {}

export function screenshotVMFrom(form: FormData | URLSearchParams): ScreenshotImportVM {
	const get = (n: string) =>
		form instanceof URLSearchParams ? (form.get(n) ?? '') : formValue(form, n);
	return newScreenshotImportVM(get('provider'), get('portfolio_list_id'));
}

/** doScreenshotRequest: 409 → merge conflict, 403 AI_CONSENT_REQUIRED → consent, other non-2xx → error. */
async function doScreenshotRequest<T>(res: Response): Promise<T> {
	if (res.status === 409) {
		let reason = '';
		try {
			const env = (await res.json()) as { reason?: string; error?: unknown };
			reason = env.reason || (typeof env.error === 'string' ? env.error : '');
		} catch {
			/* empty reason */
		}
		throw new MergeConflict(reason || 'import would duplicate an existing holding');
	}
	if (res.status === 403) {
		const body = await res.text().catch(() => '');
		try {
			if ((JSON.parse(body) as { reason?: string }).reason === AI_CONSENT_REQUIRED_REASON)
				throw new ConsentRequired();
		} catch (err) {
			if (err instanceof ConsentRequired) throw err;
		}
	}
	if (!res.ok) throw new Error(`screenshot import request: backend returned ${res.status}`);
	return (await res.json()) as T;
}

function screenshotRowVMs(items: Row[] | null | undefined): ScreenshotImportRowVM[] {
	return (items ?? []).map((item) => ({
		symbol: item.symbol,
		line: item.line,
		willReplace: item.willReplaceExistingImport ?? false,
		existing: item.existingPositionKind ?? '',
		shares: item.shares != null ? String(item.shares) : '',
		buyPrice: item.buyPrice != null ? formatFloat(item.buyPrice, 2) : '',
		buyDate: item.buyDate ?? '',
		confidence: item.confidence ?? 0
	}));
}

const screenshotErrorMessages = (errs: RowError[] | null | undefined) =>
	(errs ?? []).map((e) => e.message);

/** processScreenshotPreview. Returns 'consent' for a backend AI_CONSENT_REQUIRED refusal. */
export async function processScreenshotPreview(
	event: RequestEvent
): Promise<ScreenshotImportVM | 'consent'> {
	const tooBig =
		Number(event.request.headers.get('content-length') ?? '0') > MAX_SCREENSHOT_UPLOAD_BYTES;
	let form: FormData | null = null;
	if (!tooBig) {
		try {
			form = await event.request.formData();
		} catch {
			form = null;
		}
	}
	if (!form) {
		const vm = screenshotVMFrom(event.url.searchParams);
		vm.error = 'Could not read the uploaded images. Each screenshot must be 8 MB or smaller.';
		return vm;
	}
	const vm = screenshotVMFrom(form);

	// Go's multipart reader treats a part with no filename as a value, so an
	// empty file input uploads nothing.
	const files = form
		.getAll('file')
		.filter((v): v is File => typeof v !== 'string' && v.name !== '');
	if (files.length === 0) {
		vm.error = 'Select at least one screenshot.';
		return vm;
	}
	if (files.length > MAX_SCREENSHOT_IMAGES) {
		vm.error = `Upload at most ${MAX_SCREENSHOT_IMAGES} screenshots at a time.`;
		return vm;
	}

	const body = new FormData();
	files.forEach((file, i) => body.append('file', file, file.name || `screenshot-${i + 1}.png`));

	let resp: PreviewResponse;
	try {
		const res = await apiFetch(event, 'POST', '/v1/brokers/import/screenshot', body, {
			query: { provider: vm.provider, portfolioListId: vm.portfolioListID || undefined }
		});
		resp = await doScreenshotRequest<PreviewResponse>(res);
	} catch (err) {
		if (err instanceof ConsentRequired) return 'consent';
		console.error('screenshot import preview', err);
		vm.error = 'Could not read these screenshots. Try again, or import a CSV instead.';
		return vm;
	}

	vm.kind = String(resp.kind ?? '');
	vm.imageCount = resp.imageCount ?? 0;
	vm.rows = screenshotRowVMs(resp.items);
	vm.errors = screenshotErrorMessages(resp.errors);
	if (vm.rows.length === 0 && vm.error === '' && vm.errors.length === 0)
		vm.error = 'Nothing could be read from these images.';
	return vm;
}

/** strconv.Atoi */
const atoi = (raw: string) => (/^[+-]?\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

/** optionalFloat(decimalComma(raw)): blank or unparsable → absent; "1,5" reads as 1.5. */
function optionalFloat(raw: string): number | undefined {
	const v = raw.trim().replaceAll(',', '.');
	if (v === '' || !/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(v)) return undefined;
	return Number(v);
}

/** parseReviewedScreenshotRows: unchecked or symbol-less rows are skipped. */
function parseReviewedRows(form: FormData): Row[] {
	const count = atoi(formValue(form, 'row_count'));
	if (!Number.isFinite(count) || count <= 0) return [];
	const rows: Row[] = [];
	for (let i = 0; i < count; i++) {
		if (formValue(form, `row_keep_${i}`) === '') continue;
		const symbol = formValue(form, `row_symbol_${i}`).trim().toUpperCase();
		if (symbol === '') continue;
		const row: Row = { line: rows.length, symbol };
		const shares = optionalFloat(formValue(form, `row_shares_${i}`));
		const buyPrice = optionalFloat(formValue(form, `row_buy_price_${i}`));
		if (shares !== undefined) row.shares = shares;
		if (buyPrice !== undefined) row.buyPrice = buyPrice;
		const date = formValue(form, `row_buy_date_${i}`).trim();
		if (date !== '') row.buyDate = date;
		rows.push(row);
	}
	return rows;
}

/** reviewedRowVMs: the review table rebuilt from what was submitted, existing kinds included. */
function reviewedRowVMs(form: FormData, rows: Row[]): ScreenshotImportRowVM[] {
	const existing = new Map<string, string>();
	const count = atoi(formValue(form, 'row_count'));
	if (Number.isFinite(count) && count > 0) {
		for (let i = 0; i < count; i++) {
			const symbol = formValue(form, `row_symbol_${i}`).trim().toUpperCase();
			if (symbol === '') continue;
			existing.set(symbol, formValue(form, `row_existing_${i}`).trim());
		}
	}
	return screenshotRowVMs(rows).map((r) => ({ ...r, existing: existing.get(r.symbol) ?? '' }));
}

/** processScreenshotCommit: commits the rows the user left in the review table. */
export async function processScreenshotCommit(event: RequestEvent): Promise<ScreenshotImportVM> {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		const vm = screenshotVMFrom(event.url.searchParams);
		vm.error = 'Could not read the reviewed rows.';
		return vm;
	}
	const vm = screenshotVMFrom(form);
	const rows = parseReviewedRows(form);
	if (rows.length === 0) {
		vm.error = 'No positions selected to import.';
		return vm;
	}
	const payload: Record<string, unknown> = { provider: vm.provider, items: rows };
	if (vm.portfolioListID) payload.portfolioListId = vm.portfolioListID;
	if (formValue(form, 'confirm_merge_existing') !== '') payload.confirmMergeExisting = true;

	let resp: CommitResponse;
	try {
		const res = await apiFetch(
			event,
			'POST',
			'/v1/brokers/import/screenshot/commit',
			JSON.stringify(payload),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
		resp = await doScreenshotRequest<CommitResponse>(res);
	} catch (err) {
		if (err instanceof MergeConflict) {
			// The rows stay on screen with the offending symbols named.
			vm.rows = reviewedRowVMs(form, rows);
			vm.needsMergeConfirm = true;
			vm.error = err.message;
			return vm;
		}
		console.error('screenshot import commit', err);
		vm.error = 'Import failed. Check the rows and try again.';
		return vm;
	}
	vm.committed = true;
	vm.inserted = resp.inserted?.length ?? 0;
	vm.updated = resp.updated?.length ?? 0;
	vm.replacedSymbols = resp.replacedSymbols ?? [];
	vm.errors = screenshotErrorMessages(resp.errors);
	return vm;
}
