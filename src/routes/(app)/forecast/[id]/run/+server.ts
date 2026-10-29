import { redirect, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { parseUUID, requireNetWorthForecasting } from '#lib/features/planning-tools/forecast/form.server.js';

// POST /forecast/{id}/run → NetWorthForecastRun: run, then 303 to
// /forecast?run=<id as posted>, where the page shows the latest run.
export const POST: RequestHandler = async (event) => {
	await requireNetWorthForecasting(event);
	const id = parseUUID(event.params.id);
	if (!id) return text('404 page not found\n', { status: 404 });
	try {
		await apiJSON(event, 'POST', `/v1/net-worth-forecasts/${id}/runs`);
	} catch {
		return text('Could not run forecast\n', { status: 422 });
	}
	redirect(303, '/forecast?run=' + event.params.id);
};
