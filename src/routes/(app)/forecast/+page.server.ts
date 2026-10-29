import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { errorStatus } from '#lib/features/settings-admin/api-errors.js';
import {
	ForecastFormError,
	forecastRequestFromForm,
	parseUUID,
	requireNetWorthForecasting
} from '#lib/features/planning-tools/forecast/form.server.js';
import type {
	ForecastVM,
	NetWorthForecastDefaults,
	NetWorthForecastDefinition,
	NetWorthForecastRun
} from '#lib/features/planning-tools/forecast/types.js';

// GET /forecast → AppHandler.NetWorthForecast (wealth_automation.go). Reads
// are best effort: only a transport failure listing forecasts shows the error.
export const load: PageServerLoad = async (event) => {
	await requireNetWorthForecasting(event);
	const vm: ForecastVM = { portfolios: [], forecasts: [], defaults: null, run: null, editing: null, error: '' };
	const query = event.url.searchParams;
	const get = <T>(path: string) => apiJSON<T>(event, 'GET', path);

	const portfolios = await get<{ id: string; name: string }[]>('/v1/portfolio/lists').catch(() => null);
	vm.portfolios = (portfolios ?? []).map((p) => ({ id: p.id, name: p.name }));
	try {
		vm.forecasts = (await get<NetWorthForecastDefinition[]>('/v1/net-worth-forecasts')) ?? [];
	} catch (err) {
		// Go: `else if err != nil` — a non-200 answer leaves the list empty, silently.
		if (errorStatus(err) === 0) vm.error = 'Could not load forecasts.';
	}
	const editID = parseUUID(query.get('edit') ?? '');
	if (editID) {
		vm.editing = (await get<NetWorthForecastDefinition>(`/v1/net-worth-forecasts/${editID}`).catch(() => null)) ?? null;
	}
	vm.defaults = (await get<NetWorthForecastDefaults>('/v1/net-worth-forecasts/defaults').catch(() => null)) ?? null;
	const runID = query.get('run') ?? '';
	if (runID !== '' && vm.forecasts.some((f) => f.id === runID)) {
		// parseUUID(id): an id that is not a UUID becomes uuid.Nil.
		const id = parseUUID(runID) ?? '00000000-0000-0000-0000-000000000000';
		vm.run = (await get<NetWorthForecastRun>(`/v1/net-worth-forecasts/${id}/runs/latest`).catch(() => null)) ?? null;
	}
	return { vm };
};

// POST /forecast → NetWorthForecastCreate. Go answered failures with a
// plain-text http.Error; v2 renders the same message on the error page.
export const actions: Actions = {
	default: async (event) => {
		await requireNetWorthForecasting(event);
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			error(400, 'Invalid form');
		}
		const portfolioID = parseUUID((form.get('portfolio_id') as string | null) ?? '');
		if (!portfolioID) error(400, 'Choose a portfolio');
		let body;
		try {
			body = forecastRequestFromForm(form);
		} catch (err) {
			if (err instanceof ForecastFormError) error(400, err.message);
			throw err;
		}
		try {
			await apiJSON(event, 'POST', '/v1/net-worth-forecasts', body, { query: { portfolio_list_id: portfolioID } });
		} catch {
			error(422, 'Could not save forecast');
		}
		redirect(303, '/forecast');
	}
};
