import { BUDGET_PILLARS, resolvePillarKey } from '../pillars.js';
import {
	MAX_RECEIPT_BATCH_IMAGES,
	type ReceiptDraft,
	type ReceiptExpenseMetadata,
	type ReceiptImportEntryVM,
	type ReceiptImportItem,
	type ReceiptImportVM
} from './types.js';

// Port of norviq-web handlers/receipts_batch.go (view-model half) and
// pages/expenses/receipt_import_vm.go.

/** Scanning never guesses a pillar; this is only the picker's starting point. */
export const DEFAULT_RECEIPT_PILLAR = 'fundamentals';

export function newReceiptImportVM(): ReceiptImportVM {
	return {
		receipts: [],
		errors: [],
		error: '',
		committed: false,
		imported: 0,
		skipped: 0,
		maxImages: MAX_RECEIPT_BATCH_IMAGES,
		pillarOptions: BUDGET_PILLARS.map((p) => ({ key: p.key, label: p.label }))
	};
}

export function commitSummary(vm: ReceiptImportVM): string {
	const parts = [`Added ${vm.imported} expense(s).`];
	if (vm.skipped > 0) parts.push(`${vm.skipped} already recorded and skipped.`);
	return parts.join(' ');
}

/** Describes what the receipt produced, so an itemized split is not silently expected. */
export function lineCountLabel(e: ReceiptImportEntryVM): string {
	if (e.singleLine) return 'Read as one expense — no itemized lines were legible.';
	return `${e.lines.length} items`;
}

function lineItemsSum(d: ReceiptDraft): number | null {
	if (!d.lineItems?.length) return null;
	return d.lineItems.reduce((sum, item) => sum + item.amount, 0);
}

/** [reconciles, comparable] — api.ReceiptDraft.LineItemsReconcile. */
function lineItemsReconcile(d: ReceiptDraft): [boolean, boolean] {
	const sum = lineItemsSum(d);
	if (sum === null || d.total === null || d.total === undefined) return [false, false];
	return [Math.abs(sum - d.total) < 0.01, true];
}

/**
 * Turns a draft into editable lines. Line items become one expense each, but
 * only when they reconcile with the printed total; otherwise the receipt falls
 * back to a single expense and says why.
 */
export function receiptEntryVM(index: number, draft: ReceiptDraft): ReceiptImportEntryVM {
	let merchant = 'Receipt';
	if (draft.merchant && draft.merchant.trim() !== '') merchant = draft.merchant.trim();
	else if (draft.taxId) merchant = 'Receipt · ' + draft.taxId;

	const entry: ReceiptImportEntryVM = {
		index,
		merchant,
		date: draft.date ?? '',
		currency: draft.currency ?? '',
		total: draft.total != null ? draft.total.toFixed(2) : '',
		lines: [],
		warning: '',
		singleLine: false,
		source: draft.source ?? '',
		taxIdentifier: draft.taxId ?? '',
		vatTotal: draft.taxTotal != null ? draft.taxTotal.toFixed(2) : ''
	};

	const identity = [entry.taxIdentifier, entry.date, entry.total].join('|');
	const externalID = (suffix: string) => (identity === '||' ? '' : identity + suffix);

	const items = draft.lineItems ?? [];
	const [reconciles, comparable] = lineItemsReconcile(draft);
	if (items.length > 0 && comparable && reconciles) {
		entry.lines = items.map((item, i) => ({
			index: i,
			title: item.description,
			amount: item.amount.toFixed(2),
			pillar: DEFAULT_RECEIPT_PILLAR,
			externalID: externalID('#' + i)
		}));
		return entry;
	}

	if (items.length > 0 && comparable && !reconciles) {
		const sum = lineItemsSum(draft) ?? 0;
		const total = draft.total ?? 0;
		entry.warning = `Items read add up to ${sum.toFixed(2)} but the receipt says ${total.toFixed(2)}, so they were not split. Check the total.`;
	}

	entry.singleLine = true;
	entry.lines = [
		{ index: 0, title: merchant, amount: entry.total, pillar: DEFAULT_RECEIPT_PILLAR, externalID: externalID('') }
	];
	return entry;
}

// --- form parsing (strconv semantics) ---

const FLOAT_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/** handlers.optionalFloat: blank or unparsable → null. */
export function optionalFloat(raw: string | null | undefined): number | null {
	const s = (raw ?? '').trim();
	if (!s || !FLOAT_RE.test(s)) return null;
	return Number(s);
}

/** handlers.decimalComma */
export const decimalComma = (raw: string | null | undefined) => (raw ?? '').trim().replaceAll(',', '.');

const str = (form: FormData, key: string) => {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
};

function strictAtoi(raw: string): number | null {
	return /^[+-]?\d+$/.test(raw) ? Number.parseInt(raw, 10) : null;
}

function isISODate(raw: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
	const d = new Date(raw + 'T00:00:00Z');
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
}

function receiptMetadataFromPrefix(form: FormData, prefix: string): ReceiptExpenseMetadata | undefined {
	const source = str(form, prefix + '_source').trim();
	if (source !== 'qr' && source !== 'ocr') return undefined;
	const meta: ReceiptExpenseMetadata = { source };
	const merchant = str(form, prefix + '_merchant').trim();
	if (merchant) meta.merchant = merchant;
	const taxID = str(form, prefix + '_tax_id').trim();
	if (taxID) meta.taxIdentifier = taxID;
	const currency = str(form, prefix + '_currency').trim();
	if (currency) meta.currency = currency;
	const date = str(form, prefix + '_date').trim();
	if (date) meta.issuedOn = date;
	const total = optionalFloat(str(form, prefix + '_total'));
	if (total !== null) meta.total = total;
	const vat = optionalFloat(str(form, prefix + '_vat_total'));
	if (vat !== null) meta.vatTotal = vat;
	return meta;
}

/**
 * Reads the indexed inputs the review form posts. A cleared checkbox, a blank
 * description or a non-positive amount simply means "skip this one".
 */
export function parseReviewedReceiptLines(form: FormData, today: string): ReceiptImportItem[] {
	const receiptCount = strictAtoi(str(form, 'receipt_count'));
	if (receiptCount === null || receiptCount <= 0) return [];

	const items: ReceiptImportItem[] = [];
	for (let ri = 0; ri < receiptCount; ri++) {
		const prefix = 'r' + ri;
		const lineCount = strictAtoi(str(form, prefix + '_line_count'));
		if (lineCount === null || lineCount <= 0) continue;

		let occurredOn = str(form, prefix + '_date').trim();
		// A receipt whose date was not legible still belongs somewhere; today
		// is the honest default and the user can move it.
		if (!isISODate(occurredOn)) occurredOn = today;
		const metadata = receiptMetadataFromPrefix(form, prefix);

		for (let li = 0; li < lineCount; li++) {
			const lp = `${prefix}_l${li}`;
			if (str(form, lp + '_keep') === '') continue;
			const title = str(form, lp + '_title').trim();
			const amount = optionalFloat(decimalComma(str(form, lp + '_amount')));
			if (!title || amount === null || amount <= 0) continue;
			const def = resolvePillarKey(str(form, lp + '_pillar').trim());
			const item: ReceiptImportItem = {
				expense: {
					title,
					amount,
					pillar: def ? def.key : DEFAULT_RECEIPT_PILLAR,
					occurredOn,
					...(metadata ? { receiptMetadata: metadata } : {})
				}
			};
			const ext = str(form, lp + '_external_id').trim();
			if (ext) item.externalId = ext;
			items.push(item);
		}
	}
	return items;
}
