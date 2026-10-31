import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	httpError,
	parseUUID,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';
import type { CompareResponse } from '#lib/features/planning-tools/scenarios/types.js';

// POST /scenarios/compare → ScenarioRunsCompare. Go rendered the Comparison
// fragment; v2 returns the compared runs and the page renders Comparison.svelte.
export const POST: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return httpError('Invalid comparison', 400);
	}
	const values = form.getAll('runId');
	if (values.length < 1 || values.length > 4)
		return httpError('Choose one to four completed runs', 422);
	const ids: string[] = [];
	for (const value of values) {
		const id = typeof value === 'string' ? parseUUID(value) : null;
		if (!id) return httpError('Invalid run', 400);
		ids.push(id);
	}
	try {
		const response = await apiJSON<CompareResponse>(event, 'POST', '/v1/scenario-runs/compare', {
			runIds: ids
		});
		if (!response) return httpError('Comparison unavailable', 502);
		return json({ runs: response.runs ?? [] } satisfies CompareResponse);
	} catch {
		return httpError('Comparison unavailable', 502);
	}
};
