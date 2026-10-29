import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { apiFetch, apiJSON } from '#lib/server/api.js';
import { Feature } from '#lib/billing.js';
import { aiConsentMissing, aiConsentReturnPath, isAIConsentRequired } from '#lib/features/money/receipts/ai-consent.server.js';
import { newReceiptImportVM, parseReviewedReceiptLines, receiptEntryVM } from '#lib/features/money/receipts/vm.js';
import {
	MAX_RECEIPT_BATCH_IMAGES,
	type ReceiptBatchScanResponse,
	type ReceiptImportCommitResponse,
	type ReceiptImportState,
	type ReceiptImportVM
} from '#lib/features/money/receipts/types.js';

// Port of norviq-web handlers/receipts_batch.go.
//
//   GET  /expenses/receipt/import  ReceiptImportForm (htmx fragment in Go; the
//        planner preloads this route into its #expense-action-panel dialog)
//   POST /expenses/receipt/scan    → ?/scan
//   POST /expenses/receipt/commit  → ?/commit
//
// Gates as server.go: requireReceiptScan on all three, requireAIConsent on the
// form and the scan (commit sends JSON and spends no AI call).

const FEATURE_NAME = 'Receipt scanning';

// Five receipts at 8 MB each, plus room for the form fields.
const MAX_RECEIPT_BATCH_BYTES = 5 * 8 * 1024 * 1024 + 64 * 1024;
const MAX_COMMIT_BYTES = 1 << 20;

async function consentState(event: RequestEvent): Promise<ReceiptImportState | null> {
	if (await aiConsentMissing(event)) {
		return { kind: 'consent', next: aiConsentReturnPath(event), vm: newReceiptImportVM() };
	}
	return null;
}

const review = (vm: ReceiptImportVM): ReceiptImportState => ({ kind: 'review', vm });

function tooLarge(request: Request, max: number): boolean {
	const len = Number(request.headers.get('content-length') ?? '0');
	return Number.isFinite(len) && len > max;
}

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.ReceiptScan, FEATURE_NAME);
	const state: ReceiptImportState = (await consentState(event)) ?? review(newReceiptImportVM());
	return { state };
};

export const actions: Actions = {
	// ScanBatch reads several receipt photos and renders them for review.
	// Nothing is written to the ledger here, and no image is stored on this hop.
	scan: async (event) => {
		await requireFeature(event, Feature.ReceiptScan, FEATURE_NAME);
		const consent = await consentState(event);
		if (consent) return { state: consent };

		const vm = newReceiptImportVM();
		const readError = 'Could not read those photos. Each receipt must be 8 MB or smaller.';
		if (tooLarge(event.request, MAX_RECEIPT_BATCH_BYTES)) {
			vm.error = readError;
			return { state: review(vm) };
		}
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			vm.error = readError;
			return { state: review(vm) };
		}

		// A part with an empty filename is a form value in Go, not a file.
		const files = form.getAll('file').filter((f): f is File => f instanceof File && f.name !== '');
		if (files.length === 0) {
			vm.error = 'Select at least one receipt photo.';
			return { state: review(vm) };
		}
		if (files.length > MAX_RECEIPT_BATCH_IMAGES) {
			vm.error = `Scan at most ${MAX_RECEIPT_BATCH_IMAGES} receipts at a time.`;
			return { state: review(vm) };
		}
		if (files.reduce((n, f) => n + f.size, 0) > MAX_RECEIPT_BATCH_BYTES) {
			vm.error = readError;
			return { state: review(vm) };
		}

		// Same multipart shape as api.ScanReceiptBatch: one "file" part per
		// photo, original filename (receipt-N.jpg when blank) and content type.
		const upload = new FormData();
		try {
			for (const [i, file] of files.entries()) {
				const data = await file.arrayBuffer();
				upload.append('file', new Blob([data], { type: file.type }), file.name || `receipt-${i + 1}.jpg`);
			}
		} catch {
			vm.error = 'Could not read one of the photos.';
			return { state: review(vm) };
		}

		let resp: ReceiptBatchScanResponse;
		try {
			const res = await apiFetch(event, 'POST', '/v1/receipts/scan', upload);
			if (!res.ok) {
				const body = await res.text().catch(() => '');
				if (isAIConsentRequired(res.status, body)) {
					return { state: { kind: 'consent', next: aiConsentReturnPath(event), vm } satisfies ReceiptImportState };
				}
				throw new Error(`scan receipt batch: backend returned ${res.status}`);
			}
			resp = (await res.json()) as ReceiptBatchScanResponse;
		} catch (err) {
			console.error('scan receipt batch', err);
			vm.error = 'Could not read those receipts. Try again, or enter the expense manually.';
			return { state: review(vm) };
		}

		let unreadable = 0;
		for (const result of resp.results ?? []) {
			if (!result.recognized || !result.draft) {
				unreadable++;
				continue;
			}
			vm.receipts.push(receiptEntryVM(vm.receipts.length, result.draft));
		}
		if (unreadable > 0) vm.errors.push(`${unreadable} photo(s) could not be read as a receipt.`);
		if (vm.receipts.length === 0 && vm.error === '') vm.error = 'Nothing could be read from those photos.';
		return { state: review(vm) };
	},

	// CommitBatch writes the expenses the user confirmed. The backend dedupes
	// on externalId, so a retry is safe.
	commit: async (event) => {
		await requireFeature(event, Feature.ReceiptScan, FEATURE_NAME);
		const vm = newReceiptImportVM();
		let form: FormData;
		try {
			if (tooLarge(event.request, MAX_COMMIT_BYTES)) throw new Error('too large');
			form = await event.request.formData();
		} catch {
			vm.error = 'Could not read the reviewed lines.';
			return { state: review(vm) };
		}

		const items = parseReviewedReceiptLines(form, new Date().toISOString().slice(0, 10));
		if (items.length === 0) {
			vm.error = 'No expenses selected to add.';
			return { state: review(vm) };
		}

		let resp: ReceiptImportCommitResponse;
		try {
			resp = await apiJSON<ReceiptImportCommitResponse>(event, 'POST', '/v1/expenses/import/receipts/commit', {
				items
			});
		} catch (err) {
			console.error('commit receipt expenses', err);
			vm.error = 'Could not add those expenses. Try again.';
			return { state: review(vm) };
		}

		vm.committed = true;
		vm.imported = resp.imported;
		vm.skipped = resp.skipped;
		for (const e of resp.errors ?? []) vm.errors.push(e.message);
		// Go answered with HX-Trigger {"expenses-changed":true}; the panel
		// fires the same window event when it sees `expensesChanged`.
		return { state: review(vm), expensesChanged: true };
	}
};
