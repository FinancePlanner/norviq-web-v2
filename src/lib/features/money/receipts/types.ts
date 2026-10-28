// Receipt batch scan/commit shapes. Hand-written, like norviq-web
// internal/api/receipts.go: these endpoints are not in the generated client.

export interface ReceiptVATLine {
	rate: string;
	base?: number | null;
	amount?: number | null;
}

export interface ReceiptLineItem {
	description: string;
	amount: number;
	quantity?: number | null;
}

export interface ReceiptDraft {
	merchant?: string | null;
	total?: number | null;
	currency?: string | null;
	date?: string | null;
	taxId?: string | null;
	taxTotal?: number | null;
	vatLines?: ReceiptVATLine[] | null;
	lineItems?: ReceiptLineItem[] | null;
	confidence: number;
	source: string;
}

export interface ReceiptDraftResponse {
	recognized: boolean;
	draft?: ReceiptDraft | null;
}

/** Reply from /v1/receipts/scan: one result per uploaded image, in order. */
export interface ReceiptBatchScanResponse {
	results: ReceiptDraftResponse[];
}

export interface ReceiptExpenseMetadata {
	source: string;
	merchant?: string;
	taxIdentifier?: string;
	issuedOn?: string;
	currency?: string;
	total?: number;
	vatTotal?: number;
}

export interface ReceiptExpense {
	title: string;
	amount: number;
	pillar: string;
	occurredOn: string;
	receiptMetadata?: ReceiptExpenseMetadata;
}

export interface ReceiptImportItem {
	externalId?: string;
	expense: ReceiptExpense;
}

export interface ReceiptImportCommitRequest {
	items: ReceiptImportItem[];
}

export interface ReceiptImportCommitResponse {
	imported: number;
	skipped: number;
	failed: number;
	monthsTouched: string[] | null;
	errors: { index: number; message: string }[] | null;
}

/** api.MaxReceiptBatchImages: the backend ceiling on /v1/receipts/scan. */
export const MAX_RECEIPT_BATCH_IMAGES = 5;

// --- view models (pages/expenses/receipt_import_vm.go) ---

export interface ReceiptPillarOption {
	key: string;
	label: string;
}

export interface ReceiptImportLineVM {
	index: number;
	title: string;
	amount: string;
	pillar: string;
	externalID: string;
}

export interface ReceiptImportEntryVM {
	index: number;
	merchant: string;
	date: string;
	currency: string;
	total: string;
	lines: ReceiptImportLineVM[];
	warning: string;
	singleLine: boolean;
	source: string;
	taxIdentifier: string;
	vatTotal: string;
}

export interface ReceiptImportVM {
	receipts: ReceiptImportEntryVM[];
	errors: string[];
	error: string;
	committed: boolean;
	imported: number;
	skipped: number;
	maxImages: number;
	pillarOptions: ReceiptPillarOption[];
}

/** What the receipt import load and its actions hand the panel. */
export type ReceiptImportState =
	| { kind: 'review'; vm: ReceiptImportVM }
	| { kind: 'consent'; next: string; vm: ReceiptImportVM };
