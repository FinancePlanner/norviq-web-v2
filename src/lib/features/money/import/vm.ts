import type { components } from '#lib/api/schema.js';

// Port of norviq-web pages/expenses/import_viewmodel.go,
// handlers/expenses_import_data.go and the decisionFromForm half of
// handlers/expenses_import.go. The generated shapes match the Go client here.

type S = components['schemas'];
export type SpreadsheetImportSheet = S['SpreadsheetImportSheet'];
export type SpreadsheetImportCategoryMapping = S['SpreadsheetImportCategoryMapping'];
export type SpreadsheetImportPreview = S['SpreadsheetImportPreview'];
export type SpreadsheetImportAnalysisResponse = S['SpreadsheetImportAnalysisResponse'];
export type SpreadsheetImportPreviewResponse = S['SpreadsheetImportPreviewResponse'];
export type SpreadsheetImportCommitResponse = S['SpreadsheetImportCommitResponse'];

export interface ImportColumnVM {
	letter: string;
	header: string;
	sample: string;
	field: string;
	confidence: number;
	/** A guess worth a second look rather than a fact. */
	lowConfidence: boolean;
}

export interface ImportCategoryVM {
	sourceValue: string;
	pillar: string;
	category: string;
	needsPillar: boolean;
}

export interface ImportRowVM {
	row: number;
	title: string;
	amount: string;
	occurredOn: string;
	category: string;
	status: string;
	statusLabel: string;
	message: string;
	importable: boolean;
}

export interface ImportReviewVM {
	sessionID: string;
	fileName: string;
	sheetName: string;
	error: string;
	totalRows: number;
	importableRows: number;
	duplicateRows: number;
	attentionRows: number;
	excludedRows: number;
	totalAmount: number;
	dateRange: string;
	warnings: string[];
	columns: ImportColumnVM[];
	categories: ImportCategoryVM[];
	currencies: string[];
	rows: ImportRowVM[];
	truncated: boolean;
	amountSign: string;
	dateOrder: string;
}

export interface ImportSummaryVM {
	imported: number;
	skipped: number;
	failed: number;
	createdCategories: string[];
	months: string[];
}

/** What the #import-review area shows (the htmx swap targets in Go). */
export type ImportPanel =
	| { kind: 'error'; message: string }
	| { kind: 'review'; vm: ImportReviewVM }
	| { kind: 'summary'; vm: ImportSummaryVM }
	| { kind: 'consent'; next: string };

/**
 * The roles a column can be reassigned to. `unknown` is deliberately absent:
 * it exists so older clients survive a backend addition.
 */
export const SELECTABLE_FIELDS = [
	'date',
	'title',
	'amount',
	'category',
	'pillar',
	'notes',
	'currency',
	'ignore'
];

/** Shown when the backend matched columns without an AI model. */
export const SPREADSHEET_NO_AI_NOTICE =
	'Columns were matched without AI. Check the mapping below. To let AI read the column headers and sample values, allow AI features in Settings, AI providers.';

export const canCommit = (vm: ImportReviewVM) => vm.importableRows > 0;

export function buildImportReviewVM(
	sessionID: string,
	fileName: string,
	sheets: SpreadsheetImportSheet[] | null | undefined,
	categories: SpreadsheetImportCategoryMapping[] | null | undefined,
	preview: SpreadsheetImportPreview,
	warnings: string[] | null | undefined,
	amountSign: string,
	dateOrder: string
): ImportReviewVM {
	const vm: ImportReviewVM = {
		sessionID,
		fileName,
		sheetName: '',
		error: '',
		totalRows: preview.totalRows,
		importableRows: preview.importableRows,
		duplicateRows: preview.duplicateRows,
		attentionRows: preview.needsAttentionRows,
		excludedRows: preview.excludedRows,
		totalAmount: preview.totalAmount,
		dateRange: '',
		warnings: warnings ?? [],
		columns: [],
		categories: [],
		currencies: [],
		rows: [],
		truncated: preview.truncated,
		amountSign,
		dateOrder
	};

	if (preview.dateRangeStart != null && preview.dateRangeEnd != null) {
		vm.dateRange = `${preview.dateRangeStart} → ${preview.dateRangeEnd}`;
	}

	const sheet = (sheets ?? []).find((s) => s.include);
	if (sheet) {
		vm.sheetName = sheet.name;
		for (const column of sheet.columns ?? []) {
			vm.columns.push({
				letter: column.letter,
				field: column.field,
				confidence: column.confidence,
				// Anything the detector wasn't sure about, or the model
				// proposed, is worth the reader's eye.
				lowConfidence: column.confidence < 0.7,
				header: column.header || 'Column ' + column.letter,
				sample: column.sampleValues?.[0] ?? ''
			});
		}
	}

	for (const mapping of categories ?? []) {
		const pillar = mapping.pillar ?? '';
		vm.categories.push({
			sourceValue: mapping.sourceValue,
			pillar,
			category: mapping.categoryName ?? '',
			needsPillar: pillar === ''
		});
	}

	const currencies = new Set<string>();
	for (const row of preview.rows ?? []) {
		vm.rows.push({
			row: row.row,
			status: row.status,
			statusLabel: importStatusLabel(row.status),
			importable: row.status === 'ok',
			title: row.title ?? '',
			amount: row.amount != null ? row.amount.toFixed(2) : '',
			occurredOn: row.occurredOn ?? '',
			category: row.categoryName ?? row.sourceCategoryValue ?? '',
			message: row.message ?? ''
		});
		if (row.status === 'needsExchangeRate' && row.currency != null) currencies.add(row.currency);
	}
	vm.currencies = [...currencies].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	return vm;
}

