import { redirect, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	ForecastFormError,
	forecastRequestFromForm,
	parseUUID,
	requireNetWorthForecasting
} from '#lib/features/planning-tools/forecast/form.server.js';

// POST /forecast/{id} → NetWorthForecastUpdate: a plain form post (no htmx),
// answered with 303 /forecast or a plain-text http.Error.
export const POST: RequestHandler = async (event) => {
	await requireNetWorthForecasting(event);
	const id = parseUUID(event.params.id);
	if (!id) return text('404 page not found\n', { status: 404 });
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return text('Invalid form\n', { status: 400 });
	}
	let body;
	try {
		body = forecastRequestFromForm(form);
	} catch (err) {
		if (err instanceof ForecastFormError) return text(err.message + '\n', { status: 400 });
		throw err;
	}
	try {
		await apiJSON(event, 'PUT', `/v1/net-worth-forecasts/${id}`, body);
	} catch {
		return text('Could not update forecast\n', { status: 422 });
	}
	redirect(303, '/forecast');
};
