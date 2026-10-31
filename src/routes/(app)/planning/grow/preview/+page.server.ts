import type { Actions, PageServerLoad } from './$types';
import {
	growPreview,
	loadGrowViewModel,
	previewGetGuard
} from '#lib/features/planning-tools/planning/planning.server.js';

// POST /planning/grow/preview (PlanningGrowPreview). With JS the form posts
// here through use:enhance and swaps the results panel only; without it this
// route renders the whole page with the result, as Go did.
export const load: PageServerLoad = async (event) => {
	previewGetGuard(event, '/planning/grow');
	return { vm: await loadGrowViewModel(event) };
};

export const actions: Actions = { default: growPreview };
