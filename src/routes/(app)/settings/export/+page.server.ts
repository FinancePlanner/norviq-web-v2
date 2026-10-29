import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { errorMessage, errorStatus } from '#lib/features/settings-admin/api-errors.js';
import { shortDate, shortDateTime } from '#lib/features/settings-admin/go-time.js';

type ExportListItem = components['schemas']['ExportListItem'];

interface ExportRow {
	id: string;
	type: string;
	format: string;
	status: string;
	createdAt: string;
	expiresAt: string;
	canDownload: boolean;
}

const EXPORT_TYPES = new Set(['all', 'insights', 'portfolio', 'transactions', 'watchlist']);
const EXPORT_FORMATS = new Set(['csv', 'json']);

// Go LoadExportVM.
async function loadExports(event: RequestEvent): Promise<{ exports: ExportRow[]; errorMessage: string }> {
	try {
		const resp = await apiJSON<{ items: ExportListItem[] }>(event, 'GET', '/v1/api/v3/export', undefined, { query: { limit: 20, offset: 0 } });
		return {
			exports: (resp.items ?? []).map((item) => ({
				id: item.id,
				type: String(item.type),
				format: String(item.format).toUpperCase(),
				status: String(item.status),
				createdAt: shortDateTime(item.createdAt),
				expiresAt: shortDate(item.expiresAt),
				canDownload: item.status === 'ready'
			})),
			errorMessage: ''
		};
	} catch (err) {
		console.warn('export list failed', errorStatus(err), err);
		return { exports: [], errorMessage: 'Could not load exports.' };
	}
}

export const load: PageServerLoad = async (event) => {
	const vm = await loadExports(event);
	const successMessage = (event.url.searchParams.get('requested') ?? '').trim() === '1' ? 'Export requested. Refresh in a moment when it is ready.' : '';
	return { ...vm, successMessage };
};

export const actions: Actions = {
	// Go SettingsExportSubmit: POST /settings/export, same URL. Failures re-render
	// the #export-feedback block with the list reloaded (renderExportFeedback).
	default: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			return { errorMessage: 'Invalid form submission.' };
		}
		const type = String(form.get('type') ?? '').trim();
		const format = String(form.get('format') ?? '').trim();
		if (!EXPORT_TYPES.has(type) || !EXPORT_FORMATS.has(format)) return { errorMessage: 'Choose a valid data type and format.' };
		try {
			await apiJSON(event, 'POST', '/v1/api/v3/export', { type, format });
		} catch (err) {
			return { errorMessage: errorMessage(err, 'Could not start export.') };
		}
		redirect(303, '/settings/export?requested=1');
	}
};
