import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	httpError,
	mutationRedirect,
	parseUUID,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';

// DELETE /scenarios/risk-profiles/{id} → ScenarioRiskProfileDelete. Go: 204 +
// HX-Redirect /scenarios; v2: { redirect: '/scenarios' }.
export const DELETE: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const id = parseUUID(event.params.id);
	if (!id) return httpError('Invalid risk profile', 400);
	try {
		await apiJSON(event, 'DELETE', `/v1/holding-risk-profiles/${id}`);
	} catch {
		return httpError('Risk profile could not be deleted', 502);
	}
	return mutationRedirect();
};