/** A wire status as something a person can act on. */
export function importStatusLabel(status: string): string {
	switch (status) {
		case 'ok':
			return 'Ready';
		case 'duplicateInFile':
			return 'Repeat';
		case 'duplicateExisting':
			return 'Already added';
		case 'invalidDate':
			return 'No date';
		case 'invalidAmount':
			return 'No amount';
		case 'missingTitle':
			return 'No description';
		case 'needsCategory':
			return 'Needs pillar';
		case 'needsExchangeRate':
			return 'Needs rate';
		case 'aggregateRow':
			return 'Total row';
		case 'skippedByUser':
			return 'Skipped';
		default:
			return 'Unknown';
	}
}

/** A backend status as wording that tells the reader what to do. */
export function spreadsheetImportErrorMessage(status: number): string {
	switch (status) {
		case 401:
			return 'Your session expired. Sign in and try again.';
		case 402:
		case 403:
			return 'Spreadsheet import is a Pro feature.';
		case 404:
			// The session lives for an hour; this is what a lapsed one looks like.
			return 'That import expired. Upload the file again.';
		case 409:
			return 'This import was already applied.';
		case 413:
			return 'That file is too large. Spreadsheets must be 8 MB or smaller.';
		case 415:
			return 'That looks like an older .xls file. Save it as .xlsx and try again.';
		case 429:
			return 'Too many imports just now. Wait a minute and try again.';
		default:
			if (status >= 500) return 'The import service is unavailable right now. Try again shortly.';
			return "We couldn't read that file. Make sure it's a valid .xlsx spreadsheet.";
	}
}

/**
 * Rebuilds the decision from the review form. The form is the single source
 * of truth for what the reader approved, so preview and commit build it
 * identically. Unlike Go, which marshals nil slices as null and omits empty
 * optional fields, every collection is sent, empty if need be:
 * StockPlanShared decodes them with synthesized Codable, so a null or missing
 * one is a 400 ("No such key 'categoryMappings'").
 */
export function decisionFromForm(form: FormData): Record<string, unknown> {
	const value = (key: string) => {
		const v = form.get(key);
		return typeof v === 'string' ? v : '';
	};
	const firstValues = new Map<string, string>();
	for (const [key, v] of form.entries()) {
		if (!firstValues.has(key)) firstValues.set(key, typeof v === 'string' ? v : '');
	}

	const decision: Record<string, unknown> = {
		amountSign: value('amount_sign').trim() === '' ? 'positiveIsExpense' : value('amount_sign')
	};
	const order = value('date_order');
	if (order !== '') decision.dateFormat = order;

	const sheetName = value('sheet_name');
	const columns: Record<string, unknown>[] = [];
	for (const [key, v] of firstValues) {
		if (!key.startsWith('column_')) continue;
		columns.push({
			letter: key.slice('column_'.length),
			detectedType: 'text',
			sampleValues: [],
			field: v,
			confidence: 1,
			source: 'user'
		});
	}
	decision.sheets = sheetName
		? [
				{
					name: sheetName,
					index: 0,
					rowCount: 0,
					headerRow: 0,
					dataStartRow: 0,
					dataEndRow: 0,
					include: true,
					isRecommended: true,
					columns,
					excludedRows: [],
					notes: []
				}
			]
		: [];

	const categoryMappings: Record<string, unknown>[] = [];
	for (const [key, v] of firstValues) {
		if (!key.startsWith('pillar_') || v === '') continue;
		categoryMappings.push({
			sourceValue: key.slice('pillar_'.length),
			pillar: v,
			createCategory: false,
			confidence: 1,
			source: 'user'
		});
	}
	decision.categoryMappings = categoryMappings;

	const rates: Record<string, number> = {};
	for (const [key, v] of firstValues) {
		if (!key.startsWith('rate_') || v === '') continue;
		const raw = v.replaceAll(',', '.');
		if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(raw)) continue;
		const rate = Number(raw);
		if (rate > 0) rates[key.slice('rate_'.length)] = rate;
	}
	decision.exchangeRates = rates;

	const overrides: Record<string, unknown>[] = [];
	for (const key of firstValues.keys()) {
		if (!key.startsWith('exclude_')) continue;
		const raw = key.slice('exclude_'.length);
		if (!/^[+-]?\d+$/.test(raw)) continue;
		overrides.push({ sheetName, row: Number.parseInt(raw, 10), include: false });
	}
	decision.rowOverrides = overrides;

	return decision;
}
