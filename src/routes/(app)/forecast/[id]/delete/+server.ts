import { redirect, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { parseUUID, requireNetWorthForecasting } from '#lib/features/planning-tools/forecast/form.server.js';

// POST /forecast/{id}/delete → NetWorthForecastDelete: 303 /forecast, or a
// plain-text 422 when the backend does not answer 204.
export const POST: RequestHandler = async (event) => {
	await requireNetWorthForecasting(event);
	const id = parseUUID(event.params.id);
	if (!id) return text('404 page not found\n', { status: 404 });
	try {
		await apiJSON(event, 'DELETE', `/v1/net-worth-forecasts/${id}`);
	} catch {
		return text('Could not delete forecast\n', { status: 422 });
	}
	redirect(303, '/forecast');
};
