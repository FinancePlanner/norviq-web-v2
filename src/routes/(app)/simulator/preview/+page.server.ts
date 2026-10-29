import type { Actions, PageServerLoad } from './$types';
import { previewGetGuard } from '#lib/features/planning-tools/planning/planning.server.js';
import { loadSimulatorViewModel, simulatorPreview } from '#lib/features/planning-tools/simulator/simulator.server.js';

// POST /simulator/preview (SimulatorPreview): computes an unsaved draft, or
// grows it by one row for "Add position". With JS the builder posts here via
// use:enhance; without it this renders the whole page, as Go did.
export const load: PageServerLoad = async (event) => {
	previewGetGuard(event, '/simulator');
	return { vm: await loadSimulatorViewModel(event) };
};

export const actions: Actions = { default: simulatorPreview };
