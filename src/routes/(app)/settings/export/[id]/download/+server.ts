import type { RequestHandler } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiFetch, apiJSON } from '#lib/server/api.js';

type ExportDetail = components['schemas']['ExportDetailResponse'];

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const text = (body: string, status: number) =>
	new Response(body + '\n', { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// Go SettingsExportDownload: proxies the backend export file unchanged.
export const GET: RequestHandler = async (event) => {
	const exportID = event.params.id.trim();
	if (exportID === '') return text('Missing export ID', 400);
	if (!UUID_RE.test(exportID)) return text('Invalid export ID', 400);

	let detail: ExportDetail;
	try {
		detail = await apiJSON<ExportDetail>(
			event,
			'GET',
			`/v1/api/v3/export/${encodeURIComponent(exportID)}`
		);
	} catch {
		return text('Export not found', 404);
	}
	if (detail.status !== 'ready') return text('Export is not ready', 400);

	const userID = event.locals.session.auth?.userId ?? '';
	if (!UUID_RE.test(userID)) return text('Unauthorized', 401);

	const filename = `${exportID}.${String(detail.format).toLowerCase()}`;
	let file: Response;
	try {
		file = await apiFetch(
			event,
			'GET',
			`/v1/api/v3/export/file/${encodeURIComponent(userID.toLowerCase())}/${encodeURIComponent(filename)}`
		);
	} catch {
		return text('Download failed', 502);
	}
	if (file.status !== 200) return text('Download failed', 502);

	const headers = new Headers();
	headers.set(
		'Content-Disposition',
		file.headers.get('Content-Disposition') || `attachment; filename="${filename}"`
	);
	const ct = file.headers.get('Content-Type');
	if (ct) headers.set('Content-Type', ct);
	return new Response(file.body, { status: 200, headers });
};
