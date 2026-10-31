import type { Actions, PageServerLoad } from './$types';
import {
	retirePreview,
	loadRetireViewModel,
	previewGetGuard
} from '#lib/features/planning-tools/planning/planning.server.js';

// POST /planning/retire/preview (PlanningRetirePreview). With JS the form posts
// here through use:enhance and swaps the results panel only; without it this
// route renders the whole page with the result, as Go did.
export const load: PageServerLoad = async (event) => {
	previewGetGuard(event, '/planning/retire');
	return { vm: await loadRetireViewModel(event) };
};

export const actions: Actions = { default: retirePreview };
