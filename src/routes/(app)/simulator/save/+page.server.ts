import type { Actions, PageServerLoad } from './$types';
import { previewGetGuard } from '#lib/features/planning-tools/planning/planning.server.js';
import { loadSimulatorViewModel, simulatorSave } from '#lib/features/planning-tools/simulator/simulator.server.js';

// POST /simulator/save (SimulatorSave): the builder's Save button
// (formaction). Renders the whole page with a notice or an error.
export const load: PageServerLoad = async (event) => {
	previewGetGuard(event, '/simulator');
	return { vm: await loadSimulatorViewModel(event) };
};

export const actions: Actions = { default: simulatorSave };
