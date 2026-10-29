import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	httpError,
	mutationRedirect,
	parseUUID,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';

// DELETE /scenarios/configurations/{id} → ScenarioDefinitionDelete. Go: 204 +
// HX-Redirect /scenarios; v2: { redirect: '/scenarios' }.
export const DELETE: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const id = parseUUID(event.params.id);
	if (!id) return httpError('Invalid scenario', 400);
	try {
		await apiJSON(event, 'DELETE', `/v1/scenarios/${id}`);
	} catch {
		return httpError('Scenario configuration could not be deleted', 502);
	}
	return mutationRedirect();
};
