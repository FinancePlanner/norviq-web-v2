import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';
import { Feature } from '#lib/billing.js';
import { aiConsentReturnPath, isAIConsentRequired } from '#lib/features/money/receipts/ai-consent.server.js';
import {
	SPREADSHEET_NO_AI_NOTICE,
	buildImportReviewVM,
	decisionFromForm,
	spreadsheetImportErrorMessage,
	type ImportPanel,
	type SpreadsheetImportAnalysisResponse,
	type SpreadsheetImportCommitResponse,
	type SpreadsheetImportPreviewResponse
} from '#lib/features/money/import/vm.js';

// Port of norviq-web handlers/expenses_import.go. Every route sits behind
// requireSpreadsheetImport. Deliberately not consent-gated: without AI consent
// the backend maps columns by heuristics (aiAvailable:false).
//
//   GET    /expenses/import                       page
//   POST   /expenses/import/analyze               → ?/analyze
//   POST   /expenses/import/{sessionID}/preview   → ?/preview  (session_id field)
//   POST   /expenses/import/{sessionID}/commit    → ?/commit   (session_id field)
//   DELETE /expenses/import/{sessionID}           → ?/discard  (session_id field)

const FEATURE_NAME = 'Spreadsheet import';

// Matches the backend cap; an oversized file never crosses the wire.
const MAX_SPREADSHEET_UPLOAD_BYTES = 8 << 20;

const UNAVAILABLE = 'The import service is unavailable right now. Try again shortly.';
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

const errorPanel = (message: string): { panel: ImportPanel } => ({ panel: { kind: 'error', message } });

function sessionIDFrom(form: FormData): string | null {
	const raw = form.get('session_id');
	return typeof raw === 'string' && UUID_RE.test(raw.trim()) ? raw.trim() : null;
}

async function readForm(event: RequestEvent): Promise<FormData | null> {
	try {
		return await event.request.formData();
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.SpreadsheetImport, FEATURE_NAME);
	return {};
};

export const actions: Actions = {
	// Uploads the workbook and swaps in the review panel.
	analyze: async (event) => {
		await requireFeature(event, Feature.SpreadsheetImport, FEATURE_NAME);
		const tooLarge = 'That file is too large. Spreadsheets must be 8 MB or smaller.';
		const len = Number(event.request.headers.get('content-length') ?? '0');
		if (Number.isFinite(len) && len > MAX_SPREADSHEET_UPLOAD_BYTES) return errorPanel(tooLarge);
		const form = await readForm(event);
		if (!form) return errorPanel(tooLarge);

		const file = form.get('file');
		if (!(file instanceof File) || file.name === '') return errorPanel('Choose an .xlsx file to upload.');
		if (file.size > MAX_SPREADSHEET_UPLOAD_BYTES) return errorPanel(tooLarge);

		let bytes: ArrayBuffer;
		try {
			bytes = await file.arrayBuffer();
		} catch {
			return errorPanel('Could not read that file.');
		}
		// onboarding.MultipartFileField: one "file" part, CreateFormFile's
		// application/octet-stream, the original filename.
		const upload = new FormData();
		upload.append('file', new Blob([bytes], { type: 'application/octet-stream' }), file.name);

		let res: Response;
		try {
			res = await apiFetch(event, 'POST', '/v1/expenses/import/spreadsheet', upload);
		} catch {
			return errorPanel(UNAVAILABLE);
		}
		if (res.status !== 200) {
			const body = await res.text().catch(() => '');
			if (isAIConsentRequired(res.status, body)) {
				return { panel: { kind: 'consent', next: aiConsentReturnPath(event) } satisfies ImportPanel };
			}
			return errorPanel(spreadsheetImportErrorMessage(res.status));
		}

		let analysis: SpreadsheetImportAnalysisResponse;
		try {
			analysis = (await res.json()) as SpreadsheetImportAnalysisResponse;
		} catch {
			return errorPanel(UNAVAILABLE);
		}
		const warnings = [...(analysis.warnings ?? [])];
		// Say so rather than imply AI read the file.
		if (!analysis.aiAvailable) warnings.push(SPREADSHEET_NO_AI_NOTICE);
		const vm = buildImportReviewVM(
			analysis.sessionId,
			analysis.fileName,
			analysis.sheets,
			analysis.categoryMappings,
			analysis.preview,
			warnings,
			analysis.amountSign,
			analysis.dateFormat ?? ''
		);
		return { panel: { kind: 'review', vm } satisfies ImportPanel };
	},

	// Re-derives the preview after a mapping change. No file is re-sent: the
	// backend still holds the parsed rows.
	preview: async (event) => {
		await requireFeature(event, Feature.SpreadsheetImport, FEATURE_NAME);
		const form = await readForm(event);
		if (!form) return errorPanel('Could not read your changes.');
		const sessionID = sessionIDFrom(form);
		if (!sessionID) return errorPanel('That import expired. Upload the file again.');

		let preview: SpreadsheetImportPreviewResponse;
		try {
			preview = await apiJSON<SpreadsheetImportPreviewResponse>(
				event,
				'POST',
				`/v1/expenses/import/spreadsheet/${sessionID}/preview`,
				decisionFromForm(form)
			);
		} catch (err) {
			return errorPanel(isAPIError(err) ? spreadsheetImportErrorMessage(err.status) : UNAVAILABLE);
		}
		const value = (k: string) => {
			const v = form.get(k);
			return typeof v === 'string' ? v : '';
		};
		const vm = buildImportReviewVM(
			preview.sessionId,
			value('file_name'),
			preview.sheets,
			preview.categoryMappings,
			preview.preview,
			preview.warnings,
			value('amount_sign'),
			value('date_order')
		);
		return { panel: { kind: 'review', vm } satisfies ImportPanel };
	},

	// Writes the approved rows.
	commit: async (event) => {
		await requireFeature(event, Feature.SpreadsheetImport, FEATURE_NAME);
		const form = await readForm(event);
		if (!form) return errorPanel('Could not read your changes.');
		const sessionID = sessionIDFrom(form);
		if (!sessionID) return errorPanel('That import expired. Upload the file again.');

		let result: SpreadsheetImportCommitResponse;
		try {
			// A retry after a dropped connection must not insert the same
			// expenses twice; the key is stable per session.
			result = await apiJSON<SpreadsheetImportCommitResponse>(
				event,
				'POST',
				`/v1/expenses/import/spreadsheet/${sessionID}/commit`,
				decisionFromForm(form),
				{ headers: { 'Idempotency-Key': 'web-' + sessionID } }
			);
		} catch (err) {
			return errorPanel(isAPIError(err) ? spreadsheetImportErrorMessage(err.status) : UNAVAILABLE);
		}
		return {
			panel: {
				kind: 'summary',
				vm: {
					imported: result.imported,
					skipped: result.skipped,
					failed: result.failed,
					createdCategories: result.createdCategories ?? [],
					months: result.monthsTouched ?? []
				}
			} satisfies ImportPanel
		};
	},

	// Releases the session rather than leaving an encrypted copy of someone's
	// finances on the server until it expires.
	discard: async (event) => {
		await requireFeature(event, Feature.SpreadsheetImport, FEATURE_NAME);
		const form = await readForm(event);
		const sessionID = form ? sessionIDFrom(form) : null;
		if (!sessionID) return errorPanel('That import expired. Upload the file again.');
		try {
			await apiJSON(event, 'DELETE', `/v1/expenses/import/spreadsheet/${sessionID}`);
		} catch {
			/* best effort, as Go */
		}
		redirect(303, '/expenses');
	}
};
