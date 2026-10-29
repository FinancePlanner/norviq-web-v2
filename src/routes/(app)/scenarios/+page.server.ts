import type { PageServerLoad } from './$types';
import {
	fetchScenarioWorkspace,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';
import { emptyWorkspace, type ScenarioWorkspace } from '#lib/features/planning-tools/scenarios/types.js';

// GET /scenarios → AppHandler.Scenarios (internal/handlers/scenarios.go).
// Any failed read in the workspace fan-out shows the unavailable banner.
export const load: PageServerLoad = async (event) => {
	await requireScenarioPlanning(event);
	let workspace: ScenarioWorkspace;
	let errorMessage = '';
	try {
		workspace = await fetchScenarioWorkspace(event);
	} catch {
		workspace = emptyWorkspace();
		errorMessage = 'Scenario planning is temporarily unavailable.';
	}
	return { workspace, errorMessage };
};
