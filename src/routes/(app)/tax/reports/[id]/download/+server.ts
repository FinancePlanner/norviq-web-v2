import { error, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { requireTaxProForEndpoint } from '#lib/features/money/tax/tax.server.js';

// Go: appHandler.TaxReportDownload (GET /tax/reports/{id}/download), behind
// requireTaxOptimization + requireTaxPro. Streams the backend file through,
// restricted to PDF or CSV.
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export const GET: RequestHandler = async (event) => {
	await requireTaxProForEndpoint(event);
	const id = event.params.id ?? '';
	if (!UUID_RE.test(id)) error(404, 'Not found');
	let upstream: Response;
	try {
		upstream = await apiFetch(event, 'GET', `/v1/tax/reports/${id.toLowerCase()}/download`, null, {
			headers: { accept: '*/*' }
		});
	} catch {
		error(502, 'Download unavailable');
	}
	if (upstream.status !== 200) error(upstream.status, 'Report is not ready');
	const contentType = upstream.headers.get('content-type') ?? '';
	if (!contentType.startsWith('application/pdf') && !contentType.startsWith('text/csv')) {
		error(502, 'Unsupported report format');
	}
	const headers = new Headers();
	for (const name of ['Content-Type', 'Content-Disposition', 'Content-Length']) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: 200, headers });
};
